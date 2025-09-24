const { div, details, summary, span, strong } = require("hyperaxe");
const { aiI18n } = require('../i18n/ai_i18n');

/**
 * MCPServerNavigator - Componente para navegar por servidores MCP
 * Maneja la expansión/colapso de servidores y muestra su estado de conexión
 */

/**
 * Renderiza la tarjeta de navegación de un servidor MCP
 * @param {Object} server - Datos del servidor
 * @param {Function} renderContent - Función para renderizar el contenido del servidor
 * @returns {Object} Elemento HTML de la tarjeta del servidor
 */
function renderMCPServerCard(server, renderContent) {
    const totalItems = (server.tools?.length || 0) + 
                      (server.resources?.length || 0) + 
                      (server.prompts?.length || 0);
    
    return details(
        { 
            class: 'mcp-server-card', 
            style: 'margin-bottom: 0.75rem;',
            open: server.isConnected // Auto-expandir si está conectado
        },
        
        // Resumen del servidor (clickeable para expandir/colapsar)
        renderServerSummary(server, totalItems),
        
        // Contenido del servidor (colapsable)
        renderServerContent(server, renderContent)
    );
}

/**
 * Renderiza el resumen/header del servidor
 * @param {Object} server - Datos del servidor
 * @param {number} totalItems - Total de items en el servidor
 * @returns {Object} Elemento summary HTML
 */
function renderServerSummary(server, totalItems) {
    return summary({ 
        class: 'mcp-server-summary',
        style: `
            padding: 0.9rem 1rem;
            cursor: pointer;
            user-select: none;
            background: var(--background-secondary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            transition: background-color 0.2s;
        `,
        onmouseover: "this.style.backgroundColor='var(--background-hover)'",
        onmouseout: "this.style.backgroundColor='var(--background-secondary)'"
    }, 
        // Ícono de estado de conexión
        renderConnectionIcon(server.isConnected),
        
        // Nombre del servidor
        strong({ 
            style: `
                color: var(--text-primary);
                flex: 1;
            `
        }, server.serverName),
        
        // Contador de items
        renderItemsCounter(totalItems)
    );
}

/**
 * Renderiza el ícono de estado de conexión
 * @param {boolean} isConnected - Estado de conexión del servidor
 * @returns {Object} Elemento span con el ícono
 */
function renderConnectionIcon(isConnected) {
    return span({ 
        class: 'mcp-connection-status',
        style: `
            font-size: 1.2em;
            color: ${isConnected ? 'var(--success-color)' : 'var(--danger-color)'};
        `,
        title: isConnected ? 'Servidor conectado' : 'Servidor desconectado'
    }, isConnected ? '🟢' : '🔴');
}

/**
 * Renderiza el contador de items del servidor
 * @param {number} totalItems - Total de items
 * @returns {Object} Elemento span con el contador
 */
function renderItemsCounter(totalItems) {
    return span({ 
        class: 'mcp-items-counter',
        style: `
            font-size: 0.85em; 
            color: var(--text-secondary); 
            background: var(--background-tertiary); 
            padding: 0.25rem 0.5rem; 
            border-radius: 4px;
        `
    }, `${totalItems} items`);
}

/**
 * Renderiza el contenido del servidor (área colapsable)
 * @param {Object} server - Datos del servidor
 * @param {Function} renderContent - Función para renderizar el contenido específico
 * @returns {Object} Elemento div con el contenido
 */
function renderServerContent(server, renderContent) {
    return div(
        { 
            class: 'mcp-server-content',
            style: `
                padding: 1.1rem; 
                background: var(--background-primary); 
                border: 1px solid var(--border-color); 
                border-top: none; 
                border-radius: 0 0 6px 6px;
            `
        },
        // Renderizar contenido usando la función proporcionada
        renderContent ? renderContent(server) : renderDefaultContent(server)
    );
}

/**
 * Renderiza contenido por defecto si no se proporciona función personalizada
 * @param {Object} server - Datos del servidor
 * @returns {Object} Contenido por defecto
 */
function renderDefaultContent(server) {
    return div(
        { 
            style: 'color: var(--text-secondary); font-style: italic;' 
        },
        server.isConnected 
            ? `Servidor ${server.serverName} listo para explorar`
            : `Servidor ${server.serverName} no disponible`
    );
}

/**
 * Renderiza una lista de servidores MCP navegables
 * @param {Array} servers - Array de servidores MCP
 * @param {Function} renderServerContent - Función opcional para renderizar contenido del servidor
 * @returns {Object} Contenedor con todos los servidores
 */
function renderMCPServerNavigator(servers, renderServerContent) {
    if (!servers || servers.length === 0) {
        return renderEmptyState();
    }
    
    return div(
        { 
            class: 'mcp-server-navigator',
            style: `
                background: var(--background-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                max-height: 70vh;
                overflow-y: auto;
                overflow-x: hidden;
                padding: 0.25rem;
            `
        },
        ...servers.map(server => renderMCPServerCard(server, renderServerContent))
    );
}

/**
 * Renderiza estado vacío cuando no hay servidores
 * @returns {Object} Elemento HTML para estado vacío
 */
function renderEmptyState() {
    return div({ 
        class: "mcp-empty-state",
        style: "padding: 2rem; text-align: center; color: var(--text-secondary);" 
    }, 
        div({ style: "font-size: 2rem; margin-bottom: 0.5rem;" }, "🔌"),
        div({ style: "margin: 0;" }, aiI18n.mcpNoServers)
    );
}

module.exports = {
    renderMCPServerNavigator,
    renderMCPServerCard,
    renderServerSummary,
    renderServerContent,
    renderConnectionIcon,
    renderItemsCounter,
    renderEmptyState
};