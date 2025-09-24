/**
 * Exportaciones centralizadas de todos los tipos de la capa web
 * Este archivo actúa como el punto de entrada único para todos los tipos específicos de web
 */

// Re-exportar tipos del dominio MCP que se usan frecuentemente en web
export type { 
    MCPItemType,
    MCPTool,
    MCPResource,
    MCPPresetPrompt,
    MCPCatalogServer,
    MCPCatalogResponse,
    MCPPresetsListResponse,
    MCPPresetSavePayload,
    MCPPresetSaveResponse,
    MCPPresetSummary,
    MCPItemsCount,
    MCPServerInfo
} from '@/typescript/mcp-catalog-driver';

// Exportar todos los tipos específicos de web
export * from './types';

// Exportar constantes útiles
export { MCP_MODEL_SDK_SERVER } from '@/typescript/mcp-catalog-driver';