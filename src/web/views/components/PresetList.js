const { div, h3, ul, li, span, button, p, strong } = require("hyperaxe");

/**
 * Componentes de renderizado para presets
 * Componentes funcionales que devuelven hyperaxe objects
 * Funcionan tanto en server-side como client-side
 */

/**
 * Renderiza la lista completa de presets
 * @param {Array} presets - Lista de presets
 * @param {Object} state - Estado actual (activePreset, isLoading, etc.)
 * @param {Object} handlers - Funciones de manejo de eventos
 * @param {Object} options - Opciones de renderizado
 * @returns {Object} Hyperaxe element
 */
function renderPresetList(presets, state = {}, handlers = {}, options = { showActions: true }) {
    const { activePreset, isLoading } = state;
    const { onSelect, onCreate, onEdit, onDuplicate, onDelete, onUse } = handlers;
    const activeName = activePreset ? activePreset.name : null;

    if (isLoading) {
        return renderLoadingState();
    }

    if (!presets || presets.length === 0) {
        return renderEmptyState(options.showActions, onCreate);
    }

    return div(
        { 
            id: "preset-list-container",
            class: "preset-list-container",
            style: `
                background: var(--background-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1.5rem;
            `
        },
        
        // Header
        renderListHeader(presets.length, options.showActions, onCreate),
        
        // Lista de presets
        ul({
            class: "preset-list",
            style: `
                list-style: none;
                margin: 0;
                padding: 0;
                max-height: 600px;
                overflow-y: auto;
                scrollbar-width: thin;
                scrollbar-color: var(--border-color) transparent;
            `
        }, 
            ...presets.map((preset, index) => 
                renderPresetListItem(preset, {
                    isActive: activeName === preset.name,
                    index,
                    showActions: options.showActions
                }, {
                    onSelect,
                    onEdit,
                    onDuplicate,
                    onDelete,
                    onUse
                })
            )
        )
    );
}

/**
 * Renderiza el header de la lista
 */
function renderListHeader(count, showActions, onCreate) {
    return div({
        style: "margin-bottom: 1rem;"
    },
        // Título y botón crear
        div({
            style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;"
        },
            h3({ 
                style: "margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;" 
            }, "💾", `Mis Presets (${count})`)
        ),
        
        // Campo de búsqueda (solo si hay presets)
        count > 0 ? div({
            style: "position: relative;"
        },
            require('hyperaxe').input({
                type: "text",
                id: "preset-search-input",
                placeholder: "🔍 Buscar presets...",
                style: `
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    background: var(--background-primary);
                    color: var(--text-primary);
                    font-size: 0.9em;
                `
            })
        ) : null
    );
}

/**
 * Renderiza un item individual de preset de forma pura
 */
