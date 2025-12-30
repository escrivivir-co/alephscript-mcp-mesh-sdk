import { BaseMCPServerConfig } from "../MCPServerConfig";


export const DEFAULT_STATE_MACHINE_MCP_SERVER_CONFIG: BaseMCPServerConfig = {
	id: "state-machine-server",
	name: "Simple MCP Server for State Machines",
	script: "src/MCPStateMachineServer.ts",
	port: 3004,
	description: "Easy state management",
	autoRestart: true,
	healthCheckInterval: 30000,
	version: "1.0.0",
	url: "http://localhost"
};

export const MCP_ORFEO_STATE_BOT = "orfeo-state-bot";