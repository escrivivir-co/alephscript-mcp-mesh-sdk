/**
 * State Machine MCP Driver - MCP Types
 * Defines types and interfaces for MCP protocol communication
 * 
 * Re-exports common types from @alephscript/mcp-core-sdk/types/mcp
 * and adds mesh-specific extensions.
 */

// Re-export common MCP types from core SDK
export {
    MCPToolRequest,
    MCPToolResponse,
    MCPResourceRequest,
    MCPResourceResponse,
    MCPPromptRequest,
    MCPPromptResponse,
    MCPHealthResponse,
    MCPStats,
    MCPEventType,
    MCPErrorType,
    MCPError,
    MCPClientConfig,
    MCP_DEFAULTS,
    type MCPDefaultsType,
} from '@alephscript/mcp-core-sdk/types/mcp';

import { AppConfig } from "@/configs/app.config";

// Start servers in background
const DEFAULT_MCP_SERVER_CONFIG = [
    {
        name: "MCP Service Launcher",
        script: "npm run mcp:launcher",
        port: 3050,
    },
    { name: "AS_MCP_MESH_SDK", script: "npm run mcp:xplus1", port: 3001 },
    { name: "Wiki MCP Browser", script: "npm run mcp:wiki", port: 3002 },
    { name: "DevOps MCP Server", script: "npm run mcp:devops", port: 3003 },
];

/**
 * Configuration for an MCP server connection
 * Extended version with mesh-specific fields
 */
export interface MCPServerConfig {
    /** Server port */
    port?: number;
    script?: string;
    /** Unique identifier for this server */
    id: string;
    /** Human-readable name for this server */
    name?: string;
    /** Base URL for the MCP server */
    url?: string;
    /** Optional API key for authentication */
    apiKey?: string;
    /** Connection timeout in milliseconds */
    timeout?: number;
    /** Maximum number of retry attempts */
    maxRetries?: number;
    /** Additional headers to send with requests */
    headers?: Record<string, string>;
    /** Server capabilities (populated after connection) */
    capabilities?: MCPServerCapabilities;
    capabilitiesCheck?: {
        tools?: boolean;
        resources?: boolean;
        prompts?: boolean;
    };
    version?: string;
    description?: string;
    features?: {
        enableManagers?: boolean;
        enableWebConsole?: boolean;
        enableHealthChecks?: boolean;
    };
    autoRestart?: boolean;
    healthCheckInterval?: number;
    args?: string[];
    env?: Record<string, string>;
}

/**
 * Server capabilities returned by an MCP server (extended with string arrays)
 */
export interface MCPServerCapabilities {
    /** Available tools on this server */
    tools?: string[];
    /** Available resources on this server */
    resources?: string[];
    /** Available prompts on this server */
    prompts?: string[];
    /** Server version */
    version?: string;
    /** Additional server metadata */
    metadata?: Record<string, any>;
}

// ============================================
// Legacy Aliases (for backwards compatibility)
// ============================================

/**
 * @deprecated Use MCPErrorType from core SDK instead
 */
export { MCPErrorType as eType } from '@alephscript/mcp-core-sdk/types/mcp';

/**
 * @deprecated Use MCPError from core SDK instead
 */
export { MCPError as e } from '@alephscript/mcp-core-sdk/types/mcp';
