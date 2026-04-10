/**
 * FirehoseConsumerService — Bluesky Jetstream WebSocket consumer
 *
 * Connects to Jetstream (lightweight JSON proxy of the AT Protocol firehose)
 * and emits parsed events via callbacks.
 *
 * Jetstream docs: https://docs.bsky.app/blog/jetstream
 * Public endpoints:
 *   wss://jetstream1.us-east.bsky.network/subscribe
 *   wss://jetstream2.us-east.bsky.network/subscribe
 */

import WebSocket from "ws";

// Simple console logger with timestamps
const LOG_PREFIX = "[FirehoseConsumer]";
const log = {
	info: (msg: string, data?: any) => console.log(`${new Date().toISOString()} ${LOG_PREFIX} ℹ️  ${msg}`, data ?? ""),
	warn: (msg: string, data?: any) => console.warn(`${new Date().toISOString()} ${LOG_PREFIX} ⚠️  ${msg}`, data ?? ""),
	error: (msg: string, data?: any) => console.error(`${new Date().toISOString()} ${LOG_PREFIX} ❌ ${msg}`, data ?? ""),
	debug: (msg: string, data?: any) => console.log(`${new Date().toISOString()} ${LOG_PREFIX} 🔍 ${msg}`, data ?? ""),
	success: (msg: string, data?: any) => console.log(`${new Date().toISOString()} ${LOG_PREFIX} ✅ ${msg}`, data ?? ""),
};

// --- Types ---

export interface JetstreamEvent {
	did: string;
	handle?: string;         // Resolved via PLC Directory (may be undefined until cached)
	time_us: number;
	kind: "commit" | "identity" | "account";
	commit?: {
		rev: string;
		operation: "create" | "update" | "delete";
		collection: string;
		rkey: string;
		record?: {
			$type: string;
			text?: string;
			createdAt?: string;
			reply?: { parent: { uri: string; cid: string }; root: { uri: string; cid: string } };
			embed?: unknown;
			langs?: string[];
			facets?: unknown[];
		};
		cid?: string;
	};
}

export enum FirehoseConsumerModesEnum {
	STREAM,
	N_FIRST,				// quantity: number of messages for batch
	N_FIRST_INTERVAL		// quantity: milliseconds between batches
}

export interface FirehoseConsumerModes {
	mode: FirehoseConsumerModesEnum;
	/** N_FIRST: batch size. N_FIRST_INTERVAL: interval in ms between batches */
	quantity?: number;
	/** N_FIRST_INTERVAL only: how many messages per interval batch (defaults to quantity or 50) */
	batchSize?: number;
}

export interface FirehoseConsumerConfig {
	jetstreamUrl: string;
	collections: string[];
	dids?: string[];
	reconnectDelayMs: number;
	maxReconnectAttempts: number;
	mode: FirehoseConsumerModes
}

export type FirehoseEventCallback = (event: JetstreamEvent) => void;

// --- Service ---

export interface ConnectionError {
	timestamp: string;
	type: "ws_error" | "parse_error" | "connect_error";
	message: string;
	url?: string;
}

export class FirehoseConsumerService {
	private ws: WebSocket | null = null;
	private isRunning = false;
	private shouldReconnect = true;
	private reconnectCount = 0;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private callbacks: FirehoseEventCallback[] = [];
	private stats = { received: 0, parsed: 0, errors: 0 };
	private config: FirehoseConsumerConfig;

	// Mode state
	private batchCount = 0;
	private intervalTimer: ReturnType<typeof setInterval> | null = null;
	private isPaused = false;

	// Error tracking for diagnostics
	private errorLog: ConnectionError[] = [];
	private readonly MAX_ERRORS = 50;

	constructor(config?: Partial<FirehoseConsumerConfig>) {
		this.config = {
			jetstreamUrl: config?.jetstreamUrl ?? "wss://jetstream2.us-east.bsky.network/subscribe",
			collections: config?.collections ?? ["app.bsky.feed.post"],
			dids: config?.dids,
			reconnectDelayMs: config?.reconnectDelayMs ?? 3000,
			maxReconnectAttempts: config?.maxReconnectAttempts ?? 20,
			mode: config?.mode ?? {
				mode: FirehoseConsumerModesEnum.STREAM,
			}
		};
	}

	onEvent(cb: FirehoseEventCallback): void {
		this.callbacks.push(cb);
	}

	start(): void {
		if (this.isRunning && !this.isPaused) {
			log.warn("start() called but already running");
			return;
		}
		log.info("▶️  START called", { mode: this.config.mode, url: this.config.jetstreamUrl });
		this.isRunning = true;
		this.isPaused = false;
		this.shouldReconnect = true;
		this.reconnectCount = 0;
		this.batchCount = 0;
		this.connect();
		this.startIntervalIfNeeded();
	}

