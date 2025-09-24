const { div, input, button } = require("hyperaxe");
const { generateSafeId } = require('../helpers/view_helpers');

/**
 * MCPItemSelector - Componente reutilizable para la funcionalidad de selección/deselección
 * Maneja el sistema de pills visuales conectado con checkboxes ocultos
 */

/**
 * Renderiza un selector de item con pill visual y checkbox oculto
 * @param {Object} server - Datos del servidor
 * @param {Object} item - Datos del item
 * @param {string} type - Tipo del item ('tool', 'resource', 'prompt')
 * @param {Object} options - Opciones adicionales para el selector
 * @returns {Object} Elemento HTML del selector
 */
function renderMCPItemSelector(server, item, type, options = {}) {
    const id = generateSafeId(server.serverName, type, item.name);
    const isDisabled = !server.isConnected;
    const value = `${server.serverName}|${type}|${item.name}`;
    
    return div(
        {
            class: 'mcp-item-selector',
            style: 'display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.5rem;'
        },
        // Checkbox oculto que mantiene el estado real de selección
        renderHiddenCheckbox(id, value, isDisabled),
        
        // Pill button visual que actúa como toggle
        renderSelectionPill(id, isDisabled, options),
        
        // Contenido del item (nombre, descripción, etc.)
        options.renderContent ? options.renderContent(item, server, type) : renderDefaultContent(item)
    );
}

/**
 * Renderiza el checkbox oculto que mantiene el estado de selección
 * @param {string} id - ID único del checkbox
 * @param {string} value - Valor del checkbox (server|type|name)
 * @param {boolean} isDisabled - Si el checkbox está deshabilitado
 * @returns {Object} Input checkbox oculto
 */
function renderHiddenCheckbox(id, value, isDisabled) {
    const attributes = {
        type: 'checkbox',
        id,
        name: 'selected[]',
        value,
        style: 'display:none;'
    };
    
    // Only add disabled attribute if actually disabled
    if (isDisabled) {
        attributes.disabled = true;
    }
    
    return input(attributes);
}

/**
 * Renderiza el pill button visual para selección
 * @param {string} checkboxId - ID del checkbox asociado
 * @param {boolean} isDisabled - Si el selector está deshabilitado
 * @param {Object} options - Opciones del pill
 * @returns {Object} Button pill visual
 */
function renderSelectionPill(checkboxId, isDisabled, options = {}) {
    const {
        size = 'normal',
        variant = 'default',
        customStyle = ''
    } = options;
    
    const baseStyle = `
        white-space: nowrap;
        padding: ${size === 'small' ? '0.25rem 0.5rem' : '0.35rem 0.6rem'};
        border-radius: 999px;
        border: 1px solid var(--border-color);
        background: var(--background-primary);
        color: ${isDisabled ? 'var(--text-secondary)' : 'var(--text-primary)'};
        cursor: ${isDisabled ? 'not-allowed' : 'pointer'};
        font-size: ${size === 'small' ? '0.75em' : '0.85em'};
        font-weight: 600;
        line-height: 1;
        transition: all 0.2s ease;
    `;
    
    return button({
        type: 'button',
        'aria-pressed': 'false',
        class: 'mcp-select-pill',
        'data-checkbox-id': checkboxId,
        'data-disabled': isDisabled ? 'true' : 'false',
        'aria-disabled': isDisabled ? 'true' : 'false',
        style: baseStyle + customStyle
    }, isDisabled ? 'No disponible' : 'Seleccionar');
}

/**
 * Renderiza contenido por defecto del item
 * @param {Object} item - Datos del item
 * @returns {Object} Contenido por defecto
 */
function renderDefaultContent(item) {
    return div({ style: 'flex:1;' },
        div({ 
            class: 'mcp-item-name',
            style: 'margin-bottom: 0.15rem; font-weight: 600; color: var(--text-primary);' 
        }, item.name),
        item.description ? div({ 
            class: 'mcp-item-description',
            style: 'font-size: 0.85em; color: var(--text-secondary); font-weight: normal;' 
        }, item.description) : null
    );
}

/**
 * Renderiza un grupo de selectores con header
 * @param {string} groupTitle - Título del grupo
 * @param {Array} items - Array de items
 * @param {Object} server - Datos del servidor
 * @param {string} type - Tipo de items
 * @param {Object} options - Opciones del grupo
 * @returns {Object} Grupo de selectores
 */
