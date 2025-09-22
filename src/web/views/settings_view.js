const { div, h2, h3, p, section, button, form, select, option, label, span, script } = require("hyperaxe");
const { template, i18n } = require('./main_views');
const { getCurrentTheme, getAvailableThemes } = require('../controllers/ThemeController.js');

const settingsI18n = {
    ...i18n,
    settingsTitle: 'Settings',
    settingsDescription: 'Configure your MCP Mesh SDK interface',
    themeSection: 'Theme Settings',
    themeDescription: 'Choose your preferred theme for the interface',
    currentTheme: 'Current Theme',
    selectTheme: 'Select New Theme',
    applyTheme: 'Apply Theme',
    serverSection: 'Server Settings',
    serverDescription: 'Server configuration and status',
    serverStatus: 'Server Status',
    serverRunning: 'Running',
    serverPort: 'Port'
};

const settingsView = () => {
    const currentTheme = getCurrentTheme();
    const availableThemes = getAvailableThemes();

    return template(
        settingsI18n.settingsTitle,
        section(
            { class: "settings-container" },
            div({ class: "settings-header" },
                h2(settingsI18n.settingsTitle),
                p(settingsI18n.settingsDescription)
            ),

            // Theme Settings Section
            div({ class: "settings-section" },
                h3(settingsI18n.themeSection),
                p(settingsI18n.themeDescription),
                
                div({ class: "theme-settings" },
                    div({ class: "current-theme-info" },
                        label(settingsI18n.currentTheme + ": "),
                        span({ 
                            class: "current-theme-name",
                            style: "font-weight: bold; color: var(--accent-color);"
                        }, currentTheme)
                    ),
                    
                    form({ 
                        method: 'POST', 
                        action: '/settings/theme',
                        class: 'theme-selector-form',
                        style: "margin-top: 1em;"
                    },
                        div({ class: "form-group" },
                            label({ for: "theme" }, settingsI18n.selectTheme + ":"),
                            select({ 
                                name: "theme", 
                                id: "theme",
                                class: "theme-select"
                            },
                                ...availableThemes.map(theme =>
                                    option({ 
                                        value: theme,
                                        selected: theme === currentTheme
                                    }, theme)
                                )
                            )
                        ),
                        button({ 
                            type: 'submit',
                            class: 'btn btn-primary',
                            style: "margin-top: 1em;"
                        }, settingsI18n.applyTheme)
                    )
                )
            ),

            // Server Settings Section
            div({ class: "settings-section" },
                h3(settingsI18n.serverSection),
                p(settingsI18n.serverDescription),
                
                div({ class: "server-info" },
                    div({ class: "info-item" },
                        label(settingsI18n.serverStatus + ": "),
                        span({ 
                            class: "status-indicator running",
                            style: "color: var(--success-color); font-weight: bold;"
                        }, settingsI18n.serverRunning)
                    ),
                    div({ class: "info-item" },
                        label(settingsI18n.serverPort + ": "),
                        span("3011")
                    )
                )
            ),

            // Theme Preview Section
            div({ class: "settings-section" },
                h3("Theme Preview"),
                p("Preview of available themes:"),
                div({ class: "theme-preview-grid" },
                    ...availableThemes.map(theme =>
                        div({ 
                            class: `theme-preview ${theme === currentTheme ? 'active' : ''}`,
                            "data-theme": theme
                        },
                            div({ class: "theme-name" }, theme),
                            div({ class: "theme-colors" },
                                div({ class: "color-sample primary" }),
                                div({ class: "color-sample secondary" }),
                                div({ class: "color-sample accent" })
                            )
                        )
                    )
                )
            ),

            // JavaScript para manejar el cambio de tema dinámicamente
            script(`
                // Actualizar el selector cuando se carga la página
                document.addEventListener('DOMContentLoaded', function() {
                    // Obtener el tema actual desde el backend
                    fetch('/api/config')
                        .then(response => response.json())
                        .then(data => {
                            const currentTheme = data.currentTheme;
                            
                            // Actualizar el nombre del tema actual
                            const themeNameElement = document.querySelector('.current-theme-name');
                            if (themeNameElement) {
                                themeNameElement.textContent = currentTheme;
                            }
                            
                            // Actualizar el selector
                            const selector = document.querySelector('#theme');
                            if (selector) {
                                // Desmarcar todas las opciones
                                Array.from(selector.options).forEach(option => {
                                    option.selected = false;
                                });
                                
                                // Marcar la opción actual
                                const currentOption = selector.querySelector('option[value="' + currentTheme + '"]');
                                if (currentOption) {
                                    currentOption.selected = true;
                                }
                            }
                            
                            // Actualizar vista previa
                            document.querySelectorAll('.theme-preview').forEach(preview => {
                                preview.classList.remove('active');
                                if (preview.dataset.theme === currentTheme) {
                                    preview.classList.add('active');
                                }
                            });
                        })
                        .catch(error => console.error('Error loading current theme:', error));
                });

                // Manejar el envío del formulario para actualizar dinámicamente
                document.querySelector('.theme-selector-form').addEventListener('submit', function(e) {
                    e.preventDefault();
                    
                    const formData = new FormData(this);
                    const selectedTheme = formData.get('theme');
                    
                    // Enviar el cambio de tema
                    fetch('/settings/theme', {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => {
                        if (response.ok) {
                            // Actualizar la UI sin recargar la página
                            document.querySelector('.current-theme-name').textContent = selectedTheme;
                            
                            // Actualizar vista previa
                            document.querySelectorAll('.theme-preview').forEach(preview => {
                                preview.classList.remove('active');
                                if (preview.dataset.theme === selectedTheme) {
                                    preview.classList.add('active');
                                }
                            });
                            
                            // Recargar la página para aplicar el nuevo tema
                            setTimeout(() => {
                                window.location.reload();
                            }, 500);
                        } else {
                            console.error('Error applying theme');
                        }
                    })
                    .catch(error => console.error('Error:', error));
                });
            `)
        )
    );
};

module.exports = {
    settingsView,
    settingsI18n
};