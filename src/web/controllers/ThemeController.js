const { ConfigManager } = require('./ConfigManager');

class ThemeController {
    constructor() {
        if (ThemeController.instance) {
            return ThemeController.instance;
        }
        this.configManager = ConfigManager.getInstance();
        ThemeController.instance = this;
    }

    static getInstance() {
        if (!ThemeController.instance) {
            ThemeController.instance = new ThemeController();
        }
        return ThemeController.instance;
    }

    getCurrentTheme() {
        return this.configManager.getConfig().themes.current || 'Orange-Dark-MCP';
    }

    getAvailableThemes() {
        return [
            'Dark-MCP',
            'Orange-Dark-MCP',
            'Matrix-MCP',
            'Purple-MCP',
            'Clear-MCP'
        ];
    }

    updateTheme(themeName) {
        if (!this.getAvailableThemes().includes(themeName)) {
            return false;
        }

        const config = this.configManager.getConfig();
        config.themes.current = themeName;
        this.configManager.saveConfig(config);
        return true;
    }
}

// Export functions for compatibility
function getCurrentTheme() {
    return ThemeController.getInstance().getCurrentTheme();
}

function getAvailableThemes() {
    return ThemeController.getInstance().getAvailableThemes();
}

function updateTheme(themeName) {
    return ThemeController.getInstance().updateTheme(themeName);
}

module.exports = {
    ThemeController,
    getCurrentTheme,
    getAvailableThemes,
    updateTheme
};