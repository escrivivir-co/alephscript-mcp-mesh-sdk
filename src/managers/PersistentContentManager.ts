/**
 * Persistent Content Manager for MCP Servers
 * Extends ContentManager with file-based persistence
 * 
 * Storage: ARCHIVO/PLUGINS/MCP_DATA/{serverName}/
 *   ├── prompts/
 *   │   └── {id}.json
 *   ├── resources/
 *   │   └── {id}.json
 *   └── _metadata.json
 * 
 * @epic MCP-PERSISTENCE-1.0.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PersistentCRUDManager } from './PersistentCRUDManager.js';
import { FileDatabase, createFileDatabase, PersistenceConfig } from './FilePersistenceManager.js';
import { IContentManager, ResourceDefinition, PromptDefinition, ContentFilters } from './ContentDefinitions.js';
import { l } from '@/Logger.js';

/**
 * Persistent Content Manager
 * Manages prompts and resources with automatic persistence to disk
 * Implements IContentManager interface for compatibility with CRUDToolsManager
 */
export class PersistentContentManager implements IContentManager {
    private prompts: PersistentCRUDManager<PromptDefinition>;
    private resources: PersistentCRUDManager<ResourceDefinition>;
    private server: McpServer;
    private serverName: string;
    private db: FileDatabase;
    private initialized: boolean = false;

    constructor(
        server: McpServer,
        serverName: string,
        persistenceConfig?: Partial<PersistenceConfig>
    ) {
        this.server = server;
        this.serverName = serverName;
        
        // Create database instance
        this.db = createFileDatabase(serverName, persistenceConfig);
        
        // Create persistent managers for prompts and resources
        this.prompts = new PersistentCRUDManager<PromptDefinition>('Prompt', this.db, 'prompts');
        this.resources = new PersistentCRUDManager<ResourceDefinition>('Resource', this.db, 'resources');
    }

    /**
     * Initialize persistence (load from disk)
     * Call this during server startup
     */
    async init(): Promise<void> {
        if (this.initialized) return;

        try {
            await this.db.init();
            await Promise.all([
                this.prompts.init(),
                this.resources.init()
            ]);
            
            // Register handlers for loaded content
            await this.registerLoadedHandlers();
            
            this.initialized = true;
            l.i(`${this.serverName}: PersistentContentManager initialized`);
            
            const stats = await this.getStats();
            l.i(`${this.serverName}: Loaded ${stats.prompts.count} prompts, ${stats.resources.count} resources`);
        } catch (error) {
            l.e(`${this.serverName}: Failed to initialize PersistentContentManager`, { error });
            throw error;
        }
    }

    /**
     * Register MCP handlers for all loaded prompts and resources
     */
    private async registerLoadedHandlers(): Promise<void> {
        // Register prompt handlers
        for (const prompt of this.prompts.list()) {
            this.setupPromptHandler(prompt);
        }
        
        // Register resource handlers
        for (const resource of this.resources.list()) {
            this.setupResourceHandler(resource);
        }
    }

    // ===== PROMPT MANAGEMENT =====

    /**
     * Add prompt with automatic persistence and handler registration
     */
    async addPrompt(prompt: PromptDefinition): Promise<void> {
        await this.prompts.addAsync(prompt);
        this.setupPromptHandler(prompt);
        l.v(`${this.serverName}: Prompt '${prompt.id}' added and persisted`);
    }

    /**
     * Add prompt synchronously (for backward compatibility)
     */
    addPromptSync(prompt: PromptDefinition): void {
        this.prompts.add(prompt);
        this.setupPromptHandler(prompt);
    }

    /**
     * Update prompt with persistence and handler re-registration
     */
    async updatePrompt(id: string, updates: Partial<PromptDefinition>): Promise<PromptDefinition> {
        const updatedPrompt = await this.prompts.updateAsync(id, updates);
        this.updatePromptHandler(updatedPrompt);
        l.v(`${this.serverName}: Prompt '${id}' updated and persisted`);
        return updatedPrompt;
    }

    /**
     * Delete prompt with persistence and handler removal
     */
    async deletePrompt(id: string): Promise<boolean> {
        const prompt = this.prompts.get(id);
        if (!prompt) return false;

        await this.prompts.deleteAsync(id);
        this.removePromptHandler(id);
        l.v(`${this.serverName}: Prompt '${id}' deleted and persisted`);
        return true;
    }

    /**
     * Get prompt by ID
     */
    getPrompt(id: string): PromptDefinition | undefined {
        return this.prompts.get(id);
    }

    /**
     * List prompts with filtering
     */
    listPrompts(filters?: ContentFilters): PromptDefinition[] {
        return this.prompts.list(filters);
    }

    // ===== RESOURCE MANAGEMENT =====

    /**
     * Add resource with automatic persistence and handler registration
     */
    async addResource(resource: ResourceDefinition): Promise<void> {
        await this.resources.addAsync(resource);
        this.setupResourceHandler(resource);
        l.v(`${this.serverName}: Resource '${resource.id}' added and persisted`);
    }

    /**
     * Add resource synchronously (for backward compatibility)
     */
    addResourceSync(resource: ResourceDefinition): void {
        this.resources.add(resource);
        this.setupResourceHandler(resource);
    }

    /**
     * Update resource with persistence and handler re-registration
     */
    async updateResource(id: string, updates: Partial<ResourceDefinition>): Promise<ResourceDefinition> {
        const updatedResource = await this.resources.updateAsync(id, updates);
        this.updateResourceHandler(updatedResource);
        l.v(`${this.serverName}: Resource '${id}' updated and persisted`);
        return updatedResource;
    }

