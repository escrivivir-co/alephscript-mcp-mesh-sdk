/**
 * Configuración del servidor UI
 */
export interface ServerConfig {
    port: number;
    staticPath: string;
    viewsPath: string;
}

export const defaultServerConfig: ServerConfig = {
    port: 3011,
    staticPath: '/assets',
    viewsPath: '../views'
};

export function getServerConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
    return {
        ...defaultServerConfig,
        ...overrides
    };
}