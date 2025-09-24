const { section } = require("hyperaxe");
const { template } = require('./main_views');

// Import preset management component
const { renderPresetManager } = require('./components/PresetManager');
const { renderAIHeader, renderAIInputForm } = require('./components/ai_forms_view');
const { aiConversationView } = require('./components/ai_conversation_view');
const { aiI18n } = require('./i18n/ai_i18n');

/**
 * Render preset management section for AI view
 * Uses exactly the same implementation as catalog view
 */
function renderPresetManagementSection(mcpData) {
    return renderPresetManager({
        presets: mcpData.presets || [],
        activePreset: mcpData.activePreset,
        selectedContext: {
            items: [], // Será actualizado dinámicamente por JavaScript
            total: 0
        },
        totalItems: mcpData.totalItems || 0,
        mode: 'ai', // Using catalog mode for full functionality
        showActions: true
    });
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
            presetsCount: Array.isArray(mcpData.presets) ? mcpData.presets.length : 0,
            flash: (prefetch && prefetch.flash) ? String(prefetch.flash) : ''
        }
    };

    const { div, a, p } = require("hyperaxe");

    return template(
        aiI18n.aiTitle,
        // AI Assistant section
        section(
            { class: "ai-container" },
            renderAIHeader(userPrompt),
            renderAIInputForm(),
            renderPresetManagementSection(mcpData),
            aiConversationView(history)
        ),
        // Scripts needed for preset management on AI page (same as catalog)
        require('hyperaxe').script({ src: "/assets/js/toast-manager.js" }),
        require('hyperaxe').script({ src: "/assets/js/preset-manager.js" }),
        require('hyperaxe').script({ src: "/assets/js/mcp-selection-manager.js" }),

        require('hyperaxe').script({ src: "/assets/js/preset-architecture-init.js" }),
        // AI form enhancements (keyboard shortcuts, validation)
        require('hyperaxe').script({ src: "/assets/js/ai-form-enhancements.js" }),

        // Link to catalog for creating new presets
        div(
            { 
                style: "margin-top: 2rem; padding: 1rem; background: var(--background-secondary); border: 1px solid var(--border-color); border-radius: 8px; text-align: center;" 
            },
            p({ 
                style: "margin: 0; color: var(--text-secondary);" 
            }, 
                "¿Necesitas crear o editar presets? ",
                a({ 
                    href: "/explorer", 
                    style: "color: var(--primary-color); text-decoration: none; font-weight: 600;" 
                }, "� Explorador MCP")
            )
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
        `) : null
    );
};

module.exports = {
    aiView,
    aiI18n
};