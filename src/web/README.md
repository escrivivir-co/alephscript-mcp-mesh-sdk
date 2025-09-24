🗂️ **ANÁLISIS POR CAPETAS**
-----------------------------

### **✅ MANTENER - Carpetas Esenciales**

#### **📁 [server/]() - ARQUITECTURA MODULAR NUEVA**

-   **✅ [UIServer.ts]()** - Servidor modular principal (NUEVO - reemplaza [UIServer.ts]() monolítico)
-   **✅ [index.ts]()** - Exportaciones del servidor modular
-   **✅ [ServerConfig.ts]()** - Configuración centralizada
-   **✅ [index.ts]()** - Middleware modular
-   **✅ [server/routes/]()** - Rutas separadas por responsabilidad:
    -   [ViewRoutes.ts]() - Rutas de vistas
    -   [PresetRoutes.ts]() - Rutas de presets (✅ corregido error TypeScript)
    -   [ApiRoutes.ts]() - Rutas API
    -   [SettingsRoutes.ts]() - Rutas de configuración

#### **📁 `views/` - VISTAS LIMPIAS**

-   **✅ [main_views.js]()** - Vista principal
-   **✅ [ai_view.js]()** - Vista AI (✅ actualizada para usar PresetManager)
-   **✅ [catalog_view.js]()** - Vista catálogo (✅ renombrada de unified_catalog_view.js)
-   **✅ `error_views.js`** - Vistas de error
-   **✅ `settings_view.js`** - Vista de configuración
-   **✅ `stats_view.js`** - Vista de estadísticas
-   **✅ `helpers/`** - Helpers de vista
-   **✅ `i18n/`** - Internacionalización

#### **📁 `views/components/` - COMPONENTES LIMPIOS**

-   **✅ `PresetManager.js`** - Gestor de presets (✅ reemplaza UnifiedPresetManager.js)
-   **✅ [PresetList.js]()** - Lista de presets (✅ renombrado de PresetListPure.js)
-   **✅ `PresetDetails.js`** - Detalles de presets (✅ renombrado de PresetDetailsPure.js)
-   **✅ `MCPContextTree.js`** - Árbol de contexto MCP
-   **✅ `MCPItemExplorer.js`** - Explorador de elementos MCP
-   **✅ `MCPItemSelector.js`** - Selector de elementos MCP
-   **✅ `MCPServerNavigator.js`** - Navegador de servidores MCP
-   **✅ `PresetForm.js`** - Formulario de presets
-   **✅ `ItemMetadataRenderer.js`** - Renderizador de metadatos
-   **✅ `QuickActionsBar.js`** - Barra de acciones rápidas
-   **✅ `ai_conversation_view.js`** - Vista conversación AI
-   **✅ `ai_forms_view.js`** - Formularios AI

#### **📁 `controllers/` - CONTROLADORES CONSOLIDADOS**

-   **✅ [PresetController.js]()** - Controlador de presets (✅ movido desde services/PresetComponentManager.js)
-   **✅ [AIController.js]()** - Controlador AI
-   **✅ `ConfigManager.js`** - Gestor de configuración
-   **✅ [ThemeController.js]()** - Controlador de temas

#### **📁 [services/]() - SERVICIOS CORE**

-   **✅ [MCPDataService.ts]()** - Servicio de datos MCP
-   **✅ `PresetDataService.js`** - Servicio de datos de presets
-   **✅ `PresetStore.js`** - Almacén de presets
-   **✅ [EventBus.js]()** - Bus de eventos (✅ comentarios legacy limpiados)

#### **📁 `assets/` - RECURSOS ESTÁTICOS**

-   **✅ `assets/styles/style.css`** - Estilos principales
-   **✅ `assets/themes/`** - Temas (Clear-MCP, Dark-MCP, Matrix-MCP, etc.)
-   **✅ `assets/images/`** - Imágenes (si las hay)

#### **📁 `assets/js/` - SCRIPTS ACTIVOS**

-   **✅ [mcp-selection-manager.js]()** - Gestor de selección MCP (✅ comentarios legacy limpiados)
-   **✅ [preset-manager.js]()** - Gestor de presets (✅ código legacy limpiado)
-   **✅ [preset-architecture-init.js]()** - Inicializador de arquitectura (✅ referencias actualizadas)
-   **✅ `home.js`** - Script de página principal
-   **✅ `settings.js`** - Script de configuración
-   **✅ `toast-manager.js`** - Gestor de notificaciones

#### **📁 [mcp/]() - MÓDULOS MCP**

-   **✅ `mcp_function_handler.mjs`** - Manejador de funciones MCP
-   **✅ `mcp_query_server.mjs`** - Servidor de consultas MCP
-   **✅ [mcp_schema_transformer.mjs]()** - Transformador de esquemas MCP
-   **✅ [mcp_tools_extractor.mjs]()** - Extractor de herramientas MCP
-   **✅ `mcp_ui_routes.mjs`** - Rutas UI MCP
-   **✅ `MCPMixin.mjs`** - Mixin MCP
-   **✅ `mixer.mjs`** - Mezclador
-   **✅ `MCP_PARSER_README.md`** - Documentación

#### **📁 `configs/`**

-   **✅ `mesh-config.json`** - Configuración de mesh

#### **📁 `test/`**

-   **✅ [mcp-catalog-integration-test.js]()** - Test de integración