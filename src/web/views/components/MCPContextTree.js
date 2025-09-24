const { div, h3, span, strong } = require("hyperaxe");

/**
 * MCPContextTree - Componente para mostrar el árbol de contexto con elementos seleccionados
 * Maneja la visualización jerárquica de items seleccionados agrupados por servidor y tipo
 */

/**
 * Renderiza el árbol de contexto completo con resumen y árbol expandido
 * @param {Array} selectedItems - Array de items seleccionados [{server, type, name}]
 * @param {Object} options - Opciones de renderizado
 * @returns {Object} Elemento HTML del árbol de contexto
 */
function renderMCPContextTree(selectedItems = [], options = {}) {
    const {
        title = 'Contexto seleccionado',
        icon = '🧩',
        showSummary = true,
        maxHeight = '220px',
        containerStyle = ''
    } = options;
    
    const itemsArray = selectedItems || [];
    const grouped = groupByServerAndType(itemsArray);
    const total = itemsArray.length;
    
    return div(
        { 
            id: 'mcp-selected-context',
            class: 'mcp-context-tree',
            style: 'margin-top: 1rem;' + containerStyle
        },
        // Header del árbol de contexto
        renderContextHeader(title, icon),
        
        // Resumen numérico (opcional)
        showSummary ? renderContextSummary(total) : null,
        
        // Árbol de items seleccionados
        renderContextTreeContent(grouped, maxHeight)
    );
}

/**
 * Renderiza el header del árbol de contexto con diseño profesional
 * @param {string} title - Título del contexto
 * @param {string} icon - Ícono del contexto
 * @returns {Object} Header del contexto
 */
function renderContextHeader(title, icon) {
    return div({ 
        class: 'context-tree-header',
        style: `
            display: flex; 
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding: 0.75rem 1rem;
            background: var(--background-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            box-shadow: var(--shadow-small);
        `
    }, [
        h3({ 
            style: `
                margin: 0; 
                color: var(--text-primary); 
                font-size: 1.1em; 
                display: flex; 
                align-items: center; 
                gap: 0.5rem;
                font-weight: 600;
            `
        }, [icon, title])
    ]);
}

/**
 * Renderiza el resumen numérico del contexto con estadísticas visuales
 * @param {number} total - Total de items seleccionados
 * @returns {Object} Resumen del contexto
 */
function renderContextSummary(total) {
    return div({
        id: 'mcp-selected-summary',
        class: 'mcp-context-summary',
        style: `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
            gap: 0.5rem;
            margin-bottom: 1rem;
            padding: 0.75rem;
            background: var(--background-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
        `
    }, [
        div({
            class: 'mcp-stat-badge',
            style: `
                text-align: center;
                padding: 0.5rem;
                background: var(--background-primary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                font-size: 0.8em;
            `
        }, [
            div({ style: 'font-size: 1.2em; margin-bottom: 0.25rem;' }, '📊'),
            div({ style: 'font-weight: 600; color: var(--text-primary);' }, (total || 0).toString()),
            div({ style: 'color: var(--text-secondary);' }, 'Total')
        ])
    ]);
}

/**
 * Renderiza el contenido del árbol de contexto
 * @param {Object} grouped - Items agrupados por servidor y tipo
 * @param {string} maxHeight - Altura máxima del contenedor
 * @returns {Object} Contenido del árbol
 */
function renderContextTreeContent(grouped, maxHeight) {
    return div({
        id: 'mcp-selected-tree',
        class: 'mcp-context-tree-content',
        style: `
            max-height: ${maxHeight}; 
            overflow-y: auto; 
            background: var(--background-secondary); 
            border: 1px solid var(--border-color); 
            border-radius: 8px; 
            padding: 1rem; 
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; 
            font-size: 0.85em; 
            color: var(--text-secondary);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        `
    }, renderTreeHTML(grouped));
}

/**
 * Agrupa items seleccionados por servidor y tipo
 * @param {Array} items - Array de items [{server, type, name}]
 * @returns {Object} Items agrupados {serverName: {tools: [], resources: [], prompts: []}}
 */
