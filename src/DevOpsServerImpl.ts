
import { z } from "zod";
import BaseMCPServer from "@wrapper/BaseMCPServer";
import { BaseMCPServerConfig } from "@wrapper/MCPServerConfig";

import { DEFAULT_DEVOPS_MCP_SERVER_CONFIG } from "./configs/DEFAULT_DEVOPS_MCP_SERVER_CONFIG";
import { MCPDriverAdapter } from "./drivers";
import { AlephScriptClient } from "@libs/alephscript-client";
import { PersistentContentManager, CRUDToolsManager, CoreComponentsManager } from "@managers";
import { DevOpsPluginManager, PluginContext, XPlus1ControlPlugin, DevOpsRoomPlugin } from "@plugins";
import { l } from "./Logger";

// Helper function for generating unique session hashes
function getHash(key: string): string {
    const l = (s: string) => s.substring(s.length - 2);
    const a = new Date().getTime().toString();
    const b = Math.random().toString();
    return key + ">" + l(a) + l(b);
}



/**
 * DevOps MCP Server
 * Provides DevOps automation and management capabilities
 * NEW: Plugin system for modular functionality
 * NEW: ProserpinaBot Socket.IO client for mesh communication
 */
export class DevOpsServer extends BaseMCPServer {
    private mcpAdapter?: MCPDriverAdapter;
    private pluginManager?: DevOpsPluginManager;
    private proserpinaBot!: AlephScriptClient;

    // Manager architecture for better code organization (NEW)
    // Using PersistentContentManager for MongoDB-style file persistence
    private contentManager?: PersistentContentManager;
    private crudToolsManager?: CRUDToolsManager;
    private coreComponentsManager?: CoreComponentsManager;

    constructor(public appConfig: any) {
        const config: BaseMCPServerConfig = DEFAULT_DEVOPS_MCP_SERVER_CONFIG;
        
		console.log("Start")
        super(config);

        // Initialize manager architecture for better code organization
        this.initializeManagers();

        // Initialize ProserpinaBot - Socket.IO client for mesh communication
        this.initProserpinaBot();

        // Initialize MCP adapter for connecting to other servers
        // this.initializeMCPAdapter();
        // Plugin system will be initialized in setupServerSpecifics
        // Initialize default content will be called in setupServerSpecifics
    }

    /**
     * Initialize ProserpinaBot - Socket.IO client for DevOps operations
     * Connects to the AlephScript mesh and registers as MASTER of DevOps_ROOM
     */
    private initProserpinaBot(): void {
        try {
            const socketUrl = this.appConfig?.launcher?.socketUrl || "http://localhost:3010";
            const serverName = DEFAULT_DEVOPS_MCP_SERVER_CONFIG.id;
            
            this.proserpinaBot = new AlephScriptClient(
                serverName,
                socketUrl
            );
            
            this.proserpinaBot.initTriggersDefinition.push(() => {
                const ROOM_NAME = serverName + "_ROOM";
                const REGISTER_PAYLOAD = { 
                    usuario: this.proserpinaBot.name, 
                    sesion: getHash("ProserpinaBot")
                };
                
                this.proserpinaBot.io.emit("CLIENT_REGISTER", REGISTER_PAYLOAD);
                this.proserpinaBot.io.emit("CLIENT_SUSCRIBE", { room: ROOM_NAME });
                this.proserpinaBot.room("MAKE_MASTER", { 
                    features: ["DevOps_Operations", "MCP_Server_Control", "Plugin_Management"] 
                }, ROOM_NAME);

                // Subscribe to all events for debugging
                this.proserpinaBot.io.onAny((eventName: string, ...args: any[]) => {
                    l.d(`ProserpinaBot event: ${eventName}`, args);
                });
                
                l.i("ProserpinaBot initialized and connected to AlephScript mesh", {
                    botName: serverName,
                    room: ROOM_NAME,
                    socketUrl
                });
            });

            l.i("ProserpinaBot client created successfully");
        } catch (error) {
            l.e("Failed to initialize ProserpinaBot", { error });
        }
    }

