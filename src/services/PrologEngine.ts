/**
 * Prolog Engine Wrapper
 * Local implementation using swipl-stdio (copied from AAIAGallery pattern)
 */
import * as swipl from 'swipl-stdio';
import fs from 'fs';
import path from 'path';
import { l } from '../Logger';

export class PrologEngine {
	public engine: swipl.Engine;
	private loadedFiles: string[] = [];
	private cacheFilePath: string;

	constructor() {
		this.engine = new swipl.Engine();
		// Use package-local cache directory
		this.cacheFilePath = path.join(__dirname, '../../.prolog-cache', 'loadedFiles.json');
		this.ensureCacheDir();
	}

	private ensureCacheDir(): void {
		const cacheDir = path.dirname(this.cacheFilePath);
		if (!fs.existsSync(cacheDir)) {
			fs.mkdirSync(cacheDir, { recursive: true });
		}
	}

	/**
	 * Initialize the Prolog engine
	 */
	async initialize(): Promise<void> {
		// Load saved cache
		this.loadSavedFiles();
		l.info("PrologEngine initialized", { cachedFiles: this.loadedFiles.length });
	}

	/**
	 * Load Prolog files with caching support
	 */
	async loadPrologFiles(files: string[]): Promise<void> {
		const filesToLoad = files.filter((file) => !this.loadedFiles.includes(file));

		if (filesToLoad.length === 0) {
			l.d("All files already cached", { files });
			return;
		}

		l.d("Loading new Prolog files", { files: filesToLoad });

		for (const filePath of filesToLoad) {
			try {
				// Consult the file using engine.call
				const consultCommand = `consult('${filePath}').`;
				await this.engine.call(consultCommand);
				this.loadedFiles.push(filePath);
			} catch (error: any) {
				l.e(`Failed to load Prolog file: ${filePath}`, error);
				throw error;
			}
		}

		this.saveLoadedFiles();
	}

	/**
	 * Save loaded files cache to disk
	 */
	private saveLoadedFiles(): void {
		try {
			const data = JSON.stringify(this.loadedFiles, null, "\t");
			fs.writeFileSync(this.cacheFilePath, data);
			l.d("Saved Prolog cache", { count: this.loadedFiles.length });
		} catch (error: any) {
			l.e("Failed to save Prolog cache", error);
		}
	}

	/**
	 * Load saved files cache from disk
	 */
	private loadSavedFiles(): void {
		try {
			if (fs.existsSync(this.cacheFilePath)) {
				const data = fs.readFileSync(this.cacheFilePath, 'utf8');
				this.loadedFiles = JSON.parse(data);
				l.d("Loaded Prolog cache", { count: this.loadedFiles.length });
			}
		} catch (error: any) {
			l.w("No Prolog cache found, starting fresh", error);
			this.loadedFiles = [];
		}
	}

	/**
	 * Execute a Prolog query
	 */
	async query(queryString: string): Promise<any[]> {
		const query = await this.engine.createQuery(queryString);
		const results: any[] = [];

		try {
			let result;
			while (result = await query.next()) {
				results.push(result);
			}
		} finally {
			await query.close();
		}

		return results;
	}

	/**
	 * Assert a fact to the knowledge base
	 */
	async assertFact(fact: string): Promise<void> {
		const assertCommand = `assert(${fact}).`;
		await this.engine.call(assertCommand);
	}

	/**
	 * Get loaded files list
	 */
	getLoadedFiles(): string[] {
		return [...this.loadedFiles];
	}
}
