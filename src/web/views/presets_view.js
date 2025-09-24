const { div, section, h2, h3, p, button } = require("hyperaxe");
const { template } = require('./main_views');

// Import preset management components
const { renderPresetForm } = require('./components/PresetForm');
const { renderPresetManager } = require('./components/PresetManager');
const { renderPresetDetails } = require('./components/PresetDetails'); // ✅ Componente funcional existente
const { renderQuickActionsBar } = require('./components/QuickActionsBar');

const { aiI18n } = require('./i18n/ai_i18n');
const { processMCPPrefetch } = require('./helpers/view_helpers');

/**
 * 📋 GESTIÓN DE PRESETS - Vista completamente independiente
 * Solo se encarga de crear, editar, eliminar y gestionar presets
 * NO tiene conexión con explorador - funciona con datos guardados
 */

/**
 * ✅ Acciones de presets independientes
 * Solo para gestión de presets - SIN selección de explorador
 */
function renderPresetActions(activePreset) {
    return div(
        { 
            class: "preset-actions", 
            style: `margin-top: 1.5rem; 
                    display: flex; 
                    gap: 1rem; 
                    align-items: center;
                    padding: 1rem;
                    background: var(--background-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;`
        },
        button({
            id: "create-new-preset",
            class: "btn btn-primary",
            style: "padding: 0.5rem 1rem; font-weight: 600;"
        }, "➕ Crear Nuevo Preset"),
        
        activePreset ? button({
            id: "edit-active-preset", 
            class: "btn btn-secondary",
            style: "padding: 0.5rem 1rem;"
        }, "✏️ Editar Preset") : null,
        
        activePreset ? button({
            id: "duplicate-preset", 
            class: "btn btn-secondary",
            style: "padding: 0.5rem 1rem;"
        }, "📋 Duplicar") : null,
        
        activePreset ? button({
            id: "load-preset-in-explorer", 
            class: "btn btn-success",
            style: "padding: 0.5rem 1rem; font-weight: 600;"
        }, "🔧 Cargar en Explorador") : null,
        
        div({
            style: "margin-left: auto; color: var(--text-secondary); font-size: 0.9em;"
        }, activePreset ? `Preset activo: ${activePreset.name}` : "Gestiona tus presets desde aquí")
    );
}

/**
 * Renderiza la sección completa de gestión de presets
 * Sin conexión al explorador - solo gestión pura de presets
 */
function renderPresetManagementSection(mcpData) {
    return section(
        { 
            class: "preset-management-section",
            style: `margin-bottom: 2rem; 
                    background: var(--background-primary); 
                    border: 1px solid var(--border-color); 
                    border-radius: 8px; 
                    padding: 1.5rem;`
        },
        h2({ 
            style: "margin: 0 0 1.5rem 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;" 
        }, "📋", "Gestión de Presets"),

        // ✅ PRIMERO: Detalles del preset seleccionado (componente funcional existente)
        renderPresetDetails(mcpData.activePreset, {}, {
            // ✅ Handlers que serán conectados via JavaScript del lado cliente
            onEdit: true, // Marcador para habilitar botón
            onDuplicate: true, // Marcador para habilitar botón
            onDelete: true, // Mantener funcionalidad de borrado en presets
            // ✅ NO incluimos onUse para ocultar el botón "Usar en IA"
        }, { 
            showActions: true // Mostrar acciones pero sin el botón "Usar"
        }),

        // ✅ SEGUNDO: Gestor de presets independiente - SIN selectedContext
        renderPresetManager({
            presets: mcpData.presets || [],
            activePreset: mcpData.activePreset,
            totalItems: mcpData.totalItems || 0,
            mode: 'presets', // ✅ Modo específico para vista de presets
            showActions: false // ✅ Acciones manejadas por renderPresetActions
        }),
        
        // ✅ Acciones de presets
        renderPresetActions(mcpData.activePreset),
        
        // Formulario para crear/editar presets (inicialmente oculto)
        div(
            { 
                id: "preset-form-wrapper",
                style: "margin-top: 2rem; display: none;"
            },
            renderPresetForm(null, false)
        )
    );
}

/**
 * 📋 VISTA PRINCIPAL DE PRESETS
 * Completamente independiente del explorador
 */
