import { DEFAULT_DEVOPS_MCP_SERVER_CONFIG } from "./DEFAULT_DEVOPS_MCP_SERVER_CONFIG";
import { DEFAULT_STATE_MACHINE_MCP_SERVER_CONFIG } from "./DEFAULT_STATE_MACHINE_MCP_SERVER_CONFIG";
import { DEFAULT_WIKI_MCP_SERVER_CONFIG } from "./DEFAULT_WIKI_MCP_SERVER_CONFIG";
import { DEFAULT_XPLUS1_MCP_SERVER_CONFIG } from "./DEFAULT_XPLUS1_MCP_SERVER_CONFIG";

export interface AppConfig {
    [key: string]: any;
    mcp: {
        servers: object
    }
}  

export const DEFAULT_APP_CONFIG: AppConfig = {
    mcp: {
        servers: {
            "state-machine-server": DEFAULT_STATE_MACHINE_MCP_SERVER_CONFIG,
            "xplus1-mcp-machine": DEFAULT_XPLUS1_MCP_SERVER_CONFIG,
            "wiki-mcp-browser": DEFAULT_WIKI_MCP_SERVER_CONFIG,
            "devops-mcp-server": DEFAULT_DEVOPS_MCP_SERVER_CONFIG,
        },
    },
}

export function getConfigOrDefault(key: string, config: AppConfig): AppConfig {
    // In a real-world scenario, you might load this from a file or environment variables
    return DEFAULT_APP_CONFIG;
}