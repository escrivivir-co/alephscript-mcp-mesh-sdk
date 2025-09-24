const { div, h3, section, button } = require("hyperaxe");
const { renderPresetList } = require("./PresetList");
const { renderPresetDetails } = require("./PresetDetails");
const { renderMCPContextTree } = require("./MCPContextTree");

/**
 * Componente: Gestión de Presets y Contexto
 * 
 * Gestiona la funcionalidad de presets entre el catálogo y la vista AI,
 * con componente moderno y arquitectura limpia.
 * 
 * @param {Object} options - Opciones de configuración
 * @param {Array} options.presets - Lista de presets disponibles
 * @param {Object} options.activePreset - Preset actualmente activo
 * @param {Object} options.selectedContext - Contexto seleccionado actual
 * @param {number} options.totalItems - Total de items disponibles
 * @param {string} options.mode - 'catalog' | 'ai' - Modo de visualización
 * @param {boolean} options.showActions - Si mostrar botones de acción
 */
function renderPresetManager(options = {}) {
    const {
        presets = [],
        activePreset = null,
        selectedContext = {},
        totalItems = 0,
        mode = 'catalog',
        showActions = true
    } = options;

    const isCatalogMode = mode === 'catalog';
    const isAIMode = mode === 'ai';

    return section(
        { 
            class: `preset-manager ${mode}-mode`,
            style: "margin-bottom: 2rem;",
            'data-preset-container': true
        },
        // Botones de acción (solo en modo catálogo)
        showActions && isCatalogMode ? div(
            {
                class: "preset-actions",
                style: "margin-bottom: 1.5rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;"
            },
            button({
                id: "create-preset-btn",
                class: "btn btn-primary",
                style: "font-size: 0.9em;"
            }, "➕ Crear Nuevo"),
            
            button({
                id: "import-preset-btn", 
                class: "btn btn-secondary",
                style: "font-size: 0.9em;"
            }, "📥 Importar"),
            
            button({
                id: "export-preset-btn",
                class: "btn btn-secondary", 
                style: "font-size: 0.9em;"
            }, "📤 Exportar")
        ) : null,

        // Layout principal: dos columnas en catálogo, una en AI
        div({
            class: "preset-manager-layout",
            style: isCatalogMode 
                ? "display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; min-height: 400px;"
                : "display: flex; flex-direction: column; gap: 1.5rem;"
        },
            // Columna izquierda: Lista de presets
            div({
                class: "preset-list-column",
                style: isCatalogMode 
                    ? "background: var(--background-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.5rem;"
                    : "background: var(--background-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem;"
            },
                h3({ 
                    style: "margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.1em;" 
                }, "📋 Mis Presets"),
                
                renderPresetList(presets, { activePreset }, {
                    onSelect: (presetName) => `selectPreset('${presetName}')`,
                    onCreate: () => `showCreatePresetForm()`,
                    onEdit: (presetName) => `editPreset('${presetName}')`,
                    onDuplicate: (presetName) => `duplicatePreset('${presetName}')`,
                    onDelete: (presetName) => `deletePreset('${presetName}')`,
                    onUse: (presetName) => isAIMode ? `usePreset('${presetName}')` : null
                }, { showActions })
            ),
            
            // Columna derecha: Detalles del preset (solo en catálogo)
            isCatalogMode ? div({
                class: "preset-details-column",
                style: "background: var(--background-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.5rem;"
            },
                h3({ 
                    style: "margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.1em;" 
                }, "🔍 Detalles del Preset"),
                
                renderPresetDetails(activePreset, { selectedItems: [] }, {
                    onEdit: (presetName) => `editPreset('${presetName}')`,
                    onDuplicate: (presetName) => `duplicatePreset('${presetName}')`,
                    onDelete: (presetName) => `deletePreset('${presetName}')`,
                    onUse: (presetName) => `usePreset('${presetName}')`
                }, { showActions })
            ) : null
        ),

        // Sección de contexto y acciones en 2 columnas (solo en modo catálogo)
        isCatalogMode ? renderContextAndActionsSection(selectedContext, totalItems, mode) : null
    );
}