const presetsView = (prefetch = {}) => {
    // Procesar datos MCP
    const mcpData = processMCPPrefetch(prefetch);
    const debug = Boolean(prefetch && (prefetch.debug === true || prefetchedTrue(prefetch.debug)));

    function prefetchedTrue(v) {
        return v === true || v === 'true' || v === '1' || v === 1;
    }

    // Datos para template principal
    const templateData = {
        flash: null,
        content: {
            presetsCount: Array.isArray(mcpData.presets) ? mcpData.presets.length : 0,
            activePreset: mcpData.activePreset,
            flash: (prefetch && prefetch.flash) ? String(prefetch.flash) : ''
        }
    };

    return template(
        "MCP Presets - Gestión Independiente",
        
        // Header de presets
        div(
            { style: "margin-bottom: 2rem; padding: 1.5rem; background: var(--background-secondary); border: 1px solid var(--border-color); border-radius: 8px;" },
            div({ style: "margin-bottom: 1rem;" },
                div({ style: "font-size: 1.1em; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;" }, "📋 Gestión de Presets"),
                p({ style: "margin: 0; color: var(--text-secondary); line-height: 1.5;" }, 
                    "Gestiona tus configuraciones guardadas de herramientas, recursos y prompts MCP. Crea, edita, duplica y organiza tus presets para un acceso rápido."
                )
            )
        ),

        // ✅ Barra de estadísticas justo después del header
        renderQuickActionsBar(mcpData),

        // ✅ Sección principal de gestión de presets
        renderPresetManagementSection(mcpData),

        // Scripts específicos de presets - SIN conexión al explorador
        require('hyperaxe').script({ src: "/assets/js/toast-manager.js" }),
        require('hyperaxe').script({ src: "/assets/js/preset-manager.js" }), // ✅ Script independiente para presets
        require('hyperaxe').script(`
            // Inicialización específica de presets
            document.addEventListener('DOMContentLoaded', function() {
                console.log('[Presets View] Initializing independent preset management...');
                
                // ✅ Check if we need to refresh preset data
                const needsRefresh = sessionStorage.getItem('mcp-presets-need-refresh');
                if (needsRefresh === 'true') {
                    console.log('[Presets View] Detecting stale data, refreshing preset list...');
                    sessionStorage.removeItem('mcp-presets-need-refresh');
                    
                    // Try dynamic refresh first, fallback to page reload
                    if (window.presetManager && typeof window.presetManager.refresh === 'function') {
                        console.log('[Presets View] Using dynamic preset refresh...');
                        window.presetManager.refresh().then(() => {
                            console.log('[Presets View] Preset data refreshed dynamically');
                        }).catch(() => {
                            console.log('[Presets View] Dynamic refresh failed, reloading page...');
                            window.location.reload();
                        });
                    } else {
                        console.log('[Presets View] No dynamic refresh available, reloading page...');
                        window.location.reload();
                    }
                }
                
                // ✅ Agregar handlers personalizados para redireccionar al explorador
                document.addEventListener('click', function(e) {
                    const target = e.target;
                    
                    // Handler para botón Editar - redirigir al explorador con parámetro edit
                    if (target.classList.contains('edit-preset-btn')) {
                        e.preventDefault();
                        const presetName = target.getAttribute('data-preset-name');
                        console.log('[Presets View] Redirecting to edit preset:', presetName);
                        window.location.href = \`/explorer?edit=\${encodeURIComponent(presetName)}\`;
                        return;
                    }
                    
                    // Handler para botón Duplicar - redirigir al explorador con parámetro duplicate
                    if (target.classList.contains('duplicate-preset-btn')) {
                        e.preventDefault();
                        const presetName = target.getAttribute('data-preset-name');
                        console.log('[Presets View] Redirecting to duplicate preset:', presetName);
                        window.location.href = \`/explorer?duplicate=\${encodeURIComponent(presetName)}\`;
                        return;
                    }
                });
                
                // Inicializar solo gestión de presets - SIN selección automática
                if (window.PresetManager) {
                    window.presetManager = new window.PresetManager();
                }
                
                // ✅ Check if we need to refresh preset data (after presetManager is initialized)
                setTimeout(() => {
                    const needsRefresh = sessionStorage.getItem('mcp-presets-need-refresh');
                    if (needsRefresh === 'true') {
                        console.log('[Presets View] Detecting stale data, refreshing preset list...');
                        sessionStorage.removeItem('mcp-presets-need-refresh');
                        
                        // Try dynamic refresh first, fallback to page reload
                        if (window.presetManager && typeof window.presetManager.refresh === 'function') {
                            console.log('[Presets View] Using dynamic preset refresh...');
                            window.presetManager.refresh().then(() => {
                                console.log('[Presets View] Preset data refreshed dynamically');
                                if (window.ToastManager) {
                                    window.ToastManager.showSuccess('Lista de presets actualizada');
                                }
                            }).catch(() => {
                                console.log('[Presets View] Dynamic refresh failed, reloading page...');
                                window.location.reload();
                            });
                        } else {
                            console.log('[Presets View] No dynamic refresh available, reloading page...');
                            window.location.reload();
                        }
                    }
                }, 500); // Small delay to ensure presetManager is ready
            });
        `),

        // Debug info (solo si está habilitado)
        debug ? require('hyperaxe').script(`
            console.group('📋 [PRESETS VIEW DEBUG]');
            try {
                console.log('📊 MCP Data:', ${JSON.stringify(mcpData || {})});
                console.log('🎯 Template Data:', ${JSON.stringify(templateData || {})});
                console.log('📋 Active Preset:', ${JSON.stringify(mcpData?.activePreset || null)});
            } catch(e) {
                console.error('Debug data error:', e);
            }
            console.groupEnd();
        `) : null
    );
};

module.exports = {
    presetsView,
    renderPresetManagementSection,
    renderPresetActions, // ✅ Mantener las acciones personalizadas
    aiI18n
};