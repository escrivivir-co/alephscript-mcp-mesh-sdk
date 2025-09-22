const { div, h2, h3, p, section, button, form, input, label, ul, li, strong, details, summary, a, span } = require("hyperaxe");
const { aiI18n } = require('../i18n/ai_i18n');
const { generateSafeId } = require('../helpers/view_helpers');

/**
 * Render compact MCP items with better checkbox interaction
 */
function renderMCPItemsCompact(server, labelText, items, type) {
    if (!items || !items.length) return null;
    
    return details(
        { 
            class: 'mcp-group',
            style: 'margin-bottom: 1rem;'
        },
        summary({ 
            style: `
                font-weight: 600;
                color: var(--text-primary);
                cursor: pointer;
                user-select: none;
                padding: 0.5rem 0;
                border-bottom: 1px solid var(--border-color);
                margin-bottom: 0.75rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            `
        }, 
            `${labelText} (${items.length})`
        ),
        
        div(
            { 
                class: 'mcp-items-container',
                style: `
                    max-height: 200px;
                    overflow-y: auto;
                    padding-right: 0.5rem;
                `
            },
            ...items.map(item => renderMCPItemCompact(server, item, type))
        )
    );
}

/**
 * Render compact MCP item with better checkbox interaction
 */
function renderMCPItemCompact(server, item, type) {
    const id = generateSafeId(server.serverName, type, item.name);
    
    return div(
        { 
            class: 'mcp-item',
            style: `
                margin-bottom: 0.75rem;
                padding: 0.75rem;
                background: var(--background-secondary);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                transition: border-color 0.2s;
            `,
            onmouseover: !server.isConnected ? '' : "this.style.borderColor='var(--primary-color)'",
            onmouseout: !server.isConnected ? '' : "this.style.borderColor='var(--border-color)'"
        },
        // Main checkbox and label
        div(
            { 
                style: 'display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.5rem;'
            },
            input({
                type: 'checkbox',
                id,
                name: 'selected[]',
                value: `${server.serverName}|${type}|${item.name}`,
                disabled: !server.isConnected,
                style: `
                    margin-top: 0.2rem;
                    cursor: ${!server.isConnected ? 'not-allowed' : 'pointer'};
                    transform: scale(1.2);
                `
            }),
            label(
                { 
                    for: id, 
                    style: `
                        flex: 1;
                        cursor: ${!server.isConnected ? 'not-allowed' : 'pointer'};
                        color: ${!server.isConnected ? 'var(--text-secondary)' : 'var(--text-primary)'};
                        font-weight: 500;
                        line-height: 1.4;
                    `
                },
                div({ style: 'margin-bottom: 0.25rem;' }, item.name),
                item.description ? div({ 
                    style: 'font-size: 0.85em; color: var(--text-secondary); font-weight: normal;' 
                }, item.description) : null
            )
        ),
        
        // Metadata
        renderItemMetadataCompact(item, type),
        
        // Schema details (collapsible)
        renderSchemaDetailsCompact(item, type)
    );
}

/**
 * Render compact metadata for different item types
 */
