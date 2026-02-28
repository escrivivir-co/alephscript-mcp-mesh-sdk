import { BaseMCPServerConfig } from "../MCPServerConfig";

export const DEFAULT_FIREHOSE_MCP_SERVER_CONFIG: BaseMCPServerConfig = {
	id: "firehose-mcp-server",
	name: "Firehose MCP Server",
	script: "src/MCPFirehoseServer.ts",
	port: 3008,
	capabilitiesCheck: {
		tools: true,
		resources: true,
		prompts: false,
	},
	features: {
		enableManagers: false,
		enableWebConsole: false,
		enableHealthChecks: true,
	},
	description: "Bluesky AT Protocol firehose consumer with ONFALO CDR quality labeling",
	autoRestart: true,
	healthCheckInterval: 30000,
	url: "http://localhost",
	version: "1.0.0",
};
