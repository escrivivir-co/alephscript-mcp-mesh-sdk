import { BaseMCPServerConfig } from "../MCPServerConfig";

export const DEFAULT_TYPED_PROMPT_MCP_SERVER_CONFIG: BaseMCPServerConfig = {
	id: "typed-prompt-mcp-server",
	name: "TypedPrompt MCP Server",
	script: "src/MCPTypedPromptServer.ts",
	port: 3020,
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
	description: "TypedPrompting server for schema validation and ontology management",
	autoRestart: true,
	healthCheckInterval: 30000,
	url: "http://localhost",
	version: "1.0.0",
};
