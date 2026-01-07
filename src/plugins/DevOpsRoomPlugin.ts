/**
 * DevOpsRoomPlugin - Socket.IO Room Management for DevOpsServer
 * 
 * Plugin que expone capabilities del DevOpsServer via protocolo MASTER-ROOM.
 * Permite que otros agentes/clientes interactúen con el servidor via Socket.IO.
 * 
 * @package @alephscript/mcp-mesh-sdk
 * @module plugins/DevOpsRoomPlugin
 * @épica CHANNELS-SDK-1.0.0
 */

import { z } from 'zod';
import { 
    BaseDevOpsPlugin, 
    PluginConfig, 
    PluginContext, 
    PluginMetadata, 
    PluginResult 
} from './IDevOpsPlugin';

// ============================================
// Room Protocol Types (inline to avoid import issues)
// ============================================

type RoomId = string;
type CapabilityId = string;
type SocketId = string;

interface IRoomCapability {
    id: CapabilityId;
    description: string;
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    tags?: string[];
}

interface ICapabilityContext {
    requesterId: SocketId;
    requesterName: string;
    roomId: RoomId;
    timestamp: number;
}

type CapabilityHandler<TInput = unknown, TOutput = unknown> = (
    input: TInput,
    context: ICapabilityContext
) => Promise<TOutput>;

// ============================================
// Plugin Configuration
// ============================================

const DEVOPS_ROOM_PLUGIN_CONFIG: PluginConfig = {
    id: 'devops-room',
    name: 'DevOps Room Plugin',
    description: 'Socket.IO room management for DevOps capabilities exposure',
    version: '1.0.0',
    category: 'communication',
    enabled: true,
    settings: {
        meshUrl: process.env.SOCKET_MESH_URL || 'http://localhost:3010',
        namespace: '/runtime',
        roomId: 'DevOps_ROOM',
    }
};

// ============================================
// Plugin Metadata
// ============================================

const DEVOPS_ROOM_PLUGIN_METADATA: PluginMetadata = {
    tools: [
        {
            name: 'devops_room_get_capabilities',
            description: 'Get list of capabilities exposed by DevOps Room',
            schema: z.object({}),
        },
        {
            name: 'devops_room_invoke',
            description: 'Invoke a capability on the DevOps Room',
            schema: z.object({
                capability: z.string().describe('Capability ID to invoke'),
                input: z.any().optional().describe('Input data for the capability'),
            }),
        },
        {
            name: 'devops_room_status',
            description: 'Get status of the DevOps Room connection',
            schema: z.object({}),
        },
    ],
    resources: [
        {
            id: 'devops-room://status',
            name: 'DevOps Room Status',
            description: 'Current status of the DevOps Room',
            mimeType: 'application/json',
        },
        {
            id: 'devops-room://capabilities',
            name: 'DevOps Room Capabilities',
            description: 'List of capabilities exposed by DevOps Room',
            mimeType: 'application/json',
        },
    ],
    prompts: [],
};

// ============================================
// Capability Definitions
// ============================================

const DEVOPS_CAPABILITIES: IRoomCapability[] = [
    {
        id: 'GET_SERVER_STATUS',
        description: 'Get current status of all MCP servers',
        tags: ['status', 'monitoring'],
        outputSchema: {
            type: 'object',
            properties: {
                servers: { type: 'array' },
                timestamp: { type: 'number' },
            }
        }
    },
    {
        id: 'GET_PLUGIN_LIST',
        description: 'List all installed DevOps plugins',
        tags: ['plugins', 'config'],
        outputSchema: {
            type: 'object',
            properties: {
                plugins: { type: 'array' },
                count: { type: 'number' },
            }
        }
    },
    {
        id: 'GET_TASK_LIST',
        description: 'List available VS Code tasks',
        tags: ['tasks', 'automation'],
        outputSchema: {
            type: 'object',
            properties: {
                tasks: { type: 'array' },
            }
        }
    },
    {
        id: 'GET_AGENT_LIST',
        description: 'List registered agents in the Scriptorium',
        tags: ['agents', 'scriptorium'],
        outputSchema: {
            type: 'object',
            properties: {
                agents: { type: 'array' },
            }
        }
    },
    {
        id: 'GET_ROOM_MEMBERS',
        description: 'List current members of the DevOps room',
        tags: ['room', 'members'],
        outputSchema: {
            type: 'object',
            properties: {
                members: { type: 'array' },
                count: { type: 'number' },
            }
        }
    },
];

// ============================================
// DevOps Room Plugin
// ============================================

