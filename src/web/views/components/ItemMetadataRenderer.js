const { div, details, summary, pre } = require("hyperaxe");

/**
 * Componente: ItemMetadataRenderer
 * Renderiza metadata específica según el tipo de item MCP
 */

/**
 * Renderiza metadata específica según el tipo de item
 * @param {Object} item - Datos del item
 * @param {string} type - Tipo del item ('tool', 'resource', 'prompt')
 * @returns {Object|null} Elemento HTML con metadata o null
 */
function renderItemTypeMetadata(item, type) {
    if (type === 'resource' && item.uri) {
        return renderResourceMetadata(item);
    }
    
    if (type === 'prompt' && item.arguments && item.arguments.length > 0) {
        return renderPromptMetadata(item);
    }
    
    if (type === 'tool' && item.parameters) {
        return renderToolSchemaDetails(item);
    }
    
    return null;
}

/**
 * Renderiza metadata para recursos
 */
function renderResourceMetadata(item) {
    return div(
        { 
            style: 'font-size: 0.8em; color: var(--text-secondary); background: var(--background-tertiary); padding: 0.25rem 0.5rem; border-radius: 3px; margin-top: 0.5rem;'
        },
        '🔗 ' + item.uri,
        item.mimeType ? ` (${item.mimeType})` : ''
    );
}

/**
 * Renderiza metadata para prompts
 */
function renderPromptMetadata(item) {
    return div(
        { 
            style: 'font-size: 0.8em; color: var(--text-secondary); background: var(--background-tertiary); padding: 0.25rem 0.5rem; border-radius: 3px; margin-top: 0.5rem;'
        },
        '⚙️ ' + item.arguments.map(arg => arg.name + (arg.required ? '*' : '')).join(', ')
    );
}

/**
 * Renderiza detalles expandibles del schema de una tool
 * @param {Object} item - Datos de la tool
 * @returns {Object} Elemento HTML con schema expandible
 */
function renderToolSchemaDetails(item) {
    const paramCount = Object.keys(item.parameters.properties || {}).length;
    const required = item.parameters.required || [];
    
    return details(
        { 
            class: 'tool-schema-details',
            style: 'margin-top: 0.5rem;'
        },
        summary({ 
            style: `
                font-size: 0.8em;
                color: var(--accent-color);
                cursor: pointer;
                user-select: none;
                padding: 0.25rem 0.5rem;
                background: var(--background-tertiary);
                border-radius: 3px;
                transition: background-color 0.2s;
            `,
            onmouseover: "this.style.backgroundColor='var(--background-hover)'",
            onmouseout: "this.style.backgroundColor='var(--background-tertiary)'"
        }, 
            `📋 Ver Schema (${paramCount} parámetros, ${required.length} requeridos)`
        ),
        div(
            { 
                class: 'schema-content',
                style: `
                    margin-top: 0.5rem;
                    padding: 1rem;
                    background: var(--background-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    max-height: 400px;
                    overflow-y: auto;
                `
            },
            // Header con información básica
            renderSchemaHeader(item),
            
            // Parámetros requeridos
            required.length > 0 ? renderRequiredParameters(required) : null,
            
            // Schema JSON completo
            renderSchemaJSON(item.parameters)
        )
    );
}

/**
 * Renderiza el header del schema con info básica
 */
function renderSchemaHeader(item) {
    return div(
        { style: 'margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);' },
        div({ style: 'font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;' }, '🔧 ' + item.name),
        div({ style: 'font-size: 0.85em; color: var(--text-secondary);' }, item.description || 'Sin descripción')
    );
}

/**
 * Renderiza los parámetros requeridos como pills
 */
function renderRequiredParameters(required) {
    return div(
        { style: 'margin-bottom: 1rem;' },
        div({ style: 'font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;' }, '⚠️ Parámetros Requeridos:'),
        div(
            { style: 'display: flex; flex-wrap: wrap; gap: 0.25rem;' },
            ...required.map(param => div(
                { 
                    style: 'padding: 0.25rem 0.5rem; background: var(--error-background); color: var(--error-color); border-radius: 3px; font-size: 0.8em; font-family: monospace;'
                },
                param
            ))
        )
    );
}

/**
 * Renderiza el schema JSON completo
 */
function renderSchemaJSON(parameters) {
    return div(
        { style: 'margin-bottom: 0.5rem;' },
        div({ style: 'font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;' }, '📄 Schema JSON:'),
        pre(
            { 
                style: `
                    font-family: 'Consolas', 'Monaco', monospace;
                    font-size: 0.75em;
                    white-space: pre-wrap;
                    color: var(--text-secondary);
                    line-height: 1.4;
                    background: var(--background-secondary);
                    padding: 0.75rem;
                    border-radius: 4px;
                    overflow-x: auto;
                `
            },
            JSON.stringify(parameters || {}, null, 2)
        )
    );
}

module.exports = {
    renderItemTypeMetadata,
    renderToolSchemaDetails,
    renderResourceMetadata,
    renderPromptMetadata
};