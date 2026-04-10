#!/usr/bin/env node
/**
 * MCPFirehoseServer — Bluesky AT Protocol Firehose + ONFALO CDR Labeling
 *
 * Pipeline: Jetstream WebSocket → Quality Filter → ONFALO Autoetiquetado → Ring Buffer
 * Exposes labeled posts via MCP tools and resources.
 *
 * @épica FIREHOSE-LABELER-1.0.0
 */

import { BaseMCPServer } from "./BaseMCPServer";
import { DEFAULT_FIREHOSE_MCP_SERVER_CONFIG } from "./configs/DEFAULT_FIREHOSE_MCP_SERVER_CONFIG";
import { FirehoseConsumerService, FirehoseConsumerModesEnum, JetstreamEvent } from "./services/FirehoseConsumerService";
import { FirehoseFilterEngine } from "./services/FirehoseFilterEngine";
import { OntaloLabelerService, LabeledPost } from "./services/OntaloLabelerService";
import { BlueskyAuthService } from "./services/BlueskyAuthService";
import { AlephScriptClient } from "./libs/alephscript-client";
import { l } from "./Logger";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

function getHash(key: string): string {
	const h = (s: string) => s.substring(s.length - 2);
	const a = new Date().getTime().toString();
	const b = Math.random().toString();
	return key + ">" + h(a) + h(b);
}

export class MCPFirehoseServer extends BaseMCPServer {
	private consumer: FirehoseConsumerService;
	private filterEngine: FirehoseFilterEngine;
	private labeler: OntaloLabelerService;
	private bsky: BlueskyAuthService;
	private icariaBot!: AlephScriptClient;

	// Ring buffer of labeled posts
	private labeledBuffer: LabeledPost[] = [];
	private readonly BUFFER_SIZE = parseInt(process.env.FIREHOSE_BUFFER_SIZE || "500", 10);

	// Ring buffer of raw filtered events (no labeling, for Node-RED delegation)
	private rawBuffer: JetstreamEvent[] = [];
	private rawBufferCursor = 0; // monotonic counter for polling

	// DID → handle cache (populated lazily via PLC Directory, persisted to disk)
	private didCache = new Map<string, string>();
	private readonly DID_CACHE_PATH = path.resolve(__dirname, "..", "data", "did-cache.json");
	private didCacheDirty = false;
	private didCacheSaveTimer: ReturnType<typeof setInterval> | null = null;
	private readonly DID_CACHE_SAVE_INTERVAL_MS = 30_000; // auto-save every 30s

	// Pipeline stats
	private pipelineStats = {
		received: 0,
		filtered: 0,
		labeled: 0,
		errors: 0,
		startedAt: "",
	};

	constructor() {
		super(DEFAULT_FIREHOSE_MCP_SERVER_CONFIG);

		this.consumer = new FirehoseConsumerService({
			jetstreamUrl: process.env.JETSTREAM_URL || "wss://jetstream1.us-east.bsky.network/subscribe",
			collections: ["app.bsky.feed.post"],
			reconnectDelayMs: 3000,
			maxReconnectAttempts: 20,
		});

		this.filterEngine = new FirehoseFilterEngine({
			minTextLength: parseInt(process.env.FILTER_MIN_TEXT_LENGTH || "80", 10),
			maxTextLength: 2000,
			languages: (process.env.FILTER_LANGUAGES || "es").split(","),
		});

		this.labeler = new OntaloLabelerService();
		this.bsky = new BlueskyAuthService();

		// Load persisted DID cache
		this.loadDidCache();

		// Wire the pipeline
		this.consumer.onEvent(async (event) => this.handleFirehoseEventNoProcessing(event));

		// Initialize IcariaBot for Socket.IO mesh
		// this.initIcariaBot();

		l.info("MCPFirehoseServer initialized");
	}

	// --- DID cache persistence ---

