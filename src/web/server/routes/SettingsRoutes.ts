import express from 'express';

/**
 * Rutas para manejo de configuración y settings
 */
export function setupSettingsRoutes(app: express.Application): void {
    // POST para procesar input de AI
    app.post('/ai', (req, res) => {
        const { input, selectedItems } = req.body;
        console.log("AI payload received:", req.body);
        
        try {
            const { addAIEntry } = require('../../controllers/AIController');
            
            // Parse selected items (presets)
            let parsedSelectedItems = [];
            if (selectedItems) {
                try {
                    parsedSelectedItems = typeof selectedItems === 'string' ? JSON.parse(selectedItems) : selectedItems;
                } catch (parseError) {
                    console.warn('Could not parse selectedItems:', selectedItems);
                }
            }
            
            // Create context message for selected presets
            let contextMessage = input;
            if (parsedSelectedItems.length > 0) {
                contextMessage = `${input}\n\n[Context: Using presets - ${parsedSelectedItems.join(', ')}]`;
            }
            
            // Add entry to history with proper context
            const entry = addAIEntry(contextMessage);
            console.log('AI entry added:', entry);
            
            // Redirect back to AI view with updated history
            res.redirect('/ai?prompt=' + encodeURIComponent(input));
        } catch (error) {
            console.error('Error processing AI input:', error);
            res.redirect('/ai');
        }
    });

    // Ruta para limpiar historial de AI
    app.post('/ai/clear', (req, res) => {
        try {
            const { clearAIHistory } = require('../../controllers/AIController');
            const success = clearAIHistory();
            console.log('AI history cleared:', success);
        } catch (error) {
            console.error('Error clearing AI history:', error);
        }
        res.redirect('/ai');
    });

    // Ruta para aprobar entrada de entrenamiento
    app.post('/ai/approve/:id', (req, res) => {
        try {
            const { approveAIEntry } = require('../../controllers/AIController');
            const { id } = req.params;
            const success = approveAIEntry(parseInt(id));
            console.log(`Training entry ${id} approved:`, success);
            res.json({ success, message: `Entry ${id} ${success ? 'approved' : 'not found'}` });
        } catch (error) {
            console.error('Error approving training entry:', error);
            res.status(500).json({ success: false, error: 'Failed to approve entry' });
        }
    });

    // Ruta para rechazar entrada de entrenamiento
    app.post('/ai/reject/:id', (req, res) => {
        try {
            const { rejectAIEntry } = require('../../controllers/AIController');
            const { id } = req.params;
            const success = rejectAIEntry(parseInt(id));
            console.log(`Training entry ${id} rejected:`, success);
            res.json({ success, message: `Entry ${id} ${success ? 'rejected' : 'not found'}` });
        } catch (error) {
            console.error('Error rejecting training entry:', error);
            res.status(500).json({ success: false, error: 'Failed to reject entry' });
        }
    });

    // Ruta para cambiar tema
    app.post('/settings/theme', (req, res) => {
        const { theme } = req.body;
        console.log(`Received theme change request: ${theme}`);
        try {
            const { updateTheme } = require('../../controllers/ThemeController');
            const success = updateTheme(theme);
            console.log(`Theme changed to: ${theme}`, success ? 'success' : 'failed');
            
            // Return JSON response for AJAX calls
            if (req.get('Content-Type') === 'application/json' || req.get('Accept')?.includes('application/json')) {
                res.json({ success, theme, message: success ? 'Theme updated successfully' : 'Failed to update theme' });
            } else {
                res.redirect(req.get('Referer') || '/ui');
            }
        } catch (error) {
            console.error('Error setting theme:', error);
            if (req.get('Content-Type') === 'application/json' || req.get('Accept')?.includes('application/json')) {
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to update theme', 
                    details: error instanceof Error ? error.message : String(error)
                });
            } else {
                res.redirect(req.get('Referer') || '/ui');
            }
        }
    });
}