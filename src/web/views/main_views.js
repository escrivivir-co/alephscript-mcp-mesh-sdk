const { 
    html, head, body, title, meta, link, div, nav, ul, li, a, span, 
    main, section, h1, h2, h3, p, button, form, input, select, option, script 
} = require('hyperaxe');

const { getCurrentTheme, getAvailableThemes } = require('../controllers/ThemeController.js');

// Internacionalización básica (se puede expandir)
const i18n = {
    appTitle: 'MCP Mesh SDK',
    home: 'Home',
    ai: 'AI Assistant',
    settings: 'Settings',
    themes: 'Themes',
    description: 'Model Context Protocol Mesh SDK - Web Interface',
    currentTheme: 'Current Theme',
    selectTheme: 'Select Theme',
    apply: 'Apply'
};

const doctypeString = "<!DOCTYPE html>";
const nbsp = "\xa0";

const navLink = ({ href, emoji, text, current = false }) =>
    li(
        a(
            { href, class: current ? "current" : "" },
            span({ class: "emoji" }, emoji),
            nbsp,
            text
        )
    );

const toAttributes = (obj) =>
    Object.entries(obj)
        .map(([key, val]) => `${key}="${val}"`)
        .join(" ");

const template = (titlePrefix, ...elements) => {
    const currentTheme = getCurrentTheme();
    const themeLink = link({
        rel: "stylesheet",
        href: `/assets/themes/${currentTheme}.css`
    });

    const nodes = html(
        { lang: "en" },
        head(
            title(titlePrefix, " | ", i18n.appTitle),
            link({ rel: "stylesheet", href: "/assets/styles/style.css" }),
            themeLink,
            meta({ charset: "utf-8" }),
            meta({ name: "description", content: i18n.description }),
            meta({ name: "viewport", content: toAttributes({ width: "device-width", "initial-scale": 1 }) })
        ),
        body(
            div(
                { class: "header" },
                div(
                    { class: "top-bar" },
                    div(
                        { class: "logo" },
                        a({ href: "/ui" }, h1(i18n.appTitle))
                    ),
                    nav(
                        { class: "main-nav" },
                        ul(
                            navLink({ href: "/ui", emoji: "🏠", text: i18n.home }),
                            navLink({ href: "/ai", emoji: "🤖", text: i18n.ai }),
                            navLink({ href: "/explorer", emoji: "🔧", text: "Explorer" }), // ✅ Nueva vista del explorador
                            navLink({ href: "/presets", emoji: "📋", text: "Presets" }),   // ✅ Nueva vista de presets

                            navLink({ href: "/stats", emoji: "📊", text: "Statistics" }),
                            navLink({ href: "/settings", emoji: "⚙️", text: i18n.settings })
                        )
                    )
                )
            ),
            div(
                { class: "main-content" },
                main({ class: "content-area" }, elements)
            ),
            div(
                { class: "footer" },
                p(`${i18n.appTitle} - Powered by MCP`)
            ),
            // Inject scripts - home-specific enhancements only
            script({ src: "/assets/js/home.js" })
        )
    );
    return doctypeString + nodes.outerHTML;
};