	private loadDidCache(): void {
		try {
			if (fs.existsSync(this.DID_CACHE_PATH)) {
				const raw = fs.readFileSync(this.DID_CACHE_PATH, "utf-8");
				const entries: [string, string][] = JSON.parse(raw);
				for (const [k, v] of entries) {
					this.didCache.set(k, v);
				}
				l.info(`DID cache loaded: ${this.didCache.size} entries`, { path: this.DID_CACHE_PATH });
			}
		} catch (err) {
			l.w("Failed to load DID cache, starting fresh", { error: String(err) });
		}

		// Start periodic auto-save
		this.didCacheSaveTimer = setInterval(() => this.saveDidCache(), this.DID_CACHE_SAVE_INTERVAL_MS);
	}

	private saveDidCache(): void {
		if (!this.didCacheDirty) return;
		try {
			const dir = path.dirname(this.DID_CACHE_PATH);
			if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
			fs.writeFileSync(this.DID_CACHE_PATH, JSON.stringify([...this.didCache.entries()], null, 2));
			this.didCacheDirty = false;
			l.d(`DID cache saved: ${this.didCache.size} entries`);
		} catch (err) {
			l.w("Failed to save DID cache", { error: String(err) });
		}
	}

	private initIcariaBot(): void {
		try {
			const socketUrl = process.env.SOCKET_MESH_URL || "http://localhost:3010";
			const serverName = DEFAULT_FIREHOSE_MCP_SERVER_CONFIG.id;

			this.icariaBot = new AlephScriptClient(serverName, socketUrl);

			this.icariaBot.initTriggersDefinition.push(() => {
				const ROOM_NAME = serverName + "_ROOM";
				const REGISTER_PAYLOAD = {
					usuario: this.icariaBot.name,
					sesion: getHash("IcariaBot"),
				};

				this.icariaBot.io.emit("CLIENT_REGISTER", REGISTER_PAYLOAD);
				this.icariaBot.io.emit("CLIENT_SUSCRIBE", { room: ROOM_NAME });
				this.icariaBot.room("MAKE_MASTER", {
					features: [
						"FIREHOSE_START",
						"FIREHOSE_STOP",
						"FIREHOSE_GET_LABELED",
						"FIREHOSE_GET_STATS",
					],
				}, ROOM_NAME);

				this.icariaBot.io.on("GET_FIREHOSE_LABELED", () => {
					const recent = this.getRecentLabeled(20);
					this.icariaBot.room("SET_FIREHOSE_LABELED", { posts: recent }, ROOM_NAME);
				});

				this.icariaBot.io.on("GET_FIREHOSE_STATS", () => {
					this.icariaBot.room("SET_FIREHOSE_STATS", this.getFullStats(), ROOM_NAME);
				});

				l.info("IcariaBot initialized and connected to AlephScript mesh", {
					botName: serverName,
					room: ROOM_NAME,
					socketUrl,
				});
			});
		} catch (error) {
			l.e("Failed to initialize IcariaBot", { error });
		}
	}

	protected setupServerSpecifics(): void {
		this.setupTools();
		this.setupResources();

		if (this.icariaBot) {
			l.info("Connecting IcariaBot to AlephScript mesh...");
			this.icariaBot.connect();
		}

		l.info("MCPFirehoseServer tools and resources registered");
	}

	// --- Resolve DID → handle (PLC Directory, with in-memory cache) ---
	private async resolveHandle(did: string): Promise<string> {
		const cached = this.didCache.get(did);
		if (cached !== undefined) return cached;

		try {
			const res = await fetch(`https://plc.directory/${encodeURIComponent(did)}`);
			if (res.ok) {
				const doc = await res.json() as { alsoKnownAs?: string[] };
				const atUri = doc.alsoKnownAs?.[0];
				const handle = atUri ? atUri.replace("at://", "") : did;
				this.didCache.set(did, handle);
				this.didCacheDirty = true;
				return handle;
			}
		} catch {
			// Network error — keep DID as fallback
		}

		this.didCache.set(did, did);
		this.didCacheDirty = true;
		return did;
	}

