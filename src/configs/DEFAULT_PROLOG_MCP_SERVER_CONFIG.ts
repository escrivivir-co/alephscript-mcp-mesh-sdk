import { BaseMCPServerConfig } from "../MCPServerConfig";

export const DEFAULT_PROLOG_MCP_SERVER_CONFIG: BaseMCPServerConfig = {
	id: "prolog-mcp-server",
	name: "Prolog MCP Server",
	script: "src/MCPPrologServer.ts",
	port: 3006,
	capabilitiesCheck: {
		tools: true,
		resources: true,
		prompts: false,
	},
	features: {
		enableManagers: true,        // Session manager
		enableWebConsole: false,
		enableHealthChecks: true,
	},
	description: "Prolog logic inference server with session management for Teatro agents",
	autoRestart: true,
	healthCheckInterval: 30000,
	url: "http://localhost",
	version: "1.0.0",
};
