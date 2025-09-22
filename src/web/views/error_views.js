const { div, h2, p, section, a } = require("hyperaxe");
const { template, i18n } = require('./main_views');

const errorI18n = {
    ...i18n,
    notFoundTitle: '404 - Page Not Found',
    notFoundMessage: 'The page you are looking for does not exist.',
    goHome: 'Go Home',
    serverErrorTitle: '500 - Server Error',
    serverErrorMessage: 'An internal server error occurred.',
    tryAgain: 'Try Again'
};

const notFoundView = () => {
    return template(
        errorI18n.notFoundTitle,
        section(
            { class: "error-container" },
            div({ class: "error-content" },
                h2({ class: "error-title" }, errorI18n.notFoundTitle),
                p({ class: "error-message" }, errorI18n.notFoundMessage),
                div({ class: "error-actions" },
                    a({ 
                        href: "/ui", 
                        class: "btn btn-primary" 
                    }, errorI18n.goHome)
                )
            )
        )
    );
};

const serverErrorView = (error = '') => {
    return template(
        errorI18n.serverErrorTitle,
        section(
            { class: "error-container" },
            div({ class: "error-content" },
                h2({ class: "error-title" }, errorI18n.serverErrorTitle),
                p({ class: "error-message" }, errorI18n.serverErrorMessage),
                error ? p({ 
                    class: "error-details",
                    style: "font-family: monospace; background: var(--background-secondary); padding: 1em; border-radius: 4px;"
                }, error) : null,
                div({ class: "error-actions" },
                    a({ 
                        href: "/ui", 
                        class: "btn btn-primary" 
                    }, errorI18n.goHome),
                    button({ 
                        onclick: "history.back()",
                        class: "btn btn-secondary" 
                    }, errorI18n.tryAgain)
                )
            )
        )
    );
};

module.exports = {
    notFoundView,
    serverErrorView,
    errorI18n
};