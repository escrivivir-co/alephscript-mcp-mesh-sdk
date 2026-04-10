#!/usr/bin/env node
/**
 * BotHub MCP Server
 * Exposes BotHubSDK (Telegram bot SDK + IACM protocol) as MCP tools/resources/prompts.
 * Connects to the AlephScript mesh via Socket.IO (AGENT channel).
 *
 * Pattern: RuntimeEmitter → Store<BaseRuntimeState> → MCP tools read/write the store.
 * Same pattern as BotHubSDK's examples/dashboard but without React UI.
 */

import * as path from "node:path";
import * as fs from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";
import { BaseMCPServer } from "./BaseMCPServer";
import { DEFAULT_BOTHUB_MCP_SERVER_CONFIG } from "./configs/DEFAULT_BOTHUB_MCP_SERVER_CONFIG";
import { AlephScriptClient } from "./libs/alephscript-client";
import { l } from "./Logger";
import { z } from "zod";

// --- BotHubSDK imports (via tsconfig path alias @bothub-sdk) ---
import {
	// Core boot
	bootBot,
	type BootBotOptions,
	type BootResult,
	// Emitter + Store
	RuntimeEmitter,
	type BaseRuntimeState,
	getDefaultBaseState,
	connectEmitterToStore,
	createStore,
	type Store,
	// Message persistence
	FileMessageStore,
	// IACM builders
	buildRequest,
	buildReport,
	buildQuestion,
	buildAnswer,
	buildProposal,
	buildAcknowledge,
	buildAccept,
	buildReject,
	buildDefer,
	buildFyi,
	buildUrgent,
	formatIacmForChat,
	// IACM parser
	parseIacmMessage,
	detectsIacmMessage,
} from "@bothub-sdk";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHash(key: string): string {
	const h = (s: string) => s.substring(s.length - 2);
	const a = new Date().getTime().toString();
	const b = Math.random().toString();
	return key + ">" + h(a) + h(b);
}

/**
 * Build an IACM message from a flat content string.
 * Maps content → each type's required data fields, using content as both data and narrative.
 */
function buildIacmFromContent(
	type: string,
	from: string,
	to: string,
	content: string,
	opts?: { thread_id?: string; reply_to?: string }
): any {
	const replyTo = opts?.reply_to || "unknown";
	const buildOpts = opts?.thread_id ? { thread_id: opts.thread_id } : undefined;
	switch (type) {
		case "REQUEST":
			return buildRequest(from, to, { task: content }, content, buildOpts);
		case "REPORT":
			return buildReport(from, to, { subject: content, summary: content }, content, buildOpts);
		case "QUESTION":
			return buildQuestion(from, to, { question: content }, content, buildOpts);
		case "ANSWER":
			return buildAnswer(from, to, { question_id: replyTo, answer: content }, content, buildOpts);
		case "PROPOSAL":
			return buildProposal(from, to, { title: content, summary: content, rationale: content }, content, buildOpts);
		case "ACKNOWLEDGE":
			return buildAcknowledge(from, to, { acknowledged_message_id: replyTo, confirmation: content }, content, buildOpts);
		case "ACCEPT":
			return buildAccept(from, to, { proposal_id: replyTo, commitment: content }, content, buildOpts);
		case "REJECT":
			return buildReject(from, to, { proposal_id: replyTo, rationale: content }, content, buildOpts);
		case "DEFER":
			return buildDefer(from, to, { deferred_message_id: replyTo, reason: content }, content, buildOpts);
		case "FYI":
			return buildFyi(from, to, { subject: content, information: content }, content, buildOpts);
		case "URGENT":
			return buildUrgent(from, to, { issue: content, severity: "high", urgency_reason: content, action_needed: content, action_needed_by: "ASAP" }, content, buildOpts);
		default:
			throw new Error(`Unknown IACM type: ${type}`);
	}
}

// ---------------------------------------------------------------------------
// App Launcher Types + Constants
// ---------------------------------------------------------------------------

const KNOWN_APPS = ["console-app", "dashboard", "iacm-demo"] as const;
type KnownAppName = typeof KNOWN_APPS[number];

interface AppProcessInfo {
	pid: number;
	appName: string;
	startedAt: string;
	status: "running" | "stopped" | "error";
	command: string;
	args: string[];
	cwd: string;
	recentLogs: string[];
	exitCode: number | null;
}

const MAX_APP_LOGS = 50;

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