    /**
     * Initialize the manager architecture for better code organization (NEW)
     */
    private initializeManagers(): void {
        try {
            // Content manager for CRUD operations with file persistence
            // Data stored in: ARCHIVO/PLUGINS/MCP_DATA/devops-mcp-server/
            this.contentManager = new PersistentContentManager(
                this.server,
                "devops-mcp-server"
            );

            // CRUD tools manager
            this.crudToolsManager = new CRUDToolsManager(
                this.server,
                this.contentManager,
                "devops-mcp-server"
            );

            // Core components manager
            this.coreComponentsManager = new CoreComponentsManager(
                this.server,
                "devops-mcp-server",
                3003
            );

            l.i("DevOps: Manager architecture initialized");
        } catch (error) {
            l.e("DevOps: Failed to initialize managers", { error });
            // Disable managers if they fail
            this.contentManager = undefined;
            this.crudToolsManager = undefined;
            this.coreComponentsManager = undefined;
        }
    }


    /**
     * Initialize MCP Driver Adapter for connecting to other servers
     */
    private initializeMCPAdapter(): void {
        try {
            this.mcpAdapter = new MCPDriverAdapter();

            // Add default MCP servers that might be running
            this.setupMCPConnections();

            l.v("DevOps: MCP Adapter initialized");
        } catch (error) {
            l.e("DevOps: Failed to initialize MCP Adapter", {
                error,
            });
            this.mcpAdapter = undefined;
        }
    }

    /**
     * Setup connections to other MCP servers
     */
    private async setupMCPConnections(): Promise<void> {
        if (!this.mcpAdapter) return;

        const mcpServers = [
            {
                id: "state-machine-server",
                name: "AS_MCP_MESH_SDK",
                url: "http://localhost:3001",
                timeout: 5000,
                maxRetries: 2,
            },
            {
                id: "wiki-mcp-browser",
                name: "Wiki MCP Browser",
                url: "http://localhost:3002",
                timeout: 5000,
                maxRetries: 2,
            },
            {
                id: "mcp-service-launcher",
                name: "MCP Service Launcher",
                url: "http://localhost:3050",
                timeout: 5000,
                maxRetries: 2,
            },
        ];

        for (const server of mcpServers) {
            try {
                await this.mcpAdapter.addServer(server);
                l.v(`DevOps: Connected to ${server.name}`, {
                    serverId: server.id,
                });
            } catch (error) {
                l.v(
                    `DevOps: Could not connect to ${server.name}`,
                    { error }
                );
            }
        }
    }

    /**
     * Initialize Plugin System
     * Sets up the plugin manager and loads default plugins
     */
    private initializePluginSystem(): void {
        try {
            // Create plugin context
            const pluginContext: Omit<PluginContext, "config"> = {
                server: this.server,
                mcpAdapter: this.mcpAdapter,
                log: (level: any, message: string, data: object | undefined) => {
                    switch (level) {
                        case "info":
                            l.i(message, data);
                            break;
                        case "warn":
                            l.w(message, data);
                            break;
                        case "error":
                            l.e(message, data);
                            break;
                        case "debug":
                            l.v(message, data);
                            break;
                    }
                },
            };

            // Initialize plugin manager
            this.pluginManager = new DevOpsPluginManager(pluginContext);

            // Register default plugins
            this.registerDefaultPlugins();

            l.i("DevOps: Plugin system initialized");
        } catch (error) {
            l.e("DevOps: Failed to initialize plugin system", {
                error,
            });
            this.pluginManager = undefined;
        }
    }

