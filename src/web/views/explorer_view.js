const { div, section, h2, h3, p, button } = require("hyperaxe");
const { template } = require('./main_views');

// Import MCP components
const { renderMCPServerNavigator } = require('./components/MCPServerNavigator');
const { renderMCPItemExplorer } = require('./components/MCPItemExplorer');
const { renderMCPItemSelector } = require('./components/MCPItemSelector');
const { renderItemTypeMetadata } = require('./components/ItemMetadataRenderer');
const { renderQuickActionsBar } = require('./components/QuickActionsBar');

const { aiI18n } = require('./i18n/ai_i18n');
const { processMCPPrefetch } = require('./helpers/view_helpers');

/**
 * 🔧 EXPLORADOR MCP - Vista completamente independiente
 * Solo se encarga de explorar y seleccionar elementos MCP
 * NO tiene conexión con presets - flujo unidireccional
 */

/**
 * ✅ Componente mejorado para mostrar contexto seleccionado
 * Posicionado ANTES del explorador para vista rápida
 */
function renderSelectedContextTree() {
    return div(
        { 
            id: "selected-context-tree",
            class: "selected-context-section",
            style: `margin-bottom: 2rem; 
                    padding: 1.5rem; 
                    background: var(--background-secondary); 
                    border: 2px solid var(--primary-color);
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);`
        },
        // Header con contador en vivo
        div({ 
            style: "display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;" 
        },
            h3({ 
                style: "margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem; font-size: 1.2em;" 
            }, "📋", "Preset"),
            
            div({
                id: "mcp-selected-summary",
                class: "selection-counter",
                style: `padding: 0.5rem 1rem; 
                        border-radius: 20px; 
                        font-weight: 700; 
                        font-size: 0.9em;
                        min-width: 120px;
                        text-align: center;`
            }, "0")
        ),
        
        // Área de contenido principal del árbol
        div({ 
            id: "mcp-selected-tree",
            class: "context-tree-content",
            style: `min-height: 80px; 
                    padding: 1rem; 
                    background: var(--background-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    color: var(--text-secondary); 
                    font-style: italic;`
        }, "Ningún elemento seleccionado"),
        
        // Stats y acciones principales
        div({ 
            style: "margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem;" 
        },
            // Línea 1: Stats y acciones secundarias
            div({ 
                style: "display: flex; justify-content: space-between; align-items: center;" 
            },
                div({ 
                    id: "context-stats",
                    style: "color: var(--text-secondary); font-size: 0.9em;"
                }, "Total: 0 elementos"),
                
                div({ style: "display: flex; gap: 0.5rem;" },
                    button({
                        id: "clear-all-selections",
                        class: "btn btn-outline-secondary btn-sm",
                        style: "padding: 0.25rem 0.75rem; font-size: 0.8em;",
                        onclick: "if(window.mcpSelectionManager) window.mcpSelectionManager.clearAll();"
                    }, "🗑️ Limpiar"),
                    
                    button({
                        id: "export-context",
                        class: "btn btn-outline-primary btn-sm", 
                        style: "padding: 0.25rem 0.75rem; font-size: 0.8em;",
                        disabled: true
                    }, "📄 Exportar")
                )
            ),
            
            // Línea 2: Campo de nombre y botón de guardar
            div({
                id: "preset-save-section", 
                style: "display: flex; gap: 1rem; align-items: center; padding: 1rem; background: var(--background-primary); border: 1px solid var(--border-color); border-radius: 8px;"
            },
                div({ style: "flex: 1;" },
                    require('hyperaxe').label({ 
                        for: "new-preset-name",
                        style: "display: block; font-size: 0.9em; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;"
                    }, "Nombre del Preset:"),
                    
                    require('hyperaxe').input({
                        type: "text",
                        id: "new-preset-name",
                        name: "presetName",
                        placeholder: "Ej: Mi selección personalizada",
                        style: `width: 100%; 
                                padding: 0.5rem; 
                                border: 1px solid var(--border-color); 
                                border-radius: 4px; 
                                background: var(--background-primary);
                                color: var(--text-primary);`,
                        maxlength: "50"
                    })
                ),
                
                button({
                    id: "save-selection-as-preset",
                    class: "btn btn-primary",
                    disabled: true,
                    style: "padding: 0.75rem 1.5rem; font-weight: 600; min-width: 120px;",
                    onclick: "if(window.mcpSelectionManager) window.mcpSelectionManager.saveCurrentSelection();"
                }, "💾 Guardar")
            )
        )
    );
}

/**
 * ✅ Acciones secundarias del explorador (simplificadas)
 */
function renderExplorerActions() {
    return div(
        { 
            class: "explorer-actions", 
            style: `margin-top: 1.5rem; 
                    display: flex; 
                    gap: 1rem; 
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    background: var(--background-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;`
        },
        require('hyperaxe').p({
            style: "margin: 0; color: var(--text-secondary); font-style: italic; text-align: center;"
        }, "� Selecciona elementos arriba, personaliza el nombre y guarda como preset")
    );
}