export class MCPBotHubServer extends BaseMCPServer {
	private emitter: RuntimeEmitter;
	private store: Store<BaseRuntimeState>;
	private unsubBridge: (() => void) | null = null;
	private bootResult: BootResult | null = null;
	private meshClient: AlephScriptClient | null = null;
	// App launcher state
	private readonly launchedApps: Map<string, { info: AppProcessInfo; proc: ChildProcess }> = new Map();
	// Data paths (Scriptorium canonical location)
	private readonly sdkDir: string;
	private readonly dataDir: string;
	// Message cursor for incremental polling (bothub_get_messages)
	private messageCursor = 0;

	constructor() {
		super(DEFAULT_BOTHUB_MCP_SERVER_CONFIG);

		// Resolve Scriptorium data paths (override via env vars)
		const workspaceRoot = path.resolve(__dirname, "../../..");
		this.sdkDir = process.env.BOTHUB_SDK_DIR || path.join(workspaceRoot, "BotHubSDK");
		this.dataDir = process.env.BOTHUB_DATA_DIR || path.join(workspaceRoot, "ARCHIVO", "PLUGINS", "BOT_HUB_SDK", "data");

		// Ensure data directory exists (non-blocking)
		try { fs.mkdirSync(this.dataDir, { recursive: true }); } catch { /* ignore */ }

		// Persistent message store (ARCHIVO/PLUGINS/BOT_HUB_SDK/data/messages.json)
		const messageStore = new FileMessageStore(path.join(this.dataDir, "messages.json"));

		// Create emitter + store + bridge (same pattern as BotHubSDK examples/dashboard)
		this.emitter = new RuntimeEmitter();
		this.store = createStore<BaseRuntimeState>(getDefaultBaseState());
		this.unsubBridge = connectEmitterToStore(this.emitter, this.store, { messageStore });

		// Socket.IO mesh client
		this.initMeshClient();

		l.info("MCPBotHubServer v2.0 initialized", { dataDir: this.dataDir, sdkDir: this.sdkDir });
	}

	// -----------------------------------------------------------------------
	// Socket.IO mesh (AGENT channel)
	// -----------------------------------------------------------------------

	private initMeshClient(): void {
		const socketUrl = process.env.SOCKET_MESH_URL || "http://localhost:3000";
		const meshEnabled = process.env.BOTHUB_MESH_ENABLED !== "false";

		if (!meshEnabled) {
			l.info("BotHub mesh client disabled (BOTHUB_MESH_ENABLED=false)");
			return;
		}

		try {
			const serverName = DEFAULT_BOTHUB_MCP_SERVER_CONFIG.id;

			this.meshClient = new AlephScriptClient(serverName, socketUrl);
			const client = this.meshClient;

			client.initTriggersDefinition.push(() => {
				const ROOM_NAME = "bothub_ROOM";
				const REGISTER_PAYLOAD = {
					usuario: client.name,
					sesion: getHash("BotHubMCP"),
				};

				client.io.emit("CLIENT_REGISTER", REGISTER_PAYLOAD);
				client.io.emit("CLIENT_SUSCRIBE", { room: ROOM_NAME });
				client.room("MAKE_MASTER", {
					features: [
						"BOTHUB_BOOT",
						"BOTHUB_STATUS",
						"BOTHUB_EXECUTE_COMMAND",
						"BOTHUB_BROADCAST",
						"BOTHUB_SEND_IACM",
						"BOTHUB_PARSE_IACM",
					],
				}, ROOM_NAME);

				// Forward BotHubSDK runtime events to mesh (unidirectional: bot → mesh)
				this.emitter.events$.subscribe((event) => {
					client.room("BOTHUB_EVENT", {
						type: event.type,
						timestamp: "timestamp" in event ? (event as any).timestamp : new Date().toISOString(),
						data: event,
					}, ROOM_NAME);
				});

				l.info("BotHub mesh client connected", { room: ROOM_NAME, socketUrl });
			});

			l.info("BotHub mesh client created");
		} catch (error) {
			l.e("Failed to initialize BotHub mesh client", { error });
		}
	}

	// -----------------------------------------------------------------------
	// MCP setup (called by BaseMCPServer.start())
	// -----------------------------------------------------------------------

	protected setupServerSpecifics(): void {
		this.setupTools();
		this.setupResources();
		this.setupPrompts();

		// Connect to mesh after MCP server is ready
		if (this.meshClient) {
			l.info("Connecting BotHub to AlephScript mesh...");
			this.meshClient.connect();
		}

		l.info("MCPBotHubServer: 14 tools, 5 resources, 3 prompts registered");
	}

