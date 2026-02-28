/**
 * BlueskyAuthService — AT Protocol authentication and record creation
 *
 * Handles session management (createSession, refreshSession) and
 * record operations (createRecord) for the Bluesky network.
 *
 * Used by Via C (bot digest/reply) and future Via A (feed generator).
 *
 * Docs: https://docs.bsky.app/docs/get-started
 * API: https://docs.bsky.app/docs/api/com-atproto-repo-create-record
 */

import { l } from "../Logger";

// --- Types ---

export interface BlueskyAuthConfig {
	service: string;  // e.g. "https://bsky.social"
	identifier: string;  // handle or DID (e.g. "escrivivir.co")
	password: string;  // app password (NOT main password)
}

interface Session {
	did: string;
	handle: string;
	accessJwt: string;
	refreshJwt: string;
	createdAt: string;
}

export interface PostRecord {
	$type: "app.bsky.feed.post";
	text: string;
	createdAt: string;
	langs?: string[];
	reply?: {
		root: { uri: string; cid: string };
		parent: { uri: string; cid: string };
	};
	facets?: Array<{
		index: { byteStart: number; byteEnd: number };
		features: Array<{ $type: string; uri?: string; tag?: string }>;
	}>;
}

export interface CreateRecordResult {
	uri: string;
	cid: string;
}

// --- Service ---

export class BlueskyAuthService {
	private session: Session | null = null;
	private config: BlueskyAuthConfig;

	constructor(config?: Partial<BlueskyAuthConfig>) {
		this.config = {
			service: config?.service || process.env.BSKY_SERVICE || "https://bsky.social",
			identifier: config?.identifier || process.env.BSKY_IDENTIFIER || "",
			password: config?.password || process.env.BSKY_PASSWORD || "",
		};
	}

	isConfigured(): boolean {
		return !!this.config.identifier && !!this.config.password;
	}

	isAuthenticated(): boolean {
		return !!this.session?.accessJwt;
	}

	getDid(): string | null {
		return this.session?.did || null;
	}

	getHandle(): string | null {
		return this.session?.handle || null;
	}

	async createSession(): Promise<boolean> {
		if (!this.isConfigured()) {
			l.e("BlueskyAuthService: Not configured. Set BSKY_IDENTIFIER and BSKY_PASSWORD env vars.");
			return false;
		}

		try {
			const res = await fetch(`${this.config.service}/xrpc/com.atproto.server.createSession`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					identifier: this.config.identifier,
					password: this.config.password,
				}),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				l.e("BlueskyAuthService: createSession failed", { status: res.status, error: err });
				return false;
			}

			this.session = await res.json() as Session;
			l.info("BlueskyAuthService: Authenticated", { did: this.session.did, handle: this.session.handle });
			return true;
		} catch (error: any) {
			l.e("BlueskyAuthService: createSession error", { error: error.message });
			return false;
		}
	}

	async refreshSession(): Promise<boolean> {
		if (!this.session?.refreshJwt) {
			return this.createSession();
		}

		try {
			const res = await fetch(`${this.config.service}/xrpc/com.atproto.server.refreshSession`, {
				method: "POST",
				headers: { Authorization: `Bearer ${this.session.refreshJwt}` },
			});

			if (!res.ok) {
				l.w("BlueskyAuthService: refreshSession failed, creating new session");
				return this.createSession();
			}

			this.session = await res.json() as Session;
			return true;
		} catch {
			return this.createSession();
		}
	}

	/**
	 * Ensure we have a valid session, refreshing if needed
	 */
	private async ensureSession(): Promise<boolean> {
		if (!this.session) return this.createSession();
		return true;
	}

	/**
	 * Create a new post on Bluesky
	 */
	async createPost(text: string, langs?: string[]): Promise<CreateRecordResult | null> {
		if (!await this.ensureSession()) return null;

		const record: PostRecord = {
			$type: "app.bsky.feed.post",
			text,
			createdAt: new Date().toISOString(),
			langs: langs || ["es"],
		};

		return this.createRecord("app.bsky.feed.post", record);
	}

	/**
	 * Reply to an existing post
	 */
	async createReply(
		text: string,
		parentUri: string,
		parentCid: string,
		rootUri?: string,
		rootCid?: string,
		langs?: string[],
	): Promise<CreateRecordResult | null> {
		if (!await this.ensureSession()) return null;

		const record: PostRecord = {
			$type: "app.bsky.feed.post",
			text,
			createdAt: new Date().toISOString(),
			langs: langs || ["es"],
			reply: {
				root: { uri: rootUri || parentUri, cid: rootCid || parentCid },
				parent: { uri: parentUri, cid: parentCid },
			},
		};

		return this.createRecord("app.bsky.feed.post", record);
	}

	/**
	 * Resolve a handle to a DID
	 */
	async resolveHandle(handle: string): Promise<string | null> {
		try {
			const res = await fetch(
				`${this.config.service}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
			);
			if (!res.ok) return null;
			const data = await res.json() as { did: string };
			return data.did;
		} catch {
			return null;
		}
	}

	/**
	 * Get a post record (needed for reply CID)
	 */
	async getPost(uri: string): Promise<{ uri: string; cid: string; value: any } | null> {
		if (!await this.ensureSession()) return null;

		// Parse at:// URI: at://did/collection/rkey
		const parts = uri.replace("at://", "").split("/");
		if (parts.length < 3) return null;
		const [repo, collection, rkey] = parts;

		try {
			const res = await fetch(
				`${this.config.service}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(repo)}&collection=${encodeURIComponent(collection)}&rkey=${encodeURIComponent(rkey)}`,
				{ headers: { Authorization: `Bearer ${this.session!.accessJwt}` } },
			);
			if (!res.ok) return null;
			return await res.json() as { uri: string; cid: string; value: any };
		} catch {
			return null;
		}
	}

	/**
	 * Generic createRecord
	 */
	private async createRecord(collection: string, record: any): Promise<CreateRecordResult | null> {
		if (!this.session) return null;

		try {
			const res = await fetch(`${this.config.service}/xrpc/com.atproto.repo.createRecord`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.session.accessJwt}`,
				},
				body: JSON.stringify({
					repo: this.session.did,
					collection,
					record,
				}),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				// If auth expired, try refresh and retry once
				if (res.status === 401) {
					l.w("BlueskyAuthService: Token expired, refreshing...");
					if (await this.refreshSession()) {
						return this.createRecord(collection, record);
					}
				}
				l.e("BlueskyAuthService: createRecord failed", { status: res.status, error: err });
				return null;
			}

			const result = await res.json() as CreateRecordResult;
			l.info("BlueskyAuthService: Record created", { uri: result.uri });
			return result;
		} catch (error: any) {
			l.e("BlueskyAuthService: createRecord error", { error: error.message });
			return null;
		}
	}
}
