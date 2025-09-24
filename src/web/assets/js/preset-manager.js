/**
 * PresetManager - Gestor unificado de presets
 * Gestión moderna de presets con fallback automático
 */

class PresetManager {
    constructor() {
        this.initialized = false;
        this.isNewArchitecture = false;
        this.store = null;
        this.eventBus = null;
        this.componentManager = null;
        
        this.state = {
            presets: [],
            activePreset: null,
            selectedContext: {}
        };
        
        this.eventListeners = {};
        this.init();
    }

    async init() {
        if (this.initialized) return;
        
        try {
            if (window.presetStore && window.globalEventBus && window.PresetController) {
                this.isNewArchitecture = true;
                this.store = window.presetStore;
                this.eventBus = window.globalEventBus;
                this.componentManager = new window.PresetController(this.store, this.eventBus);
                
                this.store.subscribe((state) => {
                    this.handleStateChange(state);
                });
                
                this.componentManager.init();
                
            } else {
                this.initFallbackMode();
            }
        } catch (error) {
            console.warn('[PresetManager] Using fallback mode:', error);
            this.initFallbackMode();
        }
        
        this.initialized = true;
    }

    initFallbackMode() {
        this.isNewArchitecture = false;
        
        // Check if we need to refresh from server before loading localStorage
        const needsServerRefresh = sessionStorage.getItem('mcp-presets-need-refresh');
        if (needsServerRefresh === 'true') {
            console.log('[PresetManager] Detected refresh flag, initializing with server data...');
            sessionStorage.removeItem('mcp-presets-need-refresh');
            // Don't load from storage, wait for refresh() to be called
            this.state.presets = [];
        } else {
            this.loadPresetsFromStorage();
        }
        
        this.setupEventListeners();
        this.setupPresetDataListener();
        
        // Ensure UI is rendered after initialization
        setTimeout(() => {
            this.renderPresetsInUI();
            if (this.state.activePreset) {
                this.updatePresetDetails();
                this.updateActivePresetVisual(this.state.activePreset.name);
            }
        }, 100);
    }

    handleStateChange(state) {
        if (!this.isNewArchitecture) return;
        
        if (state.activePreset !== this.state.activePreset) {
            this.dispatchEvent('preset-selected', { preset: state.activePreset });
            this.state.activePreset = state.activePreset;
        }
        
        if (JSON.stringify(state.presets) !== JSON.stringify(this.state.presets)) {
            this.dispatchEvent('presets-updated', { presets: state.presets });
            this.state.presets = state.presets;
        }
    }

    // API pública: Métodos principales
    async getPresets() {
        if (this.isNewArchitecture) {
            const state = this.store.getState();
            return state.presets;
        } else {
            return this.state.presets;
        }
    }

    getActivePreset() {
        if (this.isNewArchitecture) {
            const state = this.store.getState();
            return state.activePreset;
        } else {
            return this.state.activePreset;
        }
    }

    async selectPreset(presetId) {
        if (this.isNewArchitecture) {
            await this.store.selectPreset(presetId);
        } else {
            const preset = this.state.presets.find(p => p.id === presetId);
            if (preset) {
                this.state.activePreset = preset;
                this.dispatchEvent('preset-selected', { preset });
                this.saveToStorage();
            }
        }
    }

    async createPreset(presetData) {
        if (this.isNewArchitecture) {
            return await this.store.createPreset(presetData);
        } else {
            const newPreset = {
                id: `preset_${Date.now()}`,
                name: presetData.name || 'Nuevo Preset',
                description: presetData.description || '',
                mcpSelection: presetData.mcpSelection || {},
                createdAt: new Date().toISOString(),
                ...presetData
            };
            
            this.state.presets.push(newPreset);
            this.dispatchEvent('preset-created', { preset: newPreset });
            this.saveToStorage();
            return newPreset;
        }
    }

    async updatePreset(presetId, updates) {
        if (this.isNewArchitecture) {
            return await this.store.updatePreset(presetId, updates);
        } else {
            const index = this.state.presets.findIndex(p => p.id === presetId);
            if (index !== -1) {
                this.state.presets[index] = {
                    ...this.state.presets[index],
                    ...updates,
                    updatedAt: new Date().toISOString()
                };
                
                const updatedPreset = this.state.presets[index];
                this.dispatchEvent('preset-updated', { preset: updatedPreset });
                this.saveToStorage();
                return updatedPreset;
            }
            return null;
        }
    }

