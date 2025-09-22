import express from 'express';
import path from 'path';
import { Logger } from '../Logger';
import { MCPCatalogResponse, MCPPresetsListResponse, MCP_MODEL_SDK_SERVER, MCPPresetSavePayload, MCPPresetSaveResponse } from '@/typescript/mcp-catalog-driver';
import { fetchJsonTyped } from '@/typescript/fetch-typed-json';

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
        this.app.get('/ai', async (req, res) => {
            const { aiView } = require('./views/ai_view');
            // Prefetch MCP catalog and presets from backend (CORS enabled)
            let mcpCatalog: MCPCatalogResponse | null = null;
            let mcpPresets: MCPPresetsListResponse | null = null;
            const flash = (req.query && typeof (req.query as any).flash === 'string') ? (req.query as any).flash : '';
            const debug = (() => {
                const v = (req.query && (req.query as any).debug);
                if (v === undefined || v === null) return false;
                if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
                if (Array.isArray(v)) {
                    const s = String(v[0] ?? '').toLowerCase();
                    return s === '1' || s === 'true' || s === 'yes';
                }
                return Boolean(v);
            })();
            try {
                const [catRes, preRes] = await Promise.all([
                    fetchJsonTyped<MCPCatalogResponse>(`${MCP_MODEL_SDK_SERVER}/ai/ui/mcp/list`),
                    fetchJsonTyped<MCPPresetsListResponse>(`${MCP_MODEL_SDK_SERVER}/ai/ui/mcp/presets`),
                ]);
                mcpCatalog = catRes;
                mcpPresets = preRes;
                Logger.info(`Fetched MCP data: catalog servers=${mcpCatalog?.catalog?.length || 0}, presets=${mcpPresets?.presets?.length || 0}`);
            } catch (e) {
                Logger.e(`Error prefetching MCP data: ${e}`);
            }
            res.send(aiView([], '', { mcpCatalog, mcpPresets, flash, debug }));
        });

        // Proxy para guardar preset MCP desde el formulario de la UI
        this.app.post('/ai/ui/mcp/set', async (req, res) => {
            try {
                const bodyAny: any = req.body || {};

                console.log("Received /ai/ui/mcp/set", req.body)

                const wantsJson = String(req.headers['accept'] || '').includes('application/json') || req.is('application/json');
                const presetNameRaw = bodyAny.presetName;
                let selectedItems: MCPPresetSavePayload['selectedItems'] = [];
                if (Array.isArray(bodyAny.selectedItems)) {
                    if (bodyAny.selectedItems.length > 0 && typeof bodyAny.selectedItems[0] === 'string') {
                        // Array of strings like "server|type|name"
                        selectedItems = bodyAny.selectedItems.map((v: string) => {
                            const [serverName, type, name] = String(v).split('|');
                            const t = (type === 'tool' || type === 'resource' || type === 'prompt') ? type : 'tool';
                            return { serverName, type: t, name };
                        });
                    } else {
                        // JSON shape directly provided by client
                        selectedItems = bodyAny.selectedItems
                            .filter((it: any) => it && typeof it.serverName === 'string' && typeof it.name === 'string' && typeof it.type === 'string')
                            .map((it: any) => ({
                                serverName: String(it.serverName),
                                name: String(it.name),
                                type: (it.type === 'tool' || it.type === 'resource' || it.type === 'prompt') ? it.type : 'tool',
                            }));
                    }
                } else {
                    // Form-encoded shape from checkboxes: selected[]
                    const rawSelected = bodyAny.selected ?? bodyAny['selected[]'];
                    const arr: string[] = Array.isArray(rawSelected)
                        ? rawSelected
                        : (typeof rawSelected === 'string' ? [rawSelected] : []);
                    selectedItems = arr.map((v: string) => {
                        const [serverName, type, name] = String(v).split('|');
                        const t = (type === 'tool' || type === 'resource' || type === 'prompt') ? type : 'tool';
                        return { serverName, type: t, name };
                    });
                }

                const payload: MCPPresetSavePayload = {
                    presetName: (presetNameRaw && String(presetNameRaw).trim()) || `mcp-preset-${new Date().toISOString()}`,
                    selectedItems,
                };

                Logger.info(`[UI] /ai/ui/mcp/set received. presetName="${payload.presetName}", selectedItems=${selectedItems.length}`);
                if (selectedItems.length === 0) {
                    const flash = 'No hay elementos seleccionados para guardar';
                    Logger.info(`[UI] Skipping upstream call: ${flash}`);
                    return res.redirect(`/ai?flash=${encodeURIComponent(flash)}`);
                }

                const url = `${MCP_MODEL_SDK_SERVER}/ai/ui/mcp/set`;
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);
                Logger.info(`[UI] Proxying preset save -> ${url}`);
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                }).finally(() => clearTimeout(timeout));
                Logger.info(`[UI] Upstream response status: ${resp.status}`);
                const data = await resp.json().catch(() => ({} as MCPPresetSaveResponse)) as MCPPresetSaveResponse;

                if (wantsJson) {
                    return res.status(resp.status).json(data);
                }

                const flash = data && data.success
                    ? `Preset ${data?.preset?.name || payload.presetName} guardado (${data?.preset?.itemsCount?.total ?? selectedItems.length} elementos)`
                    : String(data?.details || data?.error || `Error guardando preset (status ${resp.status})`);

                res.redirect(`/ai?flash=${encodeURIComponent(flash)}`);
                
            } catch (error: any) {
                Logger.e(`Error proxy MCP preset save: ${error?.message || error}`);
                const wantsJson = String(req.headers['accept'] || '').includes('application/json') || req.is('application/json');
                if (wantsJson) {
                    return res.status(500).json({ success: false, error: 'Error guardando preset', details: String(error?.message || error) });
                }
                res.redirect(`/ai?flash=${encodeURIComponent('Error guardando preset')}`);
            }
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
            Logger.info(`Received theme change request: ${theme}`);
            try {
                const { ThemeController } = require('./controllers/ThemeController');
                const themeController = ThemeController.getInstance();
                const success = themeController.updateTheme(theme);
                if (success) {
                    Logger.info(`Theme successfully changed to: ${theme}`);
                } else {
                    Logger.e(`Failed to change theme to: ${theme}`);
                }
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
