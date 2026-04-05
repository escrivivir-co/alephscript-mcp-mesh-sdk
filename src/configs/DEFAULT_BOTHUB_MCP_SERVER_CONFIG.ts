import { BaseMCPServerConfig } from "../MCPServerConfig";

export const DEFAULT_BOTHUB_MCP_SERVER_CONFIG: BaseMCPServerConfig = {
	id: "bothub-mcp-server",
	name: "BotHub MCP Server",
	script: "src/MCPBotHubServer.ts",
	port: 3010,
	capabilitiesCheck: {
		tools: true,
		resources: true,
		prompts: true,
	},
	features: {
		enableManagers: false,
		enableWebConsole: false,
		enableHealthChecks: true,
	},
	description: "Telegram bot SDK (BotHubSDK) exposed as MCP tools with IACM protocol support",
	autoRestart: true,
	healthCheckInterval: 30000,
	url: "http://localhost",
	version: "1.0.0",
};
