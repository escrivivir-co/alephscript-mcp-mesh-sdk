const { div, h3, h4, p, span, ul, li, button, strong } = require("hyperaxe");

/**
 * Componente para renderizar detalles de preset
 * Funciona tanto en server-side como client-side
 */

/**
 * Renderiza los detalles de un preset
 * @param {Object|null} preset - Preset a mostrar
 * @param {Object} state - Estado actual (selectedItems, isLoading, etc.)
 * @param {Object} handlers - Funciones de manejo de eventos
 * @param {Object} options - Opciones de renderizado
 * @returns {Object} Hyperaxe element
 */
function renderPresetDetails(preset, state = {}, handlers = {}, options = { showActions: true }) {
    const { selectedItems = [], isLoading } = state;
    const { onEdit, onDuplicate, onDelete, onUse } = handlers;

    if (isLoading) {
        return renderDetailsLoadingState();
    }

    if (!preset) {
        return renderDetailsEmptyState();
    }

    const itemsCount = preset.itemsCount || { tools: 0, resources: 0, prompts: 0, total: 0 };
    const createdDate = preset.createdAt ? new Date(preset.createdAt).toLocaleDateString() : 'N/A';
    const lastUsed = preset.lastUsed ? new Date(preset.lastUsed).toLocaleDateString() : 'Nunca';

    return div(
        { 
            id: "preset-details-container",
            class: "preset-details-container",
            style: `
                background: var(--background-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1.5rem;
            `
        },
        
        // Header con info básica del preset
        renderDetailsHeader(preset, itemsCount, options.showActions, handlers),
        
        // Metadata section
        renderDetailsMetadata(createdDate, lastUsed),
        
        // Items breakdown section
        preset.selectedItems && preset.selectedItems.length > 0 
            ? renderDetailsItemsBreakdown(preset.selectedItems, itemsCount)
            : null,

        // Context comparison si hay selectedItems actuales
        selectedItems.length > 0 
            ? renderDetailsContextComparison(preset.selectedItems || [], selectedItems)
            : null
    );
}

/**
 * Renderiza el header con información básica del preset
 */
function renderDetailsHeader(preset, itemsCount, showActions, handlers) {
    const { onEdit, onDuplicate, onDelete, onUse } = handlers;
    
    return div({
        class: "preset-details-header",
        style: "border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1rem;"
    },
        // Título y descripción
        div({
            style: "margin-bottom: 1rem;"
        },
            h3({ 
                style: "margin: 0 0 0.5rem 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;" 
            }, "🧩", preset.name),
            
            preset.description ? p({ 
                style: "margin: 0; color: var(--text-secondary); font-style: italic; line-height: 1.4;" 
            }, preset.description) : null
        ),
        
        // Stats row
        div({
            class: "preset-stats",
            style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-bottom: 1rem;"
        },
            renderStatBadge("🔧", "Tools", itemsCount.tools, "var(--primary-color)"),
            renderStatBadge("📦", "Resources", itemsCount.resources, "var(--accent-color)"),
            renderStatBadge("💬", "Prompts", itemsCount.prompts, "var(--warning-color)"),
            renderStatBadge("📊", "Total", itemsCount.total, "var(--success-color)")
        ),
        
        // Acciones
        showActions ? renderDetailsActions(preset, handlers) : null
    );
}

/**
 * Renderiza las acciones de los detalles
 */
function renderDetailsActions(preset, handlers) {
    const { onEdit, onDuplicate, onDelete, onUse } = handlers;
    
    return div({
        class: "preset-details-actions",
        style: "display: flex; gap: 0.75rem; flex-wrap: wrap;"
    },
        onUse ? button({
            class: "btn btn-success use-preset-btn",
            "data-action": "use",
            "data-preset-name": preset.name,
            style: "padding: 0.5rem 1rem;",
            title: "Usar este preset en IA"
        }, "🚀 Usar en IA") : null,
        
        onEdit ? button({
            class: "btn btn-outline edit-preset-btn",
            "data-action": "edit",
            "data-preset-name": preset.name,
            style: "padding: 0.5rem 1rem;",
            title: "Editar preset"
        }, "✏️ Editar") : null,
        
        onDuplicate ? button({
            class: "btn btn-outline duplicate-preset-btn",
            "data-action": "duplicate",
            "data-preset-name": preset.name,
            style: "padding: 0.5rem 1rem;",
            title: "Crear copia de este preset"
        }, "📋 Duplicar") : null,
        
        onDelete ? button({
            class: "btn btn-danger delete-preset-btn",
            "data-action": "delete",
            "data-preset-name": preset.name,
            style: "padding: 0.5rem 1rem;",
            title: "Eliminar preset"
        }, "🗑️ Eliminar") : null
    );
}

