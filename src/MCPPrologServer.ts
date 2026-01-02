#!/usr/bin/env node
/**
 * Prolog MCP Server
 * Provides Prolog logic inference capabilities to MCP clients
 * with session management for Teatro multi-agent scenarios
 */

import { BaseMCPServer } from "./BaseMCPServer";
import { DEFAULT_PROLOG_MCP_SERVER_CONFIG } from "./configs/DEFAULT_PROLOG_MCP_SERVER_CONFIG";
import { PrologSessionManager } from "./services/PrologSessionManager";
import { l } from "./Logger";
import { z } from "zod";

export class MCPPrologServer extends BaseMCPServer {
	private sessionManager: PrologSessionManager;

	constructor() {
		super(DEFAULT_PROLOG_MCP_SERVER_CONFIG);
		this.sessionManager = new PrologSessionManager();
		l.info("MCPPrologServer initialized with session management");
	}

	protected setupServerSpecifics(): void {
		this.setupTools();
		this.setupResources();
		l.info("MCPPrologServer tools and resources registered");
	}

	/**
	 * Setup MCP Tools for Prolog operations
	 */
	private setupTools(): void {
		// Tool: Create Prolog session
		this.server.tool(
			"prolog_create_session",
			"Create a new Prolog session for a Teatro obra",
			{
				sessionId: z.string().describe("Unique session identifier"),
				obraId: z.string().describe("Teatro obra identifier"),
			},
			async ({ sessionId, obraId }) => {
				const result = await this.handleCreateSession(sessionId, obraId);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Tool: Query Prolog
		this.server.tool(
			"prolog_query",
			"Execute a Prolog query in a session",
			{
				sessionId: z.string().describe("Session identifier"),
				query: z.string().describe("Prolog query to execute (e.g., 'member(X, [1,2,3]).')"),
			},
			async ({ sessionId, query }) => {
				const result = await this.handleQueryProlog(sessionId, query);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Tool: Assert fact
		this.server.tool(
			"prolog_assert_fact",
			"Assert a new fact into the Prolog knowledge base",
			{
				sessionId: z.string().describe("Session identifier"),
				fact: z.string().describe("Prolog fact to assert (e.g., 'likes(mary, wine)')"),
			},
			async ({ sessionId, fact }) => {
				const result = await this.handleAssertFact(sessionId, fact);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Tool: Consult file
		this.server.tool(
			"prolog_consult_file",
			"Load a Prolog file into the session knowledge base",
			{
				sessionId: z.string().describe("Session identifier"),
				filePath: z.string().describe("Path to .pl file to consult"),
			},
			async ({ sessionId, filePath }) => {
				const result = await this.handleConsultFile(sessionId, filePath);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Tool: Destroy session
		this.server.tool(
			"prolog_destroy_session",
			"Destroy a Prolog session and free resources",
			{
				sessionId: z.string().describe("Session identifier to destroy"),
			},
			async ({ sessionId }) => {
				const result = await this.handleDestroySession(sessionId);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Tool: List sessions
		this.server.tool(
			"prolog_list_sessions",
			"List all active Prolog sessions",
			{},
			async () => {
				const result = await this.handleListSessions();
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Tool: Get templates catalog
		this.server.tool(
			"prolog_get_templates",
			"Get catalog of available Prolog templates for Teatro",
			{},
			async () => {
				const result = await this.handleTemplatesCatalog();
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);
	}

	/**
	 * Setup MCP Resources for Prolog state inspection
	 */
	private setupResources(): void {
		// Resource: Session state
		this.server.resource(
			"prolog-session-state",
			"prolog://sessions/current",
			{
				description: "Current state of a Prolog session including metadata",
				mimeType: "application/json",
			},
			async () => {
				const sessions = await this.handleListSessions();
				return {
					contents: [{
						uri: "prolog://sessions/current",
						mimeType: "application/json",
						text: JSON.stringify(sessions, null, 2),
					}],
				};
			}
		);

		// Resource: Templates catalog
		this.server.resource(
			"prolog-templates-catalog",
			"prolog://templates/catalog",
			{
				description: "Available Prolog templates for Teatro agents",
				mimeType: "application/json",
			},
			async () => {
				const catalog = await this.handleTemplatesCatalog();
				return {
					contents: [{
						uri: "prolog://templates/catalog",
						mimeType: "application/json",
						text: JSON.stringify(catalog, null, 2),
					}],
				};
			}
		);

		// Resource: Active sessions list
		this.server.resource(
			"prolog-active-sessions",
			"prolog://sessions",
			{
				description: "List of all active Prolog sessions",
				mimeType: "application/json",
			},
			async () => {
				const sessions = await this.handleListSessions();
				return {
					contents: [{
						uri: "prolog://sessions",
						mimeType: "application/json",
						text: JSON.stringify(sessions, null, 2),
					}],
				};
			}
		);
	}

	/**
	 * Public API for tool handlers (used by BaseMCPServer legacy REST API)
	 */
	async handleCreateSession(sessionId: string, obraId: string): Promise<any> {
		try {
			const session = await this.sessionManager.createSession(sessionId, obraId);
			return {
				success: true,
				sessionId: session.sessionId,
				obraId: session.obraId,
				createdAt: session.createdAt.toISOString(),
				message: "Session created successfully",
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message,
			};
		}
	}

	async handleQueryProlog(sessionId: string, query: string): Promise<any> {
		const session = this.sessionManager.getSession(sessionId);
		if (!session) {
			return {
				success: false,
				error: `Session ${sessionId} not found`,
			};
		}

		try {
			// Create query with swipl-stdio
			const prologQuery = await session.engine.engine.createQuery(query);
			const results: any[] = [];
			
			let result;
			while (result = await prologQuery.next()) {
				results.push(result);
			}
			
			await prologQuery.close();
			
			return {
				success: true,
				query,
				results,
				count: results.length,
			};
		} catch (error: any) {
			l.e(`Error executing query: ${query}`, error);
			return {
				success: false,
				query,
				error: error.message,
			};
		}
	}

	async handleAssertFact(sessionId: string, fact: string): Promise<any> {
		const session = this.sessionManager.getSession(sessionId);
		if (!session) {
			return {
				success: false,
				error: `Session ${sessionId} not found`,
			};
		}

		try {
			// Assert fact using engine.call
			const assertCommand = `assert(${fact}).`;
			await session.engine.engine.call(assertCommand);
			
			return {
				success: true,
				fact,
				message: "Fact asserted successfully",
			};
		} catch (error: any) {
			l.e(`Error asserting fact: ${fact}`, error);
			return {
				success: false,
				fact,
				error: error.message,
			};
		}
	}

	async handleConsultFile(sessionId: string, filePath: string): Promise<any> {
		const session = this.sessionManager.getSession(sessionId);
		if (!session) {
			return {
				success: false,
				error: `Session ${sessionId} not found`,
			};
		}

		try {
			// Use loadPrologFiles with cache support (async)
			await session.engine.loadPrologFiles([filePath]);
			
			return {
				success: true,
				filePath,
				message: "File consulted successfully (with cache)",
			};
		} catch (error: any) {
			l.e(`Error consulting file: ${filePath}`, error);
			return {
				success: false,
				filePath,
				error: error.message,
			};
		}
	}

	async handleDestroySession(sessionId: string): Promise<any> {
		try {
			const destroyed = await this.sessionManager.destroySession(sessionId);
			return {
				success: destroyed,
				sessionId,
				message: destroyed
					? "Session destroyed successfully"
					: "Session not found",
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message,
			};
		}
	}

	async handleListSessions(): Promise<any> {
		try {
			const sessions = this.sessionManager.listSessions();
			return {
				success: true,
				count: sessions.length,
				sessions,
			};
		} catch (error: any) {
			return {
				success: false,
				error: error.message,
			};
		}
	}

	async handleSessionStateResource(uri: string): Promise<any> {
		const sessionId = uri.replace("session-state://", "");
		const session = this.sessionManager.getSession(sessionId);

		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}

		return {
			sessionId: session.sessionId,
			obraId: session.obraId,
			createdAt: session.createdAt.toISOString(),
			lastUsedAt: session.lastUsedAt.toISOString(),
			ageMinutes: Math.floor(
				(Date.now() - session.createdAt.getTime()) / 60000
			),
		};
	}

	async handleTemplatesCatalog(): Promise<any> {
		// TODO FC2: Scan AAIAGallery/alephscript/templates/ for real .pl files
		return {
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
			message: "[FC1] Hardcoded templates. Real scan in FC2.",
		};
	}

	async shutdown(): Promise<void> {
		await this.sessionManager.shutdown();
		await super.shutdown();
	}
}

// Entry point when run directly
if (require.main === module) {
	const server = new MCPPrologServer();
	server.start();
}

export default MCPPrologServer;
