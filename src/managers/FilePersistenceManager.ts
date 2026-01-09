/**
 * File-based Persistence Manager for MCP Servers
 * MongoDB-style collections with JSON documents
 * 
 * Storage Structure:
 * {dataDir}/
 * ├── {serverName}/
 * │   ├── prompts/
 * │   │   ├── {id}.json
 * │   │   └── ...
 * │   ├── resources/
 * │   │   ├── {id}.json
 * │   │   └── ...
 * │   └── _metadata.json
 * 
 * @epic MCP-PERSISTENCE-1.0.0
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { BaseContentDefinition } from './ContentDefinitions.js';
import { l } from '@/Logger.js';

/**
 * Collection metadata interface
 */
export interface CollectionMetadata {
    name: string;
    serverName: string;
    documentCount: number;
    createdAt: number;
    updatedAt: number;
    version: string;
}

/**
 * Database metadata interface
 */
export interface DatabaseMetadata {
    serverName: string;
    collections: string[];
    createdAt: number;
    updatedAt: number;
    version: string;
}

/**
 * Persistence configuration
 */
export interface PersistenceConfig {
    /** Base directory for data storage */
    dataDir: string;
    /** Server name (used as database name) */
    serverName: string;
    /** Auto-save on every write operation */
    autoSave?: boolean;
    /** Pretty print JSON (useful for debugging) */
    prettyPrint?: boolean;
    /** File extension for documents */
    extension?: string;
}

/**
 * Write result interface
 */
export interface WriteResult {
    success: boolean;
    id: string;
    path: string;
    timestamp: number;
}

/**
 * File-based Collection Manager
 * Manages a single collection (like MongoDB collection)
 */
export class FileCollection<T extends BaseContentDefinition> {
    private collectionPath: string;
    private collectionName: string;
    private config: PersistenceConfig;
    private cache: Map<string, T> = new Map();
    private initialized: boolean = false;

    constructor(collectionName: string, config: PersistenceConfig) {
        this.collectionName = collectionName;
        this.config = config;
        this.collectionPath = path.join(
            config.dataDir,
            config.serverName,
            collectionName
        );
    }

    /**
     * Initialize collection directory
     */
    async init(): Promise<void> {
        if (this.initialized) return;

        try {
            await fs.mkdir(this.collectionPath, { recursive: true });
            await this.loadAll();
            this.initialized = true;
            l.i(`Collection '${this.collectionName}' initialized at ${this.collectionPath}`);
        } catch (error) {
            l.e(`Failed to initialize collection '${this.collectionName}'`, { error });
            throw error;
        }
    }

    /**
     * Load all documents from disk into cache
     */
    async loadAll(): Promise<Map<string, T>> {
        try {
            const files = await fs.readdir(this.collectionPath);
            const ext = this.config.extension || '.json';
            
            for (const file of files) {
                if (file.endsWith(ext) && !file.startsWith('_')) {
                    const id = path.basename(file, ext);
                    const filePath = path.join(this.collectionPath, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const doc = JSON.parse(content) as T;
                    this.cache.set(id, doc);
                }
            }
            
            l.v(`Loaded ${this.cache.size} documents from '${this.collectionName}'`);
            return this.cache;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                // Directory doesn't exist yet, that's fine
                return this.cache;
            }
            throw error;
        }
    }

    /**
     * Get document file path
     */
    private getDocPath(id: string): string {
        const ext = this.config.extension || '.json';
        const sanitizedId = this.sanitizeId(id);
        return path.join(this.collectionPath, `${sanitizedId}${ext}`);
    }

