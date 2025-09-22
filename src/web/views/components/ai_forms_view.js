const { div, h2, button, form, textarea, br, span, label, input } = require("hyperaxe");
const { aiI18n } = require('../i18n/ai_i18n');

/**
 * Render AI input form with better UX
 */
function renderAIInputForm() {
    return div(
        { 
            class: 'ai-input-section',
            style: `
                background: var(--background-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1.5rem;
                margin-bottom: 2rem;
            `
        },
        form({ 
            method: 'POST', 
            action: '/ai', 
            class: 'ai-input-form'
        },
            div(
                { style: "margin-bottom: 1rem;" },
                label({ 
                    for: "ai-input",
                    style: "display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;"
                }, "💬 Your Message:")
            ),
            textarea({ 
                id: "ai-input",
                name: 'input', 
                rows: 4, 
                placeholder: aiI18n.aiInputPlaceholder, 
                required: true,
                class: 'ai-textarea',
                style: `
                    width: 100%;
                    padding: 1rem;
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    background: var(--input-background);
                    color: var(--text-primary);
                    font-family: inherit;
                    font-size: 1rem;
                    line-height: 1.5;
                    resize: vertical;
                    min-height: 100px;
                    transition: border-color 0.2s;
                `,
                onfocus: "this.style.borderColor='var(--primary-color)'",
                onblur: "this.style.borderColor='var(--border-color)'"
            }),
            input({ type: 'hidden', name: 'selectedItems', id: 'ai-selected-items' }),
            div({ 
                class: 'ai-form-actions',
                style: "display: flex; gap: 1rem; justify-content: space-between; align-items: center; margin-top: 1rem;" 
            },
                div(
                    { style: "font-size: 0.85em; color: var(--text-secondary);" },
                    "💡 Tip: Press Ctrl+Enter to send"
                ),
                div(
                    { style: "display: flex; gap: 0.75rem;" },
                    button({ 
                        type: 'submit',
                        class: 'btn btn-primary',
                        style: `
                            background: var(--primary-color);
                            color: var(--primary-text);
                            border: none;
                            padding: 0.75rem 1.5rem;
                            border-radius: 6px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: background-color 0.2s;
                        `,
                        onmouseover: "this.style.backgroundColor='var(--primary-hover)'",
                        onmouseout: "this.style.backgroundColor='var(--primary-color)'"
                    }, "🚀 " + aiI18n.aiSubmitButton),
                    form({ 
                        method: 'POST', 
                        action: '/ai/clear', 
                        style: "display: inline;" 
                    },
                        button({
                            type: 'submit',
                            class: 'btn btn-danger',
                            style: `
                                background: var(--danger-color);
                                color: var(--danger-text);
                                border: none;
                                padding: 0.5rem 1rem;
                                border-radius: 6px;
                                font-weight: 500;
                                cursor: pointer;
                                transition: background-color 0.2s;
                            `,
                            onmouseover: "this.style.backgroundColor='var(--danger-hover)'",
                            onmouseout: "this.style.backgroundColor='var(--danger-color)'"
                        }, "🗑️ " + aiI18n.aiClearHistory)
                    )
                )
            )
        )
    );
}

/**
 * Render AI header section
 */
function renderAIHeader(userPrompt) {
    return div({ 
        class: "ai-header",
        style: "margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-color);"
    },
        div(
            { style: "display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;" },
            span({ style: "font-size: 2rem;" }, "🤖"),
            div(
                h2({ style: "margin: 0; color: var(--text-primary);" }, aiI18n.aiTitle),
                div({ 
                    style: "color: var(--text-secondary); font-size: 0.9em; margin-top: 0.25rem;" 
                }, aiI18n.aiDescription)
            )
        ),
        userPrompt ? div({ 
            class: 'user-prompt', 
            style: `
                padding: 1rem;
                background: var(--background-tertiary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                font-size: 0.9em;
                color: var(--text-secondary);
            `
        },
            div({ style: "font-weight: 600; margin-bottom: 0.5rem;" }, `${aiI18n.aiPromptUsed}:`),
            div({ style: 'font-style: italic; color: var(--text-primary);' }, `"${userPrompt}"`)
        ) : null
    );
}

module.exports = {
    renderAIInputForm,
    renderAIHeader
};