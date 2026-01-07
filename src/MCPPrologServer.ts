#!/usr/bin/env node
/**
 * Prolog MCP Server
 * Provides Prolog logic inference capabilities to MCP clients
 * with session management for Teatro multi-agent scenarios
 * 
 * @épica PROLOG-CLIENT-GEN-1.0.0 - Added PrologBackendClient for SQLite access
 * @épica MCP-CHANNELS-1.0.0 - Added EuridiceBot for Socket.IO mesh integration
 */

import { BaseMCPServer } from "./BaseMCPServer";
import { DEFAULT_PROLOG_MCP_SERVER_CONFIG } from "./configs/DEFAULT_PROLOG_MCP_SERVER_CONFIG";
import { PrologSessionManager } from "./services/PrologSessionManager";
import { PrologBackendClient, createPrologBackendClient } from "./clients";
import { AlephScriptClient } from "./libs/alephscript-client";
import { l } from "./Logger";
import { z } from "zod";

// Helper function for generating unique session hashes
function getHash(key: string): string {
    const h = (s: string) => s.substring(s.length - 2);
    const a = new Date().getTime().toString();
    const b = Math.random().toString();
    return key + ">" + h(a) + h(b);
}

export class MCPPrologServer extends BaseMCPServer {
	private sessionManager: PrologSessionManager;
	private backendClient: PrologBackendClient;
	private euridiceBot!: AlephScriptClient;

	constructor() {
		super(DEFAULT_PROLOG_MCP_SERVER_CONFIG);
		this.sessionManager = new PrologSessionManager();
		
		// Log environment variable for debugging
		const backendUrl = process.env.PROLOG_BACKEND_URL || 'http://localhost:8000/api';
		l.info("MCPPrologServer: Creating PrologBackendClient", { 
			PROLOG_BACKEND_URL: process.env.PROLOG_BACKEND_URL || '(not set, using default)',
			effectiveUrl: backendUrl 
		});
		
		this.backendClient = createPrologBackendClient();
		
		// Initialize EuridiceBot for Socket.IO mesh communication
		this.initEuridiceBot();
		
		l.info("MCPPrologServer initialized with session management, backend client, and Socket.IO");
	}

	/**
	 * Initialize EuridiceBot - Socket.IO client for Prolog operations
	 * Connects to the AlephScript mesh and registers as MASTER of Prolog_ROOM
	 */
	private initEuridiceBot(): void {
		try {
			const socketUrl = process.env.SOCKET_MESH_URL || "http://localhost:3010";
			const serverName = DEFAULT_PROLOG_MCP_SERVER_CONFIG.id;
			
			this.euridiceBot = new AlephScriptClient(
				serverName,
				socketUrl
			);
			
			this.euridiceBot.initTriggersDefinition.push(() => {
				const ROOM_NAME = serverName + "_ROOM";
				const REGISTER_PAYLOAD = { 
					usuario: this.euridiceBot.name, 
					sesion: getHash("EuridiceBot")
				};
				
				this.euridiceBot.io.emit("CLIENT_REGISTER", REGISTER_PAYLOAD);
				this.euridiceBot.io.emit("CLIENT_SUSCRIBE", { room: ROOM_NAME });
				this.euridiceBot.room("MAKE_MASTER", { 
					features: [
						"PROLOG_QUERY",
						"PROLOG_ASSERT", 
						"PROLOG_RETRACT",
						"PROLOG_LOAD_FILE",
						"PROLOG_GET_SESSIONS",
						"PROLOG_CREATE_SESSION",
						"PROLOG_DESTROY_SESSION"
					] 
				}, ROOM_NAME);

				// Handle incoming capability requests
				this.euridiceBot.io.on("GET_PROLOG_QUERY", async (data: any) => {
					l.info("EuridiceBot received PROLOG_QUERY request", data);
					const result = await this.handleQueryProlog(data.sessionId, data.query);
					this.euridiceBot.room("SET_PROLOG_QUERY", result, ROOM_NAME);
				});

				this.euridiceBot.io.on("GET_PROLOG_SESSIONS", async () => {
					l.info("EuridiceBot received GET_SESSIONS request");
					const sessions = await this.sessionManager.listSessions();
					this.euridiceBot.room("SET_PROLOG_SESSIONS", { sessions }, ROOM_NAME);
				});

				// Subscribe to all events for debugging
				this.euridiceBot.io.onAny((eventName: string, ...args: any[]) => {
					l.d(`EuridiceBot event: ${eventName}`, args);
				});
				
				l.info("EuridiceBot initialized and connected to AlephScript mesh", {
					botName: serverName,
					room: ROOM_NAME,
					socketUrl,
					capabilities: 7
				});
			});

			l.info("EuridiceBot client created successfully");
		} catch (error) {
			l.e("Failed to initialize EuridiceBot", { error });
		}
	}

