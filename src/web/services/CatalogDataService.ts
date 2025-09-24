import { 
    MCPCatalogResponse, 
    MCPCatalogServer,
    MCPTool,
    MCPResource,
    MCPPresetPrompt,
    MCPItemType,
    MCP_MODEL_SDK_SERVER 
} from '@/typescript/mcp-catalog-driver';
import { fetchJsonTyped } from '@/typescript/fetch-typed-json';
import { Logger } from '@/Logger';
import { MCPCatalogStats, MCPSearchResult, MCPSearchFilters } from '../types';

/**
 * CatalogDataService - Servicio especializado para el catálogo MCP
 * Responsabilidad: Gestión del catálogo de servidores MCP y sus elementos (tools, resources, prompts)
 */
export class CatalogDataService {
    /**
     * Obtiene el catálogo completo de servidores MCP
     * @returns Catálogo completo o null en caso de error
     */
    static async fetchCatalog(): Promise<MCPCatalogResponse | null> {
        try {
            const response = await fetchJsonTyped<MCPCatalogResponse>(`${MCP_MODEL_SDK_SERVER}/ai/ui/mcp/list`);

            if (response && response.success && Array.isArray(response.catalog)) {
                Logger.info(`✅ Fetched MCP catalog: ${response.serversCount} servers, ${response.totalTools} tools, ${response.totalResources} resources, ${response.totalPrompts} prompts`);
                return response;
            } else {
                Logger.w('⚠️ Invalid catalog response format');
                return {
                    success: false,
                    timestamp: new Date().toISOString(),
                    catalog: [],
                    serversCount: 0,
                    totalTools: 0,
                    totalResources: 0,
                    totalPrompts: 0
                };
            }
        } catch (error) {
            Logger.e(`❌ Error fetching MCP catalog: ${error}`);
            return {
                success: false,
                timestamp: new Date().toISOString(),
                catalog: [],
                serversCount: 0,
                totalTools: 0,
                totalResources: 0,
                totalPrompts: 0
            };
        }
    }

    /**
     * Filtra servidores del catálogo por estado de conexión
     * @param catalog Catálogo completo
     * @param connectedOnly Si solo devolver servidores conectados
     * @returns Servidores filtrados
     */
    static filterServers(catalog: MCPCatalogServer[], connectedOnly: boolean = false): MCPCatalogServer[] {
        if (!connectedOnly) return catalog;
        return catalog.filter(server => server.isConnected);
    }

    /**
     * Obtiene estadísticas agregadas del catálogo (método interno)
     * @param catalog Catálogo de servidores
     * @returns Estadísticas agregadas
     */
    static getBasicCatalogStats(catalog: MCPCatalogServer[]): MCPCatalogStats {
        const connectedServers = catalog.filter(s => s.isConnected);
        
        return {
            totalServers: catalog.length,
            connectedServers: connectedServers.length,
            disconnectedServers: catalog.length - connectedServers.length,
            totalTools: catalog.reduce((sum, s) => sum + s.tools.length, 0),
            totalResources: catalog.reduce((sum, s) => sum + s.resources.length, 0),
            totalPrompts: catalog.reduce((sum, s) => sum + s.prompts.length, 0),
            totalItems: catalog.reduce((sum, s) => sum + s.tools.length + s.resources.length + s.prompts.length, 0)
        };
    }

    /**
     * Busca items en el catálogo por nombre o descripción
     * @param catalog Catálogo de servidores
     * @param query String de búsqueda
     * @param types Tipos de items a buscar (opcional)
     * @returns Items que coinciden con la búsqueda
     */
    static searchCatalog(
        catalog: MCPCatalogServer[], 
        query: string, 
        types?: MCPItemType[]
    ): MCPSearchResult<MCPTool | MCPResource | MCPPresetPrompt>[] {
        const results: MCPSearchResult<MCPTool | MCPResource | MCPPresetPrompt>[] = [];
        const searchLower = query.toLowerCase();

        for (const server of catalog) {
            if (!server.isConnected) continue;

            // Search tools
            if (!types || types.includes('tool')) {
                for (const tool of server.tools) {
                    if (tool.name.toLowerCase().includes(searchLower) || 
                        tool.description?.toLowerCase().includes(searchLower)) {
                        results.push({ 
                            server: { serverName: server.serverName, isConnected: server.isConnected }, 
                            item: tool, 
                            type: 'tool' 
                        });
                    }
                }
            }

            // Search resources
            if (!types || types.includes('resource')) {
                for (const resource of server.resources) {
                    if (resource.name.toLowerCase().includes(searchLower) || 
                        resource.description?.toLowerCase().includes(searchLower)) {
                        results.push({ 
                            server: { serverName: server.serverName, isConnected: server.isConnected }, 
                            item: resource, 
                            type: 'resource' 
                        });
                    }
                }
            }

            // Search prompts
            if (!types || types.includes('prompt')) {
                for (const prompt of server.prompts) {
                    if (prompt.name.toLowerCase().includes(searchLower) || 
                        prompt.description?.toLowerCase().includes(searchLower)) {
                        results.push({ 
                            server: { serverName: server.serverName, isConnected: server.isConnected }, 
                            item: prompt, 
                            type: 'prompt' 
                        });
                    }
                }
            }
        }

        return results;
    }

