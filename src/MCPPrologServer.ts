#!/usr/bin/env node
/**
 * Prolog MCP Server
 * Provides Prolog logic inference capabilities to MCP clients
 * with session management for Teatro multi-agent scenarios
 */

import { BaseMCPServer } from "./BaseMCPServer";
import { DEFAULT_PROLOG_MCP_SERVER_CONFIG } from "./configs/DEFAULT_PROLOG_MCP_SERVER_CONFIG";
import { z } from "zod";
import { PrologSessionManager } from "./services/PrologSessionManager";
import { l } from "./Logger";

export class MCPPrologServer extends BaseMCPServer {
	private sessionManager: PrologSessionManager;

	constructor() {
		super(DEFAULT_PROLOG_MCP_SERVER_CONFIG);
		this.sessionManager = new PrologSessionManager();
		l.info("MCPPrologServer initialized with session management");
	}

	protected setupHandlers(): void {
		// Tool: create_session
		this.server.setRequestHandler(
			this.requestSchema.tool.call,
			async (request, extra) => {
				if (request.params.name === "create_session") {
					return this.handleCreateSession(request.params.arguments || {});
				}
				if (request.params.name === "query_prolog") {
					return this.handleQueryProlog(request.params.arguments || {});
				}
				if (request.params.name === "assert_fact") {
					return this.handleAssertFact(request.params.arguments || {});
				}
				if (request.params.name === "consult_file") {
					return this.handleConsultFile(request.params.arguments || {});
				}
				if (request.params.name === "destroy_session") {
					return this.handleDestroySession(request.params.arguments || {});
				}
				if (request.params.name === "list_sessions") {
					return this.handleListSessions();
				}

				throw new Error(`Unknown tool: ${request.params.name}`);
			}
		);

		// Resource: session-state
		this.server.setRequestHandler(
			this.requestSchema.resource.read,
			async (request) => {
				const uri = request.params.uri;
				if (uri.startsWith("session-state://")) {
					return this.handleSessionStateResource(uri);
				}
				if (uri === "templates-catalog://list") {
					return this.handleTemplatesCatalog();
				}

				throw new Error(`Unknown resource: ${uri}`);
			}
		);

		// List tools
		this.server.setRequestHandler(
			this.requestSchema.tool.list,
			async () => {
				return {
					tools: [
						{
							name: "create_session",
							description: "Create a new isolated Prolog session for an obra",
							inputSchema: {
								type: "object",
								properties: {
									sessionId: {
										type: "string",
										description: "Unique session identifier",
									},
									obraId: {
										type: "string",
										description: "Teatro obra identifier",
									},
								},
								required: ["sessionId", "obraId"],
							},
						},
						{
							name: "query_prolog",
							description: "Execute a Prolog query in a session",
							inputSchema: {
								type: "object",
								properties: {
									sessionId: {
										type: "string",
										description: "Session identifier",
									},
									query: {
										type: "string",
										description: "Prolog query (e.g., 'member(X, [1,2,3])')",
									},
								},
								required: ["sessionId", "query"],
							},
						},
						{
							name: "assert_fact",
							description: "Add a fact to the knowledge base",
							inputSchema: {
								type: "object",
								properties: {
									sessionId: {
										type: "string",
										description: "Session identifier",
									},
									fact: {
										type: "string",
										description: "Prolog fact to assert",
									},
								},
								required: ["sessionId", "fact"],
							},
						},
						{
							name: "consult_file",
							description: "Load a Prolog file into the session",
							inputSchema: {
								type: "object",
								properties: {
									sessionId: {
										type: "string",
										description: "Session identifier",
									},
									filePath: {
										type: "string",
										description: "Path to .pl file",
									},
								},
								required: ["sessionId", "filePath"],
							},
						},
						{
							name: "destroy_session",
							description: "Destroy a Prolog session and cleanup resources",
							inputSchema: {
								type: "object",
								properties: {
									sessionId: {
										type: "string",
										description: "Session identifier",
									},
								},
								required: ["sessionId"],
							},
						},
						{
							name: "list_sessions",
							description: "List all active Prolog sessions",
							inputSchema: {
								type: "object",
								properties: {},
							},
						},
					],
				};
			}
		);

		// List resources
		this.server.setRequestHandler(
			this.requestSchema.resource.list,
			async () => {
				return {
					resources: [
						{
							uri: "session-state://{sessionId}",
							name: "Prolog Session State",
							description: "Get current state of a Prolog session",
							mimeType: "application/json",
						},
						{
							uri: "templates-catalog://list",
							name: "Prolog Templates Catalog",
							description: "List available Prolog template files",
							mimeType: "application/json",
						},
					],
				};
			}
		);
	}