/**
 * Renderiza la sección de contexto y acciones en 2 columnas
 */
function renderContextAndActionsSection(selectedContext, totalItems, mode) {
    const hasContext = selectedContext && Object.keys(selectedContext).length > 0;
    
    return section({
        class: "context-and-actions-section",
        style: "margin-top: 2rem;"
    },
        // Layout de 2 columnas
        div({
            style: "display: grid; grid-template-columns: 1fr 400px; gap: 2rem; align-items: start;"
        },
            // Columna izquierda: Contexto seleccionado
            div({
                class: "context-column",
                style: "background: var(--background-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.5rem;"
            }, 
                hasContext 
                    ? renderMCPContextTree(selectedContext.items || selectedContext, {
                        onRemoveItem: (serverId, itemType, itemName) => `removeFromContext('${serverId}', '${itemType}', '${itemName}')`,
                        onClearAll: () => `clearContext()`,
                        onCreatePreset: () => `createPresetFromContext()`
                    })
                    : div({
                        class: "empty-context",
                        style: "text-align: center; padding: 2rem; color: var(--text-secondary);"
                    },
                        div({ style: "font-size: 2rem; margin-bottom: 0.5rem;" }, "📝"),
                        div({ style: "font-weight: 600; margin-bottom: 0.5rem;" }, 
                            "Selecciona herramientas del explorador"
                        ),
                        div({ style: "font-size: 0.9em;" }, 
                            "Los elementos que selecciones del explorador aparecerán aquí y podrás guardarlos como preset"
                        )
                    )
            ),
            
            // Columna derecha: Formulario y acciones
            div({
                class: "actions-column",
                style: "background: var(--background-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.5rem;"
            },
                renderPresetFormAndActions()
            )
        )
    );
}

/**
 * Renderiza el formulario de preset y botones de acción
 */
function renderPresetFormAndActions() {
    const { h3, form, input, button, div } = require("hyperaxe");
    
    return div(
        h3({ 
            style: "margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.1em;" 
        }, "💾 Guardar Preset"),
        
        form({
            method: 'POST', 
            action: '/ai/ui/mcp/set', 
            class: 'mcp-form preset-save-form', 
            id: 'preset-save-form',
            style: "margin-bottom: 1.5rem;"
        },
            input({ type: 'hidden', name: 'returnTo', value: '/explorer' }),
            input({ type: 'hidden', name: 'selectedItems', id: 'selectedItems-context', value: '[]' }),
            
            div({ style: "margin-bottom: 1rem;" },
                input({ 
                    id: "preset-name-context", 
                    name: 'presetName', 
                    type: "text", 
                    placeholder: "Nombre del preset...",
                    style: "width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.9em;"
                })
            ),
            
            div({ style: "display: flex; gap: 0.5rem;" },
                button({ 
                    class: "btn btn-primary", 
                    type: "submit",
                    id: "save-preset-context-btn",
                    style: "flex: 1; font-size: 0.9em;",
                    disabled: true
                }, "💾 Guardar"),
                
                button({
                    class: "btn btn-secondary",
                    type: "button",
                    id: "clear-selection-context-btn", 
                    style: "flex: 1; font-size: 0.9em;",
                    disabled: true
                }, "🗑️ Limpiar")
            )
        ),
        
        // Botón Actualizar
        button({
            id: "refresh-catalog-context-btn",
            class: "btn btn-secondary",
            style: "width: 100%; font-size: 0.9em; margin-bottom: 1rem;"
        }, "🔄 Actualizar Catálogo"),
        
        // Estadísticas de contexto
        div({
            id: "context-stats",
            style: "padding: 1rem; background: var(--background-tertiary); border-radius: 6px; text-align: center; font-size: 0.85em; color: var(--text-secondary);"
        }, "0 elementos seleccionados")
    );
}

module.exports = {
    renderPresetManager,
    renderContextAndActionsSection
};