/**
 * Plugin que integra capabilities de DevOpsServer via Socket.IO
 * 
 * NOTE: La integración completa con AlephScriptClient y BaseRoomManager
 * requiere actualizar el paquete @alephscript/mcp-core-sdk.
 * Esta versión proporciona los MCP tools mientras tanto.
 */
export class DevOpsRoomPlugin extends BaseDevOpsPlugin {
    private capabilities: Map<CapabilityId, IRoomCapability> = new Map();
    private handlers: Map<CapabilityId, CapabilityHandler> = new Map();
    private roomId: string;
    private isActivated: boolean = false;
    // NOTE: AlephScriptClient will be added when mcp-core-sdk is updated
    // private client?: AlephScriptClient;

    constructor() {
        super(DEVOPS_ROOM_PLUGIN_CONFIG, DEVOPS_ROOM_PLUGIN_METADATA);
        this.roomId = DEVOPS_ROOM_PLUGIN_CONFIG.settings?.roomId || 'DevOps_ROOM';
        
        // Initialize capabilities
        for (const cap of DEVOPS_CAPABILITIES) {
            this.capabilities.set(cap.id, cap);
        }
        
        // Setup capability handlers
        this.setupCapabilityHandlers();
    }

    /**
     * Setup capability handlers (called in constructor)
     */
    private setupCapabilityHandlers(): void {
        // GET_SERVER_STATUS
        this.handlers.set('GET_SERVER_STATUS', async (_input: unknown, ctx: ICapabilityContext) => {
            return {
                status: 'operational',
                servers: [
                    { id: 'devops-server', port: 3003, status: 'running' },
                    { id: 'prolog-server', port: 3006, status: 'unknown' },
                    { id: 'launcher-server', port: 3050, status: 'unknown' },
                ],
                timestamp: Date.now(),
                requestedBy: ctx.requesterName,
            };
        });

        // GET_PLUGIN_LIST
        this.handlers.set('GET_PLUGIN_LIST', async (_input: unknown, ctx: ICapabilityContext) => {
            return {
                plugins: [
                    { id: 'xplus1-control', status: 'enabled' },
                    { id: 'devops-room', status: 'enabled' },
                ],
                count: 2,
                requestedBy: ctx.requesterName,
            };
        });

        // GET_TASK_LIST
        this.handlers.set('GET_TASK_LIST', async (_input: unknown, ctx: ICapabilityContext) => {
            return {
                tasks: [
                    { label: 'APB: Start [Service]', status: 'available' },
                    { label: 'MCP: Start [Launcher]', status: 'available' },
                    { label: 'JKL: Start [Site]', status: 'available' },
                ],
                requestedBy: ctx.requesterName,
            };
        });

        // GET_AGENT_LIST
        this.handlers.set('GET_AGENT_LIST', async (_input: unknown, ctx: ICapabilityContext) => {
            return {
                agents: [
                    { name: '@ox', layer: 'meta' },
                    { name: '@aleph', layer: 'ui' },
                    { name: '@indice', layer: 'meta' },
                    { name: '@scrum', layer: 'plugins' },
                ],
                requestedBy: ctx.requesterName,
            };
        });

        // GET_ROOM_MEMBERS
        this.handlers.set('GET_ROOM_MEMBERS', async (_input: unknown, ctx: ICapabilityContext) => {
            return {
                members: [
                    { name: 'DevOpsServer', role: 'master' },
                ],
                count: 1,
                roomId: this.roomId,
                requestedBy: ctx.requesterName,
            };
        });
    }

    /**
     * Initialize the plugin
     */
    async initialize(context: PluginContext): Promise<void> {
        await super.initialize(context);
        this.log('info', `DevOps Room Plugin initialized with ${this.capabilities.size} capabilities`);
    }

