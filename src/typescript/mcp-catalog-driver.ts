export const MCP_MODEL_SDK_SERVER = process.env.MCP_MODEL_SDK_SERVER || 'http://localhost:4001';

// ==== Types for MCP Catalog/Presets API ====
export type MCPItemType = 'tool' | 'resource' | 'prompt';

export interface MCPTool {
    name: string;
    description?: string;
    // JSON Schema - keep flexible
    parameters?: Record<string, unknown>;
    type: 'tool';
}

export interface MCPResource {
    name: string;
    description?: string;
    uri: string;
    mimeType: string;
    type: 'resource';
}

export interface MCPPresetItemArgument {
    name: string;
    description?: string;
    required?: boolean;
}

export interface MCPPresetPrompt { // Prompt in catalog
    name: string;
    description?: string;
    arguments?: MCPPresetItemArgument[];
    type: 'prompt';
}

export interface MCPServerInfo {
    name: string;
    version?: string;
    url?: string;
    // allow backend to include additional fields without breaking
    [key: string]: unknown;
}

export interface MCPCatalogServer {
    serverName: string;
    serverInfo: MCPServerInfo;
    isConnected: boolean;
    extractedAt?: string;
    tools: MCPTool[];
    resources: MCPResource[];
    prompts: MCPPresetPrompt[];
}

export interface MCPCatalogResponse {
    success: boolean;
    timestamp: string;
    catalog: MCPCatalogServer[];
    serversCount: number;
    totalTools: number;
    totalResources: number;
    totalPrompts: number;
}

export interface MCPItemsCount {
    tools: number;
    resources: number;
    prompts: number;
    total: number;
}

export interface MCPPresetSummary {
    name: string;
    itemsCount: MCPItemsCount;
    createdAt: string;
}

export interface MCPPresetsListResponse {
    presets: MCPPresetSummary[];
}

export interface MCPPresetSavePayload {
    presetName: string;
    selectedItems: Array<{ serverName: string; type: MCPItemType; name: string; }>;
}

export interface MCPPresetSaveResponse {
    success: boolean;
    preset?: MCPPresetSummary;
    error?: string;
    details?: string;
    timestamp?: string;
}