    async deletePreset(presetId) {
        if (this.isNewArchitecture) {
            return await this.store.deletePreset(presetId);
        } else {
            const index = this.state.presets.findIndex(p => p.id === presetId);
            if (index !== -1) {
                const deletedPreset = this.state.presets.splice(index, 1)[0];
                
                if (this.state.activePreset?.id === presetId) {
                    this.state.activePreset = null;
                }
                
                this.dispatchEvent('preset-deleted', { preset: deletedPreset });
                this.saveToStorage();
                return true;
            }
            return false;
        }
    }

    getSelectedContext() {
        if (this.isNewArchitecture) {
            const state = this.store.getState();
            return state.selectedContext;
        } else {
            return this.state.selectedContext;
        }
    }

    updateSelectedContext(context) {
        if (this.isNewArchitecture) {
            this.store.updateSelectedContext(context);
        } else {
            this.state.selectedContext = { ...context };
            this.dispatchEvent('context-updated', { context });
        }
    }

    // Renderizado
    renderPresetList(container, options = {}) {
        if (this.isNewArchitecture && this.componentManager) {
            return this.componentManager.renderPresetList(container, options);
        } else {
            return this.renderPresetListFallback(container, options);
        }
    }

    renderPresetDetails(container, preset, options = {}) {
        if (this.isNewArchitecture && this.componentManager) {
            return this.componentManager.renderPresetDetails(container, preset, options);
        } else {
            return this.renderPresetDetailsFallback(container, preset, options);
        }
    }

