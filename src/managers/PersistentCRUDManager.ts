/**
 * Persistent CRUD Manager for MCP Servers
 * Extends GenericCRUDManager with file-based persistence
 * 
 * @epic MCP-PERSISTENCE-1.0.0
 */

import { BaseContentDefinition, ContentFilters } from './ContentDefinitions.js';
import { GenericCRUDManager } from './GenericCRUDManager.js';
import { FileCollection, FileDatabase, PersistenceConfig } from './FilePersistenceManager.js';
import { l } from '@/Logger.js';

/**
 * Persistent CRUD Manager
 * Combines in-memory operations with file persistence
 */
export class PersistentCRUDManager<T extends BaseContentDefinition> extends GenericCRUDManager<T> {
    private collection: FileCollection<T>;
    private db: FileDatabase;
    private initialized: boolean = false;
    private initPromise: Promise<void> | null = null;

    constructor(
        contentType: string,
        db: FileDatabase,
        collectionName?: string
    ) {
        super(contentType);
        this.db = db;
        this.collection = db.collection<T>(collectionName || contentType.toLowerCase() + 's');
    }

    /**
     * Initialize persistence (load from disk)
     */
    async init(): Promise<void> {
        if (this.initialized) return;
        
        // Prevent multiple initializations
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._doInit();
        return this.initPromise;
    }

    private async _doInit(): Promise<void> {
        try {
            await this.db.init();
            await this.collection.init();
            
            // Load persisted items into memory
            const cached = this.collection.getAllCached();
            for (const [id, item] of cached) {
                this.items.set(id, item);
            }
            
            this.initialized = true;
            l.i(`PersistentCRUDManager '${this.contentType}' loaded ${this.items.size} items from disk`);
        } catch (error) {
            l.e(`Failed to initialize PersistentCRUDManager '${this.contentType}'`, { error });
            throw error;
        }
    }

    /**
     * Ensure initialized before operations
     */
    private async ensureInit(): Promise<void> {
        if (!this.initialized) {
            await this.init();
        }
    }

    // ===== Override CRUD methods with persistence =====

    /**
     * Add item with persistence
     */
    override add(item: T): void {
        // Sync add to memory (base class)
        super.add(item);
        
        // Async persist to disk
        this.persistAdd(item).catch(error => {
            l.e(`Failed to persist add for '${item.id}'`, { error });
        });
    }

    /**
     * Async add with persistence
     */
    async addAsync(item: T): Promise<void> {
        await this.ensureInit();
        super.add(item);
        await this.collection.insertOne(item);
        l.v(`${this.contentType} '${item.id}' added and persisted`);
    }

    private async persistAdd(item: T): Promise<void> {
        await this.ensureInit();
        await this.collection.insertOne(item);
    }

    /**
     * Update item with persistence
     */
    override update(id: string, updates: Partial<T>): T {
        // Sync update in memory (base class)
        const updated = super.update(id, updates);
        
        // Async persist to disk
        this.persistUpdate(id, updated).catch(error => {
            l.e(`Failed to persist update for '${id}'`, { error });
        });
        
        return updated;
    }

    /**
     * Async update with persistence
     */
    async updateAsync(id: string, updates: Partial<T>): Promise<T> {
        await this.ensureInit();
        const updated = super.update(id, updates);
        await this.collection.updateOne(id, updated);
        l.v(`${this.contentType} '${id}' updated and persisted`);
        return updated;
    }

    private async persistUpdate(id: string, updated: T): Promise<void> {
        await this.ensureInit();
        await this.collection.upsert(updated);
    }

    /**
     * Delete item with persistence
     */
    override delete(id: string): boolean {
        // Sync delete from memory (base class)
        const deleted = super.delete(id);
        
        if (deleted) {
            // Async persist to disk
            this.persistDelete(id).catch(error => {
                l.e(`Failed to persist delete for '${id}'`, { error });
            });
        }
        
        return deleted;
    }

    /**
     * Async delete with persistence
     */
    async deleteAsync(id: string): Promise<boolean> {
        await this.ensureInit();
        const deleted = super.delete(id);
        if (deleted) {
            await this.collection.deleteOne(id);
            l.v(`${this.contentType} '${id}' deleted and persisted`);
        }
        return deleted;
    }

    private async persistDelete(id: string): Promise<void> {
        await this.ensureInit();
        await this.collection.deleteOne(id);
    }

    // ===== Additional persistence methods =====

    /**
     * Sync memory to disk (save all)
     */
    async syncToDisk(): Promise<number> {
        await this.ensureInit();
        
        let count = 0;
        for (const [id, item] of this.items) {
            await this.collection.upsert(item);
            count++;
        }
        
        l.i(`${this.contentType}: Synced ${count} items to disk`);
        return count;
    }

    /**
     * Sync disk to memory (reload all)
     */
    async syncFromDisk(): Promise<number> {
        await this.ensureInit();
        await this.collection.sync();
        
        this.items.clear();
        const cached = this.collection.getAllCached();
        for (const [id, item] of cached) {
            this.items.set(id, item);
        }
        
        l.i(`${this.contentType}: Synced ${this.items.size} items from disk`);
        return this.items.size;
    }

    /**
     * Get collection stats
     */
    async getStats(): Promise<{
        memoryCount: number;
        diskCount: number;
        collectionPath: string;
    }> {
        await this.ensureInit();
        const diskCount = await this.collection.count();
        
        return {
            memoryCount: this.items.size,
            diskCount,
            collectionPath: this.db.getDbPath()
        };
    }

    /**
     * Clear all (memory + disk)
     */
    override clear(): void {
        super.clear();
        this.clearDisk().catch(error => {
            l.e(`Failed to clear disk for '${this.contentType}'`, { error });
        });
    }

    async clearDisk(): Promise<number> {
        await this.ensureInit();
        return await this.collection.deleteAll();
    }

    /**
     * Export all items as array
     */
    async exportAll(): Promise<T[]> {
        await this.ensureInit();
        return Array.from(this.items.values());
    }

    /**
     * Import items (bulk insert)
     */
    async importAll(items: T[], overwrite: boolean = false): Promise<number> {
        await this.ensureInit();
        
        let count = 0;
        for (const item of items) {
            if (overwrite || !this.items.has(item.id)) {
                this.items.set(item.id, item);
                await this.collection.upsert(item);
                count++;
            }
        }
        
        l.i(`${this.contentType}: Imported ${count} items`);
        return count;
    }
}
