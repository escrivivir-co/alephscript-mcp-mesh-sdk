const { div } = require("hyperaxe");

/**
 * Componente: QuickStatsBar  
 * Barra simplificada que solo muestra estadísticas básicas
 * SIN acciones ni formularios - solo información
 */

/**
 * Renderiza la barra de estadísticas simplificada
 * Solo muestra estadísticas básicas - SIN acciones ni formularios
 * @param {Object} mcpData - Datos del catálogo MCP
 * @returns {Object} Elemento HTML de la barra de estadísticas
 */
function renderQuickActionsBar(mcpData = {}) {
    const stats = calculateStats(mcpData);
    
    return div(
        { 
            class: "quick-stats-bar",
            style: `
                display: flex; 
                justify-content: center; 
                align-items: center; 
                padding: 1rem; 
                background: var(--background-secondary); 
                border: 1px solid var(--border-color); 
                border-radius: 8px; 
                margin-bottom: 2rem;
                gap: 3rem;
            `
        },
        
        // ✅ Solo estadísticas - contenido simplificado
        renderQuickStats(stats)
    );
}

/**
 * Calcula estadísticas del catálogo
 */
function calculateStats(mcpData) {
    // ✅ Manejo seguro de datos que pueden no estar disponibles
    const servers = mcpData?.servers || mcpData?.catalog?.servers || [];
    const presets = mcpData?.presets || [];
    
    return {
        totalServers: servers.length || 0,
        connectedServers: servers.filter(s => s?.isConnected).length || 0,
        totalItems: mcpData?.totalItems || 0,
        totalPresets: presets.length || 0
    };
}

/**
 * Renderiza las estadísticas rápidas
 */
function renderQuickStats(stats) {
    return div(
        { 
            class: "quick-stats",
            style: "display: flex; gap: 2rem; align-items: center; flex-wrap: wrap;"
        },
        renderQuickStat("🖥️", `${stats.connectedServers}/${stats.totalServers}`, "Servidores"),
        renderQuickStat("📦", stats.totalItems.toString(), "Items"),
        renderQuickStat("💾", stats.totalPresets.toString(), "Presets")
    );
}

/**
 * Renderiza una estadística individual
 */
function renderQuickStat(emoji, value, label) {
    return div(
        { 
            class: "quick-stat",
            style: "display: flex; align-items: center; gap: 0.5rem;"
        },
        div({ style: "font-size: 1.2em;" }, emoji),
        div(
            { style: "display: flex; flex-direction: column;" },
            div({ style: "font-weight: 600; color: var(--text-primary); font-size: 0.9em;" }, value),
            div({ style: "font-size: 0.8em; color: var(--text-secondary);" }, label)
        )
    );
}

module.exports = {
    renderQuickActionsBar,
    renderQuickStats,
    renderQuickStat
};

/**
 * Componente: QuickActionsBar  
 * Barra superior con estadísticas, acciones y formulario de preset integrado
 */

/**
 * Renderiza la barra de acciones rápidas con estadísticas y formulario de preset
 * @param {Object} mcpData - Datos del catálogo MCP
 * @returns {Object} Elemento HTML de la barra de acciones
 */
function renderQuickActionsBar(mcpData = {}) { // ✅ Valor por defecto para evitar errores
    const stats = calculateStats(mcpData);
    
    return div(
        { 
            class: "quick-stats-bar", // ✅ Nombre más específico
            style: `
                display: flex; 
                justify-content: center; 
                align-items: center; 
                padding: 1rem; 
                background: var(--background-secondary); 
                border: 1px solid var(--border-color); 
                border-radius: 8px; 
                margin-bottom: 2rem;
                gap: 3rem;
            `
        },
        
        // ✅ Solo estadísticas - contenido simplificado
        renderQuickStats(stats)
    );
}

/**
 * Calcula estadísticas del catálogo
 */
function calculateStats(mcpData) {
    // ✅ Manejo seguro de datos que pueden no estar disponibles
    const servers = mcpData?.servers || mcpData?.catalog?.servers || [];
    const presets = mcpData?.presets || [];
    
    return {
        totalServers: servers.length || 0,
        connectedServers: servers.filter(s => s?.isConnected).length || 0,
        totalItems: mcpData?.totalItems || 0,
        totalPresets: presets.length || 0
    };
}

