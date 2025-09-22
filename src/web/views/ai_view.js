const { section } = require("hyperaxe");
const { template } = require('./main_views');

// Import modular components
const { mcpCatalogView } = require('./components/mcp_catalog_view');
const { renderAIHeader, renderAIInputForm } = require('./components/ai_forms_view');
const { aiConversationView } = require('./components/ai_conversation_view');
const { aiI18n } = require('./i18n/ai_i18n');
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