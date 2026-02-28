/**
 * FirehoseFilterEngine — Quality gate for Bluesky firehose events
 *
 * Rules are ordered by computational cost (fast-path rejection).
 * Most events are dropped before any expensive processing.
 */

import { JetstreamEvent } from "./FirehoseConsumerService";

// --- Types ---

export interface FilterRule {
	id: string;
	name: string;
	enabled: boolean;
	evaluate: (event: JetstreamEvent) => boolean;
}

export interface FilterResult {
	passed: boolean;
	passedRules: string[];
	failedRule: string | null;
}

export interface FilterEngineConfig {
	minTextLength: number;
	maxTextLength: number;
	languages: string[];
	blockedKeywordPatterns: RegExp[];
	minSubstantiveWords: number;
}

// Common Spanish stopwords for substantive filter
const STOPWORDS_ES = new Set([
	"el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al",
	"en", "y", "o", "a", "que", "es", "se", "no", "por", "con", "para", "su",
	"lo", "como", "más", "pero", "sus", "le", "ya", "me", "si", "sin", "sobre",
	"este", "entre", "cuando", "muy", "ser", "hay", "también", "fue", "son",
	"está", "era", "ha", "todo", "esta", "mi", "yo", "te", "ti", "nos", "él",
]);

// URL pattern
const URL_PATTERN = /https?:\/\/\S+/g;
// Hashtag pattern
const HASHTAG_PATTERN = /#\S+/g;
// Mention pattern
const MENTION_PATTERN = /@[\w.-]+/g;
// Spam: excessive repeated characters
const SPAM_REPEAT_PATTERN = /(.)\1{5,}/;
// Spam: excessive hashtags (more than 5)
const SPAM_HASHTAG_COUNT = 5;

// --- Engine ---

export class FirehoseFilterEngine {
	private rules: FilterRule[];
	private config: FilterEngineConfig;
	private stats = { evaluated: 0, passed: 0, rejected: 0, byRule: {} as Record<string, number> };

	constructor(config?: Partial<FilterEngineConfig>) {
		this.config = {
			minTextLength: config?.minTextLength ?? 80,
			maxTextLength: config?.maxTextLength ?? 2000,
			languages: config?.languages ?? ["es"],
			blockedKeywordPatterns: config?.blockedKeywordPatterns ?? [],
			minSubstantiveWords: config?.minSubstantiveWords ?? 5,
		};
		this.rules = this.buildDefaultRules();
	}

	evaluate(event: JetstreamEvent): FilterResult {
		this.stats.evaluated++;
		const passedRules: string[] = [];

		for (const rule of this.rules) {
			if (!rule.enabled) continue;
			if (!rule.evaluate(event)) {
				this.stats.rejected++;
				this.stats.byRule[rule.id] = (this.stats.byRule[rule.id] || 0) + 1;
				return { passed: false, passedRules, failedRule: rule.id };
			}
			passedRules.push(rule.id);
		}

		this.stats.passed++;
		return { passed: true, passedRules, failedRule: null };
	}

	getRules(): Array<{ id: string; name: string; enabled: boolean }> {
		return this.rules.map(r => ({ id: r.id, name: r.name, enabled: r.enabled }));
	}

	getConfig(): FilterEngineConfig {
		return { ...this.config };
	}

	updateConfig(partial: Partial<FilterEngineConfig>): void {
		Object.assign(this.config, partial);
		// Rebuild rules to pick up new config
		this.rules = this.buildDefaultRules();
	}

	setRuleEnabled(ruleId: string, enabled: boolean): boolean {
		const rule = this.rules.find(r => r.id === ruleId);
		if (!rule) return false;
		rule.enabled = enabled;
		return true;
	}

	getStats() {
		return { ...this.stats, passRate: this.stats.evaluated > 0 ? (this.stats.passed / this.stats.evaluated * 100).toFixed(1) + "%" : "N/A" };
	}

	private buildDefaultRules(): FilterRule[] {
		return [
			// Rule 1: has text (FREE)
			{
				id: "has-text",
				name: "Post has text content",
				enabled: true,
				evaluate: (event) => {
					return !!event.commit?.record?.text && event.commit.record.text.trim().length > 0;
				},
			},
			// Rule 2: is new post (FREE)
			{
				id: "is-new-post",
				name: "Is a new post creation",
				enabled: true,
				evaluate: (event) => {
					return event.kind === "commit"
						&& event.commit?.operation === "create"
						&& event.commit?.collection === "app.bsky.feed.post";
				},
			},
			// Rule 3: text length (FREE)
			{
				id: "text-length",
				name: `Text between ${this.config.minTextLength}-${this.config.maxTextLength} chars`,
				enabled: true,
				evaluate: (event) => {
					const len = event.commit?.record?.text?.length ?? 0;
					return len >= this.config.minTextLength && len <= this.config.maxTextLength;
				},
			},
			// Rule 4: language filter (CHEAP)
			{
				id: "lang-filter",
				name: `Language in [${this.config.languages.join(",")}]`,
				enabled: true,
				evaluate: (event) => {
					if (this.config.languages.includes("*")) return true;
					const langs = event.commit?.record?.langs;
					if (!langs || langs.length === 0) {
						// If no language declared, allow (can't filter what's not declared)
						return true;
					}
					return langs.some(l => this.config.languages.includes(l));
				},
			},
			// Rule 5: not pure URL/hashtags/mentions (CHEAP)
			{
				id: "not-pure-url",
				name: "Not exclusively URLs/hashtags/mentions",
				enabled: true,
				evaluate: (event) => {
					const text = event.commit?.record?.text ?? "";
					const stripped = text
						.replace(URL_PATTERN, "")
						.replace(HASHTAG_PATTERN, "")
						.replace(MENTION_PATTERN, "")
						.trim();
					return stripped.length >= 20;
				},
			},
			// Rule 6: no spam patterns (REGEX)
			{
				id: "no-spam",
				name: "No spam/bot patterns",
				enabled: true,
				evaluate: (event) => {
					const text = event.commit?.record?.text ?? "";
					// Excessive character repetition
					if (SPAM_REPEAT_PATTERN.test(text)) return false;
					// Excessive hashtags
					const hashtagCount = (text.match(HASHTAG_PATTERN) || []).length;
					if (hashtagCount > SPAM_HASHTAG_COUNT) return false;
					// Blocked keyword patterns
					for (const pattern of this.config.blockedKeywordPatterns) {
						pattern.lastIndex = 0;
						if (pattern.test(text)) return false;
					}
					return true;
				},
			},
			// Rule 7: substantive content (REGEX)
			{
				id: "substantive",
				name: `At least ${this.config.minSubstantiveWords} content words`,
				enabled: true,
				evaluate: (event) => {
					const text = event.commit?.record?.text ?? "";
					const words = text.toLowerCase().split(/\s+/).filter(w =>
						w.length > 2 && !STOPWORDS_ES.has(w) && !URL_PATTERN.test(w) && !HASHTAG_PATTERN.test(w)
					);
					// Reset static regex lastIndex
					URL_PATTERN.lastIndex = 0;
					HASHTAG_PATTERN.lastIndex = 0;
					return words.length >= this.config.minSubstantiveWords;
				},
			},
		];
	}
}
