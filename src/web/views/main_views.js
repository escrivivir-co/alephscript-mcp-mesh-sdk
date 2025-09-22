const { 
    html, head, body, title, meta, link, div, nav, ul, li, a, span, 
    main, section, h1, h2, p, button, form, input, select, option, script 
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
            // Inject catalog behavior script globally (safe to include on all pages)
            script({ src: "/assets/js/mcp-catalog.js" })
        )
    );
    return doctypeString + nodes.outerHTML;
};

const mainView = () => {
    return template(
        i18n.home,
        section(
            h2("Welcome to MCP Mesh SDK"),
            p("This is the web interface for the Model Context Protocol Mesh SDK."),
            div({ class: "feature-grid" },
                div({ class: "feature-card" },
                    h2("🤖 AI Assistant"),
                    p("Interact with AI models through the MCP interface."),
                    a({ href: "/ai", class: "btn btn-primary" }, "Open AI Assistant")
                ),
                div({ class: "feature-card" },
                    h2("⚙️ Settings"),
                    p("Configure themes and server settings."),
                    a({ href: "/settings", class: "btn btn-secondary" }, "Open Settings")
                )
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