    /**
     * Sanitize ID for use as filename
     */
    private sanitizeId(id: string): string {
        return id.replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    /**
     * Serialize document to JSON
     */
    private serialize(doc: T): string {
        if (this.config.prettyPrint) {
            return JSON.stringify(doc, null, 2);
        }
        return JSON.stringify(doc);
    }

    // ===== CRUD Operations =====

    /**
     * Insert a new document
     */
    async insertOne(doc: T): Promise<WriteResult> {
        await this.init();
        
        if (this.cache.has(doc.id)) {
            throw new Error(`Document with ID '${doc.id}' already exists in '${this.collectionName}'`);
        }

        const docPath = this.getDocPath(doc.id);
        await fs.writeFile(docPath, this.serialize(doc), 'utf-8');
        this.cache.set(doc.id, doc);

        return {
            success: true,
            id: doc.id,
            path: docPath,
            timestamp: Date.now()
        };
    }

    /**
     * Find document by ID
     */
    async findById(id: string): Promise<T | null> {
        await this.init();
        return this.cache.get(id) || null;
    }

    /**
     * Find all documents matching filter
     */
    async find(filter?: Partial<T>): Promise<T[]> {
        await this.init();
        
        if (!filter) {
            return Array.from(this.cache.values());
        }

        return Array.from(this.cache.values()).filter(doc => {
            for (const [key, value] of Object.entries(filter)) {
                if ((doc as any)[key] !== value) {
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Find one document matching filter
     */
    async findOne(filter: Partial<T>): Promise<T | null> {
        const results = await this.find(filter);
        return results[0] || null;
    }

    /**
     * Update document by ID
     */
    async updateOne(id: string, updates: Partial<T>): Promise<WriteResult> {
        await this.init();
        
        const existing = this.cache.get(id);
        if (!existing) {
            throw new Error(`Document with ID '${id}' not found in '${this.collectionName}'`);
        }

        const updated: T = {
            ...existing,
            ...updates,
            id, // Preserve original ID
            updatedAt: Date.now()
        };

        const docPath = this.getDocPath(id);
        await fs.writeFile(docPath, this.serialize(updated), 'utf-8');
        this.cache.set(id, updated);

        return {
            success: true,
            id,
            path: docPath,
            timestamp: Date.now()
        };
    }

    /**
     * Upsert document (insert or update)
     */
    async upsert(doc: T): Promise<WriteResult> {
        await this.init();
        
        const existing = this.cache.get(doc.id);
        if (existing) {
            return this.updateOne(doc.id, doc);
        }
        return this.insertOne(doc);
    }

    /**
     * Delete document by ID
     */
    async deleteOne(id: string): Promise<boolean> {
        await this.init();
        
        if (!this.cache.has(id)) {
            return false;
        }

        const docPath = this.getDocPath(id);
        try {
            await fs.unlink(docPath);
            this.cache.delete(id);
            return true;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                // File doesn't exist, just remove from cache
                this.cache.delete(id);
                return true;
            }
            throw error;
        }
    }

    /**
     * Check if document exists
     */
    async exists(id: string): Promise<boolean> {
        await this.init();
        return this.cache.has(id);
    }

    /**
     * Count documents
     */
    async count(filter?: Partial<T>): Promise<number> {
        const docs = await this.find(filter);
        return docs.length;
    }

    /**
     * Clear all documents
     */
    async deleteAll(): Promise<number> {
        await this.init();
        
        const count = this.cache.size;
        const files = await fs.readdir(this.collectionPath);
        const ext = this.config.extension || '.json';
        
        for (const file of files) {
            if (file.endsWith(ext) && !file.startsWith('_')) {
                await fs.unlink(path.join(this.collectionPath, file));
            }
        }
        
        this.cache.clear();
        return count;
    }

    /**
     * Get collection metadata
     */
    async getMetadata(): Promise<CollectionMetadata> {
        await this.init();
        
        return {
            name: this.collectionName,
            serverName: this.config.serverName,
            documentCount: this.cache.size,
            createdAt: Date.now(), // TODO: track actual creation time
            updatedAt: Date.now(),
            version: '1.0.0'
        };
    }

    /**
     * Sync cache from disk (force reload)
     */
    async sync(): Promise<void> {
        this.cache.clear();
        await this.loadAll();
    }

    /**
     * Get all cached documents (fast, no disk read)
     */
    getAllCached(): Map<string, T> {
        return new Map(this.cache);
    }
}

/**
 * File-based Database Manager
 * Manages multiple collections (like MongoDB database)
 */
export class FileDatabase {
    private config: PersistenceConfig;
    private collections: Map<string, FileCollection<any>> = new Map();
    private dbPath: string;
    private initialized: boolean = false;

    constructor(config: PersistenceConfig) {
        this.config = {
            ...config,
            prettyPrint: config.prettyPrint ?? true,
            extension: config.extension ?? '.json'
        };
        this.dbPath = path.join(config.dataDir, config.serverName);
    }

    /**
     * Initialize database
     */
    async init(): Promise<void> {
        if (this.initialized) return;

        try {
            await fs.mkdir(this.dbPath, { recursive: true });
            await this.saveMetadata();
            this.initialized = true;
            l.i(`Database '${this.config.serverName}' initialized at ${this.dbPath}`);
        } catch (error) {
            l.e(`Failed to initialize database '${this.config.serverName}'`, { error });
            throw error;
        }
    }

    /**
     * Get or create a collection
     */
    collection<T extends BaseContentDefinition>(name: string): FileCollection<T> {
        if (!this.collections.has(name)) {
            const collection = new FileCollection<T>(name, this.config);
            this.collections.set(name, collection);
        }
        return this.collections.get(name) as FileCollection<T>;
    }

    /**
     * List all collections
     */
    async listCollections(): Promise<string[]> {
        await this.init();
        
        try {
            const entries = await fs.readdir(this.dbPath, { withFileTypes: true });
            return entries
                .filter(entry => entry.isDirectory() && !entry.name.startsWith('_'))
                .map(entry => entry.name);
        } catch {
            return [];
        }
    }

    /**
     * Drop a collection
     */
    async dropCollection(name: string): Promise<boolean> {
        const collection = this.collections.get(name);
        if (collection) {
            await collection.deleteAll();
            this.collections.delete(name);
        }
        
        const collectionPath = path.join(this.dbPath, name);
        try {
            await fs.rm(collectionPath, { recursive: true, force: true });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get database metadata
     */
    async getMetadata(): Promise<DatabaseMetadata> {
        const collections = await this.listCollections();
        return {
            serverName: this.config.serverName,
            collections,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: '1.0.0'
        };
    }

    /**
     * Save database metadata
     */
    private async saveMetadata(): Promise<void> {
        const metadata = await this.getMetadata();
        const metaPath = path.join(this.dbPath, '_metadata.json');
        await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
    }

    /**
     * Get database path
     */
    getDbPath(): string {
        return this.dbPath;
    }

    /**
     * Get config
     */
    getConfig(): PersistenceConfig {
        return { ...this.config };
    }
}

/**
 * Default data directory resolver
 * Uses ARCHIVO/PLUGINS/MCP_DATA/{serverName}/ as storage location
 */
export function getDefaultDataDir(): string {
    // Try to resolve relative to workspace root
    const workspaceRoot = process.cwd();
    return path.join(workspaceRoot, 'ARCHIVO', 'PLUGINS', 'MCP_DATA');
}

/**
 * Create a file database instance with default configuration
 */
export function createFileDatabase(serverName: string, options?: Partial<PersistenceConfig>): FileDatabase {
    const config: PersistenceConfig = {
        dataDir: options?.dataDir || getDefaultDataDir(),
        serverName,
        autoSave: options?.autoSave ?? true,
        prettyPrint: options?.prettyPrint ?? true,
        extension: options?.extension ?? '.json'
    };
    
    return new FileDatabase(config);
}
