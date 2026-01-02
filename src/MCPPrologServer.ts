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

export class MCPPrologServer extends BaseMCPServer {
	private sessionManager: PrologSessionManager;

	constructor() {
		super(DEFAULT_PROLOG_MCP_SERVER_CONFIG);
		this.sessionManager = new PrologSessionManager();
		l.info("MCPPrologServer initialized with session management");
	}

	protected setupServerSpecifics(): void {
		// Tools are registered via the REST API endpoints in BaseMCPServer
		// The session manager handles the actual Prolog operations
		l.info("MCPPrologServer tools registered via BaseMCPServer REST endpoints");
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

export default MCPPrologServer;