    // Gestión de eventos
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    dispatchEvent(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error en event listener legacy ${event}:`, error);
                }
            });
        }
        
        window.dispatchEvent(new CustomEvent(`preset-manager:${event}`, { detail: data }));
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-preset-action]')) {
                this.handleAction(e.target.dataset.presetAction, e.target);
            }
            
            // Handle preset selection
            if (e.target.matches('.mcp-load-preset')) {
                const presetName = e.target.getAttribute('data-preset-name');
                if (presetName) {
                    this.selectPreset(presetName);
                }
            }

            // Handle preset list item clicks
            const presetItem = e.target.closest('.preset-list-item');
            if (presetItem) {
                const presetName = presetItem.getAttribute('data-preset-name');
                if (presetName) {
                    this.selectPreset(presetName);
                }
            }
        });

        // Filtro de búsqueda de presets
        document.addEventListener('input', (e) => {
            if (e.target.id === 'preset-search-input') {
                this.filterPresetList(e.target.value);
            }
        });
    }

    setupPresetDataListener() {
        // Listen for presets loaded from the API
        if (window.ClientEventBus) {
            window.ClientEventBus.on('presets-loaded', (presets) => {
                console.log('[PresetManager] Received presets from API:', presets);
                this.updatePresetsFromAPI(presets);
            });
        }
        
        // Fallback: listen to document events
        document.addEventListener('presets-loaded', (e) => {
            console.log('[PresetManager] Received presets from document event:', e.detail);
            this.updatePresetsFromAPI(e.detail);
        });
    }

    updatePresetsFromAPI(presets) {
        if (!Array.isArray(presets)) {
            console.warn('[PresetManager] Invalid presets data received:', presets);
            return;
        }

        // Convert API presets to internal format
        this.state.presets = presets.map(preset => ({
            id: preset.name || `preset_${Date.now()}`,
            name: preset.name || 'Preset Sin Nombre',
            description: ``,
            mcpSelection: {},
            itemsCount: preset.itemsCount || {},
            createdAt: preset.createdAt || new Date().toISOString(),
            source: 'api'
        }));

        // Try to restore previously selected preset from localStorage first
        const savedActivePresetName = localStorage.getItem('activePreset');
        if (savedActivePresetName) {
            const savedPreset = this.state.presets.find(p => p.name === savedActivePresetName);
            if (savedPreset) {
                this.state.activePreset = savedPreset;
                console.log(`[PresetManager] Restored active preset from localStorage: ${savedActivePresetName}`);
            }
        }

        // Auto-select first preset if none is selected
        if (this.state.presets.length > 0 && !this.state.activePreset) {
            this.state.activePreset = this.state.presets[0];
            console.log(`[PresetManager] Auto-selected first preset: ${this.state.activePreset.name}`);
        }

        // Save current state to localStorage
        this.saveToStorage();

        // Trigger re-render and events
        this.dispatchEvent('presets-updated', { presets: this.state.presets });
        this.renderPresetsInUI();
        this.updatePresetDetails();
        
        if (this.state.activePreset) {
            this.updateActivePresetVisual(this.state.activePreset.name);
        }
    }

    async handleAction(action, element) {
        const presetId = element.dataset.presetId;
        
        switch (action) {
            case 'select':
                await this.selectPreset(presetId);
                break;
            case 'delete':
                if (confirm('¿Eliminar preset?')) {
                    await this.deletePreset(presetId);
                }
                break;
            case 'edit':
                this.dispatchEvent('preset-edit-requested', { presetId });
                break;
        }
    }

    // Almacenamiento local
    loadPresetsFromStorage() {
        try {
            // Use the same keys as PresetStorageManager for consistency
            const stored = localStorage.getItem('mcp-presets');
            if (stored) {
                this.state.presets = JSON.parse(stored);
            }
            
            // Use PresetStorageManager key for active preset
            const activePresetName = localStorage.getItem('activePreset');
            if (activePresetName) {
                this.state.activePreset = this.state.presets.find(p => p.name === activePresetName);
            }
            
            console.log('[PresetManager] Loaded from storage:', {
                presets: this.state.presets.length,
                activePreset: this.state.activePreset?.name
            });
        } catch (error) {
            console.error('Error cargando presets legacy:', error);
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('mcp-presets', JSON.stringify(this.state.presets));
            
            // Use PresetStorageManager key for active preset (save by name, not id)
            if (this.state.activePreset) {
                localStorage.setItem('activePreset', this.state.activePreset.name);
            } else {
                localStorage.removeItem('activePreset');
            }
            
            console.log('[PresetManager] Saved to storage:', {
                presets: this.state.presets.length,
                activePreset: this.state.activePreset?.name
            });
        } catch (error) {
            console.error('Error guardando presets legacy:', error);
        }
    }

    renderPresetsInUI() {
        // Instead of replacing existing structure, update it with new data
        console.log(`[PresetManager] Hydrating existing preset UI with ${this.state.presets.length} presets`);
        
        // Update existing preset list if it exists
        this.hydratePresetList();
        
        // Create mcp-load-preset buttons that mcp-selection-manager expects
        this.createMCPLoadPresetButtons();
    }

    createMCPLoadPresetButtons() {
        // The buttons are now created in the preset list itself
        // We just need to ensure mcp-selection-manager can find them
        const mcpButtons = document.querySelectorAll('.mcp-load-preset');
        console.log(`[PresetManager] Found ${mcpButtons.length} MCP preset buttons in DOM`);
        
        // Ensure buttons have the right event handling
        mcpButtons.forEach(btn => {
            // Remove any existing listeners to avoid duplicates
            btn.replaceWith(btn.cloneNode(true));
        });
        
        // Get the new buttons after cloning
        const newButtons = document.querySelectorAll('.mcp-load-preset');
        console.log(`[PresetManager] Refreshed ${newButtons.length} MCP preset buttons`);
    }

    hydratePresetList() {
        // Find the existing preset list container
        const presetListContainer = document.querySelector('.preset-list-container, #preset-list-container');
        if (!presetListContainer) {
            console.log('[PresetManager] No existing preset list container found - creating fallback');
            this.createFallbackPresetContainer();
            return;
        }

        // Find the actual list element
        const presetList = presetListContainer.querySelector('.preset-list, ul');
        if (!presetList) {
            console.log('[PresetManager] No preset list element found');
            return;
        }

        // Clear existing items but keep structure
        presetList.innerHTML = '';

        // Add new preset items
        this.state.presets.forEach(preset => {
            const listItem = this.createPresetListItem(preset);
            presetList.appendChild(listItem);
        });

        // Update header count if it exists
        const headerCount = presetListContainer.querySelector('.preset-count');
        if (headerCount) {
            headerCount.textContent = this.state.presets.length;
        }

        console.log(`[PresetManager] Hydrated preset list with ${this.state.presets.length} items`);
    }

    createPresetListItem(preset) {
        const li = document.createElement('li');
        li.className = 'preset-list-item';
        li.setAttribute('data-preset-name', preset.name);
        li.style.cssText = `
            display: flex;
            align-items: center;
            padding: 0.75rem;
            margin-bottom: 0.25rem;
            background: var(--background-primary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            transition: all 0.2s ease;
            cursor: pointer;
            min-height: auto;
        `;
        
        li.innerHTML = `
            <div class="preset-info" style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.125rem;">
                    <span class="preset-name" style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem;">
                        🔧${preset.itemsCount?.tools || 0} 📄${preset.itemsCount?.resources || 0} 💬${preset.itemsCount?.prompts || 0}> ${this.escapeHtml(preset.name)}
                    </span>
                </div>
            </div>
        `;

        // Add hover effects
        li.addEventListener('mouseenter', () => {
            if (!li.classList.contains('is-active')) {
                li.style.backgroundColor = 'var(--background-hover)';
                li.style.borderColor = 'var(--primary-color)';
                const actions = li.querySelector('.preset-actions');
                if (actions) actions.style.opacity = '1';
            }
        });

        li.addEventListener('mouseleave', () => {
            if (!li.classList.contains('is-active')) {
                li.style.backgroundColor = 'var(--background-primary)';
                li.style.borderColor = 'var(--border-color)';
                const actions = li.querySelector('.preset-actions');
                if (actions) actions.style.opacity = '0.7';
            }
        });

        return li;
    }

    createFallbackPresetContainer() {
        // Only create if no preset management section exists
        const presetSection = document.querySelector('.preset-management-section, [data-preset-container]');
        if (!presetSection) {
            console.log('[PresetManager] No preset section found - cannot create fallback');
            return;
        }

        // Find or create preset list container
        let container = presetSection.querySelector('.preset-list-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'preset-list-container';
            container.innerHTML = `
                <h3>📋 Mis Presets</h3>
                <ul class="preset-list"></ul>
            `;
            presetSection.appendChild(container);
        }

        // Now hydrate it
        this.hydratePresetList();
    }

    updatePresetDetails() {
        const detailsContainer = document.querySelector('.preset-details-container, #preset-details-container');
        if (!detailsContainer) {
            console.log('[PresetManager] No preset details container found');
            return;
        }

        const activePreset = this.state.activePreset;
        if (!activePreset) {
            detailsContainer.innerHTML = `
                <div class="empty-state" style="
                    text-align: center; 
                    padding: 3rem 2rem; 
                    color: var(--text-secondary);
                    background: var(--background-secondary);
                    border: 2px dashed var(--border-color);
                    border-radius: 8px;
                    ">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📋</div>
                    <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">Sin preset seleccionado</h4>
                    <p style="margin: 0; font-size: 0.9em;">Selecciona un preset de la lista para ver sus detalles y cargarlo</p>
                </div>
            `;
            return;
        }

        // Update preset details
        detailsContainer.innerHTML = `
            <div class="preset-details-header" style="margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
                <h3 class="preset-details-title" style="margin: 0 0 0.5rem 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                    📋 ${this.escapeHtml(activePreset.name)}
                </h3>
                <p class="preset-details-description" style="margin: 0; color: var(--text-secondary); font-style: italic;">
                    ${this.escapeHtml(activePreset.description || 'Sin descripción disponible')}
                </p>
                <div style="margin-top: 0.5rem; font-size: 0.9em; color: var(--text-secondary);">
                    <span>Creado: ${activePreset.createdAt ? new Date(activePreset.createdAt).toLocaleDateString('es-ES') : 'N/A'}</span>
                </div>
            </div>
            
            <div class="preset-details-stats" style="margin-bottom: 1.5rem;">
                <h4 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1em;">📊 Composición del Preset</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                    <div class="stat-item" style="background: var(--background-secondary); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);">
                        <div style="font-size: 1.2em; font-weight: bold; color: var(--primary-color);">${activePreset.itemsCount?.tools || 0}</div>
                        <div style="font-size: 0.9em; color: var(--text-secondary);">🔧 Herramientas</div>
                    </div>
                    <div class="stat-item" style="background: var(--background-secondary); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);">
                        <div style="font-size: 1.2em; font-weight: bold; color: var(--secondary-color);">${activePreset.itemsCount?.resources || 0}</div>
                        <div style="font-size: 0.9em; color: var(--text-secondary);">📄 Recursos</div>
                    </div>
                    <div class="stat-item" style="background: var(--background-secondary); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color);">
                        <div style="font-size: 1.2em; font-weight: bold; color: var(--accent-color);">${activePreset.itemsCount?.prompts || 0}</div>
                        <div style="font-size: 0.9em; color: var(--text-secondary);">💬 Prompts</div>
                    </div>
                    <div class="stat-item" style="background: var(--primary-color-light); padding: 0.75rem; border-radius: 6px; border: 2px solid var(--primary-color);">
                        <div style="font-size: 1.2em; font-weight: bold; color: var(--primary-color);">${activePreset.itemsCount?.total || 0}</div>
                        <div style="font-size: 0.9em; color: var(--text-primary);">📋 Total</div>
                    </div>
                </div>
            </div>

            <div class="preset-details-actions" style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <button class="btn btn-secondary" onclick="editPreset('${activePreset.name}')" style="flex: 1; min-width: 120px;">
                    ✏️ Editar
                </button>
                <button class="btn btn-outline-secondary" onclick="duplicatePreset('${activePreset.name}')" style="min-width: 120px;">
                    📋 Duplicar
                </button>
            </div>
        `;

        console.log(`[PresetManager] Updated preset details for: ${activePreset.name}`);
    }

    // Handle preset selection
    async selectPreset(presetName) {
        const preset = this.state.presets.find(p => p.name === presetName);
        if (!preset) {
            console.warn(`[PresetManager] Preset not found: ${presetName}`);
            return;
        }

        this.state.activePreset = preset;
        this.updatePresetDetails();
        this.updateActivePresetVisual(presetName);
        
        // Save to storage
        this.saveToStorage();

        console.log(`[PresetManager] Selected preset: ${presetName}`);
    }

    updateActivePresetVisual(activePresetName) {
        // Update visual indication of active preset
        const allItems = document.querySelectorAll('.preset-list-item');
        allItems.forEach(item => {
            const isActive = item.getAttribute('data-preset-name') === activePresetName;
            item.classList.toggle('is-active', isActive);
            
            if (isActive) {
                item.style.backgroundColor = 'var(--primary-color-light)';
                item.style.borderColor = 'var(--primary-color)';
                item.style.borderWidth = '2px';
                item.style.transform = 'translateY(0)';
                item.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2), 0 0 0 1px var(--primary-color)';
            } else {
                item.style.backgroundColor = 'var(--background-primary)';
                item.style.borderColor = 'var(--border-color)';
                item.style.borderWidth = '1px';
                item.style.transform = 'translateY(0)';
                item.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }
        });
    }

    // Renderizado fallback
    renderPresetListFallback(container, options = {}) {
        if (!container) return;
        
        const presets = this.state.presets;
        const activePreset = this.state.activePreset;
        
        container.innerHTML = `
            <div class="preset-list-fallback">
                <div class="preset-list-header">
                    <h3>Mis Presets</h3>
                    <button class="btn btn-primary" onclick="presetManager.dispatchEvent('create-preset-requested', {})">
                        + Nuevo Preset
                    </button>
                </div>
                <div class="preset-items">
                    ${presets.length === 0 ? 
                        '<p class="empty-state">No hay presets. Crea tu primer preset para empezar.</p>' :
                        presets.map(preset => `
                            <div class="preset-item ${preset.id === activePreset?.id ? 'active' : ''}">
                                <div class="preset-info">
                                    <h4>${this.escapeHtml(preset.name)}</h4>
                                    <p>${this.escapeHtml(preset.description || '')}</p>
                                </div>
                                <div class="preset-actions">
                                    <button data-preset-action="select" data-preset-id="${preset.id}" class="btn btn-sm">
                                        Usar
                                    </button>
                                    <button data-preset-action="edit" data-preset-id="${preset.id}" class="btn btn-sm">
                                        Editar
                                    </button>
                                    <button data-preset-action="delete" data-preset-id="${preset.id}" class="btn btn-sm btn-danger">
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
    }

    renderPresetDetailsFallback(container, preset, options = {}) {
        if (!container || !preset) return;
        
        const context = preset.mcpSelection || {};
        const itemCount = Object.values(context).flat().length;
        
        container.innerHTML = `
            <div class="preset-details-fallback">
                <h3>${this.escapeHtml(preset.name)}</h3>
                <p>${this.escapeHtml(preset.description || '')}</p>
                <div class="context-summary">
                    <strong>Elementos seleccionados: ${itemCount}</strong>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Métodos adicionales
    async refresh() {
        console.log('[PresetManager] Starting refresh...');
        
        if (this.isNewArchitecture) {
            await this.store.loadPresets();
        } else {
            // Check if we need to refresh from server instead of localStorage
            const needsServerRefresh = sessionStorage.getItem('mcp-presets-need-refresh');
            
            if (needsServerRefresh === 'true') {
                console.log('[PresetManager] Refreshing from server due to stale data...');
                sessionStorage.removeItem('mcp-presets-need-refresh');
                
                try {
                    // Fetch fresh data from server
                    const response = await fetch('/api/presets');
                    if (response.ok) {
                        const serverPresets = await response.json();
                        console.log('[PresetManager] Loaded fresh presets from server:', serverPresets.length);
                        
                        // Update internal state with server data
                        this.state.presets = serverPresets.map(preset => ({
                            name: preset.name,
                            items: preset.items || [],
                            description: preset.description || '',
                            timestamp: preset.timestamp || Date.now()
                        }));
                        
                        // Update localStorage with fresh data
                        this.saveToStorage();
                        
                        console.log('[PresetManager] State updated with server data:', this.state.presets.length);
                        
                        // Re-render UI with fresh data
                        this.renderPresetsInUI();
                        
                    } else {
                        console.warn('[PresetManager] Failed to fetch from server, falling back to localStorage');
                        this.loadPresetsFromStorage();
                    }
                } catch (error) {
                    console.error('[PresetManager] Error fetching from server:', error);
                    this.loadPresetsFromStorage();
                }
            } else {
                console.log('[PresetManager] Using localStorage data');
                this.loadPresetsFromStorage();
                this.renderPresetsInUI();
            }
            
            this.dispatchEvent('presets-refreshed', {});
        }
    }

    getStats() {
        const presets = this.isNewArchitecture ? this.store.getState().presets : this.state.presets;
        return {
            totalPresets: presets.length,
            activePreset: this.getActivePreset(),
            hasSelection: !!this.getActivePreset()
        };
    }

    /**
     * Filtra la lista de presets en tiempo real
     * @param {string} searchTerm - Término de búsqueda
     */
    filterPresetList(searchTerm) {
        const presetItems = document.querySelectorAll('.preset-list-item');
        const searchLower = searchTerm.toLowerCase().trim();
        
        let visibleCount = 0;
        
        presetItems.forEach(item => {
            const presetName = item.querySelector('.preset-name')?.textContent || '';
            const presetDesc = item.querySelector('.preset-description')?.textContent || '';
            
            const matchesSearch = searchLower === '' || 
                presetName.toLowerCase().includes(searchLower) ||
                presetDesc.toLowerCase().includes(searchLower);
            
            if (matchesSearch) {
                item.style.display = 'flex';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });
        
        // Actualizar contador en el header si existe
        const headerTitle = document.querySelector('.preset-list-container h3');
        if (headerTitle) {
            const totalPresets = presetItems.length;
            if (searchLower === '') {
                headerTitle.innerHTML = `💾 Mis Presets (${totalPresets})`;
            } else {
                headerTitle.innerHTML = `💾 Mis Presets (${visibleCount}/${totalPresets})`;
            }
        }
    }
}

// Inicialización global
let presetManager = null;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPresetManager);
} else {
    initPresetManager();
}

async function initPresetManager() {
    if (!presetManager) {
        presetManager = new PresetManager();
        await presetManager.init();
        window.presetManager = presetManager;
        console.log('[PresetManager] Inicializado como:', presetManager.isNewArchitecture ? 'Arquitectura Moderna' : 'Modo Fallback');
        
        // Expose global functions for onclick handlers
        window.editPreset = async function(presetName) {
            try {
                console.log('[PresetManager] Redirecting to edit preset:', presetName);
                window.location.href = `/explorer?edit=${encodeURIComponent(presetName)}`;
            } catch (error) {
                console.error('[PresetManager] Error editing preset:', error);
                if (window.ToastManager) {
                    window.ToastManager.showError(`Error al editar preset: ${error.message}`);
                }
            }
        };
        
        window.duplicatePreset = async function(presetName) {
            try {
                console.log('[PresetManager] Redirecting to duplicate preset:', presetName);
                window.location.href = `/explorer?duplicate=${encodeURIComponent(presetName)}`;
            } catch (error) {
                console.error('[PresetManager] Error duplicating preset:', error);
                if (window.ToastManager) {
                    window.ToastManager.showError(`Error al duplicar preset: ${error.message}`);
                }
            }
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PresetManager, presetManager };
}