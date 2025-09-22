const { div, h2, p, section, button, form, textarea, br, span, input } = require("hyperaxe");
const { template, i18n } = require('./main_views');

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
    aiRejectTrain: 'Reject'
};

const aiView = (history = [], userPrompt = '') => {
    return template(
        aiI18n.aiTitle,
        section(
            { class: "ai-container" },
            div({ class: "ai-header" },
                h2(aiI18n.aiTitle),
                p(aiI18n.aiDescription),
                userPrompt ? div({ 
                    class: 'user-prompt', 
                    style: 'margin-bottom: 2em; font-size: 0.95em; color: var(--text-secondary);' 
                },
                    `${aiI18n.aiPromptUsed}: `,
                    span({ style: 'font-style: italic;' }, `"${userPrompt}"`)
                ) : null
            ),
            
            form({ 
                method: 'POST', 
                action: '/ai', 
                class: 'ai-input-form',
                style: "margin-bottom: 2em;" 
            },
                textarea({ 
                    name: 'input', 
                    rows: 4, 
                    placeholder: aiI18n.aiInputPlaceholder, 
                    required: true,
                    class: 'ai-textarea'
                }),
                br(),
                div({ 
                    class: 'ai-form-actions',
                    style: "display: flex; gap: 1em; justify-content: flex-end; margin-top: 1em;" 
                },
                    button({ 
                        type: 'submit',
                        class: 'btn btn-primary'
                    }, aiI18n.aiSubmitButton),
                    form({ 
                        method: 'POST', 
                        action: '/ai/clear', 
                        style: "display: inline;" 
                    },
                        button({
                            type: 'submit',
                            class: 'btn btn-danger'
                        }, aiI18n.aiClearHistory)
                    )
                )
            ),

            div({ class: 'ai-conversation' },
                history.length === 0 
                    ? div({ 
                        class: 'no-history',
                        style: 'text-align: center; padding: 2em; color: var(--text-secondary);'
                    }, aiI18n.aiNoHistory)
                    : history.map(entry =>
                        div({
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
                            entry.timestamp ? span({
                                class: 'timestamp',
                                style: `
                                    position: absolute;
                                    top: 0.5em;
                                    right: 1em;
                                    font-size: 0.85em;
                                    color: var(--text-secondary);
                                `
                            }, new Date(entry.timestamp).toLocaleString()) : null,
                            
                            div({ 
                                class: 'user-question',
                                style: 'margin-bottom: 1.5em;'
                            },
                                h2({ 
                                    style: 'color: var(--primary-color); margin-bottom: 0.5em; font-size: 1.1em;'
                                }, `${aiI18n.aiUserQuestion}:`),
                                p({ 
                                    style: 'margin: 0; line-height: 1.6;'
                                }, entry.question)
                            ),
                            
                            div({
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
                                ...String(entry.answer || 'No response available')
                                    .split('\n\n')
                                    .map(paragraph =>
                                        p({ 
                                            style: "margin-bottom: 1em; margin-top: 0;" 
                                        }, paragraph.trim())
                                    )
                            ),
                            
                            // AI Training Bar
                            div({
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
                                Array.isArray(entry.snippets) && entry.snippets.length
                                    ? span({ 
                                        style: 'color: var(--text-secondary); font-size: 0.9em;' 
                                    }, `${aiI18n.aiSnippetsUsed}: ${entry.snippets.length}`)
                                    : null,
                                    
                                span({ 
                                    style: 'color: var(--text-primary); font-weight: 600; font-size: 0.9em;'
                                }, `${aiI18n.aiTraining}:`),
                                
                                entry.trainStatus === 'approved'
                                    ? span({ 
                                        style: 'color: var(--success-color); font-weight: 600;' 
                                    }, aiI18n.aiTrainApproved)
                                    : entry.trainStatus === 'rejected'
                                        ? span({ 
                                            style: 'color: var(--danger-color); font-weight: 600;' 
                                        }, aiI18n.aiTrainRejected)
                                        : [
                                            form({ 
                                                method: 'POST', 
                                                action: '/ai/approve', 
                                                style: 'display: inline-block; margin-right: 8px;' 
                                            },
                                                input({ 
                                                    type: 'hidden', 
                                                    name: 'ts', 
                                                    value: String(entry.timestamp) 
                                                }),
                                                button({ 
                                                    type: 'submit', 
                                                    class: 'btn-approve',
                                                    style: `
                                                        background: var(--success-color);
                                                        color: white;
                                                        border: none;
                                                        padding: 0.4em 0.8em;
                                                        border-radius: 4px;
                                                        cursor: pointer;
                                                        font-size: 0.85em;
                                                        font-weight: 500;
                                                    `
                                                }, aiI18n.aiApproveTrain)
                                            ),
                                            form({ 
                                                method: 'POST', 
                                                action: '/ai/reject', 
                                                style: 'display: inline-block;' 
                                            },
                                                input({ 
                                                    type: 'hidden', 
                                                    name: 'ts', 
                                                    value: String(entry.timestamp) 
                                                }),
                                                button({ 
                                                    type: 'submit', 
                                                    class: 'btn-reject',
                                                    style: `
                                                        background: var(--danger-color);
                                                        color: white;
                                                        border: none;
                                                        padding: 0.4em 0.8em;
                                                        border-radius: 4px;
                                                        cursor: pointer;
                                                        font-size: 0.85em;
                                                        font-weight: 500;
                                                    `
                                                }, aiI18n.aiRejectTrain)
                                            )
                                        ]
                            )
                        )
                    )
            )
        )
    );
};

module.exports = {
    aiView,
    aiI18n
};