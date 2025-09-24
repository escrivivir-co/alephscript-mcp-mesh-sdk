/**
 * Tipos específicos para la interfaz web del MCP Mesh SDK
 * Estos tipos extienden o adaptan los tipos del dominio MCP para uso en la UI web
 */

import { MCPItemType, MCPItemsCount, MCPPresetSummary } from '@/typescript/mcp-catalog-driver';

// ==== Tipos de elementos seleccionados ====

/**
 * Elemento MCP seleccionado en la interfaz web
 * Usado para formularios y selección de elementos en presets
 */
export interface MCPSelectedItem {
    server: string;
    type: MCPItemType;
    name: string;
}

/**
 * Datos de formulario para elementos seleccionados
 * Formato string usado en formularios HTML: "server|type|name"
 */
export type MCPSelectedItemFormValue = string;

// ==== Tipos de presets extendidos para UI ====

/**
 * Detalle completo de un preset con información extendida para la UI
 * Extiende MCPPresetSummary con información adicional necesaria en la interfaz
 */
export interface MCPPresetDetail extends MCPPresetSummary {
    description?: string;
    items: MCPSelectedItem[];
    lastModified?: string;
}

/**
 * Respuesta completa de preset para la UI web
 * Wrapper que incluye información de estado y errores
 */
export interface MCPPresetUIResponse {
    success: boolean;
    preset?: MCPPresetDetail;
    error?: string;
    timestamp: string;
}

/**
 * Payload para crear/actualizar presets desde la UI
 */
export interface MCPPresetUIPayload {
    name: string;
    description?: string;
    selectedItems: MCPSelectedItem[];
}

// ==== Tipos de estadísticas y agregaciones ====

/**
 * Estadísticas extendidas de preset para mostrar en la UI
 */
export interface MCPPresetStats extends MCPItemsCount {
    serversCount: number;
    servers: string[];
}

/**
 * Estadísticas del catálogo para dashboard
 */
export interface MCPCatalogStats {
    totalServers: number;
    connectedServers: number;
    disconnectedServers: number;
    totalTools: number;
    totalResources: number;
    totalPrompts: number;
    totalItems: number;
}

// ==== Tipos de búsqueda y filtrado ====

/**
 * Resultado de búsqueda en el catálogo
 */
export interface MCPSearchResult<T = any> {
    server: {
        serverName: string;
        isConnected: boolean;
    };
    item: T;
    type: MCPItemType;
    relevanceScore?: number;
}

/**
 * Filtros para búsqueda en catálogo
 */
export interface MCPSearchFilters {
    query?: string;
    types?: MCPItemType[];
    servers?: string[];
    connectedOnly?: boolean;
}

// ==== Tipos de estado de UI ====

/**
 * Estado de carga para componentes async
 */
export interface UILoadingState {
    isLoading: boolean;
    error?: string;
    lastUpdated?: string;
}

/**
 * Estado del editor de presets
 */
export interface PresetEditorState extends UILoadingState {
    preset?: MCPPresetDetail;
    isEditing: boolean;
    isDirty: boolean;
    selectedItems: MCPSelectedItem[];
}

/**
 * Estado del explorador de catálogo
 */
export interface CatalogExplorerState extends UILoadingState {
    catalog?: any[]; // MCPCatalogServer[] pero evitamos import circular
    filters: MCPSearchFilters;
    selectedItems: MCPSelectedItem[];
    stats?: MCPCatalogStats;
}

// ==== Tipos de eventos de UI ====

/**
 * Eventos del sistema de presets
 */
export type PresetEvent = 
    | { type: 'PRESET_CREATED'; payload: { name: string; items: MCPSelectedItem[] } }
    | { type: 'PRESET_UPDATED'; payload: { name: string; items: MCPSelectedItem[] } }
    | { type: 'PRESET_DELETED'; payload: { name: string } }
    | { type: 'PRESET_LOADED'; payload: { preset: MCPPresetDetail } }
    | { type: 'PRESET_ERROR'; payload: { error: string } };

/**
 * Eventos del catálogo
 */
export type CatalogEvent =
    | { type: 'CATALOG_REFRESHED'; payload: { serversCount: number } }
    | { type: 'SERVER_CONNECTED'; payload: { serverName: string } }
    | { type: 'SERVER_DISCONNECTED'; payload: { serverName: string } }
    | { type: 'CATALOG_ERROR'; payload: { error: string } };

// ==== Tipos de configuración de UI ====

/**
 * Configuración de temas
 */
export interface UIThemeConfig {
    name: string;
    displayName: string;
    cssFile: string;
    isDark: boolean;
}

/**
 * Configuración de la interfaz web
 */
export interface WebUIConfig {
    theme: string;
    language: string;
    autoRefresh: boolean;
    refreshInterval: number;
    compactMode: boolean;
}

// ==== Utilitarios de tipos ====

/**
 * Tipo helper para operaciones CRUD
 */
export type CRUDOperation = 'create' | 'read' | 'update' | 'delete';

/**
 * Tipo helper para estados de conexión
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * Tipo helper para niveles de log en UI
 */
export type UILogLevel = 'info' | 'warn' | 'error' | 'success';

// ==== Tipos para AI/Chat ====

/**
 * Estado de entrenamiento para entradas de AI
 */
export type AITrainStatus = 'approved' | 'rejected' | null;

/**
 * Entrada individual en el historial de conversación AI
 */
export interface AIHistoryEntry {
    timestamp: number;
    question: string;
    answer: string;
    trainStatus: AITrainStatus;
    snippets: string[];
}