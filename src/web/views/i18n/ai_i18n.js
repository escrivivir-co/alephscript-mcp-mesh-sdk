const { i18n } = require('../main_views');

// Extensión del i18n para la vista AI
const aiI18n = {
    ...i18n,
    aiTitle: 'AI Assistant',
    aiDescription: 'Interact with AI models through the MCP Mesh SDK interface',
    aiInputPlaceholder: 'Enter your message or question...',
    aiSubmitButton: 'Send',
    aiClearHistory: 'Clear History',
    aiUserQuestion: 'User',
    aiResponseTitle: 'AI Assistant',
    aiPromptUsed: 'System Prompt',
    aiNoHistory: 'No conversation history yet. Start by asking a question!',
    aiSnippetsUsed: 'Snippets used',
    aiTraining: 'AI Training',
    aiTrainApproved: '✓ Approved for training',
    aiTrainRejected: '✗ Rejected for training',
    aiApproveTrain: 'Approve',
    aiRejectTrain: 'Reject',
    
    // MCP specific translations
    mcpCatalogTitle: 'MCP Catalog',
    mcpPresetName: 'Preset name:',
    mcpSavePreset: 'Guardar preset',
    mcpSummary: 'Resumen',
    mcpPresets: 'Presets',
    mcpNoServers: 'No hay servidores MCP configurados o conectados.',
    mcpNoPresets: 'Sin presets aún.',
    mcpNoElements: 'Sin elementos',
    mcpStatusReady: 'Listo',
    mcpStatusError: 'Error cargando catálogo',
    mcpStatusNoData: 'Sin datos',
    mcpViewSchema: 'Ver schema',
    mcpToolsLabel: 'Tools',
    mcpResourcesLabel: 'Resources',
    mcpPromptsLabel: 'Prompts',
    mcpTotalLabel: 'Total',
    mcpConnected: '(connected)',
    mcpNotConnected: '(not connected)',
    mcpArgsLabel: 'Args'
};

module.exports = {
    aiI18n
};