	// -----------------------------------------------------------------------
	// TOOLS (8)
	// -----------------------------------------------------------------------

	private setupTools(): void {
		// ── 1. bothub_boot ─────────────────────────────────────────────────
		this.server.tool(
			"bothub_boot",
			"Boot a Telegram bot instance. Uses mock mode if no BOT_TOKEN is found.",
			{
				mockMode: z.boolean().optional().describe("Force mock mode (no Telegram API). Default: auto-detect from env."),
				envDir: z.string().optional().describe("Directory containing .env with BOT_TOKEN. Default: BotHubSDK root."),
			},
			async ({ mockMode, envDir }) => {
				if (this.bootResult?.started) {
					return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Bot already running", status: this.store.getState().botStatus }) }] };
				}

				const resolvedEnvDir = envDir || process.env.BOTHUB_ENV_DIR || this.sdkDir;
				const opts: BootBotOptions = {
					plugins: [],
					envDir: resolvedEnvDir,
					dataDir: this.dataDir,
					chatStorePath: path.join(this.dataDir, "chats.json"),
					emitter: this.emitter,
					nonInteractive: true,
				};

				try {
					this.bootResult = await bootBot(opts);
					return {
						content: [{
							type: "text" as const,
							text: JSON.stringify({
								mock: this.bootResult.mock,
								started: this.bootResult.started,
								hasExecuteCommand: !!this.bootResult.executeCommand,
								hasBroadcast: !!this.bootResult.broadcast,
							}, null, 2),
						}],
					};
				} catch (error: any) {
					return { content: [{ type: "text" as const, text: JSON.stringify({ error: error.message }) }] };
				}
			}
		);

		// ── 2. bothub_status ───────────────────────────────────────────────
		this.server.tool(
			"bothub_status",
			"Get current bot runtime state (status, plugins, chats, command count).",
			{},
			async () => {
				const state = this.store.getState();
				return {
					content: [{
						type: "text" as const,
						text: JSON.stringify({
							botStatus: state.botStatus,
							startedAt: state.startedAt,
							plugins: state.plugins,
							commandCount: state.commandCount,
							chatCount: state.chatIds.length,
							chatIds: state.chatIds,
							chatNames: state.chatNames,
							logCount: state.logs.length,
							messageCount: state.messages.length,
						}, null, 2),
					}],
				};
			}
		);

		// ── 3. bothub_execute_command ──────────────────────────────────────
		this.server.tool(
			"bothub_execute_command",
			"Execute a registered bot command locally and return reply messages. Works in mock and real mode.",
			{
				command: z.string().describe("Command name without slash (e.g. 'start', 'help', 'rb_aleph')"),
				chatId: z.number().optional().describe("Chat ID for context. Default: 1 (mock)."),
				userId: z.number().optional().describe("User ID for context. Default: 1 (mock)."),
			},
			async ({ command, chatId, userId }) => {
				if (!this.bootResult?.executeCommand) {
					return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Bot not booted or executeCommand not available. Call bothub_boot first." }) }] };
				}
				try {
					const replies = await this.bootResult.executeCommand(command, { chatId, userId });
					return {
						content: [{
							type: "text" as const,
							text: JSON.stringify({
								command,
								replies: replies.map((r: any) => ({ chatId: r.chatId, text: r.text })),
							}, null, 2),
						}],
					};
				} catch (error: any) {
					return { content: [{ type: "text" as const, text: JSON.stringify({ error: error.message }) }] };
				}
			}
		);

		// ── 4. bothub_broadcast ────────────────────────────────────────────
		this.server.tool(
			"bothub_broadcast",
			"Broadcast a message to all tracked chats. In mock mode, records via MockTelegramBot.",
			{
				message: z.string().describe("Message text to broadcast"),
			},
			async ({ message }) => {
				if (!this.bootResult?.broadcast) {
					return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Bot not booted or broadcast not available. Call bothub_boot first." }) }] };
				}
				try {
					await this.bootResult.broadcast(message);
					return {
						content: [{
							type: "text" as const,
							text: JSON.stringify({ success: true, message, chatCount: this.store.getState().chatIds.length }),
						}],
					};
				} catch (error: any) {
					return { content: [{ type: "text" as const, text: JSON.stringify({ error: error.message }) }] };
				}
			}
		);

		// ── 5. bothub_list_plugins ─────────────────────────────────────────
		this.server.tool(
			"bothub_list_plugins",
			"List all registered bot plugins and their commands.",
			{},
			async () => {
				const state = this.store.getState();
				return {
					content: [{
						type: "text" as const,
						text: JSON.stringify({
							pluginCount: state.plugins.length,
							plugins: state.plugins,
							totalCommands: state.commandCount,
						}, null, 2),
					}],
				};
			}
		);

		// ── 6. bothub_list_chats ───────────────────────────────────────────
		this.server.tool(
			"bothub_list_chats",
			"List all tracked chats (IDs and known names/titles).",
			{},
			async () => {
				const state = this.store.getState();
				return {
					content: [{
						type: "text" as const,
						text: JSON.stringify({
							chatCount: state.chatIds.length,
							chats: state.chatIds.map((id: number) => ({
								id,
								name: (state.chatNames as any)[id] || "(unknown)",
							})),
						}, null, 2),
					}],
				};
			}
		);

		// ── 7. bothub_send_iacm ────────────────────────────────────────────
		this.server.tool(
			"bothub_send_iacm",
			"Build an IACM protocol message (REQUEST, REPORT, QUESTION, etc.) and return it formatted for Telegram chat.",
			{
				type: z.enum([
					"REQUEST", "REPORT", "QUESTION", "ANSWER",
					"PROPOSAL", "ACKNOWLEDGE", "ACCEPT", "REJECT",
					"DEFER", "FYI", "URGENT",
				]).describe("IACM message type"),
				from_agent: z.string().describe("Sender agent name (e.g. '@aleph')"),
				to_agent: z.string().describe("Recipient agent name (e.g. '@ox')"),
				content: z.string().describe("Main content/subject of the message"),
				thread_id: z.string().optional().describe("Thread ID for grouping related messages"),
				reply_to: z.string().optional().describe("Message ID this replies to"),
			},
			async ({ type, from_agent, to_agent, content, thread_id, reply_to }) => {
				try {
					const msg = buildIacmFromContent(type, from_agent, to_agent, content, { thread_id, reply_to });
					const formatted = formatIacmForChat(msg);
					return {
						content: [{
							type: "text" as const,
							text: JSON.stringify({ iacmMessage: msg, formatted }, null, 2),
						}],
					};
				} catch (error: any) {
					return { content: [{ type: "text" as const, text: JSON.stringify({ error: error.message }) }] };
				}
			}
		);

		// ── 8. bothub_parse_iacm ───────────────────────────────────────────
		this.server.tool(
			"bothub_parse_iacm",
			"Parse text that may contain an IACM protocol message. Returns structured data if detected.",
			{
				text: z.string().describe("Text to parse for IACM content"),
			},
			async ({ text }) => {
				const detected = detectsIacmMessage(text);
				if (!detected) {
					return {
						content: [{
							type: "text" as const,
							text: JSON.stringify({ detected: false, message: "No IACM message found in text." }),
						}],
					};
				}
				try {
					const result = parseIacmMessage(text);
					return {
						content: [{
							type: "text" as const,
							text: JSON.stringify({ detected: true, ...result }, null, 2),
						}],
					};
				} catch (error: any) {
					return { content: [{ type: "text" as const, text: JSON.stringify({ detected: true, parseError: error.message }) }] };
				}
			}
		);

		// ── 9. bothub_get_messages ─────────────────────────────────────────
		this.server.tool(
			"bothub_get_messages",
			"Get recent chat messages with incremental cursor. Poll repeatedly with nextCursor to receive only new messages.",
			{
				limit: z.number().int().min(1).max(200).optional().describe("Max messages to return. Default: 50."),
				since_cursor: z.number().int().min(0).optional().describe("Index cursor: return only messages from this index onward. Default: 0 (all)."),
			},
			async ({ limit = 50, since_cursor = 0 }) => {
				const msgs: any[] = (this.store.getState() as any).messages ?? [];
				const slice = msgs.slice(since_cursor, since_cursor + limit);
				const nextCursor = since_cursor + slice.length;
				return {
					content: [{
						type: "text" as const,
						text: JSON.stringify({ messages: slice, nextCursor, total: msgs.length, hasMore: nextCursor < msgs.length }, null, 2),
					}],
				};
			}
		);

		// ── 10. bothub_get_chat_history ───────────────────────────────────
		this.server.tool(
			"bothub_get_chat_history",
			"Get message history filtered by a specific chat ID.",
			{
				chatId: z.number().describe("Chat ID to filter messages for"),
				limit: z.number().int().min(1).max(100).optional().describe("Max messages. Default: 20."),
			},
			async ({ chatId, limit = 20 }) => {
				const all: any[] = (this.store.getState() as any).messages ?? [];
				const forChat = all.filter((m: any) => m.chatId === chatId).slice(-limit);
				return {
					content: [{
						type: "text" as const,
						text: JSON.stringify({ chatId, messages: forChat, count: forChat.length }, null, 2),
					}],
				};
			}
		);

		// ── 11. bothub_list_apps ──────────────────────────────────────────
		this.server.tool(
			"bothub_list_apps",
			"List available BotHubSDK apps (console-app, dashboard, iacm-demo) and their current status.",
			{},
			async () => {
				const apps = KNOWN_APPS.map((name) => {
					const launched = this.launchedApps.get(name);
					const exampleDir = path.join(this.sdkDir, "examples", name);
					const installed = fs.existsSync(path.join(exampleDir, "node_modules")) || fs.existsSync(path.join(exampleDir, "package.json"));
					return {
						name,
						status: launched ? launched.info.status : "stopped",
						pid: launched ? launched.info.pid : null,
						startedAt: launched ? launched.info.startedAt : null,
						installed,
						exampleDir,
					};
				});
				return {
					content: [{
						type: "text" as const,
						text: JSON.stringify({ apps, sdkDir: this.sdkDir, dataDir: this.dataDir }, null, 2),
					}],
				};
			}
		);

		// ── 12. bothub_launch_app ─────────────────────────────────────────
		this.server.tool(
			"bothub_launch_app",
			"Launch a BotHubSDK app (console-app, dashboard, iacm-demo) as a child process managed by this MCP server.",
			{
				appName: z.enum(["console-app", "dashboard", "iacm-demo"]).describe("App to launch"),
				mockMode: z.boolean().optional().describe("Force mock mode (no Telegram). Default: true."),
			},
			async ({ appName, mockMode = true }) => {
				// Check already running
				if (this.launchedApps.has(appName)) {
					const existing = this.launchedApps.get(appName)!;
					if (existing.info.status === "running") {
						return { content: [{ type: "text" as const, text: JSON.stringify({ error: `App '${appName}' already running (PID ${existing.info.pid})` }) }] };
					}
					this.launchedApps.delete(appName);
				}

				// Resolve command/args/cwd per app
				let command: string;
				let args: string[];
				let cwd: string;

				if (appName === "iacm-demo") {
					// iacm-demo has no root npm script — run directly from example dir
					command = process.platform === "win32" ? "bun.exe" : "bun";
					args = mockMode ? ["run", "mock"] : ["run", "dev"];
					cwd = path.join(this.sdkDir, "examples", "iacm-demo");
				} else {
					// console-app and dashboard have root npm scripts
					command = process.platform === "win32" ? "npm.cmd" : "npm";
					args = ["run", appName === "dashboard" ? "dev:dashboard" : "dev"];
					cwd = this.sdkDir;
				}

				if (!fs.existsSync(cwd)) {
					return { content: [{ type: "text" as const, text: JSON.stringify({ error: `Working dir not found: ${cwd}. Run 'BHS: Setup [Examples]' first.` }) }] };
				}

				const info: AppProcessInfo = {
					pid: -1,
					appName,
					startedAt: new Date().toISOString(),
					status: "running",
					command,
					args,
					cwd,
					recentLogs: [],
					exitCode: null,
				};

				// Pass mock env flag; apps that use bootBot will pick it up via nonInteractive + no BOT_TOKEN
				const env: NodeJS.ProcessEnv = {
					...process.env,
					...(mockMode ? { BOT_TOKEN: "" } : {}),
					BOTHUB_DATA_DIR: this.dataDir,
				};

				const proc = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
				info.pid = proc.pid ?? -1;

				proc.stdout?.on("data", (chunk: Buffer) => {
					const line = chunk.toString().trimEnd();
					if (line) {
						info.recentLogs.push(line);
						if (info.recentLogs.length > MAX_APP_LOGS) info.recentLogs.shift();
					}
				});
				proc.stderr?.on("data", (chunk: Buffer) => {
					const line = chunk.toString().trimEnd();
					if (line) {
						info.recentLogs.push(`[ERR] ${line}`);
						if (info.recentLogs.length > MAX_APP_LOGS) info.recentLogs.shift();
					}
				});
				proc.on("exit", (code) => {
					info.status = code === 0 ? "stopped" : "error";
					info.exitCode = code;
					l.info(`BotHub app '${appName}' exited`, { code });
				});
				proc.on("error", (err) => {
					info.status = "error";
					info.recentLogs.push(`[PROC_ERROR] ${err.message}`);
					l.e(`BotHub app '${appName}' spawn error`, { error: err });
				});

				this.launchedApps.set(appName, { info, proc });

				return {
					content: [{
						type: "text" as const,
						text: JSON.stringify({ launched: true, appName, pid: info.pid, command, args, cwd, mockMode, dataDir: this.dataDir }, null, 2),
					}],
				};
			}
		);

		// ── 13. bothub_stop_app ───────────────────────────────────────────
		this.server.tool(
			"bothub_stop_app",
			"Stop a running BotHubSDK app launched via bothub_launch_app.",
			{
				appName: z.enum(["console-app", "dashboard", "iacm-demo"]).describe("App to stop"),
			},
			async ({ appName }) => {
				const launched = this.launchedApps.get(appName);
				if (!launched) {
					return { content: [{ type: "text" as const, text: JSON.stringify({ error: `App '${appName}' is not running.` }) }] };
				}
				try {
					launched.proc.kill("SIGTERM");
					launched.info.status = "stopped";
					this.launchedApps.delete(appName);
					return { content: [{ type: "text" as const, text: JSON.stringify({ stopped: true, appName, pid: launched.info.pid }) }] };
				} catch (error: any) {
					return { content: [{ type: "text" as const, text: JSON.stringify({ error: error.message }) }] };
				}
			}
		);

		// ── 14. bothub_app_status ─────────────────────────────────────────
		this.server.tool(
			"bothub_app_status",
			"Get status and recent logs for launched BotHubSDK apps.",
			{
				appName: z.enum(["console-app", "dashboard", "iacm-demo"]).optional().describe("Specific app. Omit for all apps."),
			},
			async ({ appName }) => {
				if (appName) {
					const launched = this.launchedApps.get(appName);
					if (!launched) {
						return { content: [{ type: "text" as const, text: JSON.stringify({ appName, status: "stopped", pid: null }) }] };
					}
					const uptimeMs = Date.now() - new Date(launched.info.startedAt).getTime();
					return {
						content: [{
							type: "text" as const,
							text: JSON.stringify({
								appName,
								status: launched.info.status,
								pid: launched.info.pid,
								startedAt: launched.info.startedAt,
								uptimeMs,
								uptimeFmt: `${Math.floor(uptimeMs / 60000)}m ${Math.floor((uptimeMs % 60000) / 1000)}s`,
								recentLogs: launched.info.recentLogs.slice(-20),
								exitCode: launched.info.exitCode,
							}, null, 2),
						}],
					};
				}
				// All apps
				const all = KNOWN_APPS.map((name) => {
					const launched = this.launchedApps.get(name);
					if (!launched) return { name, status: "stopped", pid: null };
					const uptimeMs = Date.now() - new Date(launched.info.startedAt).getTime();
					return {
						name,
						status: launched.info.status,
						pid: launched.info.pid,
						startedAt: launched.info.startedAt,
						uptimeMs,
						logCount: launched.info.recentLogs.length,
					};
				});
				return { content: [{ type: "text" as const, text: JSON.stringify({ apps: all, runningCount: all.filter((a) => a.status === "running").length }, null, 2) }] };
			}
		);
	}

