const { section } = require("hyperaxe");
const { template } = require('./main_views');

// Import modular components
const { mcpCatalogView, renderPresetsListCompact } = require('./components/mcp_catalog_view');
const { renderAIHeader, renderAIInputForm } = require('./components/ai_forms_view');
const { aiConversationView } = require('./components/ai_conversation_view');
const { aiI18n } = require('./i18n/ai_i18n');

/**
 * Render presets and selected context
 */
function renderPresetsAndContext(mcpData) {
    const { presets } = mcpData;
    const { div, h3 } = require("hyperaxe");
    return div(
        { style: "margin-bottom: 1rem; display: flex; gap: 1rem;" },
        // Presets
        div(
            { style: "flex: 1;" },
            h3({ style: "margin: 0 0 0.5rem 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;" }, "💾", "Presets"),
            renderPresetsListCompact(presets)
        ),
        // Selected context
        div(
            { style: "flex: 1;" },
            h3({ style: 'margin: 0 0 0.5rem 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;' }, '🧩', 'Contexto seleccionado'),
            div({
                id: 'mcp-selected-summary',
                style: 'font-size: 0.85em; color: var(--text-secondary); margin-bottom: 0.5rem;'
            }, 'Seleccionados: 0'),
            div({
                id: 'mcp-selected-tree',
                style: 'max-height: 220px; overflow-y: auto; background: var(--background-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.5rem; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-size: 0.8em; color: var(--text-secondary);'
            }, 'Ningún elemento seleccionado')
        )
    );
}
const { processMCPPrefetch } = require('./helpers/view_helpers');

/**
 * Main AI view - orchestrates all components
 */
const aiView = (history = [], userPrompt = '', prefetch = {}) => {
    // Process MCP data using helper
    const mcpData = processMCPPrefetch(prefetch);
    const debug = Boolean(prefetch && (prefetch.debug === true || prefetchedTrue(prefetch.debug)));

    function prefetchedTrue(v) {
        if (v === true) return true;
        if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
        return false;
    }

    // Prepare a serializable debug payload (server-side)
    const debugPayload = {
        userPrompt: userPrompt,
        historyLen: Array.isArray(history) ? history.length : 0,
        mcp: {
            hasCatalog: !!mcpData.catalog,
            catalogCounts: mcpData.catalog ? {
                servers: (mcpData.catalog.servers || []).length
            } : null,
            presetsCount: Array.isArray(mcpData.presets) ? mcpData.presets.length : 0,
            flash: (prefetch && prefetch.flash) ? String(prefetch.flash) : ''
        }
    };

    return template(
        aiI18n.aiTitle,
        // AI Assistant section (moved first)
        section(
            { class: "ai-container" },
            renderAIHeader(userPrompt),
            renderAIInputForm(),
            renderPresetsAndContext(mcpData),
            aiConversationView(history)
                ),

                // Optional debug: expose info and log in browser DevTools
                debug ? require('hyperaxe').script(`
                    (function(){
                      try {
                        window.__AI_VIEW_DEBUG = ${JSON.stringify(debugPayload)};
                        console.group('%cAI View Debug','color:#4ea; font-weight:bold');
                        console.log('userPrompt:', window.__AI_VIEW_DEBUG.userPrompt);
                        console.log('historyLen:', window.__AI_VIEW_DEBUG.historyLen);
                        console.log('mcp:', window.__AI_VIEW_DEBUG.mcp);
                        console.groupEnd();
                      } catch(e) { /* noop */ }
                    })();
                `) : null,

        // MCP Catalog section (moved after chat, collapsible)
        mcpCatalogView(mcpData)
    );
};

module.exports = {
    aiView,
    aiI18n
};