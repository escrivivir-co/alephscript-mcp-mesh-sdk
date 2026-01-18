#!/usr/bin/env node
/**
 * AAIA MCP Server
 * Provides AAIA Runtime (FIAs + Mundos + Autómatas) capabilities to MCP clients
 * with session management for multi-agent scenarios
 * 
 * @épica MCP-AAIA-SERVER-1.0.0
 * @pattern Follows MCPPrologServer structure
 */

import { BaseMCPServer } from "./BaseMCPServer";
import { DEFAULT_AAIA_MCP_SERVER_CONFIG } from "./configs/DEFAULT_AAIA_MCP_SERVER_CONFIG";
import { 
    AAIASessionManager, 
    RunStateEnum, 
    IPercepto 
} from "./services/AAIASessionManager";
import { AlephScriptClient } from "./libs/alephscript-client";
import { l } from "./Logger";
import { z } from "zod";

// Helper function for generating unique hashes
function getHash(key: string): string {
    const h = (s: string) => s.substring(s.length - 2);
    const a = new Date().getTime().toString();
    const b = Math.random().toString();
    return key + ">" + h(a) + h(b);
}

export class MCPAAIAServer extends BaseMCPServer {
    private sessionManager: AAIASessionManager;
    private persefonBot!: AlephScriptClient;

    constructor() {
        super(DEFAULT_AAIA_MCP_SERVER_CONFIG);
        this.sessionManager = new AAIASessionManager();
        
        // Initialize PersefonBot for Socket.IO mesh communication
        this.initPersefonBot();
        
        l.info("MCPAAIAServer initialized with session management and Socket.IO");
    }

    /**
     * Initialize PersefonBot - Socket.IO client for AAIA operations
     * Connects to the AlephScript mesh and registers as MASTER of AAIA_ROOM
     */
    private initPersefonBot(): void {
        try {
            const socketUrl = process.env.SOCKET_MESH_URL || "http://localhost:3010";
            const serverName = DEFAULT_AAIA_MCP_SERVER_CONFIG.id;
            
            this.persefonBot = new AlephScriptClient(
                "PersefonBot",
                socketUrl
            );
            
            this.persefonBot.initTriggersDefinition.push(() => {
                const ROOM_NAME = "AAIA_ROOM";
                const REGISTER_PAYLOAD = { 
                    usuario: this.persefonBot.name, 
                    sesion: getHash("PersefonBot")
                };
                
                this.persefonBot.io.emit("CLIENT_REGISTER", REGISTER_PAYLOAD);
                this.persefonBot.io.emit("CLIENT_SUSCRIBE", { room: ROOM_NAME });
                this.persefonBot.room("MAKE_MASTER", { 
                    features: [
                        "AAIA_GET_APPS",
                        "AAIA_CREATE_SESSION",
                        "AAIA_LIST_SESSIONS",
                        "AAIA_DESTROY_SESSION",
                        "AAIA_LIST_FIAS",
                        "AAIA_START_FIA",
                        "AAIA_STOP_FIA",
                        "AAIA_STEP_FIA",
                        "AAIA_PLAY_FIA",
                        "AAIA_PAUSE_FIA",
                        "AAIA_SEND_PERCEPTO",
                        "AAIA_GET_EFERENCIA",
                        "AAIA_QUERY_MUNDO"
                    ] 
                }, ROOM_NAME);

                // Handle incoming capability requests
                this.persefonBot.io.on("GET_AAIA_APPS", async () => {
                    l.info("PersefonBot received GET_AAIA_APPS request");
                    const apps = await this.sessionManager.getAvailableApps();
                    this.persefonBot.room("SET_AAIA_APPS", { apps }, ROOM_NAME);
                });

                this.persefonBot.io.on("GET_AAIA_SESSIONS", async () => {
                    l.info("PersefonBot received GET_AAIA_SESSIONS request");
                    const sessions = await this.sessionManager.listSessions();
                    this.persefonBot.room("SET_AAIA_SESSIONS", { sessions }, ROOM_NAME);
                });

                this.persefonBot.io.on("GET_AAIA_STEP", async (data: any) => {
                    l.info("PersefonBot received AAIA_STEP request", data);
                    const result = await this.sessionManager.stepFIA(data.sessionId, data.fiaIndex);
                    this.persefonBot.room("SET_AAIA_STEP", result, ROOM_NAME);
                });

                // Subscribe to all events for debugging
                this.persefonBot.io.onAny((eventName: string, ...args: any[]) => {
                    l.d(`PersefonBot event: ${eventName}`, args);
                });
                
                l.info("PersefonBot initialized and connected to AlephScript mesh", {
                    botName: "PersefonBot",
                    room: ROOM_NAME,
                    socketUrl,
                    capabilities: 13
                });
            });

            l.info("PersefonBot client created successfully");
        } catch (error) {
            l.e("Failed to initialize PersefonBot", { error });
        }
    }