function renderMCPSelectorGroup(groupTitle, items, server, type, options = {}) {
    if (!items || !items.length) return null;
    
    const {
        collapsible = true,
        initiallyOpen = true,
        showCount = true,
        headerStyle = '',
        containerStyle = ''
    } = options;
    
    const count = showCount ? ` (${items.length})` : '';
    
    if (collapsible) {
        const { details, summary } = require("hyperaxe");
        
        return details(
            { 
                class: 'mcp-selector-group',
                style: 'margin-bottom: 1.25rem;' + containerStyle,
                open: initiallyOpen
            },
            summary({ 
                class: 'mcp-selector-group-header',
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
                    ${headerStyle}
                `
            }, `${groupTitle}${count}`),
            
            renderSelectorContainer(items, server, type, options)
        );
    }
    
    return div(
        { 
            class: 'mcp-selector-group',
            style: 'margin-bottom: 1.25rem;' + containerStyle
        },
        div({ 
            class: 'mcp-selector-group-header',
            style: `
                font-weight: 600;
                color: var(--text-primary);
                padding: 0.75rem 0;
                border-bottom: 1px solid var(--border-color);
                margin-bottom: 1rem;
                ${headerStyle}
            `
        }, `${groupTitle}${count}`),
        
        renderSelectorContainer(items, server, type, options)
    );
}

/**
 * Renderiza el contenedor de selectores
 * @param {Array} items - Array de items
 * @param {Object} server - Datos del servidor
 * @param {string} type - Tipo de items
 * @param {Object} options - Opciones del contenedor
 * @returns {Object} Contenedor de selectores
 */
function renderSelectorContainer(items, server, type, options = {}) {
    const {
        layout = 'grid',
        maxHeight = '360px',
        gridColumns = 'repeat(auto-fill, minmax(260px, 1fr))'
    } = options;
    
    const isGrid = layout === 'grid';
    
    return div(
        { 
            class: 'mcp-selectors-container',
            style: `
                ${isGrid ? `
                    display: grid;
                    grid-template-columns: ${gridColumns};
                    gap: 0.75rem;
                ` : 'display: flex; flex-direction: column; gap: 0.5rem;'}
                max-height: ${maxHeight};
                overflow-y: auto;
                padding: 0.25rem 0.5rem 0.5rem 0;
            `
        },
        ...items.map(item => {
            // Para layout grid, wrapeamos cada selector en un contenedor
            const selector = renderMCPItemSelector(server, item, type, options);
            
            if (isGrid) {
                return div(
                    {
                        class: 'mcp-selector-item-wrapper',
                        style: `
                            padding: 0.35rem;
                            background: var(--background-secondary);
                            border: 1px solid var(--border-color);
                            border-radius: 4px;
                            transition: border-color 0.2s;
                        `,
                        onmouseover: !server.isConnected ? '' : "this.style.borderColor='var(--primary-color)'",
                        onmouseout: !server.isConnected ? '' : "this.style.borderColor='var(--border-color)'"
                    },
                    selector
                );
            }
            
            return selector;
        })
    );
}

/**
 * Renderiza un selector compacto para uso en espacios reducidos
 * @param {Object} server - Datos del servidor
 * @param {Object} item - Datos del item
 * @param {string} type - Tipo del item
 * @param {Object} options - Opciones del selector compacto
 * @returns {Object} Selector compacto
 */
function renderCompactSelector(server, item, type, options = {}) {
    const compactOptions = {
        ...options,
        size: 'small',
        renderContent: (item) => div({ 
            style: 'flex:1; display: flex; align-items: center; gap: 0.5rem;' 
        },
            div({ 
                style: 'font-weight: 600; color: var(--text-primary); font-size: 0.85em;' 
            }, item.name),
            item.description ? div({ 
                style: 'font-size: 0.75em; color: var(--text-secondary); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;' 
            }, item.description) : null
        )
    };
    
    return renderMCPItemSelector(server, item, type, compactOptions);
}

module.exports = {
    renderMCPItemSelector,
    renderMCPSelectorGroup,
    renderSelectorContainer,
    renderCompactSelector,
    renderHiddenCheckbox,
    renderSelectionPill,
    renderDefaultContent
};