/**
 * Renderiza la sección completa del explorador MCP
 * Sin conexión a presets - solo exploración y selección
 */
function renderMCPExplorerSection(mcpData) {
    const { servers } = mcpData;
    
    return section(
        { 
            class: "mcp-explorer-section",
            style: `margin-bottom: 2rem; 
                    min-height: 600px; 
                    background: var(--background-primary); 
                    border: 1px solid var(--border-color); 
                    border-radius: 8px; 
                    padding: 1.5rem;
                    overflow: visible;`
        },
        h2({ 
            style: "margin: 0 0 1.5rem 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;" 
        }, "🔧", "Explorador de Servidores MCP"),
        
        // Container principal del explorador
        div(
            { 
                style: `min-height: 500px; 
                        overflow: visible;`
            },
            // Navegador de servidores con explorador de items
            renderMCPServerNavigator(servers, (server) => {
                return renderMCPItemExplorer(server, (server, item, type) => {
                    return renderMCPItemSelector(server, item, type, {
                        renderContent: (item, server, type) => {
                            return div({ style: 'flex:1;' },
                                div({ 
                                    style: 'margin-bottom: 0.15rem; font-weight: 600; color: var(--text-primary);' 
                                }, item.name),
                                item.description ? div({ 
                                    style: 'font-size: 0.85em; color: var(--text-secondary); font-weight: normal;' 
                                }, item.description) : null,
                                renderItemTypeMetadata(item, type)
                            );
                        }
                    });
                });
            })
        ),
        
        // ✅ Acciones del explorador
        renderExplorerActions()
    );
}

/**
 * 🔧 VISTA PRINCIPAL DEL EXPLORADOR
 * Completamente independiente de presets
 */
const explorerView = (prefetch = {}) => {
    // Procesar datos MCP
    const mcpData = processMCPPrefetch(prefetch);
    const debug = Boolean(prefetch && (prefetch.debug === true || prefetchedTrue(prefetch.debug)));

    function prefetchedTrue(v) {
        return v === true || v === 'true' || v === '1' || v === 1;
    }

    // Datos para template principal
    const templateData = {
        flash: null,
        content: {
            catalogCounts: mcpData.catalog ? {
                servers: (mcpData.catalog.servers || []).length,
                connectedServers: (mcpData.catalog.servers || []).filter(s => s.isConnected).length
            } : null,
            totalItems: mcpData.totalItems || 0,
            flash: (prefetch && prefetch.flash) ? String(prefetch.flash) : ''
        }
    };

    return template(
        "MCP Explorer - Exploración Independiente",
        
        // Header del explorador
        div(
            { style: "margin-bottom: 2rem; padding: 1.5rem; background: var(--background-secondary); border: 1px solid var(--border-color); border-radius: 8px;" },
            div({ style: "margin-bottom: 1rem;" },
                div({ style: "font-size: 1.1em; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;" }, "🔧 Explorador MCP"),
                p({ style: "margin: 0; color: var(--text-secondary); line-height: 1.5;" }, 
                    "Explora servidores MCP disponibles, selecciona herramientas, recursos y prompts. Cada selección se mantiene independiente y puede guardarse como preset o usarse directamente en AI."
                )
            )
        ),

        // ✅ Barra de estadísticas justo después del header
        renderQuickActionsBar(mcpData),

        // ✅ CONTEXTO SELECCIONADO - Posicionado ANTES del explorador para vista rápida
        renderSelectedContextTree(),

        // ✅ Sección principal del explorador
        renderMCPExplorerSection(mcpData),

        // Scripts específicos del explorador - SIN preset loading automático
        require('hyperaxe').script({ src: "/assets/js/toast-manager.js" }),
        require('hyperaxe').script({ src: "/assets/js/mcp-selection-manager.js" }), // ✅ Use existing MCP selection manager
        require('hyperaxe').script(`
            // Inicialización específica del explorador
            document.addEventListener('DOMContentLoaded', function() {
                console.log('[Explorer View] Initializing independent explorer...');
                
                // Use the existing global MCP Selection Manager instance instead of creating a new one
                if (window.mcpSelectionManager) {
                    window.explorerManager = window.mcpSelectionManager;
                    console.log('[Explorer View] Reusing existing MCP Selection Manager instance');
                } else {
                    console.warn('[Explorer View] Global mcpSelectionManager not found');
                }
            });
        `),

        // Debug info (solo si está habilitado)
        debug ? require('hyperaxe').script(`
            console.group('🔧 [EXPLORER VIEW DEBUG]');
            console.log('📊 MCP Data:', ${JSON.stringify(mcpData, null, 2)});
            console.log('🎯 Template Data:', ${JSON.stringify(templateData, null, 2)});
            console.groupEnd();
        `) : null
    );
};

module.exports = {
    explorerView,
    renderMCPExplorerSection,
    renderSelectedContextTree,
    renderExplorerActions,
    aiI18n
};