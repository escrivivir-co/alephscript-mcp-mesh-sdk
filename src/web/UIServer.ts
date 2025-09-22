import express from 'express';
import path from 'path';
import { Logger } from '../Logger';

export class UIServer {
    private app: express.Application;
    private server: any;
    private port: number;
    private serverStartTime: number;

    constructor(port: number = 3011) {
        this.app = express();
        this.port = port;
        this.serverStartTime = Date.now();
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        // Middleware básico
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // Servir archivos estáticos (CSS, JS, imágenes)
        this.app.use('/assets', express.static(path.join(__dirname, 'assets')));
    }

    private setupRoutes(): void {
        // Ruta principal
        this.app.get('/', (req, res) => {
            res.redirect('/ui');
        });

        // Ruta de la interfaz principal
        this.app.get('/ui', (req, res) => {
            const { mainView } = require('./views/main_views');
            res.send(mainView());
        });

        // Ruta de la vista AI (portada de mpc_oasis-sdk)
        this.app.get('/ai', (req, res) => {
            const { aiView } = require('./views/ai_view');
            res.send(aiView());
        });

        // POST para procesar input de AI
        this.app.post('/ai', (req, res) => {
            const { input } = req.body;
            // Aquí se procesaría la entrada de AI
            // Por ahora, simplemente redirigimos de vuelta
            Logger.info(`AI Input received: ${input}`);
            res.redirect('/ai');
        });

        // Ruta para limpiar historial de AI
        this.app.post('/ai/clear', (req, res) => {
            try {
                const { clearAIHistory } = require('./controllers/AIController');
                clearAIHistory();
                Logger.info('AI history cleared');
            } catch (error) {
                Logger.e(`Error clearing AI history: ${error}`);
            }
            res.redirect('/ai');
        });

        // Ruta para aprobar entrada de entrenamiento
        this.app.post('/ai/approve/:id', (req, res) => {
            try {
                const { approveAIEntry } = require('./controllers/AIController');
                const { id } = req.params;
                approveAIEntry(parseInt(id));
                Logger.info(`AI entry ${id} approved for training`);
                res.json({ success: true });
            } catch (error) {
                Logger.e(`Error approving AI entry: ${error}`);
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Ruta para rechazar entrada de entrenamiento
        this.app.post('/ai/reject/:id', (req, res) => {
            try {
                const { rejectAIEntry } = require('./controllers/AIController');
                const { id } = req.params;
                rejectAIEntry(parseInt(id));
                Logger.info(`AI entry ${id} rejected for training`);
                res.json({ success: true });
            } catch (error) {
                Logger.e(`Error rejecting AI entry: ${error}`);
                res.status(500).json({ success: false, error: String(error) });
            }
        });

        // Ruta para cambiar tema
        this.app.post('/settings/theme', (req, res) => {
            const { theme } = req.body;
            try {
                const { updateTheme } = require('./controllers/ThemeController');
                updateTheme(theme);
                Logger.info(`Theme changed to: ${theme}`);
            } catch (error) {
                Logger.e(`Error updating theme: ${error}`);
            }
            res.redirect(req.get('Referer') || '/ui');
        });

        // Ruta de configuración/settings
        this.app.get('/settings', (req, res) => {
            const { settingsView } = require('./views/settings_view');
            res.send(settingsView());
        });

        // API endpoint para obtener información del servidor
        this.app.get('/api/status', (req, res) => {
            res.json({
                status: 'running',
                timestamp: new Date().toISOString(),
                server: 'MCP Mesh SDK UI Server'
            });
        });

        // API para obtener configuración
        this.app.get('/api/config', (req, res) => {
            try {
                const { getCurrentTheme } = require('./controllers/ThemeController');
                res.json({
                    currentTheme: getCurrentTheme()
                });
            } catch (error) {
                Logger.e(`Error getting config: ${error}`);
                res.json({
                    currentTheme: 'Dark-MCP'
                });
            }
        });

        // Ruta de estadísticas
        this.app.get('/stats', (req, res) => {
            try {
                const { statsView } = require('./views/stats_view');
                const { AIController } = require('./controllers/AIController');
                const aiController = AIController.getInstance();
                const aiHistory = aiController.getHistory();
                const html = statsView(aiHistory, this.serverStartTime);
                res.send(html);
            } catch (error) {
                Logger.e(`Error loading stats view: ${error}`);
                res.status(500).send('Error loading statistics');
            }
        });

        // Manejo de 404
        this.app.use((req, res) => {
            const { notFoundView } = require('./views/error_views');
            res.status(404).send(notFoundView());
        });
    }

    public start(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, () => {
                    Logger.info(`MCP Mesh SDK UI Server running on http://localhost:${this.port}`);
                    Logger.info(`Main interface available at: http://localhost:${this.port}/ui`);
                    resolve();
                });

                this.server.on('error', (err: Error) => {
                    Logger.e(`Server error: ${err.message}`);
                    reject(err);
                });
            } catch (error) {
                Logger.e(`Failed to start server: ${error}`);
                reject(error);
            }
        });
    }

    public stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    Logger.info('UI Server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    public getPort(): number {
        return this.port;
    }

    public getApp(): express.Application {
        return this.app;
    }
}