    /**
     * Delete resource with persistence and handler removal
     */
    async deleteResource(id: string): Promise<boolean> {
        const resource = this.resources.get(id);
        if (!resource) return false;

        await this.resources.deleteAsync(id);
        this.removeResourceHandler(resource);
        l.v(`${this.serverName}: Resource '${id}' deleted and persisted`);
        return true;
    }

    /**
     * Get resource by ID
     */
    getResource(id: string): ResourceDefinition | undefined {
        return this.resources.get(id);
    }

    /**
     * List resources with filtering
     */
    listResources(filters?: ContentFilters): ResourceDefinition[] {
        return this.resources.list(filters);
    }

    // ===== HANDLER MANAGEMENT =====

    /**
     * Setup prompt handler
     */
    private setupPromptHandler(prompt: PromptDefinition): void {
        this.server.prompt(
            prompt.id,
            prompt.description,
            prompt.parameters || {},
            async (variables) => {
                let content = prompt.content;

                // Simple variable substitution
                if (variables && typeof variables === 'object') {
                    for (const [key, value] of Object.entries(variables)) {
                        const placeholder = `{{${key}}}`;
                        content = content.replace(new RegExp(placeholder, 'g'), String(value));
                    }
                }

                return {
                    messages: [{
                        role: 'user',
                        content: { type: 'text', text: content }
                    }]
                };
            }
        );
    }

    /**
     * Update prompt handler (remove old, add new)
     */
    private updatePromptHandler(prompt: PromptDefinition): void {
        // Note: MCP SDK may not support removing handlers
        // Re-registering should override the existing one
        this.setupPromptHandler(prompt);
    }

    /**
     * Remove prompt handler
     */
    private removePromptHandler(_id: string): void {
        // Note: MCP SDK may not support removing handlers
        // This is a placeholder for future SDK updates
    }

    /**
     * Setup resource handler
     */
    private setupResourceHandler(resource: ResourceDefinition): void {
        this.server.resource(
            resource.id,
            resource.uri,
            { mimeType: resource.mimeType },
            async () => {
                return {
                    contents: [{
                        uri: resource.uri,
                        mimeType: resource.mimeType,
                        text: resource.content
                    }]
                };
            }
        );
    }

    /**
     * Update resource handler
     */
    private updateResourceHandler(resource: ResourceDefinition): void {
        this.setupResourceHandler(resource);
    }

    /**
     * Remove resource handler
     */
    private removeResourceHandler(_resource: ResourceDefinition): void {
        // Note: MCP SDK may not support removing handlers
    }

    // ===== PERSISTENCE UTILITIES =====

    /**
     * Force sync all content to disk
     */
    async syncToDisk(): Promise<{ prompts: number; resources: number }> {
        const [promptsCount, resourcesCount] = await Promise.all([
            this.prompts.syncToDisk(),
            this.resources.syncToDisk()
        ]);
        return { prompts: promptsCount, resources: resourcesCount };
    }

    /**
     * Force reload all content from disk
     */
    async syncFromDisk(): Promise<{ prompts: number; resources: number }> {
        const [promptsCount, resourcesCount] = await Promise.all([
            this.prompts.syncFromDisk(),
            this.resources.syncFromDisk()
        ]);
        
        // Re-register handlers
        await this.registerLoadedHandlers();
        
        return { prompts: promptsCount, resources: resourcesCount };
    }

    /**
     * Get persistence statistics
     */
    async getStats(): Promise<{
        prompts: { count: number; memoryCount: number; diskCount: number };
        resources: { count: number; memoryCount: number; diskCount: number };
        dbPath: string;
    }> {
        const [promptStats, resourceStats] = await Promise.all([
            this.prompts.getStats(),
            this.resources.getStats()
        ]);

        return {
            prompts: {
                count: promptStats.memoryCount,
                memoryCount: promptStats.memoryCount,
                diskCount: promptStats.diskCount
            },
            resources: {
                count: resourceStats.memoryCount,
                memoryCount: resourceStats.memoryCount,
                diskCount: resourceStats.diskCount
            },
            dbPath: this.db.getDbPath()
        };
    }

    /**
     * Export all content as JSON
     */
    async exportAll(): Promise<{
        prompts: PromptDefinition[];
        resources: ResourceDefinition[];
        metadata: {
            serverName: string;
            exportedAt: string;
            version: string;
        };
    }> {
        return {
            prompts: await this.prompts.exportAll(),
            resources: await this.resources.exportAll(),
            metadata: {
                serverName: this.serverName,
                exportedAt: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }

    /**
     * Import content from JSON
     */
    async importAll(data: {
        prompts?: PromptDefinition[];
        resources?: ResourceDefinition[];
    }, overwrite: boolean = false): Promise<{ prompts: number; resources: number }> {
        const [promptsCount, resourcesCount] = await Promise.all([
            data.prompts ? this.prompts.importAll(data.prompts, overwrite) : 0,
            data.resources ? this.resources.importAll(data.resources, overwrite) : 0
        ]);

        // Register handlers for imported content
        if (data.prompts) {
            for (const prompt of data.prompts) {
                if (this.prompts.has(prompt.id)) {
                    this.setupPromptHandler(prompt);
                }
            }
        }
        if (data.resources) {
            for (const resource of data.resources) {
                if (this.resources.has(resource.id)) {
                    this.setupResourceHandler(resource);
                }
            }
        }

        return { prompts: promptsCount, resources: resourcesCount };
    }

    /**
     * Get database path
     */
    getDbPath(): string {
        return this.db.getDbPath();
    }
}