const mainView = () => {
    return template(
        i18n.home,
        section(
            { style: "text-align: center; margin-bottom: 3rem;" },
            h1({ style: "color: var(--primary-color); margin-bottom: 1rem;" }, "🚀 MCP Mesh SDK"),
            p({ 
                style: "font-size: 1.2em; color: var(--text-secondary); margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; line-height: 1.6;" 
            }, "Plataforma completa para trabajar con Model Context Protocol. Chatea con IA usando presets personalizados o explora el catálogo para crear nuevas configuraciones.")
        ),
        section(
            { style: "margin-bottom: 3rem;" },
            h2({ style: "text-align: center; margin-bottom: 2rem; color: var(--text-primary);" }, "¿Qué quieres hacer?"),
            div({ 
                class: "feature-grid",
                style: `
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                    gap: 2rem;
                    max-width: 800px;
                    margin: 0 auto;
                `
            },
                div({ 
                    class: "feature-card",
                    style: `
                        background: linear-gradient(135deg, var(--primary-color), #4a90e2);
                        color: white;
                        padding: 2rem;
                        border-radius: 12px;
                        text-align: center;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                        transition: transform 0.3s ease, box-shadow 0.3s ease;
                        border: none;
                    `,
                    onmouseover: "this.style.transform='translateY(-5px)'; this.style.boxShadow='0 12px 48px rgba(0,0,0,0.15)'",
                    onmouseout: "this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 32px rgba(0,0,0,0.1)'"
                },
                    div({ style: "font-size: 3rem; margin-bottom: 1rem;" }, "🤖"),
                    h2({ style: "margin-bottom: 1rem; color: white;" }, "Chat con IA"),
                    p({ 
                        style: "margin-bottom: 1.5rem; opacity: 0.9; line-height: 1.5;" 
                    }, "Usa tus presets guardados para hacer consultas inteligentes y obtener respuestas personalizadas."),
                    a({ 
                        href: "/ai", 
                        class: "btn",
                        style: `
                            background: white;
                            color: var(--primary-color);
                            padding: 0.75rem 2rem;
                            border-radius: 8px;
                            text-decoration: none;
                            font-weight: 600;
                            display: inline-block;
                            transition: all 0.3s ease;
                        `,
                        onmouseover: "this.style.background='rgba(255,255,255,0.9)'",
                        onmouseout: "this.style.background='white'"
                    }, "Iniciar Chat")
                ),
                div({ 
                    class: "feature-card",
                    style: `
                        background: linear-gradient(135deg, var(--accent-color), #f39c12);
                        color: white;
                        padding: 2rem;
                        border-radius: 12px;
                        text-align: center;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                        transition: transform 0.3s ease, box-shadow 0.3s ease;
                        border: none;
                    `,
                    onmouseover: "this.style.transform='translateY(-5px)'; this.style.boxShadow='0 12px 48px rgba(0,0,0,0.15)'",
                    onmouseout: "this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 32px rgba(0,0,0,0.1)'" 
                },
                    div({ style: "font-size: 3rem; margin-bottom: 1rem;" }, "�"),
                    h2({ style: "margin-bottom: 1rem; color: white;" }, "Explorador MCP"),
                    p({ 
                        style: "margin-bottom: 1.5rem; opacity: 0.9; line-height: 1.5;" 
                    }, "Explora servidores MCP, herramientas disponibles y crea presets personalizados para tus necesidades."),
                    a({ 
                        href: "/explorer", 
                        class: "btn",
                        style: `
                            background: white;
                            color: var(--accent-color);
                            padding: 0.75rem 2rem;
                            border-radius: 8px;
                            text-decoration: none;
                            font-weight: 600;
                            display: inline-block;
                            transition: all 0.3s ease;
                        `,
                        onmouseover: "this.style.background='rgba(255,255,255,0.9)'",
                        onmouseout: "this.style.background='white'"
                    }, "Abrir Explorer")
                )
            )
        ),
        section(
            { style: "margin: 2rem 0;" },
            div({
                style: `
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                `
            },
                div({ 
                    class: "feature-card",
                    style: `
                        background: linear-gradient(135deg, #6c5ce7, #74b9ff);
                        color: white;
                        padding: 2rem;
                        border-radius: 12px;
                        text-align: center;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                        transition: transform 0.3s ease, box-shadow 0.3s ease;
                        border: none;
                    `,
                    onmouseover: "this.style.transform='translateY(-5px)'; this.style.boxShadow='0 12px 48px rgba(0,0,0,0.15)'",
                    onmouseout: "this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 32px rgba(0,0,0,0.1)'" 
                },
                    div({ style: "font-size: 3rem; margin-bottom: 1rem;" }, "📋"),
                    h2({ style: "margin-bottom: 1rem; color: white;" }, "Presets MCP"),
                    p({ 
                        style: "margin-bottom: 1.5rem; opacity: 0.9; line-height: 1.5;" 
                    }, "Gestiona y administra tus configuraciones guardadas de herramientas y servidores MCP."),
                    a({ 
                        href: "/presets", 
                        class: "btn",
                        style: `
                            background: white;
                            color: #6c5ce7;
                            padding: 0.75rem 2rem;
                            border-radius: 8px;
                            text-decoration: none;
                            font-weight: 600;
                            display: inline-block;
                            transition: all 0.3s ease;
                        `,
                        onmouseover: "this.style.background='rgba(255,255,255,0.9)'",
                        onmouseout: "this.style.background='white'"
                    }, "Ver Presets")
                )
            )
        ),
        section(
            { style: "text-align: center; padding: 2rem; background: var(--background-secondary); border-radius: 12px; margin: 2rem 0;" },
            h3({ style: "margin-bottom: 1.5rem; color: var(--text-primary);" }, "🔧 Herramientas Adicionales"),
            p({ 
                style: "margin-bottom: 1.5rem; color: var(--text-secondary); font-size: 0.95em;" 
            }, "Accede a estadísticas del sistema y configuración avanzada"),
            div({
                style: `
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                `
            },
                a({ 
                    href: "/stats", 
                    class: "btn btn-secondary",
                    style: `
                        margin: 0.5rem;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        text-decoration: none;
                        background: var(--background-primary);
                        color: var(--text-primary);
                        border: 1px solid var(--border-color);
                        transition: all 0.3s ease;
                    `,
                    onmouseover: "this.style.borderColor='var(--primary-color)'; this.style.color='var(--primary-color)'",
                    onmouseout: "this.style.borderColor='var(--border-color)'; this.style.color='var(--text-primary)'"
                }, "📊 Estadísticas"),
                a({ 
                    href: "/settings", 
                    class: "btn btn-secondary",
                    style: `
                        margin: 0.5rem;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        text-decoration: none;
                        background: var(--background-primary);
                        color: var(--text-primary);
                        border: 1px solid var(--border-color);
                        transition: all 0.3s ease;
                    `,
                    onmouseover: "this.style.borderColor='var(--accent-color)'; this.style.color='var(--accent-color)'",
                    onmouseout: "this.style.borderColor='var(--border-color)'; this.style.color='var(--text-primary)'"
                }, "⚙️ Configuración")
            )
        )
    );
};

const notFoundView = () => {
    return template(
        "404 - Not Found",
        section(
            { class: "error-page" },
            h2("404 - Page Not Found"),
            p("The page you're looking for doesn't exist."),
            a({ href: "/ui", class: "btn btn-primary" }, "Go Home")
        )
    );
};

module.exports = {
    template,
    mainView,
    notFoundView,
    i18n
};