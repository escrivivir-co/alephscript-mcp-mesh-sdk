/**
 * Common view helpers for AI views
 */

/**
 * Calculate totals from MCP catalog servers
 */
function calculateMCPTotals(servers) {
    const totalTools = servers.reduce((acc, s) => acc + ((Array.isArray(s.tools) ? s.tools.length : 0)), 0);
    const totalResources = servers.reduce((acc, s) => acc + ((Array.isArray(s.resources) ? s.resources.length : 0)), 0);
    const totalPrompts = servers.reduce((acc, s) => acc + ((Array.isArray(s.prompts) ? s.prompts.length : 0)), 0);
    const totalItems = totalTools + totalResources + totalPrompts;
    
    return { totalTools, totalResources, totalPrompts, totalItems };
}

/**
 * Process MCP prefetch data
 */
function processMCPPrefetch(prefetch) {
    const catalog = prefetch?.mcpCatalog;
    const presetsData = prefetch?.mcpPresets;
    const servers = (catalog && catalog.success && Array.isArray(catalog.catalog)) ? catalog.catalog : [];
    
    // Handle both old and new preset data formats
    let presets = [];
    if (Array.isArray(presetsData)) {
        // Direct array from PresetDataService.fetchPresets()
        presets = presetsData;
    } else if (presetsData && Array.isArray(presetsData.presets)) {
        // Wrapped format { presets: [...] }
        presets = presetsData.presets;
    }
    
    const totals = calculateMCPTotals(servers);
    
    const statusText = catalog ? (catalog.success ? 'Listo' : 'Error cargando catálogo') : 'Sin datos';
    const statusColor = catalog ? (catalog.success ? 'var(--success-color)' : 'var(--danger-color)') : 'var(--text-secondary)';
    const flash = prefetch?.flash || '';
    
    return {
        catalog,
        servers,
        presets,
        ...totals,
        statusText,
        statusColor,
        flash
    };
}

/**
 * Generate safe HTML ID from server name, type, and item name
 */
function generateSafeId(serverName, type, itemName) {
    return `chk-${serverName}-${type}-${itemName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
}

module.exports = {
    calculateMCPTotals,
    processMCPPrefetch,
    generateSafeId,
    formatTimestamp
};