	// --- Pipeline handler (raw mode: filter only, no labeling) ---
	private async handleFirehoseEventNoProcessing(event: JetstreamEvent): Promise<void> {
		this.pipelineStats.received++;

		const filterResult = this.filterEngine.evaluate(event);
		if (!filterResult.passed) {
			this.pipelineStats.filtered++;
			return;
		}

		// Resolve handle (cache hit = sync; miss = PLC Directory fetch)
		event.handle = await this.resolveHandle(event.did);

		// Buffer raw filtered event — no labeling, delegation to downstream (Node-RED)
		this.rawBuffer.push(event);
		this.rawBufferCursor++;
		if (this.rawBuffer.length > this.BUFFER_SIZE) {
			this.rawBuffer.shift();
		}
	}

	private async handleFirehoseEvent(event: JetstreamEvent): Promise<void> {
		this.pipelineStats.received++;

		const filterResult = this.filterEngine.evaluate(event);
		if (!filterResult.passed) {
			this.pipelineStats.filtered++;
			return;
		}

		const record = event.commit?.record;
		if (!record?.text) {
			this.pipelineStats.errors++;
			return;
		}

		// Resolve handle (cache hit = sync; miss = PLC Directory fetch)
		const handle = await this.resolveHandle(event.did);

		const labeled = this.labeler.labelPost(
			record.text,
			event.did,
			event.commit!.rkey,
			event.commit!.collection,
			record.createdAt || new Date().toISOString(),
			record.langs || [],
			!!record.reply,
			filterResult.passedRules,
		);

		if (!labeled) {
			this.pipelineStats.errors++;
			return;
		}

		// Attach resolved handle to labeled post
		labeled.handle = handle;

		// Ring buffer
		this.labeledBuffer.push(labeled);
		if (this.labeledBuffer.length > this.BUFFER_SIZE) {
			this.labeledBuffer.shift();
		}

		this.pipelineStats.labeled++;
	}

	// --- Helpers ---

	private getRecentLabeled(limit: number, minScore?: number, sortBy?: string): LabeledPost[] {
		let posts = [...this.labeledBuffer];

		if (minScore !== undefined) {
			posts = posts.filter(p => p.cdr_summary.overall_quality_score >= minScore);
		}

		if (sortBy === "quality") {
			posts.sort((a, b) => b.cdr_summary.overall_quality_score - a.cdr_summary.overall_quality_score);
		} else {
			// newest first
			posts.reverse();
		}

		return posts.slice(0, limit);
	}

	private getFullStats() {
		return {
			pipeline: this.pipelineStats,
			consumer: this.consumer.getStats(),
			consumerStatus: this.consumer.getStatus(),
			consumerMode: this.consumer.getMode(),
			consumerPaused: this.consumer.getIsPaused(),
			filter: this.filterEngine.getStats(),
			labeler: this.labeler.getStats(),
			bufferSize: this.labeledBuffer.length,
			bufferCapacity: this.BUFFER_SIZE,
			rawBufferSize: this.rawBuffer.length,
			rawBufferCursor: this.rawBufferCursor,
		};
	}

	// --- MCP Tools ---