    /**
     * Setup MCP handlers (tools, resources)
     */
    async setupMCPHandlers(context: PluginContext): Promise<void> {
        const server = context.server;

        // Tool: Get capabilities
        server.tool(
            'devops_room_get_capabilities',
            'Get list of capabilities exposed by DevOps Room',
            {},
            async () => {
                this.updateActivity();
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            roomId: this.roomId,
                            capabilities: Array.from(this.capabilities.values()),
                            count: this.capabilities.size,
                        }, null, 2),
                    }],
                };
            }
        );

        // Tool: Invoke capability
        server.tool(
            'devops_room_invoke',
            'Invoke a capability on the DevOps Room',
            {
                capability: z.string().describe('Capability ID to invoke (e.g., GET_SERVER_STATUS)'),
                input: z.any().optional().describe('Input data for the capability'),
            },
            async ({ capability, input }) => {
                this.updateActivity();
                
                const handler = this.handlers.get(capability);
                if (!handler) {
                    return {
                        content: [{ 
                            type: 'text', 
                            text: JSON.stringify({ 
                                error: `Unknown capability: ${capability}`,
                                available: Array.from(this.capabilities.keys()),
                            }) 
                        }],
                    };
                }

                try {
                    const ctx: ICapabilityContext = {
                        requesterId: 'mcp-tool',
                        requesterName: 'MCP Client',
                        roomId: this.roomId,
                        timestamp: Date.now(),
                    };
                    
                    const result = await handler(input, ctx);
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: 'text',
                            text: JSON.stringify({ 
                                error: error instanceof Error ? error.message : 'Unknown error' 
                            }),
                        }],
                    };
                }
            }
        );

        // Tool: Get status
        server.tool(
            'devops_room_status',
            'Get status of the DevOps Room connection',
            {},
            async () => {
                this.updateActivity();
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            initialized: this.isInitialized,
                            activated: this.isActivated,
                            roomId: this.roomId,
                            masterName: 'DevOpsServer',
                            capabilitiesCount: this.capabilities.size,
                            socketConnected: false, // Will be true when AlephScriptClient is connected
                            note: 'Full Socket.IO integration pending mcp-core-sdk update',
                        }, null, 2),
                    }],
                };
            }
        );

        this.log('info', 'MCP handlers registered: devops_room_get_capabilities, devops_room_invoke, devops_room_status');
    }

    /**
     * Cleanup plugin resources
     */
    async cleanup(): Promise<void> {
        this.isActivated = false;
        // Disconnect from Socket.IO when implemented
        // this.client?.disconnect();
        await super.cleanup();
    }

    /**
     * Execute plugin-specific commands
     */
    async execute(command: string, params: any): Promise<PluginResult> {
        this.updateActivity();

        switch (command) {
            case 'activate':
                return this.activateRoom();
            
            case 'deactivate':
                return this.deactivateRoom();
            
            case 'invoke':
                return this.invokeCapabilityCommand(params);
            
            case 'list_capabilities':
                return {
                    success: true,
                    data: {
                        roomId: this.roomId,
                        capabilities: Array.from(this.capabilities.values()),
                    }
                };

            default:
                return super.execute(command, params);
        }
    }

    /**
     * Get plugin statistics
     */
    protected getStatistics(): Record<string, any> {
        return {
            ...super.getStatistics(),
            roomId: this.roomId,
            activated: this.isActivated,
            capabilitiesCount: this.capabilities.size,
            capabilities: Array.from(this.capabilities.keys()),
        };
    }

    // ============================================
    // Room Protocol Methods (stubs for now)
    // ============================================

    /**
     * Activate room and register as MASTER
     */
    private async activateRoom(): Promise<PluginResult> {
        if (this.isActivated) {
            return { success: true, message: 'Room already activated' };
        }

        // NOTE: Full Socket.IO integration will be added when mcp-core-sdk is updated
        // For now, just set the flag
        this.isActivated = true;
        this.log('info', `Room ${this.roomId} activated (local mode)`);
        
        return { 
            success: true, 
            message: `DevOps Room activated: ${this.roomId}`,
            data: {
                roomId: this.roomId,
                capabilities: Array.from(this.capabilities.keys()),
            }
        };
    }

    /**
     * Deactivate room and release MASTER role
     */
    private async deactivateRoom(): Promise<PluginResult> {
        if (!this.isActivated) {
            return { success: true, message: 'Room already deactivated' };
        }

        this.isActivated = false;
        this.log('info', `Room ${this.roomId} deactivated`);
        
        return { success: true, message: `DevOps Room deactivated: ${this.roomId}` };
    }

    /**
     * Invoke a capability via execute command
     */
    private async invokeCapabilityCommand(params: { capability: string; input?: any }): Promise<PluginResult> {
        const { capability, input } = params;
        
        const handler = this.handlers.get(capability);
        if (!handler) {
            return {
                success: false,
                message: `Unknown capability: ${capability}`,
                data: { available: Array.from(this.capabilities.keys()) },
            };
        }

        try {
            const ctx: ICapabilityContext = {
                requesterId: 'execute-command',
                requesterName: 'Internal',
                roomId: this.roomId,
                timestamp: Date.now(),
            };
            
            const result = await handler(input, ctx);
            return {
                success: true,
                data: result,
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
                error: error instanceof Error ? error : undefined,
            };
        }
    }
}

// ============================================
// Factory function
// ============================================

/**
 * Create an instance of DevOpsRoomPlugin
 */
export function createDevOpsRoomPlugin(): DevOpsRoomPlugin {
    return new DevOpsRoomPlugin();
}
