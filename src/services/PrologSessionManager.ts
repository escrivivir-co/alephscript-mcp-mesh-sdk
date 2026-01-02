/**
 * Prolog Session Manager
 * Manages multiple isolated Prolog engine sessions for Teatro agents
 */

import { l } from "../Logger";
import { PrologServer } from "../../../../AAIAGallery/alephscript/src/FIA/paradigmas/sbr/app/prolog/server";

export interface PrologSession {
	sessionId: string;
	obraId: string;
	createdAt: Date;
	lastUsedAt: Date;
	engine: PrologServer;
}

export class PrologSessionManager {
	private sessions: Map<string, PrologSession> = new Map();
	private cleanupInterval: NodeJS.Timeout | null = null;
	private readonly SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
	private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

	constructor() {
		this.startCleanupRoutine();
		l.info("PrologSessionManager initialized");
	}

	/**
	 * Create a new Prolog session for an obra
	 */
	async createSession(sessionId: string, obraId: string): Promise<PrologSession> {
		if (this.sessions.has(sessionId)) {
			throw new Error(`Session ${sessionId} already exists`);
		}

		const engine = new PrologServer();
		const session: PrologSession = {
			sessionId,
			obraId,
			createdAt: new Date(),
			lastUsedAt: new Date(),
			engine,
		};

		this.sessions.set(sessionId, session);
		l.info(`Created Prolog session: ${sessionId} for obra: ${obraId}`);
		return session;
	}

	/**
	 * Get an existing session
	 */
	getSession(sessionId: string): PrologSession | undefined {
		const session = this.sessions.get(sessionId);
		if (session) {
			session.lastUsedAt = new Date();
		}
		return session;
	}

	/**
	 * Destroy a session and cleanup resources
	 */
	async destroySession(sessionId: string): Promise<boolean> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			return false;
		}

		// Cleanup engine resources if needed
		try {
			// PrologServer from AAIAGallery doesn't have explicit close,
			// but we clear references
			session.engine = null as any;
		} catch (error) {
			l.error(`Error destroying session ${sessionId}:`, error);
		}

		this.sessions.delete(sessionId);
		l.info(`Destroyed Prolog session: ${sessionId}`);
		return true;
	}

	/**
	 * List all active sessions
	 */
	listSessions(): Array<{
		sessionId: string;
		obraId: string;
		createdAt: string;
		lastUsedAt: string;
		ageMinutes: number;
	}> {
		return Array.from(this.sessions.values()).map((session) => {
			const now = Date.now();
			const ageMinutes = Math.floor((now - session.createdAt.getTime()) / 60000);
			return {
				sessionId: session.sessionId,
				obraId: session.obraId,
				createdAt: session.createdAt.toISOString(),
				lastUsedAt: session.lastUsedAt.toISOString(),
				ageMinutes,
			};
		});
	}

	/**
	 * Cleanup expired sessions
	 */
	private async cleanupExpiredSessions(): Promise<void> {
		const now = Date.now();
		const expiredSessions: string[] = [];

		for (const [sessionId, session] of this.sessions.entries()) {
			const ageMs = now - session.lastUsedAt.getTime();
			if (ageMs > this.SESSION_TIMEOUT_MS) {
				expiredSessions.push(sessionId);
			}
		}

		for (const sessionId of expiredSessions) {
			l.info(`Cleaning up expired session: ${sessionId}`);
			await this.destroySession(sessionId);
		}

		if (expiredSessions.length > 0) {
			l.info(`Cleaned up ${expiredSessions.length} expired sessions`);
		}
	}

	/**
	 * Start periodic cleanup routine
	 */
	private startCleanupRoutine(): void {
		this.cleanupInterval = setInterval(() => {
			this.cleanupExpiredSessions().catch((error) => {
				l.error("Error during session cleanup:", error);
			});
		}, this.CLEANUP_INTERVAL_MS);

		l.info("Session cleanup routine started");
	}

	/**
	 * Stop cleanup routine and destroy all sessions
	 */
	async shutdown(): Promise<void> {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}

		const sessionIds = Array.from(this.sessions.keys());
		for (const sessionId of sessionIds) {
			await this.destroySession(sessionId);
		}

		l.info("PrologSessionManager shutdown complete");
	}
}
