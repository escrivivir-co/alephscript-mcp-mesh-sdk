const { div, h2, h3, p, section, span, table, thead, tbody, tr, th, td, script, button } = require("hyperaxe");
const { template, i18n } = require('./main_views');

const statsI18n = {
    ...i18n,
    statsTitle: 'Estadísticas del Sistema',
    statsDescription: 'Estadísticas del sistema MCP, catálogo y uso',
    mcpStats: 'Estadísticas MCP',
    catalogStats: 'Estadísticas del Catálogo', 
    totalServers: 'Servidores Totales',
    connectedServers: 'Servidores Conectados',
    totalTools: 'Herramientas',
    totalResources: 'Recursos',
    totalPrompts: 'Prompts',
    totalPresets: 'Presets',
    aiStats: 'Estadísticas AI',
    totalQuestions: 'Preguntas Totales',
    totalResponses: 'Respuestas Totales',
    approvedEntries: 'Entradas Aprobadas',
    rejectedEntries: 'Entradas Rechazadas',
    pendingEntries: 'Entradas Pendientes',
    systemStats: 'Estadísticas del Sistema',
    serverUptime: 'Tiempo Activo',
    currentTheme: 'Tema Actual',
    totalThemes: 'Temas Disponibles',
    lastActivity: 'Última Actividad',
    recentActivity: 'Actividad Reciente',
    noActivity: 'Sin actividad reciente',
    refreshData: 'Actualizar Datos',
    refreshCatalog: 'Actualizar Catálogo',
    lastUpdated: 'Última actualización'
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
                p(statsI18n.statsDescription),
                div({ class: "refresh-buttons" }, [
                    button({ 
                        class: "btn btn-secondary refresh-data-btn",
                        onclick: "refreshAllStats()"
                    }, [
                        span({ class: "icon" }, '🔄'),
                        statsI18n.refreshData
                    ]),
                    button({ 
                        class: "btn btn-primary refresh-catalog-btn",
                        onclick: "refreshCatalogData()"
                    }, [
                        span({ class: "icon" }, '📚'),
                        statsI18n.refreshCatalog
                    ])
                ])
            ),

            // Estadísticas MCP Section
            div({ class: "stats-section mcp-stats", id: "mcp-stats" },
                h3([
                    span({ class: "icon" }, '🔗'),
                    statsI18n.mcpStats
                ]),
                div({ class: "stats-grid", id: "mcp-stats-grid" },
                    div({ class: "stat-card loading" },
                        div({ class: "stat-number" }, "..."),
                        div({ class: "stat-label" }, statsI18n.totalServers)
                    ),
                    div({ class: "stat-card loading" },
                            div({ class: "stat-number" }, "..."),
                        div({ class: "stat-label" }, statsI18n.connectedServers)
                    )
                )
            ),

            // Estadísticas del Catálogo Section
            div({ class: "stats-section catalog-stats", id: "catalog-stats" },
                h3([
                    span({ class: "icon" }, '📚'),
                    statsI18n.catalogStats
                ]),
                div({ class: "stats-grid", id: "catalog-stats-grid" },
                    div({ class: "stat-card loading" },
                        div({ class: "stat-number" }, "..."),
                        div({ class: "stat-label" }, statsI18n.totalTools)
                    ),
                    div({ class: "stat-card loading" },
                        div({ class: "stat-number" }, "..."),
                        div({ class: "stat-label" }, statsI18n.totalResources)
                    ),
                    div({ class: "stat-card loading" },
                        div({ class: "stat-number" }, "..."),
                        div({ class: "stat-label" }, statsI18n.totalPrompts)
                    ),
                    div({ class: "stat-card loading" },
                        div({ class: "stat-number" }, "..."),
                        div({ class: "stat-label" }, statsI18n.totalPresets)
                    )
                ),
                p({ class: "last-updated", id: "catalog-last-updated" }, 
                    statsI18n.lastUpdated + ": " + new Date().toLocaleString()
                )
            ),

            // AI Statistics Section
            div({ class: "stats-section ai-stats" },
                h3([
                    span({ class: "icon" }, '🤖'),
                    statsI18n.aiStats
                ]),
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
            div({ class: "stats-section system-stats" },
                h3([
                    span({ class: "icon" }, '⚙️'),
                    statsI18n.systemStats
                ]),
                div({ class: "system-info" },
                    div({ class: "info-row" },
                        span({ class: "info-label" }, statsI18n.serverUptime + ":"),
                        span({ class: "info-value uptime-value" }, formatUptime(serverStartTime))
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
            div({ class: "stats-section activity-stats" },
                h3([
                    span({ class: "icon" }, '📊'),
                    statsI18n.recentActivity
                ]),
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

            // JavaScript para funcionalidades avanzadas
            script(`
                let refreshInterval;
                let catalogRefreshTime = new Date();

                // Función para cargar estadísticas MCP
                async function loadMCPStats() {
                    try {
                        const response = await fetch('/api/mcp-stats');
                        const mcpStats = await response.json();
                        
                        document.getElementById('mcp-stats-grid').innerHTML = \`
                            <div class="stat-card">
                                <div class="stat-number">\${mcpStats.totalServers || 0}</div>
                                <div class="stat-label">Servidores Totales</div>
                            </div>
                            <div class="stat-card connected">
                                <div class="stat-number">\${mcpStats.connectedServers || 0}</div>
                                <div class="stat-label">Servidores Conectados</div>
                            </div>
                        \`;
                    } catch (error) {
                        console.warn('Error loading MCP stats:', error);
                        document.getElementById('mcp-stats-grid').innerHTML = \`
                            <div class="stat-card error">
                                <div class="stat-number">-</div>
                                <div class="stat-label">Servidores Totales</div>
                            </div>
                            <div class="stat-card error">
                                <div class="stat-number">-</div>
                                <div class="stat-label">Servidores Conectados</div>
                            </div>
                        \`;
                    }
                }

                // Función para cargar estadísticas del catálogo
                async function loadCatalogStats() {
                    try {
                        const response = await fetch('/api/catalog/stats');
                        const catalogStats = await response.json();
                        
                        document.getElementById('catalog-stats-grid').innerHTML = \`
                            <div class="stat-card">
                                <div class="stat-number">\${catalogStats.totalTools || 0}</div>
                                <div class="stat-label">Herramientas</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number">\${catalogStats.totalResources || 0}</div>
                                <div class="stat-label">Recursos</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number">\${catalogStats.totalPrompts || 0}</div>
                                <div class="stat-label">Prompts</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number">\${catalogStats.totalPresets || 0}</div>
                                <div class="stat-label">Presets</div>
                            </div>
                        \`;
                        
                        catalogRefreshTime = new Date();
                        document.getElementById('catalog-last-updated').textContent = 
                            'Última actualización: ' + catalogRefreshTime.toLocaleString();
                            
                    } catch (error) {
                        console.warn('Error loading catalog stats:', error);
                        document.getElementById('catalog-stats-grid').innerHTML = \`
                            <div class="stat-card error">
                                <div class="stat-number">-</div>
                                <div class="stat-label">Herramientas</div>
                            </div>
                            <div class="stat-card error">
                                <div class="stat-number">-</div>
                                <div class="stat-label">Recursos</div>
                            </div>
                            <div class="stat-card error">
                                <div class="stat-number">-</div>
                                <div class="stat-label">Prompts</div>
                            </div>
                            <div class="stat-card error">
                                <div class="stat-number">-</div>
                                <div class="stat-label">Presets</div>
                            </div>
                        \`;
                    }
                }

                // Función para actualizar el uptime
                function updateUptime() {
                    const uptimeElement = document.querySelector('.uptime-value');
                    if (uptimeElement) {
                        const serverStartTime = Date.now() - (5 * 60 * 1000); // Mock: 5 minutes ago
                        const now = Date.now();
                        const diff = now - serverStartTime;
                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        
                        let uptimeStr;
                        if (days > 0) {
                            uptimeStr = days + 'd ' + hours + 'h ' + minutes + 'm';
                        } else if (hours > 0) {
                            uptimeStr = hours + 'h ' + minutes + 'm';
                        } else {
                            uptimeStr = minutes + 'm';
                        }
                        uptimeElement.textContent = uptimeStr;
                    }
                }

                // Función para refrescar todas las estadísticas
                async function refreshAllStats() {
                    const refreshBtn = document.querySelector('.refresh-data-btn');
                    refreshBtn.disabled = true;
                    refreshBtn.innerHTML = '<span class="icon">⏳</span>Actualizar Datos';
                    
                    await Promise.all([
                        loadMCPStats(),
                        loadCatalogStats()
                    ]);
                    
                    setTimeout(() => {
                        refreshBtn.disabled = false;
                        refreshBtn.innerHTML = '<span class="icon">🔄</span>Actualizar Datos';
                    }, 1000);
                }

                // Función para refrescar solo el catálogo
                async function refreshCatalogData() {
                    const refreshBtn = document.querySelector('.refresh-catalog-btn');
                    refreshBtn.disabled = true;
                    refreshBtn.innerHTML = '<span class="icon">⏳</span>Actualizar Catálogo';
                    
                    // Primero actualizar el catálogo en el servidor
                    try {
                        await fetch('/api/catalog/refresh', { method: 'POST' });
                        // Esperar un poco para que el servidor procese
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } catch (error) {
                        console.warn('Error refreshing catalog on server:', error);
                    }
                    
                    // Luego cargar las nuevas estadísticas
                    await loadCatalogStats();
                    
                    setTimeout(() => {
                        refreshBtn.disabled = false;
                        refreshBtn.innerHTML = '<span class="icon">📚</span>Actualizar Catálogo';
                    }, 1000);
                }

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

                // Cargar estadísticas iniciales
                document.addEventListener('DOMContentLoaded', () => {
                    loadMCPStats();
                    loadCatalogStats();
                });

                // Auto-refresh cada 30 segundos para estadísticas del sistema
                refreshInterval = setInterval(() => {
                    updateUptime();
                    loadMCPStats();
                }, 30000);

                // Actualizar uptime cada segundo
                setInterval(updateUptime, 1000);

                // Limpiar interval al salir de la página
                window.addEventListener('beforeunload', () => {
                    if (refreshInterval) {
                        clearInterval(refreshInterval);
                    }
                });
            `)
        )
    );
};

module.exports = {
    statsView,
    statsI18n
};