function groupByServerAndType(items) {
    const map = {};
    
    // Handle both array format and object with items property
    let itemsArray = Array.isArray(items) ? items : (items && items.items ? items.items : []);
    
    if (!Array.isArray(itemsArray)) {
        console.warn('groupByServerAndType: Expected array but got:', typeof items, items);
        return map;
    }
    
    itemsArray.forEach(function(item){
        if (!item || !item.server) return;
        
        map[item.server] = map[item.server] || { 
            tools: [], 
            resources: [], 
            prompts: [] 
        };
        
        if (item.type === 'tool') {
            map[item.server].tools.push(item.name);
        } else if (item.type === 'resource') {
            map[item.server].resources.push(item.name);
        } else if (item.type === 'prompt') {
            map[item.server].prompts.push(item.name);
        }
    });
    
    return map;
}

/**
 * Renderiza el HTML del árbol jerárquico con diseño profesional
 * @param {Object} grouped - Items agrupados por servidor y tipo
 * @returns {string} HTML del árbol
 */
function renderTreeHTML(grouped) {
    const servers = Object.keys(grouped);
    
    if (servers.length === 0) {
        return `
            <div style="
                text-align: center; 
                padding: 2rem 1rem; 
                color: var(--text-secondary); 
                font-style: italic;
                background: var(--background-primary);
                border-radius: 6px;
                border: 1px dashed var(--border-color);
            ">
                <div style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;">📭</div>
                <div>Ningún elemento seleccionado</div>
                <div style="font-size: 0.8em; margin-top: 0.5rem; opacity: 0.7;">
                    Selecciona elementos del catálogo para verlos aquí
                </div>
            </div>
        `;
    }
    
    return `<div class="server-tree-container">` + 
        servers.map(function(serverName) {
            const serverGroup = grouped[serverName];
            return renderServerNode(serverName, serverGroup);
        }).join('') + 
        `</div>`;
}

/**
 * Renderiza un nodo de servidor en el árbol con diseño mejorado
 * @param {string} serverName - Nombre del servidor
 * @param {Object} serverGroup - Grupos de items del servidor
 * @returns {string} HTML del nodo del servidor
 */
function renderServerNode(serverName, serverGroup) {
    return `
        <div style="
            margin-bottom: 1rem; 
            padding: 0.75rem; 
            background: var(--background-primary); 
            border: 1px solid var(--border-color); 
            border-radius: 6px;
            box-shadow: var(--shadow-small);
        ">
            <div style="
                display: flex; 
                align-items: center; 
                gap: 0.5rem; 
                margin-bottom: 0.5rem; 
                padding-bottom: 0.5rem; 
                border-bottom: 1px solid var(--border-color);
                color: var(--text-primary);
                font-weight: 600;
            ">
                <span style="font-size: 1.1em;">🖥️</span>
                ${escapeHtml(serverName)}
            </div>
            ${renderTypeList('🔧 Tools', serverGroup.tools, '#4CAF50')}
            ${renderTypeList('📦 Resources', serverGroup.resources, '#2196F3')}
            ${renderTypeList('💬 Prompts', serverGroup.prompts, '#FF9800')}
        </div>
    `;
}

/**
 * Renderiza una lista de items de un tipo específico con diseño profesional
 * @param {string} title - Título del tipo (🔧 Tools, 📦 Resources, 💬 Prompts)
 * @param {Array} items - Array de nombres de items
 * @param {string} color - Color del acento para el tipo
 * @returns {string} HTML de la lista de tipo
 */
function renderTypeList(title, items, color = 'var(--text-primary)') {
    if (!items || items.length === 0) return '';
    
    const itemsHTML = items.map(function(name) { 
        return `<span style="
            display: inline-block;
            background: var(--background-secondary);
            color: ${color};
            padding: 0.2rem 0.5rem;
            margin: 0.2rem 0.3rem 0.2rem 0;
            border-radius: 4px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 0.8em;
            border: 1px solid var(--border-color);
        ">${escapeHtml(name)}</span>`; 
    }).join('');
    
    return `
        <div style="margin: 0.5rem 0;">
            <div style="
                color: ${color}; 
                font-weight: 600; 
                margin-bottom: 0.3rem;
                font-size: 0.9em;
            ">${title} (${items.length})</div>
            <div style="margin-left: 0.5rem; line-height: 1.4;">
                ${itemsHTML}
            </div>
        </div>
    `;
}

/**
 * Escapa caracteres HTML para seguridad
 * @param {string} text - Texto a escapar
 * @returns {string} Texto escapado
 */
