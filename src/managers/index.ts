// Manager exports for MCP servers
export { GenericCRUDManager } from './GenericCRUDManager.js';
export { PluginSystemManager } from './PluginSystemManager.js';

// Persistence exports (MongoDB-style file collections)
export { 
    FileCollection, 
    FileDatabase, 
    createFileDatabase,
    getDefaultDataDir
} from './FilePersistenceManager.js';
export type { 
    PersistenceConfig, 
    CollectionMetadata, 
    DatabaseMetadata,
    WriteResult 
} from './FilePersistenceManager.js';
export { PersistentCRUDManager } from './PersistentCRUDManager.js';
export { PersistentContentManager } from './PersistentContentManager.js';

// Type definitions
export type {
  BaseContentDefinition,
  ResourceDefinition,
  PromptDefinition,
  CRUDOperations,
  ContentFilters,
  IContentManager
} from './ContentDefinitions.js';

export type {
  PluginInterface,
  PluginConfig,
  ToolDefinition
} from './PluginInterface.js';


export { ContentManager } from './ContentManager';
export { CRUDToolsManager } from './CRUDToolsManager';
export { CoreComponentsManager } from './CoreComponentsManager';