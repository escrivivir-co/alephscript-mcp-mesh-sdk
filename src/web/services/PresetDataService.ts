import { 
    MCPPresetsListResponse,
    MCPPresetSavePayload,
    MCPPresetSaveResponse,
    MCPPresetSummary,
    MCPItemType,
    MCP_MODEL_SDK_SERVER 
} from '@/typescript/mcp-catalog-driver';
import { fetchJsonTyped } from '@/typescript/fetch-typed-json';
import { Logger } from '@/Logger';
import { 
    MCPSelectedItem,
    MCPPresetDetail,
    MCPPresetUIResponse,
    MCPPresetUIPayload,
    MCPPresetStats,
    MCPSelectedItemFormValue
} from '../types';

/**
 * PresetDataService - Servicio especializado para la gestión de presets MCP
 * Responsabilidad: CRUD de presets que utilizan elementos del catálogo MCP
 */
export class PresetDataService {
    private static readonly API_BASE = `${MCP_MODEL_SDK_SERVER}/ai/ui/mcp`;

    /**
     * Obtiene la lista completa de presets (summaries)
     * @returns Lista de presets directamente como array
     */
    static async fetchPresets(): Promise<MCPPresetSummary[]> {
        try {
            const response = await fetchJsonTyped<MCPPresetsListResponse>(`${this.API_BASE}/presets`);
            
            if (response && response.presets && Array.isArray(response.presets)) {
                Logger.info(`✅ Fetched presets: ${response.presets.length} presets`);
                return response.presets;
            } else {
                Logger.w('⚠️ Invalid presets response format');
                return [];
            }
        } catch (error) {
            Logger.e(`❌ Error fetching presets: ${error}`);
            return [];
        }
    }

    /**
     * Obtiene un preset específico por nombre
     * @param name Nombre del preset
     * @returns Preset completo o null en caso de error
     */
    static async fetchPreset(name: string): Promise<MCPPresetUIResponse | null> {
        try {
            const url = `${this.API_BASE}/preset/${encodeURIComponent(name)}`;
            Logger.info(`🔍 Fetching preset: ${name}`);
            
            const response = await fetchJsonTyped<MCPPresetUIResponse>(url);
            
            if (response && response.success && response.preset) {
                Logger.info(`✅ Preset '${name}' loaded: ${response.preset.itemsCount.total} items`);
                return response;
            } else {
                Logger.e(`❌ Failed to fetch preset '${name}': ${response?.error || 'Invalid response'}`);
                return null;
            }
        } catch (error) {
            Logger.e(`❌ Error fetching preset '${name}': ${error}`);
            return null;
        }
    }

    /**
     * Crea un nuevo preset
     * @param presetData Datos del nuevo preset
     * @returns Respuesta del servidor
     */
    static async createPreset(presetData: MCPPresetUIPayload): Promise<MCPPresetSaveResponse | null> {
        try {
            const validatedData = this.validatePresetData(presetData);
            const payload: MCPPresetSavePayload = {
                presetName: validatedData.name,
                selectedItems: validatedData.selectedItems.map(item => ({
                    serverName: item.server,
                    type: item.type,
                    name: item.name
                }))
            };

            Logger.info(`💾 Creating preset '${validatedData.name}' with ${validatedData.selectedItems.length} items`);

            const response = await fetch(`${this.API_BASE}/set`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                Logger.e(`❌ Failed to create preset '${validatedData.name}': HTTP ${response.status}`);
                return { success: false, error: errorData.error || `HTTP ${response.status}` };
            }

            const result = await response.json() as MCPPresetSaveResponse;
            
            if (result.success) {
                Logger.info(`✅ Preset '${validatedData.name}' created successfully`);
            } else {
                Logger.e(`❌ Failed to create preset '${validatedData.name}': ${result.error}`);
            }

            return result;
        } catch (error) {
            Logger.e(`❌ Error creating preset: ${error}`);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }

    /**
     * Actualiza un preset existente
     * @param name Nombre del preset a actualizar
     * @param presetData Nuevos datos del preset
     * @returns Respuesta del servidor
     */
    static async updatePreset(name: string, presetData: Partial<MCPPresetUIPayload>): Promise<MCPPresetSaveResponse | null> {
        try {
            // Para actualizaciones, primero obtenemos el preset actual
            const currentPreset = await this.fetchPreset(name);
            if (!currentPreset || !currentPreset.preset) {
                return { success: false, error: `Preset '${name}' not found` };
            }

            // Mezclamos los datos actuales con los nuevos
            const updatedData = {
                name: presetData.name || currentPreset.preset.name,
                description: presetData.description || '',
                selectedItems: presetData.selectedItems || currentPreset.preset.items
            };

            // Reutilizamos la lógica de creación
            return await this.createPreset(updatedData);
        } catch (error) {
            Logger.e(`❌ Error updating preset '${name}': ${error}`);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }

    /**
     * Elimina un preset
     * @param name Nombre del preset a eliminar
     * @returns true si se eliminó correctamente
     */
    static async deletePreset(name: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.API_BASE}/preset/${encodeURIComponent(name)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                Logger.info(`✅ Preset '${name}' deleted successfully`);
                return true;
            } else {
                Logger.e(`❌ Failed to delete preset '${name}': HTTP ${response.status}`);
                return false;
            }
        } catch (error) {
            Logger.e(`❌ Error deleting preset '${name}': ${error}`);
            return false;
        }
    }

