const { div, h3, button, form, input, label, span, p } = require("hyperaxe");

/**
 * Componente: PresetForm
 * Formulario para crear/editar presets con validación
 */
function renderPresetForm(preset = null, isEditing = false) {
    const formTitle = isEditing ? "✏️ Editar Preset" : "➕ Crear Nuevo Preset";
    const submitText = isEditing ? "Actualizar Preset" : "Crear Preset";
    
    return div(
        { 
            id: "preset-form-container",
            style: `
                background: var(--background-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1.5rem;
                margin-bottom: 1.5rem;
            `
        },
        h3({ 
            style: "margin: 0 0 1rem 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;" 
        }, formTitle),
        
        form({
            id: "preset-form",
            class: "preset-form",
            onsubmit: "return PresetManager.handleFormSubmit(event);"
        },
            // Hidden field for edit mode
            isEditing ? input({ 
                type: "hidden", 
                name: "presetId", 
                value: preset?.id || "" 
            }) : null,
            
            // Preset name field
            div({ class: "form-group", style: "margin-bottom: 1rem;" },
                label({ 
                    for: "preset-name",
                    style: "display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;"
                }, "📝 Nombre del Preset"),
                input({
                    id: "preset-name",
                    name: "presetName",
                    type: "text",
                    required: true,
                    placeholder: "Ej: Desarrollo Web, Análisis de Datos...",
                    value: preset?.name || "",
                    style: `
                        width: 100%;
                        padding: 0.75rem;
                        border: 1px solid var(--border-color);
                        border-radius: 6px;
                        background: var(--input-background);
                        color: var(--text-primary);
                        font-size: 1rem;
                    `,
                    oninput: "PresetManager.validateForm()"
                })
            ),
            
            // Description field
            div({ class: "form-group", style: "margin-bottom: 1rem;" },
                label({ 
                    for: "preset-description",
                    style: "display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;"
                }, "📄 Descripción (opcional)"),
                input({
                    id: "preset-description",
                    name: "presetDescription",
                    type: "text",
                    placeholder: "Describe para qué sirve este preset...",
                    value: preset?.description || "",
                    style: `
                        width: 100%;
                        padding: 0.75rem;
                        border: 1px solid var(--border-color);
                        border-radius: 6px;
                        background: var(--input-background);
                        color: var(--text-primary);
                        font-size: 1rem;
                    `
                })
            ),
            
            // Selected items summary
            div({ class: "form-group", style: "margin-bottom: 1.5rem;" },
                label({ 
                    style: "display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;"
                }, "🧩 Elementos Seleccionados"),
                div({
                    id: "selected-items-summary",
                    style: `
                        padding: 1rem;
                        background: var(--background-primary);
                        border: 1px solid var(--border-color);
                        border-radius: 6px;
                        min-height: 60px;
                        color: var(--text-secondary);
                        font-size: 0.9em;
                    `
                }, "Selecciona elementos del catálogo para incluir en este preset")
            ),
            
            // Form actions
            div({ 
                class: "form-actions",
                style: "display: flex; gap: 1rem; justify-content: flex-end;" 
            },
                button({
                    type: "button",
                    class: "btn btn-secondary",
                    onclick: "PresetManager.cancelForm()",
                    style: `
                        padding: 0.75rem 1.5rem;
                        border: 1px solid var(--border-color);
                        background: var(--background-primary);
                        color: var(--text-primary);
                        border-radius: 6px;
                        cursor: pointer;
                    `
                }, "Cancelar"),
                button({
                    type: "submit",
                    id: "preset-form-submit",
                    class: "btn btn-primary",
                    disabled: true,
                    style: `
                        padding: 0.75rem 1.5rem;
                        background: var(--primary-color);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        opacity: 0.6;
                    `
                }, submitText)
            )
        )
    );
}

module.exports = {
    renderPresetForm
};