/**
 * Renderiza las estadísticas rápidas
 */
function renderQuickStats(stats) {
    return div(
        { 
            class: "quick-stats",
            style: "display: flex; gap: 2rem; align-items: center; flex-wrap: wrap;"
        },
        renderQuickStat("🖥️", "Servidores", `${stats.connectedServers}/${stats.totalServers}`),
        renderQuickStat("📦", "Items", stats.totalItems),
        renderQuickStat("💾", "Presets", stats.totalPresets)
    );
}

/**
 * Renderiza una estadística individual
 */
function renderQuickStat(icon, label, value) {
    return div(
        { 
            class: "quick-stat",
            style: "display: flex; align-items: center; gap: 0.5rem;"
        },
        div({ style: "font-size: 1.2em;" }, icon),
        div(
            { style: "display: flex; flex-direction: column;" },
            div({ style: "font-weight: 600; color: var(--text-primary); font-size: 0.9em;" }, value),
            div({ style: "font-size: 0.8em; color: var(--text-secondary);" }, label)
        )
    );
}

/**
 * Renderiza las acciones principales con formulario integrado
 */
function renderQuickActions(stats) {
    return div(
        { 
            class: "quick-actions",
            style: "display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;"
        },
        
        // Contador de selección
        renderSelectionCounter(),
        
        // Formulario inline para guardar preset
        renderInlinePresetForm(),
        
        // Separador visual
        div({ style: "width: 1px; height: 2rem; background: var(--border-color);" }),
        
        // Acciones adicionales
        renderAdditionalActions()
    );
}

/**
 * Renderiza el contador de selección
 */
function renderSelectionCounter() {
    return div({
        id: "selection-counter-header",
        style: `
            padding: 0.5rem 1rem;
            background: var(--background-tertiary);
            border-radius: 20px;
            font-size: 0.85em;
            color: var(--text-secondary);
            white-space: nowrap;
            border: 1px solid var(--border-color);
        `
    }, "0 elementos seleccionados");
}

/**
 * Renderiza el formulario inline de preset
 */
function renderInlinePresetForm() {
    return form({
        method: 'POST', 
        action: '/ai/ui/mcp/set', 
        class: 'preset-quick-form', 
        id: 'preset-quick-form',
        style: "display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;"
    },
        // Hint to return back to catalog after saving from this view
        input({ type: 'hidden', name: 'returnTo', value: '/explorer' }),
        input({ type: 'hidden', name: 'selectedItems', id: 'selectedItems-header', value: '[]' }),
        
        input({ 
            id: "preset-name-header", 
            name: 'presetName', 
            type: "text", 
            placeholder: "Nombre del preset...",
            style: "min-width: 180px; font-size: 0.9em;"
        }),
        
        button({ 
            class: "btn btn-primary", 
            type: "submit",
            id: "save-preset-btn",
            style: "font-size: 0.9em; white-space: nowrap;",
            disabled: true
        }, "💾 Guardar"),
        
        button({
            class: "btn btn-secondary",
            type: "button",
            id: "clear-selection-btn", 
            style: "font-size: 0.9em;",
            disabled: true
        }, "🗑️ Limpiar")
    );
}

/**
 * Renderiza las acciones adicionales
 */
function renderAdditionalActions() {
    return div(
        { style: "display: flex; gap: 1rem; align-items: center;" },
        
        button({
            id: "refresh-catalog-btn",
            class: "btn btn-secondary refresh-catalog-btn",
            style: "font-size: 0.9em;",
            onclick: "refreshCatalogFromQuickBar()"
        }, [
            span({ class: "icon" }, "🔄"),
            " Actualizar Catálogo"
        ]),
        
        button({
            id: "export-selection-btn", 
            class: "btn btn-secondary",
            style: "font-size: 0.9em;"
        }, "📤 Exportar")
    );
}

module.exports = {
    renderQuickActionsBar,
    renderQuickStats,
    renderQuickStat,
    renderQuickActions
};