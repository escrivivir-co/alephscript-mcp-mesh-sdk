// Manager exports for MCP servers
export { GenericCRUDManager } from './GenericCRUDManager.js';
export { PluginSystemManager } from './PluginSystemManager.js';

// Type definitions
export type {
  BaseContentDefinition,
  ResourceDefinition,
  PromptDefinition,
  CRUDOperations,
  ContentFilters
} from './ContentDefinitions.js';

export type {
  PluginInterface,
  PluginConfig,
  ToolDefinition
} from './PluginInterface.js';


export { ContentManager } from './ContentManager';
export { CRUDToolsManager } from './CRUDToolsManager';
export { CoreComponentsManager } from './CoreComponentsManager';