	protected setupServerSpecifics(): void {
		this.setupTools();
		this.setupResources();
		this.setupPrompts();
		
		// Connect EuridiceBot to mesh after server is ready
		if (this.euridiceBot) {
			l.info("Connecting EuridiceBot to AlephScript mesh...");
			this.euridiceBot.connect();
		}
		
		l.info("MCPPrologServer tools, resources and prompts registered");
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

		// ============================================
		// Backend-Integrated Tools (via PrologBackendClient)
		// These access SQLite without creating MCP cycles
		// @épica PROLOG-CLIENT-GEN-1.0.0
		// ============================================

		// Tool: Load rules from database into session KB
		this.server.tool(
			"prolog_load_rules_from_db",
			"Load persisted rules from SQLite database into session knowledge base",
			{
				sessionId: z.string().describe("Target session to load rules into"),
				app: z.string().optional().describe("Filter by app name (optional)"),
			},
			async ({ sessionId, app }) => {
				const result = await this.handleLoadRulesFromDb(sessionId, app);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Tool: Save rule to database
		this.server.tool(
			"prolog_save_rule_to_db",
			"Persist a Prolog rule to SQLite database",
			{
				name: z.string().describe("Rule name"),
				content: z.string().describe("Prolog rule content"),
				app: z.string().optional().describe("Application filter"),
			},
			async ({ name, content, app }) => {
				const result = await this.handleSaveRuleToDb(name, content, app);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Tool: List SDK templates from backend
		this.server.tool(
			"prolog_list_sdk_templates",
			"List available SDK templates from backend storage",
			{},
			async () => {
				const result = await this.handleListSdkTemplates();
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Tool: Get SDK template content
		this.server.tool(
			"prolog_get_sdk_template_content",
			"Get the content of a specific SDK template",
			{
				templateName: z.string().describe("Template name to load"),
			},
			async ({ templateName }) => {
				const result = await this.handleGetSdkTemplateContent(templateName);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Tool: Get telemetry status
		this.server.tool(
			"prolog_get_telemetry_status",
			"Get current telemetry/sensor status from backend",
			{},
			async () => {
				const result = await this.handleGetTelemetryStatus();
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

		// ============================================
		// Backend-Integrated Resources (via PrologBackendClient)
		// @épica PROLOG-PROMPTS-1.0.0
		// ============================================

		// Resource: Rules catalog from SQLite
		this.server.resource(
			"prolog-rules-catalog",
			"prolog://rules/catalog",
			{
				description: "Catalog of persisted Prolog rules in SQLite database",
				mimeType: "application/json",
			},
			async () => {
				try {
					if (!await this.backendClient.isHealthy()) {
						return {
							contents: [{
								uri: "prolog://rules/catalog",
								mimeType: "application/json",
								text: JSON.stringify({ error: "Backend not available", rules: [] }, null, 2),
							}],
						};
					}
					const rules = await this.backendClient.getAllRules();
					return {
						contents: [{
							uri: "prolog://rules/catalog",
							mimeType: "application/json",
							text: JSON.stringify({ count: rules.length, rules }, null, 2),
						}],
					};
				} catch (error: any) {
					return {
						contents: [{
							uri: "prolog://rules/catalog",
							mimeType: "application/json",
							text: JSON.stringify({ error: error.message, rules: [] }, null, 2),
						}],
					};
				}
			}
		);

		// Resource: SDK templates from backend
		this.server.resource(
			"prolog-sdk-templates",
			"prolog://sdk/templates",
			{
				description: "SDK Prolog templates available in backend storage",
				mimeType: "application/json",
			},
			async () => {
				try {
					if (!await this.backendClient.isHealthy()) {
						return {
							contents: [{
								uri: "prolog://sdk/templates",
								mimeType: "application/json",
								text: JSON.stringify({ error: "Backend not available", templates: [] }, null, 2),
							}],
						};
					}
					const templates = await this.backendClient.getSdkTemplates();
					return {
						contents: [{
							uri: "prolog://sdk/templates",
							mimeType: "application/json",
							text: JSON.stringify({ count: templates.length, templates }, null, 2),
						}],
					};
				} catch (error: any) {
					return {
						contents: [{
							uri: "prolog://sdk/templates",
							mimeType: "application/json",
							text: JSON.stringify({ error: error.message, templates: [] }, null, 2),
						}],
					};
				}
			}
		);

		// Resource: Current telemetry status
		this.server.resource(
			"prolog-telemetry",
			"prolog://telemetry/current",
			{
				description: "Current IoT/sensor telemetry status",
				mimeType: "application/json",
			},
			async () => {
				try {
					if (!await this.backendClient.isHealthy()) {
						return {
							contents: [{
								uri: "prolog://telemetry/current",
								mimeType: "application/json",
								text: JSON.stringify({ error: "Backend not available", sensors: [] }, null, 2),
							}],
						};
					}
					const status = await this.backendClient.getTelemetryStatus();
					return {
						contents: [{
							uri: "prolog://telemetry/current",
							mimeType: "application/json",
							text: JSON.stringify({ count: status.length, sensors: status }, null, 2),
						}],
					};
				} catch (error: any) {
					return {
						contents: [{
							uri: "prolog://telemetry/current",
							mimeType: "application/json",
							text: JSON.stringify({ error: error.message, sensors: [] }, null, 2),
						}],
					};
				}
			}
		);

		l.info("MCPPrologServer resources registered: 6 resources");
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
			// Use PrologEngine.assertFact wrapper (T009 fix: avoid direct engine.engine access)
			await session.engine.assertFact(fact);
			
			return {
				success: true,
				fact,
				message: "Fact asserted successfully",
			};
		} catch (error: any) {
			l.e(`Error asserting fact: ${fact}`, error);
			
			// Enhanced error handling (T009: check engine health after error)
			const errorMessage = error?.message || String(error);
			return {
				success: false,
				fact,
				error: errorMessage,
				engineHealthy: !!session.engine?.engine,
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

	// ============================================
	// Backend-Integrated Handlers (via PrologBackendClient)
	// @épica PROLOG-CLIENT-GEN-1.0.0
	// ============================================

	/**
	 * Helper: Create verbose error response with diagnostic info
	 */
	private createBackendErrorResponse(toolName: string, phase: string, error?: any): any {
		const backendUrl = process.env.PROLOG_BACKEND_URL || 'http://localhost:8000/api';
		const diagnostic = {
			success: false,
			error: phase === 'health_check' 
				? "Backend not available" 
				: (error?.message || "Unknown error"),
			_diagnostic: {
				tool: toolName,
				phase,
				backendUrl,
				timestamp: new Date().toISOString(),
				hint: phase === 'health_check'
					? "Verify Backend is running: curl http://localhost:8000/health"
					: undefined,
				errorDetails: error ? {
					name: error.name,
					message: error.message,
					statusCode: error.statusCode,
				} : undefined,
			}
		};
		l.e(`[MCPPrologServer] ${toolName} failed at phase: ${phase}`, diagnostic._diagnostic);
		return diagnostic;
	}

	/**
	 * Load rules from SQLite and assert them into session KB
	 */
	async handleLoadRulesFromDb(sessionId: string, app?: string): Promise<any> {
		const toolName = 'prolog_load_rules_from_db';
		l.d(`[MCPPrologServer] ${toolName} called`, { sessionId, app });
		
		const session = this.sessionManager.getSession(sessionId);
		if (!session) {
			return this.createBackendErrorResponse(toolName, 'session_lookup', 
				{ message: `Session ${sessionId} not found`, name: 'SessionNotFound' });
		}

		try {
			// Check backend availability
			if (!await this.backendClient.isHealthy()) {
				return this.createBackendErrorResponse(toolName, 'health_check');
			}

			// Fetch rules from backend
			l.d(`[MCPPrologServer] ${toolName} fetching rules...`, { app: app || 'all' });
			const rules = app 
				? await this.backendClient.getRulesByApp(app)
				: await this.backendClient.getAllRules();

			// Assert each rule into session KB
			let loadedCount = 0;
			for (const rule of rules) {
				try {
					await session.engine.engine.call(`assertz((${rule.content}))`);
					loadedCount++;
				} catch (assertError: any) {
					l.w(`Failed to assert rule ${rule.name}: ${assertError.message}`);
				}
			}

			return {
				success: true,
				sessionId,
				app: app || "all",
				rulesFound: rules.length,
				rulesLoaded: loadedCount,
				message: `Loaded ${loadedCount} of ${rules.length} rules into KB`,
			};
		} catch (error: any) {
			return this.createBackendErrorResponse(toolName, 'fetch_rules', error);
		}
	}

	/**
	 * Save a rule to SQLite database
	 */
	async handleSaveRuleToDb(name: string, content: string, app?: string): Promise<any> {
		const toolName = 'prolog_save_rule_to_db';
		l.d(`[MCPPrologServer] ${toolName} called`, { name, app });
		
		try {
			if (!await this.backendClient.isHealthy()) {
				return this.createBackendErrorResponse(toolName, 'health_check');
			}

			const result = await this.backendClient.createRule({
				name,
				content,
				app,
			});

			return {
				success: true,
				id: result.id,
				name,
				message: result.text || "Rule saved successfully",
			};
		} catch (error: any) {
			return this.createBackendErrorResponse(toolName, 'save_rule', error);
		}
	}

	/**
	 * List SDK templates from backend
	 */
	async handleListSdkTemplates(): Promise<any> {
		const toolName = 'prolog_list_sdk_templates';
		l.d(`[MCPPrologServer] ${toolName} called`);
		
		try {
			if (!await this.backendClient.isHealthy()) {
				return this.createBackendErrorResponse(toolName, 'health_check');
			}

			const templates = await this.backendClient.getSdkTemplates();
			l.d(`[MCPPrologServer] ${toolName} fetched`, { count: templates.length });
			return {
				success: true,
				count: templates.length,
				templates,
			};
		} catch (error: any) {
			return this.createBackendErrorResponse(toolName, 'fetch_templates', error);
		}
	}

	/**
	 * Get SDK template content
	 */
	async handleGetSdkTemplateContent(templateName: string): Promise<any> {
		const toolName = 'prolog_get_sdk_template_content';
		l.d(`[MCPPrologServer] ${toolName} called`, { templateName });
		
		try {
			if (!await this.backendClient.isHealthy()) {
				return this.createBackendErrorResponse(toolName, 'health_check');
			}

			const result = await this.backendClient.getTemplateContent(templateName);
			l.d(`[MCPPrologServer] ${toolName} fetched content for`, { templateName });
			return {
				success: true,
				templateName,
				content: result.content,
			};
		} catch (error: any) {
			return this.createBackendErrorResponse(toolName, 'fetch_content', error);
		}
	}

	/**
	 * Get telemetry status
	 */
	async handleGetTelemetryStatus(): Promise<any> {
		const toolName = 'prolog_get_telemetry_status';
		l.d(`[MCPPrologServer] ${toolName} called`);
		try {
			l.d("[MCPPrologServer] Checking backendClient.isHealthy()...");
			const healthy = await this.backendClient.isHealthy();
			l.d("[MCPPrologServer] backendClient.isHealthy() =", { healthy });
			
			if (!healthy) {
				return this.createBackendErrorResponse(toolName, 'health_check');
			}

			l.d("[MCPPrologServer] Calling backendClient.getTelemetryStatus()...");
			const status = await this.backendClient.getTelemetryStatus();
			l.d("[MCPPrologServer] getTelemetryStatus() returned", { count: status.length });
			return {
				success: true,
				count: status.length,
				sensors: status,
			};
		} catch (error: any) {
			return this.createBackendErrorResponse(toolName, 'fetch_telemetry', error);
		}
	}

	async shutdown(): Promise<void> {
		await this.sessionManager.shutdown();
		await super.shutdown();
	}

	// ============================================
	// MCP Prompts
	// @épica PROLOG-PROMPTS-1.0.0
	// ============================================

	/**
	 * Setup MCP Prompts for guided Prolog workflows
	 */
	private setupPrompts(): void {
		// Prompt: Session Lifecycle
		this.server.prompt(
			"session_lifecycle",
			"Manage Prolog session lifecycle (create, list, destroy)",
			{
				action: z.enum(["create", "list", "destroy"]).describe("Action to perform"),
				sessionId: z.string().optional().describe("Session ID (for create/destroy)"),
				obraId: z.string().optional().describe("Teatro obra ID (for create)"),
			},
			async ({ action, sessionId, obraId }) => {
				let instructions = "";
				switch (action) {
					case "create":
						instructions = `Para crear una nueva sesión Prolog:
1. Usa la tool \`prolog_create_session\` con:
   - sessionId: "${sessionId || '<id-único>'}"
   - obraId: "${obraId || '<id-obra-teatro>'}"
2. La sesión quedará activa para ejecutar queries.
3. Recuerda destruir la sesión cuando termines.`;
						break;
					case "list":
						instructions = `Para listar sesiones activas:
1. Usa la tool \`prolog_list_sessions\` sin parámetros.
2. Recibirás un array con todas las sesiones activas y su metadata.`;
						break;
					case "destroy":
						instructions = `Para destruir una sesión Prolog:
1. Usa la tool \`prolog_destroy_session\` con:
   - sessionId: "${sessionId || '<id-sesión>'}"
2. Todos los hechos y reglas de la sesión serán liberados.`;
						break;
				}
				return {
					messages: [{
						role: "assistant",
						content: { type: "text", text: instructions },
					}],
				};
			}
		);

		// Prompt: Load Knowledge Base
		this.server.prompt(
			"load_knowledge_base",
			"Load Prolog knowledge from file or database",
			{
				source: z.enum(["file", "database"]).describe("Source of knowledge"),
				sessionId: z.string().describe("Target session ID"),
				path: z.string().optional().describe("File path (for file source)"),
				app: z.string().optional().describe("App filter (for database source)"),
			},
			async ({ source, sessionId, path, app }) => {
				let instructions = "";
				if (source === "file") {
					instructions = `Para cargar conocimiento desde archivo:
1. Usa la tool \`prolog_consult_file\` con:
   - sessionId: "${sessionId}"
   - filePath: "${path || '<ruta/archivo.pl>'}"
2. Las reglas y hechos del archivo se añadirán a la KB de la sesión.`;
				} else {
					instructions = `Para cargar reglas desde la base de datos SQLite:
1. Usa la tool \`prolog_load_rules_from_db\` con:
   - sessionId: "${sessionId}"
   ${app ? `- app: "${app}" (filtro por aplicación)` : '- app: (opcional, sin filtro)'}
2. Las reglas persistidas se cargarán en la KB de la sesión.`;
				}
				return {
					messages: [{
						role: "assistant",
						content: { type: "text", text: instructions },
					}],
				};
			}
		);

		// Prompt: Interactive Query
		this.server.prompt(
			"interactive_query",
			"Execute interactive Prolog queries with session context",
			{
				sessionId: z.string().describe("Active session ID"),
				queryType: z.enum(["simple", "findall", "aggregate"]).optional().describe("Type of query"),
			},
			async ({ sessionId, queryType }) => {
				const examples = {
					simple: "?- member(X, [1,2,3]).",
					findall: "?- findall(X, predicate(X), Results).",
					aggregate: "?- aggregate_all(count, predicate(_), Count).",
				};
				const example = examples[queryType || "simple"];
				const instructions = `Para ejecutar consultas Prolog interactivas:

**Sesión activa**: ${sessionId}

1. Usa la tool \`prolog_query\` con:
   - sessionId: "${sessionId}"
   - query: "<tu consulta Prolog>"

**Ejemplo (${queryType || "simple"})**:
\`\`\`prolog
${example}
\`\`\`

**Tips**:
- Termina queries con punto (.)
- Usa variables en mayúsculas (X, Y, Result)
- Para múltiples resultados usa findall/3`;
				return {
					messages: [{
						role: "assistant",
						content: { type: "text", text: instructions },
					}],
				};
			}
		);

		// Prompt: Persist Rule
		this.server.prompt(
			"persist_rule",
			"Save Prolog rules to session or database",
			{
				target: z.enum(["session", "database"]).describe("Where to persist"),
				sessionId: z.string().optional().describe("Session ID (for session target)"),
				ruleName: z.string().optional().describe("Rule name (for database)"),
			},
			async ({ target, sessionId, ruleName }) => {
				let instructions = "";
				if (target === "session") {
					instructions = `Para añadir hechos/reglas a la sesión activa:
1. Usa la tool \`prolog_assert_fact\` con:
   - sessionId: "${sessionId || '<id-sesión>'}"
   - fact: "<hecho o regla Prolog>"

**Ejemplos**:
- Hecho: \`likes(mary, wine)\`
- Regla: \`ancestor(X,Y) :- parent(X,Y)\`

Los hechos persisten solo durante la sesión.`;
				} else {
					instructions = `Para persistir reglas en SQLite (permanente):
1. Usa la tool \`prolog_save_rule_to_db\` con:
   - name: "${ruleName || '<nombre-regla>'}"
   - content: "<contenido Prolog>"
   - app: (opcional, para categorizar)

La regla quedará guardada y podrá cargarse en futuras sesiones.`;
				}
				return {
					messages: [{
						role: "assistant",
						content: { type: "text", text: instructions },
					}],
				};
			}
		);

		// Prompt: Use SDK Template
		this.server.prompt(
			"use_sdk_template",
			"Browse and apply SDK Prolog templates",
			{
				action: z.enum(["list", "get"]).describe("Action to perform"),
				templateName: z.string().optional().describe("Template name (for get action)"),
			},
			async ({ action, templateName }) => {
				let instructions = "";
				if (action === "list") {
					instructions = `Para listar templates SDK disponibles:
1. Usa la tool \`prolog_list_sdk_templates\` sin parámetros.
2. Recibirás un catálogo de templates predefinidos.

Los templates incluyen patrones comunes para:
- Agentes Teatro
- Sistemas SBR (Sensor-Based Reasoning)
- Validación doctrinal`;
				} else {
					instructions = `Para obtener el contenido de un template:
1. Usa la tool \`prolog_get_sdk_template_content\` con:
   - templateName: "${templateName || '<nombre-template>'}"
2. Recibirás el código Prolog del template.
3. Puedes cargarlo en una sesión con \`prolog_consult_file\` o adaptarlo.`;
				}
				return {
					messages: [{
						role: "assistant",
						content: { type: "text", text: instructions },
					}],
				};
			}
		);

		// Prompt: Telemetry Check
		this.server.prompt(
			"telemetry_check",
			"Check IoT/sensor telemetry status",
			{},
			async () => {
				const instructions = `Para verificar el estado de telemetría IoT:
1. Usa la tool \`prolog_get_telemetry_status\` sin parámetros.
2. Recibirás el estado actual de sensores y telemetría.

**Integración SBR**:
Los datos de telemetría pueden usarse como hechos en consultas Prolog:
\`\`\`prolog
?- sensor(temperatura, T), T > 25.
\`\`\``;
				return {
					messages: [{
						role: "assistant",
						content: { type: "text", text: instructions },
					}],
				};
			}
		);

		// Prompt: Razonamiento SBR
		this.server.prompt(
			"razonamiento_sbr",
			"Execute Sensor-Based Reasoning with Prolog",
			{
				sessionId: z.string().describe("Active session with SBR rules"),
				objetivo: z.string().describe("Reasoning objective"),
			},
			async ({ sessionId, objetivo }) => {
				const instructions = `Para ejecutar razonamiento basado en sensores (SBR):

**Sesión**: ${sessionId}
**Objetivo**: ${objetivo}

**Workflow**:
1. Verifica telemetría: \`prolog_get_telemetry_status\`
2. Carga reglas SBR si no están: \`prolog_load_rules_from_db\` con app="sbr"
3. Ejecuta inferencia: \`prolog_query\` con:
   \`\`\`prolog
   ?- inferir_${objetivo.toLowerCase().replace(/\s+/g, '_')}(Resultado).
   \`\`\`

**Ejemplo típico SBR**:
\`\`\`prolog
% Regla: alertar si temperatura alta
alerta(temperatura_alta) :- 
    sensor(temperatura, T), 
    T > umbral_temperatura.
\`\`\``;
				return {
					messages: [{
						role: "assistant",
						content: { type: "text", text: instructions },
					}],
				};
			}
		);

		// Prompt: Teatro Agent Session (E2E)
		this.server.prompt(
			"teatro_agent_session",
			"Complete E2E workflow for Teatro agent with Prolog reasoning",
			{
				obraId: z.string().describe("Teatro obra ID"),
				agentName: z.string().describe("Agent name (e.g., 'lucas')"),
			},
			async ({ obraId, agentName }) => {
				const sessionId = `${agentName}-${obraId}`;
				const instructions = `# Workflow E2E: Agente Teatro con Razonamiento Prolog

**Obra**: ${obraId}
**Agente**: ${agentName}
**Sesión**: ${sessionId}

## Paso 1: Crear Sesión
\`\`\`
prolog_create_session({
  sessionId: "${sessionId}",
  obraId: "${obraId}"
})
\`\`\`

## Paso 2: Cargar Base de Conocimiento
\`\`\`
prolog_consult_file({
  sessionId: "${sessionId}",
  filePath: "ARCHIVO/PLUGINS/PROLOG_EDITOR/templates/${agentName}.brain.pl"
})
\`\`\`

## Paso 3: Cargar Reglas de BD (opcional)
\`\`\`
prolog_load_rules_from_db({
  sessionId: "${sessionId}",
  app: "${obraId}"
})
\`\`\`

## Paso 4: Ejecutar Razonamiento
\`\`\`
prolog_query({
  sessionId: "${sessionId}",
  query: "decidir_accion(${agentName}, Accion)."
})
\`\`\`

## Paso 5: Cleanup
\`\`\`
prolog_destroy_session({
  sessionId: "${sessionId}"
})
\`\`\`

---
Este workflow implementa un agente Teatro con capacidad de razonamiento lógico.`;
				return {
					messages: [{
						role: "assistant",
						content: { type: "text", text: instructions },
					}],
				};
			}
		);

		l.info("MCPPrologServer prompts registered: 8 prompts");
	}
}

// Entry point when run directly
if (require.main === module) {
	// T009/T010 fix: Global error handlers to prevent crash on swipl-stdio errors
	process.on('uncaughtException', (error) => {
		l.e('Uncaught exception in MCPPrologServer', { error: error.message, stack: error.stack });
		// Don't exit - let the server continue running
	});
	
	process.on('unhandledRejection', (reason, promise) => {
		l.e('Unhandled rejection in MCPPrologServer', { reason: String(reason) });
		// Don't exit - let the server continue running
	});

	const server = new MCPPrologServer();
	server.start();
}

export default MCPPrologServer;
