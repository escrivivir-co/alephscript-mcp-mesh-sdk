import express from 'express';

/**
 * Rutas de API del sistema
 */
export function setupApiRoutes(app: express.Application): void {
    // API endpoint para obtener información del servidor
    app.get('/api/status', (req, res) => {
        res.json({
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            server: 'MCP Mesh SDK UI Server',
            version: '1.0.0'
        });
    });

    // API para obtener configuración
    app.get('/api/config', (req, res) => {
        try {
            const { getCurrentTheme, getAvailableThemes } = require('../../controllers/ThemeController');
            const currentTheme = getCurrentTheme();
            const availableThemes = getAvailableThemes();
            
            res.json({
                currentTheme: currentTheme,
                availableThemes: availableThemes,
                theme: {
                    current: currentTheme,
                    available: availableThemes
                }
            });
        } catch (error) {
            console.error('Error in /api/config:', error);
            res.status(500).json({ 
                error: 'Failed to load configuration',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });

    // API endpoints for presets
    app.get('/api/presets', async (req, res) => {
        try {
            const { PresetDataService } = require('../../services/PresetDataService');
            const presets = await PresetDataService.fetchPresets();
            res.json(presets);
        } catch (error) {
            console.error('Error fetching presets:', error);
            res.status(500).json({
                error: 'Failed to fetch presets',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });

    app.get('/api/presets/:name', async (req, res) => {
        try {
            const { PresetDataService } = require('../../services/PresetDataService');
            const preset = await PresetDataService.getPresetByName(req.params.name);
            if (preset) {
                res.json(preset);
            } else {
                res.status(404).json({ error: 'Preset not found' });
            }
        } catch (error) {
            console.error('Error fetching preset:', error);
            res.status(500).json({
                error: 'Failed to fetch preset',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });

    app.post('/api/presets', async (req, res) => {
        try {
            const { PresetDataService } = require('../../services/PresetDataService');
            const { name, description, items } = req.body;
            
            if (!name || !items) {
                res.status(400).json({ error: 'Name and items are required' });
                return;
            }

            const result = await PresetDataService.createPreset({ name, description, items });
            res.json(result);
        } catch (error) {
            console.error('Error creating preset:', error);
            res.status(500).json({
                error: 'Failed to create preset',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });

    app.put('/api/presets/:name', async (req, res) => {
        try {
            const { PresetDataService } = require('../../services/PresetDataService');
            const { name } = req.params;
            const { description, items } = req.body;
            
            const result = await PresetDataService.updatePreset(name, { description, items });
            res.json(result);
        } catch (error) {
            console.error('Error updating preset:', error);
            res.status(500).json({
                error: 'Failed to update preset',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });

    app.delete('/api/presets/:name', async (req, res) => {
        try {
            const { PresetDataService } = require('../../services/PresetDataService');
            const result = await PresetDataService.deletePreset(req.params.name);
            res.json(result);
        } catch (error) {
            console.error('Error deleting preset:', error);
            res.status(500).json({
                error: 'Failed to delete preset',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });

    // API endpoint for MCP catalog
    app.get('/api/catalog', async (req, res) => {
        try {
            const { CatalogDataService } = require('../../services/CatalogDataService');
            const catalog = await CatalogDataService.fetchCatalog();
            res.json(catalog);
        } catch (error) {
            console.error('Error fetching catalog:', error);
            res.status(500).json({
                error: 'Failed to fetch catalog',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });

    // API endpoint for catalog statistics
    app.get('/api/catalog/stats', async (req, res) => {
        try {
            const { CatalogDataService } = require('../../services/CatalogDataService');
            const stats = await CatalogDataService.getCatalogStats();
            res.json(stats);
        } catch (error) {
            console.error('Error fetching catalog stats:', error);
            res.status(500).json({
                error: 'Failed to fetch catalog statistics',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });

    // API endpoint for refreshing catalog
    app.post('/api/catalog/refresh', async (req, res) => {
        try {
            const { CatalogDataService } = require('../../services/CatalogDataService');
            
            // Refresh catalog from MCP server
            const result = await CatalogDataService.refreshCatalog();
            
            res.json({
                success: true,
                message: 'Catalog refreshed successfully',
                timestamp: new Date().toISOString(),
                ...result
            });
        } catch (error) {
            console.error('Error refreshing catalog:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to refresh catalog',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });

    // API endpoint for MCP server statistics
    app.get('/api/mcp-stats', async (req, res) => {
        try {
            // Mock MCP stats - replace with actual MCP server status check
            const mcpStats = {
                totalServers: 2,
                connectedServers: 1,
                lastChecked: new Date().toISOString()
            };
            
            res.json(mcpStats);
        } catch (error) {
            console.error('Error fetching MCP stats:', error);
            res.status(500).json({
                error: 'Failed to fetch MCP statistics',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    });
}