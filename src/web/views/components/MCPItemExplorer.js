const { div, details, summary, span, strong } = require("hyperaxe");
const { aiI18n } = require('../i18n/ai_i18n');

/**
 * MCPItemExplorer - Componente para explorar items dentro de servidores MCP
 * Maneja la visualización de tools, resources y prompts agrupados por tipo
 */

/**
 * Renderiza un grupo de items MCP (tools, resources o prompts)
 * @param {Object} server - Datos del servidor
 * @param {string} labelText - Etiqueta del grupo (ej: "Tools", "Resources")
 * @param {Array} items - Array de items del tipo específico
 * @param {string} type - Tipo de items ('tool', 'resource', 'prompt')
 * @param {Function} renderItem - Función opcional para renderizar cada item
 * @returns {Object|null} Elemento HTML del grupo o null si no hay items
 */
function renderMCPItemGroup(server, labelText, items, type, renderItem) {
    if (!items || !items.length) return null;
    
    return details(
        { 
            class: 'mcp-item-group',
            style: 'margin-bottom: 1.25rem;'
        },
        renderGroupSummary(labelText, items.length, type),
        renderGroupContent(server, items, type, renderItem)
    );
}

/**
 * Renderiza el resumen del grupo de items
 * @param {string} labelText - Etiqueta del grupo
 * @param {number} itemCount - Número de items en el grupo
 * @param {string} type - Tipo de items
 * @returns {Object} Elemento summary HTML
 */
function renderGroupSummary(labelText, itemCount, type) {
    const typeIcon = getTypeIcon(type);
    
    return summary({ 
        class: 'mcp-group-summary',
        style: `
            font-weight: 600;
            color: var(--text-primary);
            cursor: pointer;
            user-select: none;
            padding: 0.75rem 0;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `
    }, 
        typeIcon,
        `${labelText} (${itemCount})`
    );
}

/**
 * Renderiza el contenido del grupo (grid de items)
 * @param {Object} server - Datos del servidor
 * @param {Array} items - Array de items
 * @param {string} type - Tipo de items
 * @param {Function} renderItem - Función para renderizar cada item
 * @returns {Object} Contenedor con los items
 */
function renderGroupContent(server, items, type, renderItem) {
    return div(
        { 
            class: 'mcp-items-container',
            style: `
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                max-height: 500px;
                overflow-y: auto;
                padding: 0.25rem 0.5rem 0.5rem 0;
            `
        },
        ...items.map(item => 
            renderItem ? renderItem(server, item, type) : renderDefaultItem(server, item, type)
        )
    );
}

/**
 * Renderiza un item MCP individual por defecto
 * @param {Object} server - Datos del servidor
 * @param {Object} item - Datos del item
 * @param {string} type - Tipo del item
 * @returns {Object} Elemento HTML del item
 */
function renderDefaultItem(server, item, type) {
    return div(
        { 
            class: 'mcp-item',
            style: `
                margin-bottom: 0.5rem;
                padding: 1rem;
                background: var(--background-secondary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                transition: all 0.2s;
                width: 100%;
            `,
            onmouseover: !server.isConnected ? '' : "this.style.borderColor='var(--primary-color)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'",
            onmouseout: !server.isConnected ? '' : "this.style.borderColor='var(--border-color)'; this.style.boxShadow='none'"
        },
        // Layout horizontal: header a la izquierda, metadata y detalles a la derecha
        div(
            { 
                style: 'display: flex; align-items: flex-start; gap: 1.5rem;'
            },
            // Columna principal: header y descripción
            div(
                { style: 'flex: 2; min-width: 0;' }, // min-width para text truncation
                renderItemHeader(item, server.isConnected)
            ),
            // Columna derecha: metadata y detalles
            div(
                { style: 'flex: 1; display: flex; flex-direction: column; gap: 0.5rem;' },
                renderItemMetadata(item, type),
                renderItemDetails(item, type)
            )
        )
    );
}

/**
 * Renderiza el header del item (nombre y descripción)
 * @param {Object} item - Datos del item
 * @param {boolean} isServerConnected - Si el servidor está conectado
 * @returns {Object} Header del item
 */
function renderItemHeader(item, isServerConnected) {
    return div(
        { 
            style: 'display: flex; flex-direction: column; gap: 0.5rem;'
        },
        div({ 
            class: 'mcp-item-name',
            style: `
                font-weight: 600; 
                color: var(--text-primary); 
                font-size: 1.1em;
                text-overflow: ellipsis;
                overflow: hidden;
                white-space: nowrap;
            `
        }, item.name),
        item.description ? div({ 
            class: 'mcp-item-description',
            style: `
                font-size: 0.9em; 
                color: var(--text-secondary); 
                font-weight: normal;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            `
        }, item.description) : null
    );
}

/**
 * Renderiza metadata específica del tipo de item
 * @param {Object} item - Datos del item
 * @param {string} type - Tipo del item
 * @returns {Object|null} Metadata del item o null
 */
