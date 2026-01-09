/**
 * Content Definitions for MCP Servers
 * Common interfaces and types for prompts and resources
 */

/**
 * Base content definition interface
 */
export interface BaseContentDefinition {
  id: string;
  name: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Resource definition interface
 */
export interface ResourceDefinition extends BaseContentDefinition {
  uri: string;
  mimeType: string;
  content: string;
}

/**
 * Prompt definition interface
 */
export interface PromptDefinition extends BaseContentDefinition {
  parameters?: Record<string, any>;
  content: string;
}

/**
 * Generic CRUD operations interface
 */
export interface CRUDOperations<T extends BaseContentDefinition> {
  list(filters?: { category?: string; search?: string }): T[];
  get(id: string): T | undefined;
  add(item: T): void;
  update(id: string, updates: Partial<T>): T;
  delete(id: string): boolean;
  has(id: string): boolean;
}

/**
 * Content filter options
 */
export interface ContentFilters {
  category?: string;
  search?: string;
}

/**
 * Content creation options
 */
export interface ContentCreationOptions {
  overwrite?: boolean;
  validate?: boolean;
}

/**
 * Content Manager Interface
 * Common interface for ContentManager and PersistentContentManager
 * Used by CRUDToolsManager for CRUD operations
 * 
 * Note: Methods can return either synchronous values or Promises.
 * CRUDToolsManager handles both via Promise.resolve()
 */
export interface IContentManager {
  // Prompt operations
  getPrompt(id: string): PromptDefinition | undefined;
  listPrompts(filters?: ContentFilters): PromptDefinition[];
  addPrompt(prompt: PromptDefinition): void | Promise<void>;
  updatePrompt(id: string, updates: Partial<PromptDefinition>): PromptDefinition | Promise<PromptDefinition>;
  deletePrompt(id: string): boolean | Promise<boolean>;
  
  // Resource operations
  getResource(id: string): ResourceDefinition | undefined;
  listResources(filters?: ContentFilters): ResourceDefinition[];
  addResource(resource: ResourceDefinition): void | Promise<void>;
  updateResource(id: string, updates: Partial<ResourceDefinition>): ResourceDefinition | Promise<ResourceDefinition>;
  deleteResource(id: string): boolean | Promise<boolean>;
}
