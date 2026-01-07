/**
 * State Machine MCP Driver - MCP Types
 * Defines types and interfaces for MCP protocol communication
 * 
 * TODO: Import from @alephscript/mcp-core-sdk when monorepo is configured
 */

import { AppConfig } from "@/configs/app.config";

// ============================================
// MCP Types (inline for now)
// ============================================

export interface MCPToolRequest {
    name: string;
    arguments?: Record<string, unknown>;
}

export interface MCPToolResponse {
    content?: Array<{ type: string; text?: string }>;
    isError?: boolean;
    success?: boolean;
    result?: unknown;
    executionTime?: number;
}

export interface MCPResourceRequest {
    uri: string;
}

export interface MCPResourceResponse {
    contents: Array<{ uri: string; mimeType?: string; text?: string }>;
}

export interface MCPPromptRequest {
    name: string;
    arguments?: Record<string, unknown>;
}

export interface MCPPromptResponse {
    messages: Array<{ role: string; content: { type: string; text: string } }>;
}

export interface MCPHealthResponse {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: number;
    details?: Record<string, unknown>;
}

export interface MCPStats {
    uptime: number;
    requestsHandled: number;
    errors: number;
}

export enum MCPEventType {
    TOOL_CALLED = 'tool_called',
    TOOL_EXECUTED = 'tool_executed',
    RESOURCE_READ = 'resource_read',
    PROMPT_EXECUTED = 'prompt_executed',
    HEALTH_CHECK = 'health_check',
    ERROR = 'error',
}

export enum MCPErrorType {
    CONNECTION_ERROR = 'connection_error',
    TIMEOUT_ERROR = 'timeout_error',
    VALIDATION_ERROR = 'validation_error',
    NOT_FOUND_ERROR = 'not_found_error',
    INTERNAL_ERROR = 'internal_error',
}

export class MCPError extends Error {
    constructor(
        public type: MCPErrorType,
        message: string,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'MCPError';
    }
}

export interface MCPClientConfig {
    baseUrl: string;
    timeout?: number;
    maxRetries?: number;
    apiKey?: string;
    headers?: Record<string, string>;
}

export const MCP_DEFAULTS = {
    timeout: 30000,
    maxRetries: 3,
    healthCheckInterval: 60000,
};

export type MCPDefaultsType = typeof MCP_DEFAULTS;

// ============================================
// Mesh-specific types
// ============================================

const DEFAULT_MCP_SERVER_CONFIG = [
    { name: "MCP Service Launcher", script: "npm run mcp:launcher", port: 3050 },
    { name: "AS_MCP_MESH_SDK", script: "npm run mcp:xplus1", port: 3001 },
    { name: "Wiki MCP Browser", script: "npm run mcp:wiki", port: 3002 },
    { name: "DevOps MCP Server", script: "npm run mcp:devops", port: 3003 },
];

export interface MCPServerConfig {
    port?: number;
    script?: string;
    id: string;
    name?: string;
    url?: string;
    apiKey?: string;
    timeout?: number;
    maxRetries?: number;
    headers?: Record<string, string>;
    capabilities?: MCPServerCapabilities;
    capabilitiesCheck?: { tools?: boolean; resources?: boolean; prompts?: boolean };
    version?: string;
    description?: string;
    features?: { enableManagers?: boolean; enableWebConsole?: boolean; enableHealthChecks?: boolean };
    autoRestart?: boolean;
    healthCheckInterval?: number;
    args?: string[];
    env?: Record<string, string>;
}

export interface MCPServerCapabilities {
    tools?: string[];
    resources?: string[];
    prompts?: string[];
    version?: string;
    metadata?: Record<string, unknown>;
}

// Legacy aliases
export { MCPErrorType as eType };
export { MCPError as e };