    /**
     * Register default plugins
     */
    private async registerDefaultPlugins(): Promise<void> {
        if (!this.pluginManager) return;

        try {
            // Optional env toggle to disable plugin entirely
            if (process.env.XPLUS1_PLUGIN_DISABLED === "true") {
                l.i(
                    "DevOps: XPlus1 plugin disabled via env (XPLUS1_PLUGIN_DISABLED=true)"
                );
                return;
            }

            // Register XPlus1 Control Plugin with dependency health guard
            const xplus1Plugin = new XPlus1ControlPlugin();

            let isHealthy = false;
            if (this.mcpAdapter) {
                try {
                    isHealthy = await this.mcpAdapter.healthCheck(
                        "state-machine-server"
                    );
                } catch (hcError) {
                    l.v(
                        "DevOps: Health check for state-machine-server failed",
                        { error: hcError }
                    );
                }
            }

            await this.pluginManager.registerPlugin(xplus1Plugin, {
                forceEnable: isHealthy,
                skipInitialization: !isHealthy,
                customSettings: {
                    priority: "high",
                    autoLoad: isHealthy,
                },
            });

            if (!isHealthy) {
                l.w(
                    "DevOps: XPlus1 server unavailable. Plugin registered but not initialized (will retry once in 15s)."
                );
                // One-off delayed retry to initialize if the dependency becomes available shortly after startup
                setTimeout(async () => {
                    try {
                        if (!this.pluginManager) return;
                        if (this.mcpAdapter) {
                            const ok = await this.mcpAdapter.healthCheck(
                                "state-machine-server"
                            );
                            if (!ok) {
                                l.w(
                                    "DevOps: XPlus1 server still unavailable on retry; leaving plugin inactive."
                                );
                                return;
                            }
                        }
                        await this.pluginManager.initializePlugin(
                            "xplus1-control"
                        );
                        await this.pluginManager.setPluginEnabled(
                            "xplus1-control",
                            true
                        );
                        l.i(
                            "DevOps: XPlus1 plugin initialized successfully after retry"
                        );
                    } catch (retryErr) {
                        l.w(
                            "DevOps: Failed to initialize XPlus1 plugin on retry",
                            { error: retryErr }
                        );
                    }
                }, 15000);
            } else {
                l.i(
                    "DevOps: Default plugins registered and initialized"
                );
            }

            // Register DevOps Room Plugin (Socket.IO MASTER-ROOM protocol)
            const roomPluginEnabled = process.env.DEVOPS_ROOM_PLUGIN_ENABLED !== "false";
            if (roomPluginEnabled) {
                try {
                    const devOpsRoomPlugin = new DevOpsRoomPlugin();
                    await this.pluginManager.registerPlugin(devOpsRoomPlugin, {
                        forceEnable: true,
                        skipInitialization: false,
                        customSettings: {
                            priority: "medium",
                            autoLoad: true,
                            meshUrl: process.env.SOCKET_MESH_URL || "http://localhost:3010",
                            roomId: "DevOps_ROOM",
                        },
                    });
                    l.i("DevOps: Room Plugin registered for MASTER-ROOM protocol");
                } catch (roomPluginError) {
                    l.w("DevOps: Failed to register Room Plugin (Socket.IO mesh may be unavailable)", { 
                        error: roomPluginError 
                    });
                }
            } else {
                l.v("DevOps: Room Plugin disabled via env (DEVOPS_ROOM_PLUGIN_ENABLED=false)");
            }
        } catch (error) {
            l.e("DevOps: Failed to register default plugins", {
                error,
            });
        }
    }