    /**
     * Obtiene todos los elementos de un tipo específico del catálogo
     * @param catalog Catálogo de servidores
     * @param type Tipo de elemento a obtener
     * @param connectedOnly Si solo incluir servidores conectados
     * @returns Lista de elementos del tipo especificado
     */
    static getItemsByType(
        catalog: MCPCatalogServer[],
        type: MCPItemType,
        connectedOnly: boolean = true
    ): { server: MCPCatalogServer; item: MCPTool | MCPResource | MCPPresetPrompt }[] {
        const servers = connectedOnly ? catalog.filter(s => s.isConnected) : catalog;
        const results: { server: MCPCatalogServer; item: MCPTool | MCPResource | MCPPresetPrompt }[] = [];

        for (const server of servers) {
            let items: (MCPTool | MCPResource | MCPPresetPrompt)[];
            
            switch (type) {
                case 'tool':
                    items = server.tools;
                    break;
                case 'resource':
                    items = server.resources;
                    break;
                case 'prompt':
                    items = server.prompts;
                    break;
                default:
                    continue;
            }

            for (const item of items) {
                results.push({ server, item });
            }
        }

        return results;
    }

    /**
     * Valida si un elemento existe en el catálogo
     * @param catalog Catálogo de servidores
     * @param serverName Nombre del servidor
     * @param type Tipo de elemento
     * @param itemName Nombre del elemento
     * @returns true si el elemento existe y el servidor está conectado
     */
    static validateItem(
        catalog: MCPCatalogServer[],
        serverName: string,
        type: MCPItemType,
        itemName: string
    ): boolean {
        const server = catalog.find(s => s.serverName === serverName);
        if (!server || !server.isConnected) return false;

        let items: (MCPTool | MCPResource | MCPPresetPrompt)[];
        
        switch (type) {
            case 'tool':
                items = server.tools;
                break;
            case 'resource':
                items = server.resources;
                break;
            case 'prompt':
                items = server.prompts;
                break;
            default:
                return false;
        }

        return items.some(item => item.name === itemName);
    }

    /**
     * Obtiene estadísticas completas del catálogo incluyendo presets
     * @returns Estadísticas del catálogo en formato para la API
     */
    static async getCatalogStats(): Promise<MCPCatalogStats & { totalPresets: number }> {
        try {
            // Obtener estadísticas del catálogo MCP
            const catalogResponse = await this.fetchCatalog();
            
            if (!catalogResponse || !catalogResponse.success) {
                return {
                    totalServers: 0,
                    connectedServers: 0,
                    disconnectedServers: 0,
                    totalTools: 0,
                    totalResources: 0,
                    totalPrompts: 0,
                    totalItems: 0,
                    totalPresets: 0
                };
            }

            const catalogStats = this.getBasicCatalogStats(catalogResponse.catalog);

            // Obtener estadísticas de presets
            let totalPresets = 0;
            try {
                const { PresetDataService } = require('./PresetDataService');
                const presets = await PresetDataService.fetchPresets();
                totalPresets = Array.isArray(presets) ? presets.length : 0;
            } catch (error) {
                Logger.w(`Warning: Could not fetch presets for stats: ${error}`);
            }

            return {
                ...catalogStats,
                totalPresets
            };

        } catch (error) {
            Logger.e(`Error getting catalog stats: ${error}`);
            return {
                totalServers: 0,
                connectedServers: 0,
                disconnectedServers: 0,
                totalTools: 0,
                totalResources: 0,
                totalPrompts: 0,
                totalItems: 0,
                totalPresets: 0
            };
        }
    }

    /**
     * Refresca el catálogo desde el servidor MCP
     * @returns Resultado de la operación de refresh
     */
    static async refreshCatalog(): Promise<{ success: boolean; message?: string; stats?: any }> {
        try {
            Logger.info('🔄 Refreshing MCP catalog...');
            
            // Hacer la llamada para refrescar el catálogo
            const refreshUrl = `${MCP_MODEL_SDK_SERVER}/ai/ui/mcp/refresh`;
            const refreshResponse = await fetch(refreshUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(res => res.json());

            // Si hay un endpoint específico de refresh, sino simplemente re-fetch
            if (refreshResponse && refreshResponse.success !== false) {
                Logger.info('✅ Catalog refresh requested successfully');
                
                // Obtener nuevas estadísticas
                const newStats = await this.getCatalogStats();
                
                return {
                    success: true,
                    message: 'Catalog refreshed successfully',
                    stats: newStats
                };
            } else {
                // Fallback: simplemente hacer un nuevo fetch del catálogo
                Logger.info('ℹ️ No specific refresh endpoint, performing catalog re-fetch');
                const catalogResponse = await this.fetchCatalog();
                
                if (catalogResponse && catalogResponse.success) {
                    const newStats = await this.getCatalogStats();
                    return {
                        success: true,
                        message: 'Catalog re-fetched successfully',
                        stats: newStats
                    };
                } else {
                    throw new Error('Failed to re-fetch catalog');
                }
            }
            
        } catch (error) {
            Logger.e(`❌ Error refreshing catalog: ${error}`);
            return {
                success: false,
                message: error instanceof Error ? error.message : String(error)
            };
        }
    }
}