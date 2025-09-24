import { Logger } from '@/Logger';
import express from 'express';

/**
 * Rutas para manejo de presets MCP
 */
export function setupPresetRoutes(app: express.Application): void {
    // Proxy para obtener un preset específico
    app.get('/ai/ui/mcp/preset/:name', async (req, res) => {
        const { name } = req.params;
        const { PresetDataService } = require('../../services/PresetDataService');
        const data = await PresetDataService.fetchPreset(name);
        if (data === null) {
            return res.status(500).json({ success: false, error: 'Failed to fetch preset' });
        }
        return res.json(data);
    });

    // Proxy para listar presets MCP
    app.get('/ai/ui/mcp/presets', async (_req, res) => {
        try {
            const { PresetDataService } = require('../../services/PresetDataService');
            const mcpPresets = await PresetDataService.fetchPresets();
            if (!mcpPresets) {
                return res.status(200).json({ presets: [] });
            }
            return res.json(mcpPresets);
        } catch (error) {
            Logger.e(`Error proxying MCP presets list: ${error}`);
            return res.status(200).json({ presets: [] });
        }
    });

    // Proxy para guardar preset MCP desde el formulario de la UI
    app.post('/ai/ui/mcp/set', async (req, res): Promise<void> => {
        try {
            const { PresetDataService } = require('../../services/PresetDataService');
            
            const {
                presetName,
                presetDescription,
                selectedItems
            } = req.body;

            if (!presetName || typeof presetName !== 'string') {
                res.status(400).json({ 
                    success: false, 
                    error: 'presetName is required and must be a string' 
                });
                return;
            }

            if (!selectedItems || !Array.isArray(selectedItems)) {
                res.status(400).json({ 
                    success: false, 
                    error: 'selectedItems is required and must be an array' 
                });
                return;
            }

            // Parsear los elementos seleccionados si vienen como strings del formulario
            const parsedItems = Array.isArray(selectedItems) && typeof selectedItems[0] === 'string'
                ? PresetDataService.parseSelectedItems(selectedItems)
                : selectedItems;

            const presetData = {
                name: presetName,
                description: presetDescription || '',
                selectedItems: parsedItems
            };

            const result = await PresetDataService.createPreset(presetData);
            
            if (result && result.success) {
                Logger.info(`✅ Preset "${presetName}" saved successfully`);
                res.json({ success: true, message: `Preset "${presetName}" saved successfully` });
            } else {
                Logger.e(`❌ Failed to save preset "${presetName}":`, result?.error);
                res.status(500).json({ 
                    success: false, 
                    error: `Failed to save preset: ${result?.error || 'Unknown error'}` 
                });
            }
        } catch (error: any) {
            Logger.e('Error in /ai/ui/mcp/set:', error);
            res.status(500).json({ 
                success: false, 
                error: `Server error: ${error.message}` 
            });
        }
    });
}