	// -----------------------------------------------------------------------
	// RESOURCES (5)
	// -----------------------------------------------------------------------

	private setupResources(): void {
		// 1. Current runtime state
		this.server.resource(
			"bothub-state",
			"bothub://state/current",
			{
				description: "Current BotHub runtime state (status, plugins, chats, counters)",
				mimeType: "application/json",
			},
			async () => ({
				contents: [{
					uri: "bothub://state/current",
					mimeType: "application/json",
					text: JSON.stringify(this.store.getState(), null, 2),
				}],
			})
		);

		// 2. Recent logs
		this.server.resource(
			"bothub-logs",
			"bothub://logs/recent",
			{
				description: "Recent bot log entries (last 200 from circular buffer)",
				mimeType: "application/json",
			},
			async () => ({
				contents: [{
					uri: "bothub://logs/recent",
					mimeType: "application/json",
					text: JSON.stringify(this.store.getState().logs, null, 2),
				}],
			})
		);

		// 3. Recent messages
		this.server.resource(
			"bothub-messages",
			"bothub://messages/recent",
			{
				description: "Recent chat messages received by the bot (last 100)",
				mimeType: "application/json",
			},
			async () => ({
				contents: [{
					uri: "bothub://messages/recent",
					mimeType: "application/json",
					text: JSON.stringify(this.store.getState().messages, null, 2),
				}],
			})
		);

		// 4. App launcher registry
		this.server.resource(
			"bothub-apps",
			"bothub://apps/registry",
			{
				description: "BotHubSDK apps registry: available apps, install status, and runtime state",
				mimeType: "application/json",
			},
			async () => {
				const apps = KNOWN_APPS.map((name) => {
					const launched = this.launchedApps.get(name);
					const exampleDir = path.join(this.sdkDir, "examples", name);
					return {
						name,
						status: launched ? launched.info.status : "stopped",
						pid: launched ? launched.info.pid : null,
						installed: fs.existsSync(path.join(exampleDir, "package.json")),
					};
				});
				return {
					contents: [{
						uri: "bothub://apps/registry",
						mimeType: "application/json",
						text: JSON.stringify({ apps, sdkDir: this.sdkDir, dataDir: this.dataDir }, null, 2),
					}],
				};
			}
		);

		// 5. IACM protocol reference (markdown, for direct context injection)
		this.server.resource(
			"bothub-iacm-protocol",
			"bothub://iacm/reference",
			{
				description: "IACM v1.0 protocol reference: 11 message types, builders, format; same content as bothub_iacm_protocol prompt but as a resource",
				mimeType: "text/markdown",
			},
			async () => ({
				contents: [{
					uri: "bothub://iacm/reference",
					mimeType: "text/markdown",
					text: `# Protocolo IACM v1.0 (SDS-17)

## Tipos de mensaje (11)

| Tipo | Emoji | Uso |
|------|-------|-----|
| REQUEST | 📩 | Solicitar acción a otro agente |
| REPORT | 📊 | Informar resultado de una tarea |
| QUESTION | ❓ | Hacer pregunta que requiere respuesta |
| ANSWER | 💡 | Responder a una QUESTION |
| PROPOSAL | 📝 | Proponer plan/acción para aprobación |
| ACKNOWLEDGE | ✅ | Confirmar recepción de mensaje |
| ACCEPT | 👍 | Aceptar una PROPOSAL |
| REJECT | 👎 | Rechazar una PROPOSAL con razón |
| DEFER | ⏳ | Posponer decisión con plazo |
| FYI | ℹ️ | Información sin acción requerida |
| URGENT | 🚨 | Mensaje prioritario de atención inmediata |

## Uso con MCP

- **Construir mensaje**: \`bothub_send_iacm\` tool
- **Parsear desde texto**: \`bothub_parse_iacm\` tool
- **Spec completa**: \`BotHubSDK/templates/IACM_FORMAT_SPECIFICATION.md\`

## Ejemplo

\`\`\`json
{
  "type": "REQUEST",
  "from_agent": "@aleph",
  "to_agent": "@ox",
  "content": "Necesito auditoría del módulo X",
  "thread_id": "audit-2026-04"
}
\`\`\`
`,
				}],
			})
		);
	}