    /**
     * Valida los datos de un preset antes de enviarlos
     * @param presetData Datos a validar
     * @returns Datos validados y limpios
     */
    static validatePresetData(presetData: MCPPresetUIPayload): Required<MCPPresetUIPayload> & { description: string } {
        const cleaned = {
            name: String(presetData.name || '').trim(),
            description: String(presetData.description || '').trim(),
            selectedItems: Array.isArray(presetData.selectedItems) ? presetData.selectedItems : []
        };

        if (!cleaned.name) {
            throw new Error('El nombre del preset es requerido');
        }

        if (cleaned.name.length > 100) {
            throw new Error('El nombre del preset es demasiado largo (máximo 100 caracteres)');
        }

        if (cleaned.description.length > 500) {
            throw new Error('La descripción es demasiado larga (máximo 500 caracteres)');
        }

        if (cleaned.selectedItems.length === 0) {
            throw new Error('Debe seleccionar al menos un elemento para el preset');
        }

        // Validar formato de elementos seleccionados
        for (const item of cleaned.selectedItems) {
            if (!item.server || !item.type || !item.name) {
                throw new Error(`Elemento inválido en el preset: ${JSON.stringify(item)}`);
            }
            
            if (!['tool', 'resource', 'prompt'].includes(item.type)) {
                throw new Error(`Tipo de elemento inválido: ${item.type}`);
            }
        }

        return cleaned;
    }

    /**
     * Parsea items seleccionados desde el formato string del formulario
     * @param selectedFormValues Array de strings en formato "server|type|name"
     * @returns Array de MCPSelectedItem parseados
     */
    static parseSelectedItems(selectedFormValues: MCPSelectedItemFormValue[]): MCPSelectedItem[] {
        return selectedFormValues
            .map(value => {
                const parts = value.split('|');
                if (parts.length !== 3) {
                    Logger.w(`⚠️ Invalid selected item format: ${value}`);
                    return null;
                }
                
                const [server, type, name] = parts;
                
                if (!['tool', 'resource', 'prompt'].includes(type)) {
                    Logger.w(`⚠️ Invalid item type: ${type}`);
                    return null;
                }

                return {
                    server,
                    type: type as MCPItemType,
                    name
                };
            })
            .filter((item): item is MCPSelectedItem => item !== null);
    }

    /**
     * Convierte items seleccionados al formato string para formularios
     * @param selectedItems Array de MCPSelectedItem
     * @returns Array de strings en formato "server|type|name"
     */
    static formatSelectedItems(selectedItems: MCPSelectedItem[]): MCPSelectedItemFormValue[] {
        return selectedItems.map(item => `${item.server}|${item.type}|${item.name}`);
    }

    /**
     * Obtiene estadísticas de un preset
     * @param selectedItems Items del preset
     * @returns Estadísticas del preset
     */
    static getPresetStats(selectedItems: MCPSelectedItem[]): MCPPresetStats {
        const stats = {
            tools: 0,
            resources: 0,
            prompts: 0,
            total: selectedItems.length,
            servers: new Set<string>()
        };

        for (const item of selectedItems) {
            stats.servers.add(item.server);
            
            switch (item.type) {
                case 'tool':
                    stats.tools++;
                    break;
                case 'resource':
                    stats.resources++;
                    break;
                case 'prompt':
                    stats.prompts++;
                    break;
            }
        }

        return {
            tools: stats.tools,
            resources: stats.resources,
            prompts: stats.prompts,
            total: stats.total,
            serversCount: stats.servers.size,
            servers: Array.from(stats.servers)
        };
    }
}