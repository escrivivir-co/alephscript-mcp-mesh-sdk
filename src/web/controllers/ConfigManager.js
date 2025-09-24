const fs = require('fs');
const path = require('path');

// Import Logger from the compiled version or fallback
let Logger;
try {
    Logger = require('../../../dist/mcp-mesh-sdk/src/Logger.js').Logger;
} catch (error) {
    // Fallback logger
    Logger = {
        info: (msg) => console.log(`[INFO] ${msg}`),
        e: (msg) => console.error(`[ERROR] ${msg}`)
    };
}

class ConfigManager {
    constructor() {
        if (ConfigManager.instance) {
            return ConfigManager.instance;
        }
        
        this.configPath = path.join(__dirname, '../configs/mesh-config.json');
        this.config = this.loadConfig();
        ConfigManager.instance = this;
    }

    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    getDefaultConfig() {
        return {
            themes: {
                current: 'Orange-Dark-MCP'
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

    loadConfig() {
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

    ensureConfigDirectory() {
        const configDir = path.dirname(this.configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
    }

    getConfig() {
        return { ...this.config };
    }

    saveConfig(newConfig) {
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

    updateConfig(updates) {
        try {
            const newConfig = { ...this.config, ...updates };
            return this.saveConfig(newConfig);
        } catch (error) {
            Logger.e(`Error updating config: ${error}`);
            return false;
        }
    }
}

module.exports = { ConfigManager };