    protected setupServerSpecifics(): void {
        this.setupTools();
        this.setupResources();
        this.setupPrompts();
        
        // Connect PersefonBot to mesh after server is ready
        if (this.persefonBot) {
            l.info("Connecting PersefonBot to AlephScript mesh...");
            this.persefonBot.connect();
        }
        
        l.info("MCPAAIAServer tools, resources and prompts registered");
    }

    /**
     * Setup MCP Tools for AAIA operations
     */
    private setupTools(): void {
        // Tool: List available apps
        this.server.tool(
            "aaia_list_apps",
            "List available AAIA applications that can be loaded",
            {},
            async () => {
                const apps = await this.sessionManager.getAvailableApps();
                return {
                    content: [{ type: "text", text: JSON.stringify({ apps }, null, 2) }],
                };
            }
        );

        // Tool: Create AAIA session
        this.server.tool(
            "aaia_create_session",
            "Create a new AAIA session with a specific app",
            {
                appId: z.string().describe("App ID to load (e.g., 'demo-logica', 'demo-sbr')"),
            },
            async ({ appId }) => {
                try {
                    const session = await this.sessionManager.createSession(appId);
                    return {
                        content: [{ 
                            type: "text", 
                            text: JSON.stringify({
                                success: true,
                                sessionId: session.sessionId,
                                appId: session.appId,
                                fiasCount: session.fias.length,
                            }, null, 2) 
                        }],
                    };
                } catch (error: any) {
                    return {
                        content: [{ 
                            type: "text", 
                            text: JSON.stringify({ success: false, error: error.message }, null, 2) 
                        }],
                    };
                }
            }
        );

        // Tool: List sessions
        this.server.tool(
            "aaia_list_sessions",
            "List all active AAIA sessions",
            {},
            async () => {
                const sessions = this.sessionManager.listSessions();
                return {
                    content: [{ type: "text", text: JSON.stringify({ sessions }, null, 2) }],
                };
            }
        );

        // Tool: List FIAs in session
        this.server.tool(
            "aaia_list_fias",
            "List all FIAs in a session",
            {
                sessionId: z.string().describe("Session identifier"),
            },
            async ({ sessionId }) => {
                const fias = this.sessionManager.getFIAs(sessionId);
                if (!fias) {
                    return {
                        content: [{ 
                            type: "text", 
                            text: JSON.stringify({ success: false, error: `Session ${sessionId} not found` }, null, 2) 
                        }],
                    };
                }
                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({ success: true, sessionId, fias }, null, 2) 
                    }],
                };
            }
        );

        // Tool: Step FIA
        this.server.tool(
            "aaia_step_fia",
            "Execute a single reasoning step on a FIA",
            {
                sessionId: z.string().describe("Session identifier"),
                fiaIndex: z.number().describe("Index of the FIA to step"),
            },
            async ({ sessionId, fiaIndex }) => {
                const result = await this.sessionManager.stepFIA(sessionId, fiaIndex);
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                };
            }
        );

        // Tool: Send percepto
        this.server.tool(
            "aaia_send_percepto",
            "Send a percepto (stimulus) to the mundo for FIAs to process",
            {
                sessionId: z.string().describe("Session identifier"),
                tipo: z.enum(['sensor', 'evento', 'comando']).describe("Percepto type"),
                fuente: z.string().optional().describe("Source of the percepto"),
                payload: z.record(z.string(), z.unknown()).describe("Percepto data payload"),
            },
            async ({ sessionId, tipo, fuente, payload }) => {
                const percepto: IPercepto = {
                    tipo: tipo as 'sensor' | 'evento' | 'comando',
                    fuente,
                    payload,
                    timestamp: new Date().toISOString(),
                };
                const result = await this.sessionManager.sendPercepto(sessionId, percepto);
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                };
            }
        );

        // Tool: Query mundo
        this.server.tool(
            "aaia_query_mundo",
            "Query the current state of the mundo in a session",
            {
                sessionId: z.string().describe("Session identifier"),
            },
            async ({ sessionId }) => {
                const mundo = this.sessionManager.queryMundo(sessionId);
                if (!mundo) {
                    return {
                        content: [{ 
                            type: "text", 
                            text: JSON.stringify({ success: false, error: `Session ${sessionId} not found` }, null, 2) 
                        }],
                    };
                }
                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({ success: true, sessionId, mundo }, null, 2) 
                    }],
                };
            }
        );

        // Tool: Set FIA state
        this.server.tool(
            "aaia_set_fia_state",
            "Change the run state of a FIA (PLAY, PAUSE, STOP)",
            {
                sessionId: z.string().describe("Session identifier"),
                fiaIndex: z.number().describe("Index of the FIA"),
                state: z.enum(['PLAY', 'PLAY_STEP', 'PAUSE', 'STOP']).describe("New run state"),
            },
            async ({ sessionId, fiaIndex, state }) => {
                const result = this.sessionManager.setFIAState(
                    sessionId, 
                    fiaIndex, 
                    state as RunStateEnum
                );
                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({ ...result, newState: state }, null, 2) 
                    }],
                };
            }
        );

        // Tool: Destroy session
        this.server.tool(
            "aaia_destroy_session",
            "Destroy an AAIA session and free resources",
            {
                sessionId: z.string().describe("Session identifier to destroy"),
            },
            async ({ sessionId }) => {
                const success = await this.sessionManager.destroySession(sessionId);
                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({ success, sessionId }, null, 2) 
                    }],
                };
            }
        );
    }

    /**
     * Setup MCP Resources for AAIA state inspection
     */
    private setupResources(): void {
        // Resource: Sessions state
        this.server.resource(
            "aaia-sessions",
            "aaia://sessions",
            {
                description: "Current state of all AAIA sessions",
                mimeType: "application/json",
            },
            async () => {
                const sessions = this.sessionManager.listSessions();
                return {
                    contents: [{
                        uri: "aaia://sessions",
                        mimeType: "application/json",
                        text: JSON.stringify({ sessions }, null, 2),
                    }],
                };
            }
        );

        // Resource: Apps catalog
        this.server.resource(
            "aaia-apps-catalog",
            "aaia://apps/catalog",
            {
                description: "Catalog of available AAIA applications",
                mimeType: "application/json",
            },
            async () => {
                const apps = await this.sessionManager.getAvailableApps();
                return {
                    contents: [{
                        uri: "aaia://apps/catalog",
                        mimeType: "application/json",
                        text: JSON.stringify({ apps }, null, 2),
                    }],
                };
            }
        );

        // Resource: FIA paradigms
        this.server.resource(
            "aaia-paradigms",
            "aaia://paradigms",
            {
                description: "List of the 10 FIA paradigms supported",
                mimeType: "application/json",
            },
            async () => {
                const paradigms = [
                    { id: 'logica', name: 'Lógica', description: 'Prolog, razonamiento declarativo' },
                    { id: 'simbolica', name: 'Simbólica', description: 'Procesamiento simbólico' },
                    { id: 'conexionista', name: 'Conexionista', description: 'Redes neuronales, ML' },
                    { id: 'sbc', name: 'SBC', description: 'Sistemas basados en conocimiento' },
                    { id: 'sbr', name: 'SBR', description: 'Sistemas basados en reglas' },
                    { id: 'situada', name: 'Situada', description: 'Agentes IoT, sensores/actuadores' },
                    { id: 'sistemas', name: 'Sistemas', description: 'Teoría de sistemas' },
                    { id: 'cientifica', name: 'Científica', description: 'Método científico' },
                    { id: 'gramaticas', name: 'Gramáticas', description: 'NLP, procesamiento de lenguaje' },
                    { id: 'hibrido', name: 'Híbrido', description: 'Combinación de paradigmas' },
                ];
                return {
                    contents: [{
                        uri: "aaia://paradigms",
                        mimeType: "application/json",
                        text: JSON.stringify({ paradigms }, null, 2),
                    }],
                };
            }
        );
    }

    /**
     * Setup MCP Prompts for guided AAIA operations
     */
    private setupPrompts(): void {
        // Prompt: Create FIA session
        this.server.prompt(
            "aaia_create_session",
            "Guide to create a new AAIA session with FIAs",
            {
                appId: z.string().optional().describe("App ID to use (leave empty to list available)"),
            },
            async ({ appId }) => {
                if (!appId) {
                    const apps = await this.sessionManager.getAvailableApps();
                    return {
                        messages: [{
                            role: "assistant",
                            content: {
                                type: "text",
                                text: `Available AAIA Apps:\n${apps.map((a: { id: string; nombre: string; descripcion?: string; paradigmaPrincipal: string }) => 
                                    `- **${a.id}**: ${a.descripcion || a.nombre} (paradigm: ${a.paradigmaPrincipal})`
                                ).join('\n')}\n\nUse aaia_create_session with one of these appIds.`,
                            },
                        }],
                    };
                }
                return {
                    messages: [{
                        role: "assistant",
                        content: {
                            type: "text",
                            text: `Creating AAIA session with app '${appId}'...\nUse the aaia_create_session tool to proceed.`,
                        },
                    }],
                };
            }
        );

        // Prompt: Step FIA cycle
        this.server.prompt(
            "aaia_step_cycle",
            "Execute a percepto → step → eferencia cycle",
            {
                sessionId: z.string().describe("Session to operate on"),
                fiaIndex: z.number().describe("FIA index to step"),
            },
            async ({ sessionId, fiaIndex }) => {
                return {
                    messages: [{
                        role: "assistant",
                        content: {
                            type: "text",
                            text: `AAIA Step Cycle Guide:

1. **Send Percepto** (optional): 
   \`aaia_send_percepto { sessionId: "${sessionId}", tipo: "sensor", payload: {...} }\`

2. **Execute Step**:
   \`aaia_step_fia { sessionId: "${sessionId}", fiaIndex: ${fiaIndex} }\`

3. **Check Eferencia**: The step result contains the FIA's output.

4. **Query Mundo** (optional):
   \`aaia_query_mundo { sessionId: "${sessionId}" }\`

Repeat this cycle as needed for your agent workflow.`,
                        },
                    }],
                };
            }
        );

        // Prompt: List paradigms
        this.server.prompt(
            "aaia_paradigms_guide",
            "Explain the 10 FIA paradigms",
            {},
            async () => {
                return {
                    messages: [{
                        role: "assistant",
                        content: {
                            type: "text",
                            text: `# Los 10 Paradigmas de FIA

## 🧠 Cognitivos
- **logica**: Prolog, razonamiento declarativo, reglas lógicas
- **simbolica**: Procesamiento simbólico, manipulación de estructuras
- **conexionista**: Redes neuronales, aprendizaje automático

## 📚 Basados en Conocimiento
- **sbc**: Sistemas expertos con base de conocimiento
- **sbr**: Sistemas basados en reglas if-then

## 🌍 Situados
- **situada**: Agentes IoT, percepción-acción en tiempo real
- **sistemas**: Teoría de sistemas, retroalimentación

## 🔬 Especializados
- **cientifica**: Método científico, hipótesis-experimento
- **gramaticas**: NLP, parsing, generación de lenguaje
- **hibrido**: Combinación de múltiples paradigmas

Use \`aaia://paradigms\` resource for detailed info.`,
                        },
                    }],
                };
            }
        );
    }
}

// Main execution
if (require.main === module) {
    const server = new MCPAAIAServer();
    server.start().catch((error) => {
        console.error("Failed to start AAIA MCP Server:", error);
        process.exit(1);
    });
}

export default MCPAAIAServer;
