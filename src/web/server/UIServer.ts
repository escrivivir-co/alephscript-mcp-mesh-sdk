import express from 'express';
import { setupMiddleware } from './middleware';
import { setupViewRoutes } from './routes/ViewRoutes';
import { setupPresetRoutes } from './routes/PresetRoutes';
import { setupApiRoutes } from './routes/ApiRoutes';
import { setupSettingsRoutes } from './routes/SettingsRoutes';
import { ServerConfig, getServerConfig } from './config/ServerConfig';

/**
 * UIServer refactorizado - Arquitectura modular
 * Separación clara de responsabilidades entre middleware, rutas y configuración
 */
export class UIServer {
    private app: express.Application;
    private server: any;
    private config: ServerConfig;
    private serverStartTime: number;

    constructor(config: Partial<ServerConfig> = {}) {
        this.app = express();
        this.config = getServerConfig(config);
        this.serverStartTime = Date.now();
        
        this.initialize();
    }

    /**
     * Inicialización completa del servidor
     */
    private initialize(): void {
        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * Configurar middleware usando módulos separados
     */
    private setupMiddleware(): void {
        setupMiddleware(this.app);
    }

    /**
     * Configurar todas las rutas usando módulos separados
     * ORDEN IMPORTANTE: APIs primero, luego views, settings al final, 404 handler al último
     */
    private setupRoutes(): void {
        // APIs primero (deben ir antes del 404 handler)
        setupApiRoutes(this.app);
        
        // Rutas de configuración/acciones
        setupPresetRoutes(this.app);
        setupSettingsRoutes(this.app);
        
        // Vistas (incluye el 404 handler al final)
        setupViewRoutes(this.app);
    }

    /**
     * Iniciar el servidor
     */
    public start(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.config.port, () => {
                    console.log(`🚀 MCP Mesh SDK UI Server running at http://localhost:${this.config.port}`);
                    console.log(`📁 Static files served from: ${this.config.staticPath}`);
                    console.log(`📄 Views path: ${this.config.viewsPath}`);
                    resolve();
                });
                
                this.server.on('error', (error: any) => {
                    console.error('❌ Server error:', error);
                    reject(error);
                });
            } catch (error) {
                console.error('❌ Failed to start server:', error);
                reject(error);
            }
        });
    }

    /**
     * Detener el servidor
     */
    public stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('🛑 UI Server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Obtener puerto configurado
     */
    public getPort(): number {
        return this.config.port;
    }

    /**
     * Obtener instancia de Express app
     */
    public getApp(): express.Application {
        return this.app;
    }

    /**
     * Obtener configuración del servidor
     */
    public getConfig(): ServerConfig {
        return { ...this.config };
    }

    /**
     * Obtener tiempo de inicio del servidor
     */
    public getUptime(): number {
        return Date.now() - this.serverStartTime;
    }
}