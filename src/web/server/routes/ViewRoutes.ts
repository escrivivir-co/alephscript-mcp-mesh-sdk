import express from 'express';

/**
 * Rutas principales de vistas
 */
export function setupViewRoutes(app: express.Application): void {
    // Ruta principal
    app.get('/', (req, res) => {
        res.redirect('/ui');
    });

    // Ruta de la interfaz principal
    app.get('/ui', (req, res) => {
        const { mainView } = require('../../views/main_views');
        res.send(mainView());
    });

    // Ruta de la vista AI (con historial y presets)
    app.get('/ai', async (req, res) => {
        const { aiView } = require('../../views/ai_view');
        const { PresetDataService } = require('../../services/PresetDataService');
        const { getAIHistory } = require('../../controllers/AIController');
        
        try {
            const mcpPresets = await PresetDataService.fetchPresets();
            const history = getAIHistory();
            const userPrompt = req.query.prompt || '';
            
            // Pass presets directly - helper will handle the format
            res.send(aiView(history, userPrompt, { mcpPresets }));
        } catch (error) {
            console.error('Error loading AI view:', error);
            const mcpPresets = await PresetDataService.fetchPresets();
            res.send(aiView([], '', { mcpPresets }));
        }
    });



    // ✅ NUEVA: Ruta independiente del explorador MCP
    app.get('/explorer', async (req, res) => {
        const { explorerView } = require('../../views/explorer_view');
        const { CatalogDataService } = require('../../services/CatalogDataService');
        const mcpCatalog = await CatalogDataService.fetchCatalog();
        res.send(explorerView({ mcpCatalog })); // Solo catálogo, sin presets
    });

    // ✅ NUEVA: Ruta independiente de gestión de presets
    app.get('/presets', async (req, res) => {
        const { presetsView } = require('../../views/presets_view');
        const { PresetDataService } = require('../../services/PresetDataService');
        const mcpPresets = await PresetDataService.fetchPresets();
        res.send(presetsView({ mcpPresets })); // Solo presets, sin catálogo
    });

    // Ruta de configuración/settings
    app.get('/settings', (req, res) => {
        const { settingsView } = require('../../views/settings_view');
        res.send(settingsView());
    });

    // Ruta de estadísticas
    app.get('/stats', (req, res) => {
        try {
            const { statsView } = require('../../views/stats_view');
            res.send(statsView());
        } catch (error) {
            console.error('Error loading stats view:', error);
            res.status(500).send('Error loading stats');
        }
    });

    // Manejo de 404
    app.use((req, res) => {
        const { notFoundView } = require('../../views/main_views');
        res.status(404).send(notFoundView());
    });
}