/**
 * Renderiza la sección de metadata
 */
function renderDetailsMetadata(createdDate, lastUsed) {
    return div({
        class: "preset-metadata",
        style: "margin-bottom: 1.5rem;"
    },
        h4({ 
            style: "margin: 0 0 0.75rem 0; color: var(--text-primary); font-size: 1rem;" 
        }, "📅 Información"),
        div({
            style: "display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9em;"
        },
            div({
                style: "padding: 0.75rem; background: var(--background-primary); border-radius: 4px;"
            },
                strong({ style: "color: var(--text-primary);" }, "Creado: "),
                span({ style: "color: var(--text-secondary);" }, createdDate)
            ),
            div({
                style: "padding: 0.75rem; background: var(--background-primary); border-radius: 4px;"
            },
                strong({ style: "color: var(--text-primary);" }, "Último uso: "),
                span({ style: "color: var(--text-secondary);" }, lastUsed)
            )
        )
    );
}

/**
 * Renderiza el breakdown de items del preset
 */
function renderDetailsItemsBreakdown(selectedItems, itemsCount) {
    // Agrupar items por tipo
    const itemsByType = selectedItems.reduce((acc, item) => {
        const type = item.type || 'unknown';
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
    }, {});

    return div({
        class: "preset-items-breakdown",
        style: "margin-bottom: 1.5rem;"
    },
        h4({ 
            style: "margin: 0 0 0.75rem 0; color: var(--text-primary); font-size: 1rem;" 
        }, "📋 Contenido del Preset"),
        
        Object.keys(itemsByType).length > 0 ? div({
            style: "display: flex; flex-direction: column; gap: 1rem;"
        },
            ...Object.entries(itemsByType).map(([type, items]) =>
                renderItemTypeGroup(type, items)
            )
        ) : p({
            style: "color: var(--text-secondary); font-style: italic;"
        }, "No hay elementos específicos guardados en este preset")
    );
}

/**
 * Renderiza un grupo de items por tipo
 */
function renderItemTypeGroup(type, items) {
    const typeConfig = {
        tools: { icon: "🔧", label: "Tools", color: "var(--primary-color)" },
        resources: { icon: "📦", label: "Resources", color: "var(--accent-color)" },
        prompts: { icon: "💬", label: "Prompts", color: "var(--warning-color)" }
    };
    
    const config = typeConfig[type] || { icon: "❓", label: type, color: "var(--text-secondary)" };
    
    return div({
        class: `item-type-group item-type-${type}`,
        style: "border: 1px solid var(--border-color); border-radius: 6px; padding: 1rem;"
    },
        div({
            style: "display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;"
        },
            span({ style: "font-size: 1.2em;" }, config.icon),
            strong({ 
                style: `color: ${config.color}; font-size: 1rem;` 
            }, `${config.label} (${items.length})`)
        ),
        
        ul({
            style: "list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem;"
        },
            ...items.slice(0, 5).map(item => // Mostrar máximo 5 items
                li({
                    class: "preset-item",
                    style: "font-size: 0.9em; color: var(--text-secondary); padding-left: 1rem; position: relative;"
                },
                    span({
                        style: "position: absolute; left: 0; color: var(--text-muted);"
                    }, "•"),
                    item.name || item.id || 'Sin nombre'
                )
            ),
            
            items.length > 5 ? li({
                style: "font-size: 0.9em; color: var(--text-muted); font-style: italic; padding-left: 1rem;"
            }, `... y ${items.length - 5} más`) : null
        )
    );
}

/**
 * Renderiza comparación con contexto actual
 */