    /**
     * Initialize default resources and prompts
     * Uses "add if not exists" pattern to avoid conflicts with persisted data
     */
    private initializeDefaultContent(): void {
        // Initialize default DevOps prompts (skip if already loaded from disk)
        if (!this.contentManager?.getPrompt("start-system")) {
            this.contentManager?.addPrompt({
            id: "start-system",
            name: "Arrancar el sistema",
            description: "Prompt para arrancar el sistema usando npm start",
            content: `🚀 **Sistema de Arranque**

Por favor, utiliza las herramientas base de VS Code para ejecutar el comando \`npm start\` en el terminal del proyecto.

**Pasos recomendados:**
1. Abre el terminal integrado de VS Code (Ctrl+\`)
2. Asegúrate de estar en el directorio raíz del proyecto
3. Ejecuta: \`npm start\`
4. Monitorea la salida para verificar que el sistema arranque correctamente

**Información del contexto:**
- Proyecto: state-machine-mcp-driver
- Script principal: npm start
- Puerto esperado: Verificar logs de arranque

¿Necesitas ayuda con algún paso específico del arranque del sistema?`,
            parameters: {
                projectPath: z
                    .string()
                    .optional()
                    .describe("Ruta del proyecto"),
                environment: z
                    .string()
                    .optional()
                    .describe("Entorno de ejecución"),
            },
            metadata: {
                category: "devops",
                priority: "high",
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            });
        }

        if (!this.contentManager?.getPrompt("open-web-console")) {
            this.contentManager?.addPrompt({
                id: "open-web-console",
            name: "Abrir consola web",
            description: "Prompt para abrir la consola web en localhost:8080",
            content: `🌐 **Consola Web**

Por favor, abre el navegador simple de VS Code para acceder a la consola web del sistema.

**URL objetivo:** http://localhost:8080

**Pasos recomendados:**
1. Usa la herramienta de navegador simple de VS Code
2. Navega a: http://localhost:8080
3. Verifica que la aplicación web esté respondiendo correctamente

**Si el puerto 8080 no está disponible, verifica:**
- Que el sistema esté ejecutándose correctamente
- Los logs del servidor para identificar el puerto real
- Configuración de puertos en packageon o variables de entorno

¿El navegador web está funcionando correctamente?`,
            parameters: {
                port: z.number().optional().describe("Puerto del servidor web"),
                host: z.string().optional().describe("Host del servidor"),
            },
            metadata: {
                category: "devops",
                priority: "medium",
            },
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }

        // Initialize default resources (skip if already loaded from disk)
        if (!this.contentManager?.getResource("project-status")) {
            this.contentManager?.addResource({
            id: "project-status",
            name: "Estado del Proyecto",
            description: "Estado actual del proyecto y servicios",
            uri: "devops://project/status",
            mimeType: "application/json",
            content: JSON.stringify(
                {
                    projectName: "state-machine-mcp-driver",
                    status: "initialized",
                    services: [],
                    lastCheck: new Date().toISOString(),
                },
                null,
                2
            ),
            metadata: {
                category: "status",
                updateInterval: "30s",
            },
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }

        if (!this.contentManager?.getResource("npm-scripts")) {
            this.contentManager?.addResource({
                id: "npm-scripts",
            name: "Scripts NPM Disponibles",
            description: "Lista de scripts NPM disponibles en el proyecto",
            uri: "devops://npm/scripts",
            mimeType: "application/json",
            content: JSON.stringify(
                {
                    availableScripts: [
                        "npm start",
                        "npm run dev",
                        "npm run build",
                        "npm test",
                        "npm run launcher",
                        "npm run cleannode",
                    ],
                    recommended: "npm start",
                    description:
                        "Scripts principales para el desarrollo y despliegue",
                },
                null,
                2
            ),
            metadata: {
                category: "documentation",
                source: "packageon",
            },
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }

        // Add dynamic resources that query live game state
        this.setupDynamicResources();
    }

    /**
     * Setup DevOps specific tools, resources, and prompts
     */
    protected async setupServerSpecifics(): Promise<void> {
        l.i("DevOps: setupServerSpecifics started");
        
        // Initialize persistence layer first (loads from disk)
        if (this.contentManager) {
            try {
                l.i("DevOps: Initializing PersistentContentManager...");
                await this.contentManager.init();
                l.i("DevOps: PersistentContentManager initialized (data loaded from disk)");
            } catch (error) {
                l.e("DevOps: Failed to initialize PersistentContentManager", { error });
                // Continue without persistence if it fails
            }
        }

        // Register manager tools first (NEW: Additional CRUD and core tools)
        this.registerManagerTools();

        this.initializeDefaultContent();
        this.setupTools();
        
        // Initialize plugin system after core tools are setup
        this.initializePluginSystem();
        
        // Start ProserpinaBot connection to AlephScript mesh
        if (this.proserpinaBot) {
            l.i("Connecting ProserpinaBot to AlephScript mesh...");
            this.proserpinaBot.connect();
        }
        
        // Note: Plugins are initialized during registration; avoid double init
    }

    /**
     * Register tools from all managers (NEW)
     */
    private registerManagerTools(): void {
        try {
            if (this.crudToolsManager) {
                this.crudToolsManager.registerAllTools();
                l.i(
                    "DevOps: Additional CRUD tools registered via manager"
                );
            }

            if (this.coreComponentsManager) {
                this.coreComponentsManager.registerAllTools();
                l.i(
                    "DevOps: Additional core tools registered via manager"
                );
            }
        } catch (error) {
            l.e("DevOps: Failed to register manager tools", {
                error,
            });
        }
    }

    /**
     * Initialize all registered plugins
     */
    private async initializePlugins(): Promise<void> {
        if (this.pluginManager) {
            try {
                await this.pluginManager.initializeAllPlugins();
                l.i("DevOps: All plugins initialized");
            } catch (error) {
                l.e("DevOps: Failed to initialize plugins", {
                    error,
                });
            }
        }
    }

    /**
     * Setup dynamic resources that query live game state
     */
    private setupDynamicResources(): void {
        // Live game state resource
        this.server.resource(
            "live-game-state",
            "devops://game/state/live",
            {
                description:
                    "Estado actual del juego X+1 consultado dinámicamente via MCP",
                mimeType: "application/json",
            },
            async () => {
                try {
                    const gameState = await this.queryLiveGameState();
                    return {
                        contents: [
                            {
                                uri: "devops://game/state/live",
                                mimeType: "application/json",
                                text: JSON.stringify(gameState, null, 2),
                            },
                        ],
                    };
                } catch (error) {
                    return {
                        contents: [
                            {
                                uri: "devops://game/state/live",
                                mimeType: "application/json",
                                text: JSON.stringify(
                                    {
                                        error: "Failed to query live game state",
                                        message:
                                            error instanceof Error
                                                ? error.message
                                                : "Unknown error",
                                        timestamp: new Date().toISOString(),
                                        available: false,
                                    },
                                    null,
                                    2
                                ),
                            },
                        ],
                    };
                }
            }
        );

        // Runtime statistics resource
        this.server.resource(
            "runtime-stats",
            "devops://runtime/statistics",
            {
                description: "Estadísticas detalladas del runtime del juego",
                mimeType: "application/json",
            },
            async () => {
                try {
                    const stats = await this.queryRuntimeStatistics();
                    return {
                        contents: [
                            {
                                uri: "devops://runtime/statistics",
                                mimeType: "application/json",
                                text: JSON.stringify(stats, null, 2),
                            },
                        ],
                    };
                } catch (error) {
                    return {
                        contents: [
                            {
                                uri: "devops://runtime/statistics",
                                mimeType: "application/json",
                                text: JSON.stringify(
                                    {
                                        error: "Failed to query runtime statistics",
                                        message:
                                            error instanceof Error
                                                ? error.message
                                                : "Unknown error",
                                        timestamp: new Date().toISOString(),
                                    },
                                    null,
                                    2
                                ),
                            },
                        ],
                    };
                }
            }
        );

        // MCP servers health resource
        this.server.resource(
            "mcp-servers-health",
            "devops://mcp/health",
            {
                description: "Estado de salud de todos los servidores MCP",
                mimeType: "application/json",
            },
            async () => {
                try {
                    const health = await this.queryMCPServersHealth();
                    return {
                        contents: [
                            {
                                uri: "devops://mcp/health",
                                mimeType: "application/json",
                                text: JSON.stringify(health, null, 2),
                            },
                        ],
                    };
                } catch (error) {
                    return {
                        contents: [
                            {
                                uri: "devops://mcp/health",
                                mimeType: "application/json",
                                text: JSON.stringify(
                                    {
                                        error: "Failed to query MCP servers health",
                                        message:
                                            error instanceof Error
                                                ? error.message
                                                : "Unknown error",
                                        timestamp: new Date().toISOString(),
                                    },
                                    null,
                                    2
                                ),
                            },
                        ],
                    };
                }
            }
        );

        // Agents status resource
        this.server.resource(
            "agents-status",
            "devops://game/agents",
            {
                description: "Estado actual de todos los agentes del juego",
                mimeType: "application/json",
            },
            async () => {
                try {
                    const agents = await this.queryAgentsStatus();
                    return {
                        contents: [
                            {
                                uri: "devops://game/agents",
                                mimeType: "application/json",
                                text: JSON.stringify(agents, null, 2),
                            },
                        ],
                    };
                } catch (error) {
                    return {
                        contents: [
                            {
                                uri: "devops://game/agents",
                                mimeType: "application/json",
                                text: JSON.stringify(
                                    {
                                        error: "Failed to query agents status",
                                        message:
                                            error instanceof Error
                                                ? error.message
                                                : "Unknown error",
                                        timestamp: new Date().toISOString(),
                                    },
                                    null,
                                    2
                                ),
                            },
                        ],
                    };
                }
            }
        );
    }

    /**
     * Setup DevOps tools (excluding CRUD operations handled by managers)
     */
    private setupTools(): void {
        // CRUD operations are now handled by CRUDToolsManager
        // Core tools (start_system, open_web_console, get_server_status) are handled by CoreComponentsManager

        // This method is kept for any future DevOps-specific tools
        // that are not generic enough to be in the managers

        l.i(
            "DevOps: Custom tools setup completed (using managers for CRUD and core tools)"
        );
    }

    // Note: Prompt/Resource handlers and storage are managed by ContentManager

    // ===== LIVE GAME STATE QUERY METHODS =====

    /**
     * Query live game state from AS_MCP_MESH_SDK
     */
    private async queryLiveGameState(): Promise<any> {
        if (!this.mcpAdapter) {
            throw new Error("MCP Adapter not initialized");
        }

        try {
            // Get X value and status
            const xStatus = await this.mcpAdapter.executeTool(
                "state-machine-server",
                "get_x_status",
                {}
            );

            // Get current game state
            const fullGameState = await this.mcpAdapter.executeTool(
                "state-machine-server",
                "get_full_game_state",
                {}
            );

            // Get UI status
            const uiStatus = await this.mcpAdapter.executeTool(
                "state-machine-server",
                "get_ui_status",
                {}
            );

            // Get interaction state
            const interactionState = await this.mcpAdapter.executeTool(
                "state-machine-server",
                "get_interaction_state",
                {}
            );

            return {
                timestamp: new Date().toISOString(),
                serverId: "state-machine-server",
                gameState: {
                    x: xStatus?.content?.[0]?.text || "Unknown",
                    fullState: fullGameState?.content?.[0]?.text || "Unknown",
                    uiStatus: uiStatus?.content?.[0]?.text || "Unknown",
                    interaction:
                        interactionState?.content?.[0]?.text || "Unknown",
                },
                available: true,
                lastUpdate: Date.now(),
            };
        } catch (error) {
            l.e("DevOps: Failed to query live game state", {
                error,
            });
            throw error;
        }
    }

    /**
     * Query runtime statistics if available
     */
    private async queryRuntimeStatistics(): Promise<any> {
        if (!this.mcpAdapter) {
            throw new Error("MCP Adapter not initialized");
        }

        try {
            // Since the Runtime is typically embedded in the application,
            // we'll try to get statistics from the X+1 machine server
            const consoleOutput = await this.mcpAdapter.executeTool(
                "state-machine-server",
                "get_console_output",
                {}
            );

            const conversationThread = await this.mcpAdapter.executeTool(
                "state-machine-server",
                "get_current_conversation",
                {}
            );

            // Calculate some basic statistics
            const statistics = {
                timestamp: new Date().toISOString(),
                serverAvailable: true,
                gameMetrics: {
                    consoleOutput:
                        consoleOutput?.content?.[0]?.text || "Not available",
                    conversationThread:
                        conversationThread?.content?.[0]?.text ||
                        "Not available",
                },
                performance: {
                    responseTime: Date.now(), // Simple timestamp
                    serverStatus: "active",
                },
            };

            return statistics;
        } catch (error) {
            l.e("DevOps: Failed to query runtime statistics", {
                error,
            });
            throw error;
        }
    }

    /**
     * Query MCP servers health status
     */
    private async queryMCPServersHealth(): Promise<any> {
        if (!this.mcpAdapter) {
            throw new Error("MCP Adapter not initialized");
        }

        const healthResults: Record<string, any> = {};
        const servers = [
            "state-machine-server",
            "wiki-mcp-browser",
            "mcp-service-launcher",
        ];

        for (const serverId of servers) {
            try {
                const isHealthy = await this.mcpAdapter.healthCheck(serverId);
                healthResults[serverId] = {
                    status: isHealthy ? "healthy" : "unhealthy",
                    lastCheck: new Date().toISOString(),
                    available: true,
                };
            } catch (error) {
                healthResults[serverId] = {
                    status: "error",
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
                    lastCheck: new Date().toISOString(),
                    available: false,
                };
            }
        }

        // Also query service launcher for more detailed status
        try {
            const serviceStatus = await this.mcpAdapter.executeTool(
                "mcp-service-launcher",
                "get_server_status",
                {}
            );

            healthResults.launcher_detailed = {
                status: "available",
                details:
                    serviceStatus?.content?.[0]?.text || "Status not available",
                lastCheck: new Date().toISOString(),
            };
        } catch (error) {
            healthResults.launcher_detailed = {
                status: "unavailable",
                error: error instanceof Error ? error.message : "Unknown error",
                lastCheck: new Date().toISOString(),
            };
        }

        return {
            timestamp: new Date().toISOString(),
            servers: healthResults,
            summary: {
                total: servers.length,
                healthy: Object.values(healthResults).filter(
                    (h: any) => h.status === "healthy"
                ).length,
                unhealthy: Object.values(healthResults).filter(
                    (h: any) => h.status !== "healthy"
                ).length,
            },
        };
    }

    /**
     * Query agents status from the game
     */
    private async queryAgentsStatus(): Promise<any> {
        if (!this.mcpAdapter) {
            throw new Error("MCP Adapter not initialized");
        }

        try {
            // Get available agents/postulations
            const availableAgents = await this.mcpAdapter.executeTool(
                "state-machine-server",
                "get_available_postulations",
                {}
            );

            // Get current conversation to see active agents
            const conversation = await this.mcpAdapter.executeTool(
                "state-machine-server",
                "get_current_conversation",
                {}
            );

            // Get interaction state to see what agents are available
            const interactionState = await this.mcpAdapter.executeTool(
                "state-machine-server",
                "get_interaction_state",
                {}
            );

            return {
                timestamp: new Date().toISOString(),
                agents: {
                    available:
                        availableAgents?.content?.[0]?.text || "Not available",
                    conversation:
                        conversation?.content?.[0]?.text || "Not available",
                    interaction:
                        interactionState?.content?.[0]?.text || "Not available",
                },
                status: "active",
                lastUpdate: Date.now(),
            };
        } catch (error) {
            l.e("DevOps: Failed to query agents status", { error });
            throw error;
        }
    }
}
