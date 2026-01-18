import { BaseMCPServerConfig } from "../MCPServerConfig";

export const DEFAULT_AAIA_MCP_SERVER_CONFIG: BaseMCPServerConfig = {
    id: "aaia-mcp-server",
    name: "AAIA MCP Server",
    script: "src/MCPAAIAServer.ts",
    port: 3007,
    capabilitiesCheck: {
        tools: true,
        resources: true,
        prompts: true,
    },
    features: {
        enableManagers: true,        // Session manager
        enableWebConsole: false,
        enableHealthChecks: true,
    },
    description: "AAIA Runtime server: FIAs + Mundos + Autómatas with session isolation",
    autoRestart: true,
    healthCheckInterval: 30000,
    url: "http://localhost",
    version: "1.0.0",
};