	private setupTools(): void {
		// Tool: Start firehose
		this.server.tool(
			"firehose_start",
			"Start consuming the Bluesky AT Protocol firehose via Jetstream. Modes: STREAM (continuous), N_FIRST (fixed batch then pause), N_FIRST_INTERVAL (batches on a timer).",
			{
				jetstreamUrl: z.string().optional().describe("Jetstream WebSocket URL (default: wss://jetstream1.us-east.bsky.network/subscribe). Try jetstream2 if jetstream1 returns 503."),
				collections: z.array(z.string()).optional().describe("Collections to watch (default: app.bsky.feed.post)"),
				languages: z.array(z.string()).optional().describe("Language filter (default: [\"es\"]). Use [\"*\"] for all."),
				mode: z.enum(["STREAM", "N_FIRST", "N_FIRST_INTERVAL"]).optional().describe("Consumer mode (default: STREAM)"),
				quantity: z.number().optional().describe("N_FIRST: batch size. N_FIRST_INTERVAL: interval in ms between batches."),
				batchSize: z.number().optional().describe("N_FIRST_INTERVAL only: messages per interval batch (default: quantity or 50)"),
			},
			async ({ jetstreamUrl, collections, languages, mode, quantity, batchSize }) => {
				if (jetstreamUrl) {
					this.consumer.updateConfig({ jetstreamUrl });
				}
				if (collections) {
					this.consumer.updateConfig({ collections });
				}
				if (languages) {
					this.filterEngine.updateConfig({ languages });
				}
				if (mode) {
					this.consumer.updateMode({
						mode: FirehoseConsumerModesEnum[mode],
						quantity,
						batchSize,
					});
				}
				this.pipelineStats.startedAt = new Date().toISOString();
				this.consumer.start();
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							success: true,
							status: "started",
							consumerConfig: this.consumer.getConfig(),
							consumerMode: this.consumer.getMode(),
							filterLanguages: this.filterEngine.getConfig().languages,
						}, null, 2),
					}],
				};
			},
		);

		// Tool: Stop firehose
		this.server.tool(
			"firehose_stop",
			"Stop the firehose consumer",
			{},
			async () => {
				this.consumer.stop();
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							success: true,
							status: "stopped",
							finalStats: this.getFullStats(),
						}, null, 2),
					}],
				};
			},
		);

		// Tool: Resume firehose (after N_FIRST batch pause)
		this.server.tool(
			"firehose_resume",
			"Resume the firehose consumer after a batch pause (N_FIRST / N_FIRST_INTERVAL mode)",
			{},
			async () => {
				const wasPaused = this.consumer.getIsPaused();
				this.consumer.resume();
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							success: wasPaused,
							status: wasPaused ? "resumed" : "was_not_paused",
							consumerStatus: this.consumer.getStatus(),
							mode: this.consumer.getMode(),
						}, null, 2),
					}],
				};
			},
		);

		// Tool: Configure consumer mode at runtime
		this.server.tool(
			"firehose_configure_mode",
			"Change the firehose consumer mode at runtime. STREAM: continuous. N_FIRST: fixed batch then pause (call firehose_resume to continue). N_FIRST_INTERVAL: auto-batches on a timer.",
			{
				mode: z.enum(["STREAM", "N_FIRST", "N_FIRST_INTERVAL"]).describe("Consumer mode"),
				quantity: z.number().optional().describe("N_FIRST: batch size. N_FIRST_INTERVAL: interval in ms."),
				batchSize: z.number().optional().describe("N_FIRST_INTERVAL only: messages per batch (default: 50)"),
			},
			async ({ mode, quantity, batchSize }) => {
				this.consumer.updateMode({
					mode: FirehoseConsumerModesEnum[mode],
					quantity,
					batchSize,
				});
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							success: true,
							mode: this.consumer.getMode(),
							consumerStatus: this.consumer.getStatus(),
							hint: mode === "N_FIRST"
								? "Consumer will pause after receiving the batch. Call firehose_resume to get the next batch."
								: mode === "N_FIRST_INTERVAL"
									? `Consumer will auto-resume every ${quantity ?? 10000}ms, fetching ${batchSize ?? quantity ?? 50} messages per batch.`
									: "Continuous streaming enabled.",
						}, null, 2),
					}],
				};
			},
		);

		// Tool: Get raw filtered events (for Node-RED delegation — no labeling)
		this.server.tool(
			"firehose_get_raw",
			"Get raw filtered events from the buffer (no labeling applied). Use 'since' cursor for incremental polling.",
			{
				limit: z.number().min(1).max(200).optional().describe("Max events to return (default 50)"),
				since: z.number().optional().describe("Cursor from previous call — only returns events after this cursor"),
			},
			async ({ limit, since }) => {
				const maxItems = limit ?? 50;
				let events: JetstreamEvent[];
				let newCursor: number;

				if (since !== undefined) {
					// Incremental: return events added after 'since' cursor
					const offset = this.rawBufferCursor - this.rawBuffer.length;
					const startIdx = Math.max(0, since - offset);
					events = this.rawBuffer.slice(startIdx, startIdx + maxItems);
					newCursor = this.rawBufferCursor;
				} else {
					// Snapshot: return last N events
					events = this.rawBuffer.slice(-maxItems);
					newCursor = this.rawBufferCursor;
				}

				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							count: events.length,
							cursor: newCursor,
							bufferSize: this.rawBuffer.length,
							events,
						}, null, 2),
					}],
				};
			},
		);

		// Tool: Get stats
		this.server.tool(
			"firehose_get_stats",
			"Get pipeline statistics (received/filtered/labeled counts)",
			{},
			async () => {
				return {
					content: [{
						type: "text",
						text: JSON.stringify(this.getFullStats(), null, 2),
					}],
				};
			},
		);

		// Tool: Get labeled posts
		this.server.tool(
			"firehose_get_labeled",
			"Get recent labeled posts from the ring buffer",
			{
				limit: z.number().min(1).max(100).optional().describe("Number of posts (default 20)"),
				minQualityScore: z.number().min(0).max(100).optional().describe("Minimum CDR quality score"),
				sortBy: z.enum(["newest", "quality"]).optional().describe("Sort order (default: newest)"),
			},
			async ({ limit, minQualityScore, sortBy }) => {
				const posts = this.getRecentLabeled(limit ?? 20, minQualityScore, sortBy);
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							count: posts.length,
							bufferSize: this.labeledBuffer.length,
							posts,
						}, null, 2),
					}],
				};
			},
		);

		// Tool: Label arbitrary text (on-demand, no firehose)
		this.server.tool(
			"firehose_label_text",
			"Run ONFALO CDR labeler on provided text (on-demand, without firehose)",
			{
				text: z.string().min(1).describe("Text to analyze"),
				agente: z.string().optional().describe("Agent slug (default: texto-libre)"),
			},
			async ({ text, agente }) => {
				const result = this.labeler.labelText(text, agente);
				return {
					content: [{
						type: "text",
						text: JSON.stringify(result, null, 2),
					}],
				};
			},
		);

		// Tool: Configure filter
		this.server.tool(
			"firehose_configure_filter",
			"Update filter engine configuration at runtime",
			{
				minTextLength: z.number().optional().describe("Minimum text length (default 80)"),
				languages: z.array(z.string()).optional().describe("Language filter array"),
				minSubstantiveWords: z.number().optional().describe("Min content words (default 5)"),
				disableRule: z.string().optional().describe("Rule ID to disable"),
				enableRule: z.string().optional().describe("Rule ID to enable"),
			},
			async ({ minTextLength, languages, minSubstantiveWords, disableRule, enableRule }) => {
				if (minTextLength || languages || minSubstantiveWords) {
					this.filterEngine.updateConfig({
						...(minTextLength !== undefined && { minTextLength }),
						...(languages !== undefined && { languages }),
						...(minSubstantiveWords !== undefined && { minSubstantiveWords }),
					});
				}
				if (disableRule) this.filterEngine.setRuleEnabled(disableRule, false);
				if (enableRule) this.filterEngine.setRuleEnabled(enableRule, true);

				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							success: true,
							config: this.filterEngine.getConfig(),
							rules: this.filterEngine.getRules(),
						}, null, 2),
					}],
				};
			},
		);

		// Tool: Get filter rules
		this.server.tool(
			"firehose_get_filter_rules",
			"List all current filter rules with enabled state and stats",
			{},
			async () => {
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							rules: this.filterEngine.getRules(),
							stats: this.filterEngine.getStats(),
							config: this.filterEngine.getConfig(),
						}, null, 2),
					}],
				};
			},
		);

		// Tool: Add Prolog rule (via HTTP to Prolog server)
		this.server.tool(
			"firehose_add_prolog_rule",
			"Add a Prolog-based filter rule via the Prolog MCP server (port 3006)",
			{
				ruleName: z.string().describe("Name for the Prolog rule"),
				prologContent: z.string().describe("Prolog rule content (e.g., 'calidad_minima :- post_text_length(L), L > 100.')"),
			},
			async ({ ruleName, prologContent }) => {
				const prologUrl = process.env.PROLOG_SERVER_URL || "http://localhost:3006";
				try {
					const response = await fetch(`${prologUrl}/mcp`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							jsonrpc: "2.0",
							id: Date.now(),
							method: "tools/call",
							params: {
								name: "prolog_save_rule_to_db",
								arguments: {
									name: ruleName,
									content: prologContent,
									app: "firehose-filter",
								},
							},
						}),
					});
					const result = await response.json();
					return {
						content: [{
							type: "text",
							text: JSON.stringify({
								success: true,
								ruleName,
								prologServerUrl: prologUrl,
								result,
								hint: "Rule stored in Prolog KB. Load into session with prolog_load_rules_from_db.",
							}, null, 2),
						}],
					};
				} catch (error: any) {
					return {
						content: [{
							type: "text",
							text: JSON.stringify({
								success: false,
								error: error.message,
								prologServerUrl: prologUrl,
								hint: "Ensure Prolog MCP server is running on port 3006",
							}, null, 2),
						}],
					};
				}
			},
		);

		// ============================================
		// Via C — Bot Tools (Bluesky posting)
		// Requires BSKY_IDENTIFIER and BSKY_PASSWORD env vars
		// ============================================

		// Tool: Authenticate with Bluesky
		this.server.tool(
			"firehose_bsky_login",
			"Authenticate with Bluesky using app password (set BSKY_IDENTIFIER and BSKY_PASSWORD env vars)",
			{
				identifier: z.string().optional().describe("Bluesky handle (e.g. escrivivir.co). Overrides BSKY_IDENTIFIER env var."),
				password: z.string().optional().describe("App password. Overrides BSKY_PASSWORD env var."),
			},
			async ({ identifier, password }) => {
				if (identifier || password) {
					this.bsky = new BlueskyAuthService({
						identifier: identifier || process.env.BSKY_IDENTIFIER,
						password: password || process.env.BSKY_PASSWORD,
					});
				}
				const success = await this.bsky.createSession();
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							success,
							did: this.bsky.getDid(),
							handle: this.bsky.getHandle(),
							hint: success
								? "Authenticated. You can now use firehose_post_digest and firehose_reply_cdr."
								: "Failed. Check identifier/password. Use an App Password from bsky.app Settings > App Passwords.",
						}, null, 2),
					}],
				};
			},
		);

		// Tool: Post CDR digest (top N posts summary)
		this.server.tool(
			"firehose_post_digest",
			"Post a CDR quality digest to Bluesky (top posts from the buffer, summarized)",
			{
				count: z.number().min(1).max(10).optional().describe("Number of top posts to include (default 5)"),
				minQualityScore: z.number().optional().describe("Minimum CDR score to include"),
				dryRun: z.boolean().optional().describe("If true, return the post text without publishing"),
			},
			async ({ count, minQualityScore, dryRun }) => {
				const topPosts = this.getRecentLabeled(count ?? 5, minQualityScore, "quality");

				if (topPosts.length === 0) {
					return {
						content: [{
							type: "text",
							text: JSON.stringify({ success: false, error: "No labeled posts in buffer. Start firehose first." }, null, 2),
						}],
					};
				}

				// Build digest text (max 300 chars for Bluesky)
				const header = `ONFALO CDR Digest (${topPosts.length} posts)\n`;
				const lines = topPosts.map((p, i) => {
					const score = p.cdr_summary.overall_quality_score;
					const preview = p.text.substring(0, 60).replace(/\n/g, " ");
					return `${i + 1}. [${score}] ${preview}...`;
				});

				let digestText = header + lines.join("\n");
				// Bluesky post limit is 300 graphemes
				if (digestText.length > 295) {
					digestText = digestText.substring(0, 292) + "...";
				}

				if (dryRun) {
					return {
						content: [{
							type: "text",
							text: JSON.stringify({ dryRun: true, text: digestText, length: digestText.length }, null, 2),
						}],
					};
				}

				if (!this.bsky.isAuthenticated()) {
					return {
						content: [{
							type: "text",
							text: JSON.stringify({ success: false, error: "Not authenticated. Call firehose_bsky_login first." }, null, 2),
						}],
					};
				}

				const result = await this.bsky.createPost(digestText, ["es"]);
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							success: !!result,
							uri: result?.uri,
							cid: result?.cid,
							text: digestText,
							postsIncluded: topPosts.length,
						}, null, 2),
					}],
				};
			},
		);

		// Tool: Reply to a post with its CDR label
		this.server.tool(
			"firehose_reply_cdr",
			"Reply to a Bluesky post with its ONFALO CDR nutritional label",
			{
				postUri: z.string().describe("at:// URI of the post to reply to"),
				dryRun: z.boolean().optional().describe("If true, return the reply text without publishing"),
			},
			async ({ postUri, dryRun }) => {
				// Find the post in our buffer
				let labeled = this.labeledBuffer.find(p => p.uri === postUri);

				// If not in buffer, try to fetch and label it on the fly
				if (!labeled && this.bsky.isAuthenticated()) {
					const postData = await this.bsky.getPost(postUri);
					if (postData?.value?.text) {
						const parts = postUri.replace("at://", "").split("/");
						const etiqueta = this.labeler.labelText(postData.value.text, parts[0]);
						// Build a synthetic LabeledPost for the reply text
						labeled = {
							did: parts[0],
							rkey: parts[2] || "",
							uri: postUri,
							collection: "app.bsky.feed.post",
							text: postData.value.text,
							createdAt: postData.value.createdAt || "",
							langs: postData.value.langs || [],
							isReply: false,
							labeledAt: new Date().toISOString(),
							labelingMethod: "autoetiquetado-v1-inline",
							nivel: 0,
							agente: parts[0],
							nutricion: etiqueta.nutricion,
							metadata: { palabras_analizadas: etiqueta.metadata.palabras_analizadas, filterRulesPassed: [] },
							cdr_summary: etiqueta.cdr_summary,
						};
					}
				}

				if (!labeled) {
					return {
						content: [{
							type: "text",
							text: JSON.stringify({ success: false, error: "Post not found in buffer and could not fetch. Provide a valid at:// URI." }, null, 2),
						}],
					};
				}

				// Build CDR reply text
				const n = labeled.nutricion;
				const replyText = [
					`Etiqueta nutricional ONFALO (CDR):`,
					`Pensamiento critico: ${n.pensamiento_critico.cdr_porcentaje}% ${n.pensamiento_critico.valor}`,
					`Pluralidad: ${n.pluralidad.cdr_porcentaje}% ${n.pluralidad.valor}`,
					`Transparencia: ${n.transparencia.cdr_porcentaje}% ${n.transparencia.valor}`,
					`Autonomia: ${n.autonomia.cdr_porcentaje}% ${n.autonomia.valor}`,
					`Complacencia: ${n.complacencia.cdr_porcentaje}% ${n.complacencia.valor}`,
					`Score: ${labeled.cdr_summary.overall_quality_score}/100`,
				].join("\n");

				if (dryRun) {
					return {
						content: [{
							type: "text",
							text: JSON.stringify({ dryRun: true, text: replyText, length: replyText.length, postUri }, null, 2),
						}],
					};
				}

				if (!this.bsky.isAuthenticated()) {
					return {
						content: [{
							type: "text",
							text: JSON.stringify({ success: false, error: "Not authenticated. Call firehose_bsky_login first." }, null, 2),
						}],
					};
				}

				// Need CID for reply
				const postData = await this.bsky.getPost(postUri);
				if (!postData) {
					return {
						content: [{
							type: "text",
							text: JSON.stringify({ success: false, error: "Could not fetch post CID for reply." }, null, 2),
						}],
					};
				}

				const result = await this.bsky.createReply(
					replyText,
					postData.uri,
					postData.cid,
					undefined,
					undefined,
					["es"],
				);

				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							success: !!result,
							replyUri: result?.uri,
							replyCid: result?.cid,
							text: replyText,
							originalPost: postUri,
						}, null, 2),
					}],
				};
			},
		);

		l.info("MCPFirehoseServer: 14 tools registered");
	}

	// --- MCP Resources ---

	private setupResources(): void {
		// Resource: Pipeline status
		this.server.resource(
			"firehose-status",
			"firehose://status",
			{
				description: "Current firehose consumer status and pipeline statistics",
				mimeType: "application/json",
			},
			async () => ({
				contents: [{
					uri: "firehose://status",
					mimeType: "application/json",
					text: JSON.stringify(this.getFullStats(), null, 2),
				}],
			}),
		);

		// Resource: Recent labeled posts
		this.server.resource(
			"firehose-labeled-recent",
			"firehose://labeled/recent",
			{
				description: "Last 20 labeled posts from the firehose pipeline",
				mimeType: "application/json",
			},
			async () => ({
				contents: [{
					uri: "firehose://labeled/recent",
					mimeType: "application/json",
					text: JSON.stringify(this.getRecentLabeled(20), null, 2),
				}],
			}),
		);

		// Resource: Top quality posts
		this.server.resource(
			"firehose-labeled-top-quality",
			"firehose://labeled/top-quality",
			{
				description: "Top 20 posts by CDR quality score",
				mimeType: "application/json",
			},
			async () => ({
				contents: [{
					uri: "firehose://labeled/top-quality",
					mimeType: "application/json",
					text: JSON.stringify(this.getRecentLabeled(20, undefined, "quality"), null, 2),
				}],
			}),
		);

		// Resource: Filter rules
		this.server.resource(
			"firehose-filter-rules",
			"firehose://filter/rules",
			{
				description: "Current filter rules configuration and stats",
				mimeType: "application/json",
			},
			async () => ({
				contents: [{
					uri: "firehose://filter/rules",
					mimeType: "application/json",
					text: JSON.stringify({
						rules: this.filterEngine.getRules(),
						stats: this.filterEngine.getStats(),
						config: this.filterEngine.getConfig(),
					}, null, 2),
				}],
			}),
		);

		l.info("MCPFirehoseServer: 4 resources registered");
	}

	async shutdown(): Promise<void> {
		this.consumer.stop();
		if (this.didCacheSaveTimer) clearInterval(this.didCacheSaveTimer);
		this.saveDidCache(); // persist on shutdown
		await super.shutdown();
	}
}

// Entry point
if (require.main === module) {
	process.on("uncaughtException", (error) => {
		l.e("Uncaught exception in MCPFirehoseServer", { error: error.message, stack: error.stack });
	});

	process.on("unhandledRejection", (reason) => {
		l.e("Unhandled rejection in MCPFirehoseServer", { reason: String(reason) });
	});

	const server = new MCPFirehoseServer();
	server.start();
}

export default MCPFirehoseServer;
