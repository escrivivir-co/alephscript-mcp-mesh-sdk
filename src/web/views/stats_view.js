const { div, h2, h3, p, section, span, table, thead, tbody, tr, th, td, script } = require("hyperaxe");
const { template, i18n } = require('./main_views');

const statsI18n = {
    ...i18n,
    statsTitle: 'Statistics',
    statsDescription: 'System statistics and information',
    aiStats: 'AI Statistics',
    totalQuestions: 'Total Questions',
    totalResponses: 'Total Responses',
    approvedEntries: 'Approved Entries',
    rejectedEntries: 'Rejected Entries',
    pendingEntries: 'Pending Entries',
    systemStats: 'System Statistics',
    serverUptime: 'Server Uptime',
    currentTheme: 'Current Theme',
    totalThemes: 'Available Themes',
    lastActivity: 'Last Activity',
    recentActivity: 'Recent Activity',
    noActivity: 'No recent activity'
};

const formatUptime = (startTime) => {
    const now = Date.now();
    const diff = now - startTime;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
};

const statsView = (aiHistory = [], serverStartTime = Date.now()) => {
    const totalQuestions = aiHistory.length;
    const approvedEntries = aiHistory.filter(entry => entry.trainStatus === 'approved').length;
    const rejectedEntries = aiHistory.filter(entry => entry.trainStatus === 'rejected').length;
    const pendingEntries = aiHistory.filter(entry => !entry.trainStatus).length;
    
    const recentEntries = aiHistory.slice(0, 5);

    return template(
        statsI18n.statsTitle,
        section(
            { class: "stats-container" },
            div({ class: "stats-header" },
                h2(statsI18n.statsTitle),
                p(statsI18n.statsDescription)
            ),

            // AI Statistics Section
            div({ class: "stats-section" },
                h3(statsI18n.aiStats),
                div({ class: "stats-grid" },
                    div({ class: "stat-card" },
                        div({ class: "stat-number" }, totalQuestions.toString()),
                        div({ class: "stat-label" }, statsI18n.totalQuestions)
                    ),
                    div({ class: "stat-card" },
                        div({ class: "stat-number" }, totalQuestions.toString()),
                        div({ class: "stat-label" }, statsI18n.totalResponses)
                    ),
                    div({ class: "stat-card approved" },
                        div({ class: "stat-number" }, approvedEntries.toString()),
                        div({ class: "stat-label" }, statsI18n.approvedEntries)
                    ),
                    div({ class: "stat-card rejected" },
                        div({ class: "stat-number" }, rejectedEntries.toString()),
                        div({ class: "stat-label" }, statsI18n.rejectedEntries)
                    ),
                    div({ class: "stat-card pending" },
                        div({ class: "stat-number" }, pendingEntries.toString()),
                        div({ class: "stat-label" }, statsI18n.pendingEntries)
                    )
                )
            ),

            // System Statistics Section
            div({ class: "stats-section" },
                h3(statsI18n.systemStats),
                div({ class: "system-info" },
                    div({ class: "info-row" },
                        span({ class: "info-label" }, statsI18n.serverUptime + ":"),
                        span({ class: "info-value" }, formatUptime(serverStartTime))
                    ),
                    div({ class: "info-row" },
                        span({ class: "info-label" }, statsI18n.currentTheme + ":"),
                        span({ class: "info-value theme-name" }, "Loading...")
                    ),
                    div({ class: "info-row" },
                        span({ class: "info-label" }, statsI18n.totalThemes + ":"),
                        span({ class: "info-value" }, "5")
                    )
                )
            ),

            // Recent Activity Section
            div({ class: "stats-section" },
                h3(statsI18n.recentActivity),
                recentEntries.length === 0 
                    ? p({ class: "no-activity" }, statsI18n.noActivity)
                    : table({ class: "activity-table" },
                        thead(
                            tr(
                                th("Time"),
                                th("Question"),
                                th("Status")
                            )
                        ),
                        tbody(
                            ...recentEntries.map(entry =>
                                tr(
                                    td({ class: "time-cell" }, 
                                        new Date(entry.timestamp).toLocaleString()
                                    ),
                                    td({ class: "question-cell" }, 
                                        entry.question.length > 50 
                                            ? entry.question.substring(0, 50) + "..."
                                            : entry.question
                                    ),
                                    td({ class: "status-cell" },
                                        span({ 
                                            class: `status-badge ${entry.trainStatus || 'pending'}` 
                                        }, 
                                            entry.trainStatus === 'approved' ? '✓ Approved' :
                                            entry.trainStatus === 'rejected' ? '✗ Rejected' :
                                            '⏳ Pending'
                                        )
                                    )
                                )
                            )
                        )
                    )
            ),

            // JavaScript para actualizar el tema actual
            script(`
                // Cargar el tema actual
                fetch('/api/config')
                    .then(response => response.json())
                    .then(data => {
                        const themeName = data.currentTheme || 'Dark-MCP';
                        document.querySelector('.theme-name').textContent = themeName;
                    })
                    .catch(() => {
                        document.querySelector('.theme-name').textContent = 'Dark-MCP';
                    });

                // Auto-refresh cada 30 segundos
                setInterval(() => {
                    window.location.reload();
                }, 30000);
            `)
        )
    );
};

module.exports = {
    statsView,
    statsI18n
};