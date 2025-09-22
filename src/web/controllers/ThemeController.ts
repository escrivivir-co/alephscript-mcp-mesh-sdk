import { ConfigManager } from './ConfigManager';

export class ThemeController {
    private static instance: ThemeController;
    private configManager: ConfigManager;

    private constructor() {
        this.configManager = ConfigManager.getInstance();
    }

    public static getInstance(): ThemeController {
        if (!ThemeController.instance) {
            ThemeController.instance = new ThemeController();
        }
        return ThemeController.instance;
    }

    public getCurrentTheme(): string {
        return this.configManager.getConfig().themes.current || 'Dark-MCP';
    }

    public getAvailableThemes(): string[] {
        return [
            'Dark-MCP',
            'Orange-Dark-MCP',
            'Matrix-MCP',
            'Purple-MCP',
            'Clear-MCP'
        ];
    }

    public updateTheme(themeName: string): boolean {
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
export function getCurrentTheme(): string {
    return ThemeController.getInstance().getCurrentTheme();
}

export function getAvailableThemes(): string[] {
    return ThemeController.getInstance().getAvailableThemes();
}

export function updateTheme(themeName: string): boolean {
    return ThemeController.getInstance().updateTheme(themeName);
}