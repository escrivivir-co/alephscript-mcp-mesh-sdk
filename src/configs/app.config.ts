import { BaseMCPServerConfig } from "../MCPServerConfig";
import { DEFAULT_AAIA_MCP_SERVER_CONFIG } from "./DEFAULT_AAIA_MCP_SERVER_CONFIG";
import { DEFAULT_DEVOPS_MCP_SERVER_CONFIG } from "./DEFAULT_DEVOPS_MCP_SERVER_CONFIG";
import { DEFAULT_PROLOG_MCP_SERVER_CONFIG } from "./DEFAULT_PROLOG_MCP_SERVER_CONFIG";
import { DEFAULT_STATE_MACHINE_MCP_SERVER_CONFIG } from "./DEFAULT_STATE_MACHINE_MCP_SERVER_CONFIG";
import { DEFAULT_WIKI_MCP_SERVER_CONFIG } from "./DEFAULT_WIKI_MCP_SERVER_CONFIG";
import { DEFAULT_TYPED_PROMPT_MCP_SERVER_CONFIG } from "./DEFAULT_TYPED_PROMPT_MCP_SERVER_CONFIG";
import { DEFAULT_FIREHOSE_MCP_SERVER_CONFIG } from "./DEFAULT_FIREHOSE_MCP_SERVER_CONFIG";
import { DEFAULT_BOTHUB_MCP_SERVER_CONFIG } from "./DEFAULT_BOTHUB_MCP_SERVER_CONFIG";

export interface AppConfig {
    [key: string]: any;
    mcp: {
        servers: Record<string, BaseMCPServerConfig>;
    };
}

export const DEFAULT_APP_CONFIG: AppConfig = {
    mcp: {
        servers: {
            "aaia-mcp-server": DEFAULT_AAIA_MCP_SERVER_CONFIG,
            "state-machine-server": DEFAULT_STATE_MACHINE_MCP_SERVER_CONFIG,
            "wiki-mcp-browser": DEFAULT_WIKI_MCP_SERVER_CONFIG,
            "devops-mcp-server": DEFAULT_DEVOPS_MCP_SERVER_CONFIG,
            "prolog-mcp-server": DEFAULT_PROLOG_MCP_SERVER_CONFIG,
            "typed-prompt-mcp-server": DEFAULT_TYPED_PROMPT_MCP_SERVER_CONFIG,
            "firehose-mcp-server": DEFAULT_FIREHOSE_MCP_SERVER_CONFIG /*,
            "bothub-mcp-server": DEFAULT_BOTHUB_MCP_SERVER_CONFIG,*/
        },
    },
}

export function getConfigOrDefault(
    key: string,
    config: AppConfig
): BaseMCPServerConfig | undefined {
    const fromConfig = config?.mcp?.servers?.[key];
    if (fromConfig) return fromConfig;
    return DEFAULT_APP_CONFIG.mcp.servers[key];
}