function escapeHtml(text) {
    const div = require('hyperaxe').div();
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Renderiza un árbol de contexto compacto (una línea)
 * @param {Array} selectedItems - Items seleccionados
 * @param {Object} options - Opciones del árbol compacto
 * @returns {Object} Árbol compacto
 */
function renderCompactContextTree(selectedItems = [], options = {}) {
    const {
        maxLength = 50,
        separator = ', ',
        containerStyle = ''
    } = options;
    
    const total = selectedItems.length;
    
    if (total === 0) {
        return span({ 
            class: 'mcp-context-compact-empty',
            style: 'color: var(--text-secondary); font-style: italic;' + containerStyle 
        }, 'Ningún elemento seleccionado');
    }
    
    const grouped = groupByServerAndType(selectedItems);
    const summary = createCompactSummary(grouped, maxLength, separator);
    
    return span({ 
        class: 'mcp-context-compact',
        style: 'color: var(--text-primary); font-size: 0.9em;' + containerStyle,
        title: createFullSummary(grouped) // Tooltip con información completa
    }, `${total} items: ${summary}`);
}

/**
 * Crea un resumen compacto de los items seleccionados
 * @param {Object} grouped - Items agrupados
 * @param {number} maxLength - Longitud máxima del resumen
 * @param {string} separator - Separador entre items
 * @returns {string} Resumen compacto
 */
function createCompactSummary(grouped, maxLength, separator) {
    const items = [];
    
    Object.keys(grouped).forEach(serverName => {
        const serverGroup = grouped[serverName];
        
        ['tools', 'resources', 'prompts'].forEach(type => {
            if (serverGroup[type] && serverGroup[type].length > 0) {
                serverGroup[type].forEach(name => {
                    items.push(`${serverName}.${name}`);
                });
            }
        });
    });
    
    let summary = items.join(separator);
    
    if (summary.length > maxLength) {
        const truncated = summary.substring(0, maxLength - 3);
        const lastSeparator = truncated.lastIndexOf(separator);
        summary = truncated.substring(0, lastSeparator) + '...';
    }
    
    return summary;
}

/**
 * Crea un resumen completo para tooltip
 * @param {Object} grouped - Items agrupados
 * @returns {string} Resumen completo
 */
function createFullSummary(grouped) {
    return Object.keys(grouped).map(serverName => {
        const serverGroup = grouped[serverName];
        const parts = [];
        
        if (serverGroup.tools.length > 0) {
            parts.push(`Tools: ${serverGroup.tools.join(', ')}`);
        }
        if (serverGroup.resources.length > 0) {
            parts.push(`Resources: ${serverGroup.resources.join(', ')}`);
        }
        if (serverGroup.prompts.length > 0) {
            parts.push(`Prompts: ${serverGroup.prompts.join(', ')}`);
        }
        
        return `${serverName}:\n  ${parts.join('\n  ')}`;
    }).join('\n\n');
}

/**
 * Calcula estadísticas del contexto
 * @param {Object} grouped - Items agrupados
 * @returns {Object} Estadísticas {tools, resources, prompts, total}
 */
function calculateContextStats(grouped) {
    let tools = 0, resources = 0, prompts = 0;
    
    Object.keys(grouped).forEach(serverName => {
        const serverGroup = grouped[serverName];
        tools += serverGroup.tools.length;
        resources += serverGroup.resources.length;
        prompts += serverGroup.prompts.length;
    });
    
    return {
        tools,
        resources,
        prompts,
        total: tools + resources + prompts
    };
}

/**
 * Renderiza un badge de estadística
 * @param {string} icon - Ícono del tipo
 * @param {string} label - Etiqueta del tipo
 * @param {number} count - Cantidad
 * @param {string} percentage - Porcentaje opcional
 * @returns {Object} Badge de estadística
 */
function renderStatBadge(icon, label, count, percentage) {
    return div({
        class: 'mcp-stat-badge',
        style: `
            text-align: center;
            padding: 0.5rem;
            background: var(--background-secondary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-size: 0.8em;
        `
    },
        div({ style: 'font-size: 1.2em; margin-bottom: 0.25rem;' }, icon),
        div({ style: 'font-weight: 600; color: var(--text-primary);' }, count),
        div({ style: 'color: var(--text-secondary);' }, label),
        percentage ? div({ style: 'color: var(--accent-color); font-size: 0.9em;' }, percentage) : null
    );
}

module.exports = {
    renderMCPContextTree,
    renderCompactContextTree,
    renderContextHeader,
    renderContextSummary,
    renderContextTreeContent,
    groupByServerAndType,
    renderTreeHTML,
    calculateContextStats,
    escapeHtml
};