const { div, h2, p, span, input, button, form } = require("hyperaxe");
const { aiI18n } = require('../i18n/ai_i18n');
const { formatTimestamp } = require('../helpers/view_helpers');

/**
 * Render individual chat entry
 */
function renderChatEntry(entry) {
    return div({
        class: 'chat-entry',
        style: `
            margin-bottom: 2em;
            position: relative;
            background: var(--chat-background);
            border-radius: 12px;
            box-shadow: var(--shadow-medium);
            padding: 1.5em;
            border: 1px solid var(--border-color);
        `
    },
        // Timestamp
        entry.timestamp ? span({
            class: 'timestamp',
            style: `
                position: absolute;
                top: 0.5em;
                right: 1em;
                font-size: 0.85em;
                color: var(--text-secondary);
            `
        }, formatTimestamp(entry.timestamp)) : null,
        
        // User question
        renderUserQuestion(entry.question),
        
        // AI response
        renderAIResponse(entry.answer),
        
        // Training bar
        renderTrainingBar(entry)
    );
}

/**
 * Render user question section
 */
function renderUserQuestion(question) {
    return div({ 
        class: 'user-question',
        style: 'margin-bottom: 1.5em;'
    },
        h2({ 
            style: 'color: var(--primary-color); margin-bottom: 0.5em; font-size: 1.1em;'
        }, `${aiI18n.aiUserQuestion}:`),
        p({ 
            style: 'margin: 0; line-height: 1.6;'
        }, question)
    );
}

/**
 * Render AI response section
 */
function renderAIResponse(answer) {
    return div({
        class: 'ai-response',
        style: `
            background: var(--response-background);
            padding: 1.5em;
            border-radius: 8px;
            border-left: 4px solid var(--accent-color);
            line-height: 1.7;
        `
    },
        h2({ 
            style: 'color: var(--accent-color); margin-bottom: 1em; font-size: 1.1em;'
        }, `${aiI18n.aiResponseTitle}:`),
        ...String(answer || 'No response available')
            .split('\n\n')
            .map(paragraph =>
                p({ 
                    style: "margin-bottom: 1em; margin-top: 0;" 
                }, paragraph.trim())
            )
    );
}

/**
 * Render training status bar
 */
function renderTrainingBar(entry) {
    return div({
        class: 'ai-train-bar',
        style: `
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 12px auto 8px auto;
            padding: 12px;
            border-top: 1px solid var(--border-color);
            background: var(--background-tertiary);
            border-radius: 0 0 8px 8px;
        `
    },
        // Snippets info
        Array.isArray(entry.snippets) && entry.snippets.length
            ? span({ 
                style: 'color: var(--text-secondary); font-size: 0.9em;' 
            }, `${aiI18n.aiSnippetsUsed}: ${entry.snippets.length}`)
            : null,
        
        // Training label
        span({ 
            style: 'color: var(--text-primary); font-weight: 600; font-size: 0.9em;'
        }, `${aiI18n.aiTraining}:`),
        
        // Training status or buttons
        renderTrainingStatus(entry)
    );
}

/**
 * Render training status or action buttons
 */
function renderTrainingStatus(entry) {
    if (entry.trainStatus === 'approved') {
        return span({ 
            style: 'color: var(--success-color); font-weight: 600;' 
        }, aiI18n.aiTrainApproved);
    }
    
    if (entry.trainStatus === 'rejected') {
        return span({ 
            style: 'color: var(--danger-color); font-weight: 600;' 
        }, aiI18n.aiTrainRejected);
    }
    
    return [
        renderTrainingButton('/ai/approve', aiI18n.aiApproveTrain, 'var(--success-color)', entry.timestamp),
        renderTrainingButton('/ai/reject', aiI18n.aiRejectTrain, 'var(--danger-color)', entry.timestamp)
    ];
}

/**
 * Render training action button
 */
function renderTrainingButton(action, label, color, timestamp) {
    return form({ 
        method: 'POST', 
        action, 
        style: 'display: inline-block; margin-right: 8px;' 
    },
        input({ 
            type: 'hidden', 
            name: 'ts', 
            value: String(timestamp) 
        }),
        button({ 
            type: 'submit', 
            class: `btn-${action.includes('approve') ? 'approve' : 'reject'}`,
            style: `
                background: ${color};
                color: white;
                border: none;
                padding: 0.4em 0.8em;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.85em;
                font-weight: 500;
            `
        }, label)
    );
}

/**
 * Render empty conversation state
 */
function renderEmptyConversation() {
    return div({ 
        class: 'no-history',
        style: 'text-align: center; padding: 2em; color: var(--text-secondary);'
    }, aiI18n.aiNoHistory);
}

/**
 * Main AI conversation component
 */
function aiConversationView(history) {
    return div({ class: 'ai-conversation' },
        history.length === 0 
            ? renderEmptyConversation()
            : history.map(entry => renderChatEntry(entry))
    );
}

module.exports = {
    aiConversationView,
    renderChatEntry,
    renderTrainingBar,
    renderEmptyConversation
};