function renderItemMetadataCompact(item, type) {
    if (type === 'resource') {
        return div(
            { 
                style: 'font-size: 0.8em; color: var(--text-secondary); background: var(--background-tertiary); padding: 0.25rem 0.5rem; border-radius: 3px; margin-bottom: 0.5rem;'
            },
            span({ style: 'margin-right: 0.5rem;' }, '🔗'),
            item.uri || '',
            item.mimeType ? span({ style: 'margin-left: 0.5rem; color: var(--accent-color);' }, item.mimeType) : null
        );
    }
    
    if (type === 'prompt' && Array.isArray(item.arguments) && item.arguments.length > 0) {
        return div(
            { 
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
    
    return null;
}

/**
 * Render compact schema details for tools
 */
function renderSchemaDetailsCompact(item, type) {
    if (type === 'tool' && item.parameters) {
        const paramCount = Object.keys(item.parameters.properties || {}).length;
        const required = item.parameters.required || [];
        
        return details(
            { style: 'margin-top: 0.5rem;' },
            summary({ 
                style: `
                    font-size: 0.8em;
                    color: var(--accent-color);
                    cursor: pointer;
                    user-select: none;
                    padding: 0.25rem 0;
                `
            }, 
                `📋 ${aiI18n.mcpViewSchema} (${paramCount} params, ${required.length} required)`
            ),
            div(
                { 
                    style: `
                        margin-top: 0.5rem;
                        padding: 0.75rem;
                        background: var(--background-primary);
                        border: 1px solid var(--border-color);
                        border-radius: 4px;
                        max-height: 200px;
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
    return null;
}

/**
 * Render compact MCP server card with collapsible sections
 */
function renderMCPServerCardCompact(server) {
    const totalItems = (server.tools?.length || 0) + (server.resources?.length || 0) + (server.prompts?.length || 0);
    
    return details(
        { 
            class: 'mcp-server-card', 
            style: 'margin-bottom: 0.5rem;',
            open: server.isConnected // Auto-open if connected
        },
        
        // Server summary
        summary({ 
            class: 'mcp-server-summary',
            style: `
                padding: 0.75rem 1rem;
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
            // Connection status icon
            span({ 
                style: `
                    font-size: 1.2em;
                    color: ${server.isConnected ? 'var(--success-color)' : 'var(--danger-color)'};
                `
            }, server.isConnected ? '🟢' : '🔴'),
            
            // Server name
            strong({ 
                style: `
                    color: var(--text-primary);
                    flex: 1;
                `
            }, server.serverName),
            
            // Items count
            span({ 
                style: "font-size: 0.85em; color: var(--text-secondary); background: var(--background-tertiary); padding: 0.25rem 0.5rem; border-radius: 4px;" 
            }, `${totalItems} items`)
        ),
        
        // Server content (collapsible)
        div(
            { 
                class: 'mcp-server-content',
                style: 'padding: 1rem; background: var(--background-primary); border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 6px 6px;'
            },
            renderMCPItemsCompact(server, aiI18n.mcpToolsLabel, server.tools, 'tool'),
            renderMCPItemsCompact(server, aiI18n.mcpResourcesLabel, server.resources, 'resource'),
            renderMCPItemsCompact(server, aiI18n.mcpPromptsLabel, server.prompts, 'prompt')
        )
    );
}

/**
 * Render MCP catalog with scrollable container
 */
function renderMCPCatalogScrollable(servers) {
    return div(
        { 
            id: "mcp-catalog", 
            class: "mcp-catalog-scrollable", 
            style: `
                background: var(--background-primary); 
                border: 1px solid var(--border-color); 
                border-radius: 8px; 
                max-height: 600px;
                overflow-y: auto;
                overflow-x: hidden;
            `
        },
        servers.length === 0
            ? div({ 
                class: "mcp-empty-state",
                style: "padding: 2rem; text-align: center; color: var(--text-secondary);" 
            }, 
                div({ style: "font-size: 2rem; margin-bottom: 0.5rem;" }, "🔌"),
                p({ style: "margin: 0;" }, aiI18n.mcpNoServers)
            )
            : servers.map(server => renderMCPServerCardCompact(server))
    );
}

/**
 * Render compact MCP summary panel
 */
function renderMCPSummaryCompact(totals, presets) {
    return div(
        { 
            id: "mcp-summary", 
            class: "mcp-summary-compact", 
            style: `
                background: var(--background-secondary); 
                border: 1px solid var(--border-color); 
                border-radius: 8px; 
                padding: 1.25rem;
                position: sticky;
                top: 1rem;
            `
        },
        // Summary header
        h3({ 
            style: "margin: 0 0 1rem 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;" 
        }, "📊", aiI18n.mcpSummary),
        
        // Stats grid
        div(
            { 
                style: `
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 0.5rem; 
                    margin-bottom: 1.5rem;
                `
            },
            renderStatCard("🔧", aiI18n.mcpToolsLabel, totals.totalTools, 'var(--primary-color)'),
            renderStatCard("📦", aiI18n.mcpResourcesLabel, totals.totalResources, 'var(--accent-color)'),
            renderStatCard("💬", aiI18n.mcpPromptsLabel, totals.totalPrompts, 'var(--warning-color)'),
            div(
                { 
                    style: `
                        grid-column: 1 / -1;
                        text-align: center;
                        padding: 0.75rem;
                        background: var(--background-tertiary);
                        border: 1px solid var(--border-color);
                        border-radius: 6px;
                        font-weight: 600;
                        color: var(--text-primary);
                    `
                },
                `${aiI18n.mcpTotalLabel}: ${totals.totalItems}`
            )
        ),
        
        // Presets section
        div(
            h3({ 
                style: "margin: 0 0 0.75rem 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;" 
            }, "💾", aiI18n.mcpPresets),
            renderPresetsListCompact(presets)
        )
    );
}



/**
 * Main MCP Catalog component - Collapsible and positioned after chat
 */
function mcpCatalogView(mcpData) {
    const { servers, statusText, statusColor, flash, ...totals } = mcpData;
    
    return details(
        { 
            class: "mcp-catalog-section", 
            style: "margin-top: 2rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--background-secondary);"
        },
        summary({ 
            class: "mcp-catalog-toggle",
            style: `
                padding: 1rem 1.5rem;
                font-size: 1.1em;
                font-weight: 600;
                color: var(--text-primary);
                cursor: pointer;
                user-select: none;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                border-radius: 8px 8px 0 0;
                background: var(--background-tertiary);
                border-bottom: 1px solid var(--border-color);
            `
        }, 
            "🔧 " + aiI18n.mcpCatalogTitle,
            span({ 
                style: `font-size: 0.85em; color: ${statusColor}; margin-left: auto;` 
            }, statusText),
            span({ 
                style: "font-size: 0.8em; color: var(--text-secondary); background: var(--background-primary); padding: 0.25rem 0.5rem; border-radius: 4px;" 
            }, `${totals.totalItems} items`)
        ),
        
        // Collapsible content
        div(
            { 
                class: "mcp-catalog-content",
                style: "padding: 1.5rem;"
            },
            form(
                { method: 'POST', action: '/ai/ui/mcp/set', class: 'mcp-form' },
                
                // Compact preset bar
                div(
                    { 
                        class: "mcp-preset-bar", 
                        style: "display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap;" 
                    },
                    label({ 
                        for: "mcp-preset-name", 
                        style: "font-weight: 600; color: var(--text-primary);" 
                    }, aiI18n.mcpPresetName),
                    input({ 
                        id: "mcp-preset-name", 
                        name: 'presetName', 
                        type: "text", 
                        value: `mcp-preset-${new Date().toISOString()}`, 
                        style: "flex: 1; min-width: 200px; max-width: 300px;"
                    }),
                    button({ 
                        class: "btn btn-primary", 
                        type: "submit",
                        style: "white-space: nowrap;"
                    }, aiI18n.mcpSavePreset)
                ),
                
                // Responsive layout
                div(
                    { 
                        class: "mcp-layout", 
                        style: `
                            display: grid; 
                            grid-template-columns: 1fr 280px; 
                            gap: 1.5rem; 
                            align-items: start;
                            @media (max-width: 768px) {
                                grid-template-columns: 1fr;
                            }
                        `
                    },
                    renderMCPCatalogScrollable(servers),
                    renderMCPSummaryCompact(totals, mcpData.presets)
                ),
                
                // Toast/feedback area
                div({ 
                    id: "mcp-toast", 
                    style: "margin-top: 1rem; min-height: 1.5rem; color: var(--text-secondary); font-style: italic;" 
                }, flash ? String(flash) : '')
            )
        )
    );
}

/**
 * Render individual stat card
 */
function renderStatCard(icon, label, count, color) {
    return div(
        { 
            style: `
                padding: 0.75rem;
                background: var(--background-primary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                text-align: center;
                transition: border-color 0.2s;
            `,
            onmouseover: `this.style.borderColor='${color}'`,
            onmouseout: "this.style.borderColor='var(--border-color)'"
        },
        div({ style: "font-size: 1.2em; margin-bottom: 0.25rem;" }, icon),
        div({ 
            style: `font-weight: 600; color: ${color}; margin-bottom: 0.25rem;` 
        }, count),
        div({ 
            style: "font-size: 0.8em; color: var(--text-secondary);" 
        }, label)
    );
}

/**
 * Render compact presets list
 */
function renderPresetsListCompact(presets) {
    if (presets.length === 0) {
        return div(
            { 
                style: "padding: 1rem; text-align: center; color: var(--text-secondary); background: var(--background-primary); border: 1px solid var(--border-color); border-radius: 6px;"
            },
            div({ style: "font-size: 1.5em; margin-bottom: 0.5rem;" }, "📝"),
            aiI18n.mcpNoPresets
        );
    }
    
    return div(
        { 
            style: `
                max-height: 200px;
                overflow-y: auto;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                background: var(--background-primary);
            `
        },
        ...presets.map((preset, index) => div(
            { 
                style: `
                    padding: 0.75rem;
                    border-bottom: ${index < presets.length - 1 ? '1px solid var(--border-color)' : 'none'};
                    transition: background-color 0.2s;
                `,
                onmouseover: "this.style.backgroundColor='var(--background-hover)'",
                onmouseout: "this.style.backgroundColor='transparent'"
            },
            a({
                href: `http://localhost:4001/ai/ui/mcp/preset/${encodeURIComponent(preset.name)}`,
                target: '_blank',
                rel: 'noopener noreferrer',
                style: "color: var(--primary-color); text-decoration: none; font-weight: 500;"
            }, preset.name || '(sin nombre)'),
            div({
                style: "font-size: 0.8em; color: var(--text-secondary); margin-top: 0.25rem;"
            }, `${(preset.itemsCount?.total||0)} items • ${(preset.createdAt||'').substring(0, 10)}`)
        ))
    );
}

module.exports = {
    mcpCatalogView,
    renderMCPItemsCompact,
    renderMCPServerCardCompact,
    renderMCPSummaryCompact
};