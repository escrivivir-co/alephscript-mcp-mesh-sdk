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

    return template(
        aiI18n.aiTitle,
        // AI Assistant section (moved first)
        section(
            { class: "ai-container" },
            renderAIHeader(userPrompt),
            renderAIInputForm(),
            aiConversationView(history)
        ),

        // MCP Catalog section (moved after chat, collapsible)
        mcpCatalogView(mcpData)
    );
};

module.exports = {
    aiView,
    aiI18n
};