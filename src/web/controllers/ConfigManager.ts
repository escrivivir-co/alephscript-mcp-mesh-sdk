import fs from 'fs';
import path from 'path';
import { Logger } from '../../Logger';

export interface MCPMeshConfig {
    themes: {
        current: string;
    };
    server: {
        port: number;
        host: string;
    };
    features: {
        aiEnabled: boolean;
        themeSwitcher: boolean;
    };
}

export class ConfigManager {
    private static instance: ConfigManager;
    private configPath: string;
    private config: MCPMeshConfig;

    private constructor() {
        this.configPath = path.join(__dirname, '../configs/mesh-config.json');
        this.config = this.loadConfig();
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    private getDefaultConfig(): MCPMeshConfig {
        return {
            themes: {
                current: 'Dark-MCP'
            },
            server: {
                port: 3010,
                host: 'localhost'
            },
            features: {
                aiEnabled: true,
                themeSwitcher: true
            }
        };
    }

    private loadConfig(): MCPMeshConfig {
        try {
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                const parsedConfig = JSON.parse(configData);
                return { ...this.getDefaultConfig(), ...parsedConfig };
            } else {
                // Create default config file
                const defaultConfig = this.getDefaultConfig();
                this.ensureConfigDirectory();
                fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
                Logger.info(`Created default config at: ${this.configPath}`);
                return defaultConfig;
            }
        } catch (error) {
            Logger.e(`Error loading config: ${error}`);
            return this.getDefaultConfig();
        }
    }

    private ensureConfigDirectory(): void {
        const configDir = path.dirname(this.configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
    }

    public getConfig(): MCPMeshConfig {
        return { ...this.config };
    }

    public saveConfig(newConfig: MCPMeshConfig): boolean {
        try {
            this.ensureConfigDirectory();
            fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 2));
            this.config = { ...newConfig };
            Logger.info(`Config saved to: ${this.configPath}`);
            return true;
        } catch (error) {
            Logger.e(`Error saving config: ${error}`);
            return false;
        }
    }

    public updateConfig(updates: Partial<MCPMeshConfig>): boolean {
        try {
            const newConfig = { ...this.config, ...updates };
            return this.saveConfig(newConfig);
        } catch (error) {
            Logger.e(`Error updating config: ${error}`);
            return false;
        }
    }
}