function renderDetailsContextComparison(presetItems, currentItems) {
    const presetItemIds = new Set(presetItems.map(item => item.id));
    const currentItemIds = new Set(currentItems.map(item => item.id));
    
    const inBoth = currentItems.filter(item => presetItemIds.has(item.id)).length;
    const onlyInPreset = presetItems.filter(item => !currentItemIds.has(item.id)).length;
    const onlyInCurrent = currentItems.filter(item => !presetItemIds.has(item.id)).length;
    
    return div({
        class: "context-comparison",
        style: "border-top: 1px solid var(--border-color); padding-top: 1rem;"
    },
        h4({ 
            style: "margin: 0 0 0.75rem 0; color: var(--text-primary); font-size: 1rem;" 
        }, "🔄 Comparación con Contexto Actual"),
        
        div({
            style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;"
        },
            renderComparisonStat("✅", "En ambos", inBoth, "var(--success-color)"),
            renderComparisonStat("📄", "Solo en preset", onlyInPreset, "var(--warning-color)"),
            renderComparisonStat("🆕", "Solo actual", onlyInCurrent, "var(--info-color)")
        )
    );
}

/**
 * Renderiza una estadística de comparación
 */
function renderComparisonStat(icon, label, count, color) {
    return div({
        style: `
            background: var(--background-primary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 0.75rem;
            text-align: center;
        `
    },
        div({ 
            style: "font-size: 1.2em; margin-bottom: 0.25rem;" 
        }, icon),
        div({ 
            style: `font-weight: 600; color: ${color}; font-size: 1.1em;` 
        }, count),
        div({ 
            style: "font-size: 0.8em; color: var(--text-secondary);" 
        }, label)
    );
}

/**
 * Renderiza un badge de estadística
 */
function renderStatBadge(icon, label, count, color) {
    return div({
        class: `stat-badge stat-${label.toLowerCase()}`,
        style: `
            background: var(--background-primary);
            border: 1px solid ${color};
            border-radius: 6px;
            padding: 0.75rem;
            text-align: center;
            transition: transform 0.2s ease;
        `
    },
        div({ 
            style: "font-size: 1.2em; margin-bottom: 0.25rem;" 
        }, icon),
        div({ 
            style: `font-weight: 600; color: ${color}; font-size: 1.1em;` 
        }, count),
        div({ 
            style: "font-size: 0.8em; color: var(--text-secondary);" 
        }, label)
    );
}

/**
 * Estado de carga para detalles
 */
function renderDetailsLoadingState() {
    return div(
        { 
            id: "preset-details-container",
            class: "preset-details-container loading",
            style: `
                background: var(--background-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 2rem;
                text-align: center;
                min-height: 300px;
                display: flex;
                flex-direction: column;
                justify-content: center;
            `
        },
        div({ 
            style: "font-size: 2rem; margin-bottom: 1rem; animation: pulse 1.5s ease-in-out infinite;" 
        }, "⏳"),
        h3({ style: "margin: 0 0 0.5rem 0; color: var(--text-secondary);" }, "Cargando detalles..."),
        p({ style: "margin: 0; color: var(--text-secondary);" }, "Por favor espera un momento")
    );
}

/**
 * Estado vacío para detalles
 */
function renderDetailsEmptyState() {
    return div(
        { 
            id: "preset-details-container",
            class: "preset-details-container empty",
            style: `
                background: var(--background-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 2rem;
                text-align: center;
                min-height: 300px;
                display: flex;
                flex-direction: column;
                justify-content: center;
            `
        },
        div({ style: "font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;" }, "🧩"),
        h3({ style: "margin: 0 0 0.5rem 0; color: var(--text-secondary);" }, "Selecciona un preset"),
        p({ style: "margin: 0; color: var(--text-secondary);" }, "Elige un preset de la lista para ver sus detalles")
    );
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        renderPresetDetails,
        renderDetailsHeader,
        renderDetailsActions,
        renderDetailsMetadata,
        renderDetailsItemsBreakdown,
        renderDetailsContextComparison,
        renderStatBadge,
        renderDetailsLoadingState,
        renderDetailsEmptyState
    };
} else if (typeof window !== 'undefined') {
    window.PresetDetailsComponents = {
        renderPresetDetails,
        renderDetailsHeader,
        renderDetailsActions,
        renderDetailsMetadata,
        renderDetailsItemsBreakdown,
        renderDetailsContextComparison,
        renderStatBadge,
        renderDetailsLoadingState,
        renderDetailsEmptyState
    };
}