	// Tool handlers (MOCK implementations for FC1)

	private async handleCreateSession(args: any) {
		const sessionId = args.sessionId;
		const obraId = args.obraId;

		try {
			const session = await this.sessionManager.createSession(sessionId, obraId);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							success: true,
							sessionId: session.sessionId,
							obraId: session.obraId,
							createdAt: session.createdAt.toISOString(),
							message: "Session created successfully",
						}),
					},
				],
			};
		} catch (error: any) {
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							success: false,
							error: error.message,
						}),
					},
				],
			};
		}
	}

	private async handleQueryProlog(args: any) {
		const sessionId = args.sessionId;
		const query = args.query;

		const session = this.sessionManager.getSession(sessionId);
		if (!session) {
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							success: false,
							error: `Session ${sessionId} not found`,
						}),
					},
				],
			};
		}

		// MOCK: For FC1, return mock response
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						success: true,
						query,
						results: [
							{ X: "mock_result_1" },
							{ X: "mock_result_2" },
						],
						message: "[FC1 MOCK] Real query execution in FC2",
					}),
				},
			],
		};
	}

	private async handleAssertFact(args: any) {
		const sessionId = args.sessionId;
		const fact = args.fact;

		const session = this.sessionManager.getSession(sessionId);
		if (!session) {
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							success: false,
							error: `Session ${sessionId} not found`,
						}),
					},
				],
			};
		}

		// MOCK: For FC1, return mock response
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						success: true,
						fact,
						message: "[FC1 MOCK] Real assert in FC2",
					}),
				},
			],
		};
	}

	private async handleConsultFile(args: any) {
		const sessionId = args.sessionId;
		const filePath = args.filePath;

		const session = this.sessionManager.getSession(sessionId);
		if (!session) {
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							success: false,
							error: `Session ${sessionId} not found`,
						}),
					},
				],
			};
		}

		// MOCK: For FC1, return mock response
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						success: true,
						filePath,
						message: "[FC1 MOCK] Real file consult in FC2",
					}),
				},
			],
		};
	}

	private async handleDestroySession(args: any) {
		const sessionId = args.sessionId;

		try {
			const destroyed = await this.sessionManager.destroySession(sessionId);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							success: destroyed,
							sessionId,
							message: destroyed
								? "Session destroyed successfully"
								: "Session not found",
						}),
					},
				],
			};
		} catch (error: any) {
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							success: false,
							error: error.message,
						}),
					},
				],
			};
		}
	}

	private async handleListSessions() {
		try {
			const sessions = this.sessionManager.listSessions();
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							success: true,
							count: sessions.length,
							sessions,
						}),
					},
				],
			};
		} catch (error: any) {
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							success: false,
							error: error.message,
						}),
					},
				],
			};
		}
	}

	// Resource handlers

	private async handleSessionStateResource(uri: string) {
		const sessionId = uri.replace("session-state://", "");
		const session = this.sessionManager.getSession(sessionId);

		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}

		return {
			contents: [
				{
					uri,
					mimeType: "application/json",
					text: JSON.stringify({
						sessionId: session.sessionId,
						obraId: session.obraId,
						createdAt: session.createdAt.toISOString(),
						lastUsedAt: session.lastUsedAt.toISOString(),
						ageMinutes: Math.floor(
							(Date.now() - session.createdAt.getTime()) / 60000
						),
					}),
				},
			],
		};
	}

	private async handleTemplatesCatalog() {
		// MOCK: For FC1, return hardcoded templates
		return {
			contents: [
				{
					uri: "templates-catalog://list",
					mimeType: "application/json",
					text: JSON.stringify({
						templates: [
							{
								id: "state-machine",
								description: "FSM model checker template",
								path: "AAIAGallery/alephscript/templates/state-machine.pl",
							},
							{
								id: "iot-app",
								description: "IoT event logic template",
								path: "AAIAGallery/alephscript/templates/iot-app.pl",
							},
							{
								id: "simu",
								description: "Simulation rules template",
								path: "AAIAGallery/alephscript/templates/simu.pl",
							},
						],
						message: "[FC1 MOCK] Real templates in FC2",
					}),
				},
			],
		};
	}

	async shutdown(): Promise<void> {
		await this.sessionManager.shutdown();
		await super.shutdown();
	}
}

// CLI entry point
if (require.main === module) {
	const server = new MCPPrologServer();

	// Graceful shutdown
	process.on("SIGINT", async () => {
		l.info("Received SIGINT, shutting down...");
		await server.shutdown();
		process.exit(0);
	});

	process.on("SIGTERM", async () => {
		l.info("Received SIGTERM, shutting down...");
		await server.shutdown();
		process.exit(0);
	});
}

export default MCPPrologServer;