	// -----------------------------------------------------------------------
	// PROMPTS (3)
	// -----------------------------------------------------------------------

	private setupPrompts(): void {
		// ── 1. Guide to create a BotPlugin ─────────────────────────────────
		this.server.prompt(
			"bothub_create_plugin",
			"Step-by-step guide to create a new BotPlugin for the Telegram bot",
			{},
			async () => ({
				messages: [{
					role: "assistant" as const,
					content: {
						type: "text" as const,
						text: `# Cómo crear un BotPlugin para BotHubSDK

## 1. Crear el archivo del plugin

\`\`\`typescript
// src/plugins/my-plugin.ts
import type { BotPlugin } from "heteronimos-semi-asistidos-sdk";
import type { Context } from "grammy";

export const myPlugin: BotPlugin = {
  name: "My Plugin",
  pluginCode: "my",  // Prefijo para comandos: my_xxx

  commands: [
    { command: "my_hello", description: "Saluda al usuario" },
  ],

  setup(bot, tracker, emitter) {
    bot.command("my_hello", async (ctx: Context) => {
      await ctx.reply("¡Hola desde MyPlugin!");
    });
  },
};
\`\`\`

## 2. Registrar en bootBot()

Añade el plugin al array \`plugins\` en las opciones de \`bootBot()\`.

## 3. Tips
- \`pluginCode\` debe ser único y corto (2-4 chars)
- Todos los comandos deben empezar con \`{pluginCode}_\`
- Usa \`tracker\` para acceder a chats conocidos
- Usa \`emitter\` para emitir eventos al dashboard/MCP server
`,
					},
				}],
			})
		);

		// ── 2. IACM protocol reference ─────────────────────────────────────
		this.server.prompt(
			"bothub_iacm_protocol",
			"Reference for the IACM inter-agent communication protocol with all message types and builders",
			{
				messageType: z.enum([
					"REQUEST", "REPORT", "QUESTION", "ANSWER",
					"PROPOSAL", "ACKNOWLEDGE", "ACCEPT", "REJECT",
					"DEFER", "FYI", "URGENT", "ALL",
				]).optional().describe("Specific type to explain, or ALL for complete reference"),
			},
			async ({ messageType }) => ({
				messages: [{
					role: "assistant" as const,
					content: {
						type: "text" as const,
						text: `# Protocolo IACM v1.0 (SDS-17)

## Tipos de mensaje (11)

| Tipo | Emoji | Uso |
|------|-------|-----|
| REQUEST | 📩 | Solicitar acción a otro agente |
| REPORT | 📊 | Informar resultado de una tarea |
| QUESTION | ❓ | Hacer pregunta que requiere respuesta |
| ANSWER | 💡 | Responder a una QUESTION |
| PROPOSAL | 📝 | Proponer plan/acción para aprobación |
| ACKNOWLEDGE | ✅ | Confirmar recepción de mensaje |
| ACCEPT | 👍 | Aceptar una PROPOSAL |
| REJECT | 👎 | Rechazar una PROPOSAL con razón |
| DEFER | ⏳ | Posponer decisión con plazo |
| FYI | ℹ️ | Información sin acción requerida |
| URGENT | 🚨 | Mensaje prioritario que requiere atención inmediata |

## Usar con tool bothub_send_iacm

\`\`\`json
{
  "type": "REQUEST",
  "from_agent": "@aleph",
  "to_agent": "@ox",
  "content": "Necesito auditoría del módulo X",
  "thread_id": "audit-2026-04"
}
\`\`\`

Parseable con \`bothub_parse_iacm\`.
`,
					},
				}],
			})
		);

		// ── 3. Troubleshooting guide ───────────────────────────────────────
		this.server.prompt(
			"bothub_troubleshoot",
			"Diagnose common BotHub problems (boot failures, missing token, connection issues)",
			{
				symptom: z.enum(["boot-fails", "no-messages", "mock-only", "mesh-disconnected", "other"])
					.optional().describe("Symptom to diagnose"),
			},
			async ({ symptom }) => ({
				messages: [{
					role: "assistant" as const,
					content: {
						type: "text" as const,
						text: `# Diagnóstico BotHub

## Pasos generales

1. **Verificar estado**: \`bothub_status\` — ¿botStatus es "running"?
2. **Ver logs**: recurso \`bothub://logs/recent\` — buscar errores
3. **Verificar boot**: ¿\`bothub_boot\` devolvió \`started: true\`?

## Problemas comunes

### Bot arranca en mock siempre
- Verificar que \`BotHubSDK/.env\` existe con \`BOT_TOKEN=...\`
- O pasar \`envDir\` a \`bothub_boot\` apuntando al directorio correcto

### No llegan mensajes
- En mock mode: usar \`bothub_execute_command\` para simular
- En real mode: verificar que el webhook de Telegram está eliminado (el boot lo hace)

### Mesh desconectado
- Verificar que \`mcp-channels-sdk/ws-server\` está corriendo en puerto 3000
- Ver task \`CHS: Start [Server]\`

### Boot falla del todo
- Ver logs con recurso \`bothub://logs/recent\`
- Probablemente falta npm install o el dist de BotHubSDK no existe
- Ejecutar: \`cd BotHubSDK && bunx tsc -p tsconfig.build.json\`
`,
					},
				}],
			})
		);
	}
}

// ---------------------------------------------------------------------------
// Standalone bootstrap (same pattern as MCPPrologServer.ts)
// ---------------------------------------------------------------------------

const server = new MCPBotHubServer();
server.start().catch((error) => {
	l.e("Failed to start MCPBotHubServer", { error });
	process.exit(1);
});