	stop(): void {
		log.info("⏹️  STOP called", { stats: this.stats });
		this.isRunning = false;
		this.isPaused = false;
		this.shouldReconnect = false;
		this.clearIntervalTimer();
		if (this.reconnectTimer) {
			log.debug("Clearing reconnect timer");
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		if (this.ws) {
			log.debug("Closing WebSocket");
			this.ws.close();
			this.ws = null;
		}
		log.info("⏹️  STOP complete");
	}

	/** Resume after an N_FIRST batch pause or trigger next N_FIRST_INTERVAL batch */
	resume(): void {
		if (!this.isRunning || !this.isPaused) {
			log.warn("resume() called but not paused", { isRunning: this.isRunning, isPaused: this.isPaused });
			return;
		}
		log.info("▶️  RESUME called");
		this.isPaused = false;
		this.batchCount = 0;
		this.connect();
	}

	/** Whether the consumer is paused waiting for resume (N_FIRST mode) */
	getIsPaused(): boolean {
		return this.isPaused;
	}

	getMode(): FirehoseConsumerModes {
		return { ...this.config.mode };
	}

	updateMode(mode: FirehoseConsumerModes): void {
		const wasRunning = this.isRunning;
		if (wasRunning) this.stop();
		this.config.mode = { ...mode };
		if (wasRunning) this.start();
	}

	private clearIntervalTimer(): void {
		if (this.intervalTimer) {
			clearInterval(this.intervalTimer);
			this.intervalTimer = null;
		}
	}

	/** For N_FIRST_INTERVAL: auto-resume on each tick */
	private startIntervalIfNeeded(): void {
		this.clearIntervalTimer();
		if (this.config.mode.mode !== FirehoseConsumerModesEnum.N_FIRST_INTERVAL) {
			log.debug("Interval timer not needed for mode", { mode: this.config.mode.mode });
			return;
		}
		const intervalMs = this.config.mode.quantity ?? 10000;
		log.info("⏱️  Starting interval timer", { intervalMs });
		this.intervalTimer = setInterval(() => {
			log.debug("⏱️  Interval tick", { isPaused: this.isPaused });
			if (this.isPaused) {
				this.resume();
			}
		}, intervalMs);
	}

	/** Called after each message to enforce batch limits */
	private checkBatchLimit(): void {
		const mode = this.config.mode;
		if (mode.mode === FirehoseConsumerModesEnum.STREAM) return;

		this.batchCount++;
		const limit = mode.mode === FirehoseConsumerModesEnum.N_FIRST
			? (mode.quantity ?? 50)
			: (mode.batchSize ?? mode.quantity ?? 50);

		// Log progress every 10 messages or when near limit
		if (this.batchCount % 10 === 0 || this.batchCount >= limit - 5) {
			log.debug(`📊 Batch progress: ${this.batchCount}/${limit}`);
		}

		if (this.batchCount >= limit) {
			log.success(`🎯 Batch limit reached: ${this.batchCount}/${limit}`);
			this.pause();
		}
	}

	private pause(): void {
		log.info("⏸️  PAUSE - batch complete", { batchCount: this.batchCount, stats: this.stats });
		this.isPaused = true;
		if (this.ws) {
			log.debug("Closing WebSocket for pause");
			this.ws.close();
			this.ws = null;
		}
	}

	getStats() {
		return { ...this.stats };
	}

	/** Get recent connection errors for diagnostics */
	getErrors(): ConnectionError[] {
		return [...this.errorLog];
	}

	/** Get batch progress for N_FIRST modes */
	getBatchProgress(): { current: number; target: number; remaining: number; mode: FirehoseConsumerModesEnum } {
		const mode = this.config.mode;
		const target = mode.mode === FirehoseConsumerModesEnum.N_FIRST
			? (mode.quantity ?? 50)
			: mode.mode === FirehoseConsumerModesEnum.N_FIRST_INTERVAL
				? (mode.batchSize ?? mode.quantity ?? 50)
				: Infinity;
		return {
			current: this.batchCount,
			target: target === Infinity ? -1 : target,
			remaining: target === Infinity ? -1 : Math.max(0, target - this.batchCount),
			mode: mode.mode,
		};
	}

	/** Log a connection error with details */
	private logError(type: ConnectionError["type"], message: string, url?: string): void {
		const err: ConnectionError = {
			timestamp: new Date().toISOString(),
			type,
			message,
			url,
		};
		this.errorLog.push(err);
		if (this.errorLog.length > this.MAX_ERRORS) {
			this.errorLog.shift();
		}
		this.stats.errors++;
	}

	getStatus(): "connecting" | "connected" | "disconnected" | "stopped" | "paused" {
		if (!this.isRunning) return "stopped";
		if (this.isPaused) return "paused";
		if (!this.ws) return "disconnected";
		if (this.ws.readyState === WebSocket.OPEN) return "connected";
		if (this.ws.readyState === WebSocket.CONNECTING) return "connecting";
		return "disconnected";
	}

	getConfig(): FirehoseConsumerConfig {
		return { ...this.config };
	}

	updateConfig(partial: Partial<FirehoseConsumerConfig>): void {
		const wasRunning = this.isRunning;
		if (wasRunning) this.stop();
		Object.assign(this.config, partial);
		if (wasRunning) this.start();
	}

	private buildUrl(): string {
		const url = new URL(this.config.jetstreamUrl);
		for (const col of this.config.collections) {
			url.searchParams.append("wantedCollections", col);
		}
		if (this.config.dids) {
			for (const did of this.config.dids) {
				url.searchParams.append("wantedDids", did);
			}
		}
		return url.toString();
	}

	private connect(): void {
		const url = this.buildUrl();
		log.info("🔌 CONNECT attempt", { url: url.substring(0, 80) + "..." });

		try {
			log.debug("Creating WebSocket instance...");
			this.ws = new WebSocket(url);
			log.debug("WebSocket instance created, waiting for events...");
		} catch (err: any) {
			log.error("WebSocket constructor threw", { error: err?.message || err });
			this.logError("connect_error", err?.message || "WebSocket constructor failed", url);
			this.scheduleReconnect();
			return;
		}

		this.ws.on("open", () => {
			log.success("🟢 WebSocket OPEN - connected to Jetstream!");
			this.reconnectCount = 0;
		});

		this.ws.on("message", (data: WebSocket.Data) => {
			this.stats.received++;
			// Log first message and then every 100
			if (this.stats.received === 1) {
				log.success("📨 First message received!");
			} else if (this.stats.received % 100 === 0) {
				log.debug(`📨 Messages received: ${this.stats.received}`);
			}
			try {
				const event: JetstreamEvent = JSON.parse(data.toString());
				this.stats.parsed++;
				for (const cb of this.callbacks) {
					cb(event);
				}
				this.checkBatchLimit();
			} catch (parseErr: any) {
				log.error("Parse error on message", { error: parseErr?.message });
				this.logError("parse_error", parseErr?.message || "JSON parse failed");
			}
		});

		this.ws.on("error", (err: Error) => {
			log.error("🟠 WebSocket ERROR", { error: err?.message || err });
			this.logError("ws_error", err?.message || "Unknown WebSocket error", url);
		});

		this.ws.on("close", (code: number, reason: Buffer) => {
			const reasonStr = reason?.toString() || "no reason";
			log.warn(`🔴 WebSocket CLOSE`, { code, reason: reasonStr, isPaused: this.isPaused });
			this.ws = null;
			if (this.shouldReconnect && !this.isPaused) {
				log.debug("Will schedule reconnect...");
				this.scheduleReconnect();
			} else {
				log.debug("NOT reconnecting", { shouldReconnect: this.shouldReconnect, isPaused: this.isPaused });
			}
		});
	}

	private scheduleReconnect(): void {
		if (!this.shouldReconnect) {
			log.debug("scheduleReconnect: shouldReconnect=false, skipping");
			return;
		}
		if (this.reconnectCount >= this.config.maxReconnectAttempts) {
			log.error(`❌ MAX RECONNECTS REACHED (${this.config.maxReconnectAttempts}), giving up`);
			this.isRunning = false;
			return;
		}

		this.reconnectCount++;
		// Exponential backoff: delay * 2^(attempts-1), capped at 60s
		const delay = Math.min(
			this.config.reconnectDelayMs * Math.pow(2, this.reconnectCount - 1),
			60000,
		);

		log.info(`⏳ RECONNECT scheduled`, { attempt: this.reconnectCount, maxAttempts: this.config.maxReconnectAttempts, delayMs: delay, delayS: Math.round(delay/1000) });

		this.reconnectTimer = setTimeout(() => {
			log.debug(`⏳ Reconnect timer fired, attempt ${this.reconnectCount}`);
			this.reconnectTimer = null;
			if (this.shouldReconnect) {
				this.connect();
			} else {
				log.debug("Reconnect timer fired but shouldReconnect=false");
			}
		}, delay);
	}
}