function renderPresetListItem(preset, itemState = {}, handlers = {}) {
    const { isActive, index, showActions } = itemState;
    const { onSelect, onEdit, onDuplicate, onDelete, onUse } = handlers;
    
    const itemsCount = preset.itemsCount?.total || 0;
    const createdDate = preset.createdAt ? new Date(preset.createdAt).toLocaleDateString() : 'N/A';
    
    return li({
        class: `preset-list-item ${isActive ? 'is-active' : ''}`,
        "data-preset-id": preset.id || preset.name,
        "data-preset-name": preset.name,
        "data-action": "select",
        style: `
            display: flex;
            align-items: center;
            padding: 0.75rem;
            margin-bottom: 0.25rem;
            background: ${isActive ? 'var(--primary-color-light)' : 'var(--background-primary)'};
            border: 1px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'};
            border-radius: 6px;
            transition: all 0.2s ease;
            cursor: pointer;
            min-height: auto;
        `
    },
        // Contenido principal del preset
        div({
            class: "preset-info",
            style: "flex: 1; min-width: 0;"
        },
            div({
                style: "display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.125rem;"
            },
                span({
                    class: "preset-name",
                    style: "font-weight: 600; color: var(--text-primary); font-size: 0.95rem;"
                }, preset.name + "<<<<"),

                renderItemsCountBadge(itemsCount),

                preset.description ? span({
                    class: "preset-description",
                    style: "margin: 0 0 0.125rem 0; color: var(--text-secondary); font-size: 0.85em; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                }, preset.description) : null,
                span({
                    class: "preset-date",
                    style: "font-size: 0.75em; color: var(--text-muted);"
                }, `${createdDate}`),
                showActions ? renderPresetActions(preset, handlers) : null
            )
        )        
    );
}

/**
 * Renderiza el badge con el número de elementos
 */
function renderItemsCountBadge(count) {
    return span({
        class: "items-count-badge",
        style: `
            background: var(--primary-color-light);
            color: var(--primary-color);
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.75em;
            font-weight: 600;
        `
    }, `${count} elementos`);
}

/**
 * Renderiza las acciones del preset
 */
function renderPresetActions(preset, handlers) {
    const { onEdit, onDuplicate, onDelete, onUse } = handlers;
    
    return div({
        class: "preset-actions",
        style: `
            display: flex;
            gap: 0.5rem;
            margin-left: 1rem;
            opacity: 0.7;
            transition: opacity 0.2s ease;
        `
    },
        
        // Botón editar
        onEdit ? button({
            class: "btn btn-sm btn-outline edit-preset-btn",
            "data-action": "edit",
            "data-preset-name": preset.name,
            style: "padding: 0.375rem 0.75rem; font-size: 0.8em;",
            title: "Editar preset"
        }, "✏️") : null,
        
        // Botón duplicar
        onDuplicate ? button({
            class: "btn btn-sm btn-outline duplicate-preset-btn",
            "data-action": "duplicate",
            "data-preset-name": preset.name,
            style: "padding: 0.375rem 0.75rem; font-size: 0.8em;",
            title: "Duplicar preset"
        }, "📋") : null,
        
        // Botón eliminar
        onDelete ? button({
            class: "btn btn-sm btn-danger delete-preset-btn",
            "data-action": "delete",
            "data-preset-name": preset.name,
            style: "padding: 0.375rem 0.75rem; font-size: 0.8em;",
            title: "Eliminar preset"
        }, "🗑️") : null
    );
}

/**
 * Estado de carga
 */
function renderLoadingState() {
    return div(
        { 
            id: "preset-list-container",
            class: "preset-list-container loading",
            style: `
                background: var(--background-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 2rem;
                text-align: center;
            `
        },
        div({ 
            style: "font-size: 2rem; margin-bottom: 1rem; animation: pulse 1.5s ease-in-out infinite;" 
        }, "⏳"),
        h3({ style: "margin: 0 0 0.5rem 0; color: var(--text-secondary);" }, "Cargando presets..."),
        p({ style: "margin: 0; color: var(--text-secondary);" }, "Por favor espera un momento")
    );
}

/**
 * Estado vacío
 */
function renderEmptyState(showActions, onCreate) {
    return div(
        { 
            id: "preset-list-container",
            class: "preset-list-container empty",
            style: `
                background: var(--background-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1.5rem;
            `
        },
        // Empty state message
        div({
            class: "empty-state-content",
            style: "text-align: center; padding: 1rem 0;"
        },
            div({ style: "font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;" }, "📝"),
            h3({ style: "margin: 0 0 0.5rem 0; color: var(--text-secondary);" }, "No hay presets creados"),
            p({ 
                style: "margin: 0 0 1.5rem 0; color: var(--text-secondary);" 
            }, "Crea tu primer preset seleccionando elementos del catálogo y usando la barra de 'Guardar Preset' al final de la página."),
            
            showActions && onCreate ? button({
                class: "btn btn-primary create-preset-btn",
                "data-action": "create",
                style: "padding: 0.75rem 1.5rem;"
            }, "➕ Crear mi primer preset") : null
        ),
        
        // Include the list structure for JavaScript hydration
        ul({
            class: "preset-list",
            style: "list-style: none; margin: 0; padding: 0; display: none;"
        })
    );
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        renderPresetList,
        renderPresetListItem,
        renderItemsCountBadge,
        renderPresetActions,
        renderLoadingState,
        renderEmptyState
    };
} else if (typeof window !== 'undefined') {
    window.PresetListComponents = {
        renderPresetList,
        renderPresetListItem,
        renderItemsCountBadge,
        renderPresetActions,
        renderLoadingState,
        renderEmptyState
    };
}