function renderItemMetadata(item, type) {
    if (type === 'resource') {
        return renderResourceMetadata(item);
    }
    
    if (type === 'prompt' && Array.isArray(item.arguments) && item.arguments.length > 0) {
        return renderPromptMetadata(item);
    }
    
    return null;
}

/**
 * Renderiza metadata de un resource
 * @param {Object} item - Datos del resource
 * @returns {Object} Metadata del resource
 */
function renderResourceMetadata(item) {
    return div(
        { 
            class: 'mcp-resource-metadata',
            style: 'font-size: 0.8em; color: var(--text-secondary); background: var(--background-tertiary); padding: 0.25rem 0.5rem; border-radius: 3px; margin-bottom: 0.5rem;'
        },
        span({ style: 'margin-right: 0.5rem;' }, '🔗'),
        item.uri || '',
        item.mimeType ? span({ 
            style: 'margin-left: 0.5rem; color: var(--accent-color);' 
        }, item.mimeType) : null
    );
}

/**
 * Renderiza metadata de un prompt
 * @param {Object} item - Datos del prompt
 * @returns {Object} Metadata del prompt
 */
function renderPromptMetadata(item) {
    return div(
        { 
            class: 'mcp-prompt-metadata',
            style: 'font-size: 0.8em; color: var(--text-secondary); background: var(--background-tertiary); padding: 0.25rem 0.5rem; border-radius: 3px; margin-bottom: 0.5rem;'
        },
        span({ style: 'margin-right: 0.5rem;' }, '⚙️'),
        `${aiI18n.mcpArgsLabel}: `,
        ...item.arguments.map((arg, index) => [
            span({ 
                style: `color: ${arg.required ? 'var(--warning-color)' : 'var(--text-secondary)'};` 
            }, arg.name + (arg.required ? '*' : '')),
            index < item.arguments.length - 1 ? ', ' : ''
        ]).flat()
    );
}

/**
 * Renderiza detalles adicionales del item (ej: schema para tools)
 * @param {Object} item - Datos del item
 * @param {string} type - Tipo del item
 * @returns {Object|null} Detalles del item o null
 */
function renderItemDetails(item, type) {
    if (type === 'tool' && item.parameters) {
        return renderToolSchema(item);
    }
    return null;
}

/**
 * Renderiza el schema de un tool (colapsable)
 * @param {Object} item - Datos del tool
 * @returns {Object} Schema del tool
 */
function renderToolSchema(item) {
    const paramCount = Object.keys(item.parameters.properties || {}).length;
    const required = item.parameters.required || [];
    
    return details(
        { 
            class: 'mcp-tool-schema',
            style: 'margin-top: 0.75rem;' 
        },
        summary({ 
            style: `
                font-size: 0.8em;
                color: var(--accent-color);
                cursor: pointer;
                user-select: none;
                padding: 0.35rem 0;
            `
        }, 
            `📋 ${aiI18n.mcpViewSchema} (${paramCount} params, ${required.length} required)`
        ),
        div(
            { 
                class: 'mcp-schema-content',
                style: `
                    margin-top: 0.6rem;
                    padding: 0.9rem;
                    background: var(--background-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    max-height: 420px;
                    overflow-y: auto;
                `
            },
            div(
                { 
                    style: 'font-family: monospace; font-size: 0.75em; white-space: pre-wrap; color: var(--text-secondary); line-height: 1.4;'
                },
                JSON.stringify(item.parameters || {}, null, 2)
            )
        )
    );
}

/**
 * Obtiene el ícono correspondiente al tipo de item
 * @param {string} type - Tipo del item
 * @returns {string} Ícono del tipo
 */
function getTypeIcon(type) {
    switch (type) {
        case 'tool': return '🔧';
        case 'resource': return '📦';
        case 'prompt': return '💬';
        default: return '📄';
    }
}

/**
 * Renderiza todos los grupos de items de un servidor
 * @param {Object} server - Datos del servidor
 * @param {Function} renderItem - Función opcional para renderizar items individuales
 * @returns {Object} Contenedor con todos los grupos de items
 */
function renderMCPItemExplorer(server, renderItem) {
    return div(
        { 
            class: 'mcp-item-explorer'
        },
        renderMCPItemGroup(server, aiI18n.mcpToolsLabel, server.tools, 'tool', renderItem),
        renderMCPItemGroup(server, aiI18n.mcpResourcesLabel, server.resources, 'resource', renderItem),
        renderMCPItemGroup(server, aiI18n.mcpPromptsLabel, server.prompts, 'prompt', renderItem)
    );
}

module.exports = {
    renderMCPItemExplorer,
    renderMCPItemGroup,
    renderGroupSummary,
    renderGroupContent,
    renderDefaultItem,
    renderItemHeader,
    renderItemMetadata,
    renderItemDetails,
    renderResourceMetadata,
    renderPromptMetadata,
    renderToolSchema,
    getTypeIcon
};