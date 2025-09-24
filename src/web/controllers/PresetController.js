/**
 * PresetController - Coordinador entre componentes y la arquitectura de presets
 * Maneja hidratación, eventos y sincronización entre SSR y CSR
 */
class PresetController {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            mode: 'catalog', // 'catalog' | 'ai'
            showActions: true,
            ...options
        };
        
        this.container = null;
        this.store = null;
        this.eventBus = null;
        this.unsubscribers = [];
        
        this.init();
    }

    /**
     * Inicializar el manager
     */
    async init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error(`PresetController: Container '${this.containerId}' not found`);
            return;
        }

        // Crear instancias de servicios
        this.store = new PresetStore();
        this.eventBus = globalEventBus.namespace('preset-component');
        
        // Configurar listeners
        this.setupEventListeners();
        this.setupStoreSubscription();
        
        // Hidratar componente si hay contenido SSR
        this.hydrateComponent();
        
        // Cargar datos iniciales
        await this.store.loadPresets();
    }

    /**
     * Configurar listeners de eventos
     */
    setupEventListeners() {
        // Delegación de eventos en el container
        this.container.addEventListener('click', (e) => {
            this.handleContainerClick(e);
        });

        // Eventos del EventBus
        this.unsubscribers.push(
            this.eventBus.on('mcp-selection-changed', (data) => {
                this.store.updateSelectedItems(data.selectedItems || []);
            })
        );

        // Eventos DOM para compatibilidad
        document.addEventListener('mcp-selection-changed', (e) => {
            this.store.updateSelectedItems(e.detail.selectedItems || []);
        });

        document.addEventListener('preset-selected', (e) => {
            const presetName = e?.detail?.presetName;
            if (presetName && this.store.getState().activePreset?.name !== presetName) {
                this.store.selectPreset(presetName);
            }
        });
    }

    /**
     * Configurar suscripción al store
     */
    setupStoreSubscription() {
        this.unsubscribers.push(
            this.store.subscribe((state) => {
                this.render(state);
            })
        );
    }

    /**
     * Hidratar componente existente
     */
    hydrateComponent() {
        // Verificar si hay contenido SSR existente
        const existingList = this.container.querySelector('.preset-list-container');
        const existingDetails = this.container.querySelector('.preset-details-container');
        
        if (existingList || existingDetails) {
            console.log('🔄 Hydrating existing preset components');
            
            // Extraer estado del DOM existente si es posible
            const activeItem = this.container.querySelector('.preset-list-item.is-active');
            if (activeItem) {
                const presetName = activeItem.dataset.presetName;
                if (presetName) {
                    // Marcar como activo en el store cuando se carguen los presets
                    this.store.subscribe((state) => {
                        if (state.presets.length > 0 && !state.activePreset) {
                            const preset = state.presets.find(p => p.name === presetName);
                            if (preset) {
                                this.store.setState({ activePreset: preset });
                            }
                        }
                    });
                }
            }
        }
    }

    /**
     * Manejar clicks en el container
     */
    handleContainerClick(e) {
        const button = e.target.closest('[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const presetName = button.dataset.presetName;

        e.preventDefault();
        e.stopPropagation();

        this.handleAction(action, presetName, button);
    }

    /**
     * Manejar acciones de los botones
     */
    async handleAction(action, presetName, element) {
        try {
            switch (action) {
                case 'select':
                    if (presetName) {
                        await this.store.selectPreset(presetName);
                        this.emitPresetSelected(presetName);
                    }
                    break;

                case 'create':
                    this.showCreateForm();
                    break;

                case 'edit':
                    if (presetName) {
                        await this.editPreset(presetName);
                    }
                    break;

                case 'duplicate':
                    if (presetName) {
                        await this.duplicatePreset(presetName);
                    }
                    break;

                case 'delete':
                    if (presetName) {
                        await this.deletePreset(presetName);
                    }
                    break;

                case 'use':
                    if (presetName) {
                        this.usePreset(presetName);
                    }
                    break;

                default:
                    console.warn(`Unknown action: ${action}`);
            }
        } catch (error) {
            console.error(`Error handling action ${action}:`, error);
            this.showError(`Error: ${error.message}`);
        }
    }

    /**
     * Renderizar componentes
     */
    render(state) {
        if (!this.container) return;

        const handlers = {
            onSelect: (presetName) => this.handleAction('select', presetName),
            onCreate: () => this.handleAction('create'),
            onEdit: (presetName) => this.handleAction('edit', presetName),
            onDuplicate: (presetName) => this.handleAction('duplicate', presetName),
            onDelete: (presetName) => this.handleAction('delete', presetName),
            onUse: this.options.mode === 'ai' ? null : (presetName) => this.handleAction('use', presetName)
        };

        // Renderizar lista
        const listContainer = this.container.querySelector('.preset-list-section') || this.container;
        if (listContainer) {
            const listElement = window.PresetListComponents.renderPresetList(
                state.presets,
                state,
                handlers,
                this.options
            );
            
            this.replaceContent(listContainer.querySelector('.preset-list-container') || listContainer, listElement);
        }

        // Renderizar detalles si hay contenedor específico
        const detailsContainer = this.container.querySelector('.preset-details-section');
        if (detailsContainer) {
            const detailsElement = window.PresetDetailsComponents.renderPresetDetails(
                state.activePreset,
                state,
                handlers,
                this.options
            );
            
            this.replaceContent(detailsContainer.querySelector('.preset-details-container') || detailsContainer, detailsElement);
        }
    }

    /**
     * Reemplazar contenido manteniendo referencias
     */
    replaceContent(container, newElement) {
        if (!container || !newElement) return;

        // Convertir hyperaxe a DOM
        const newDomElement = this.hyperaxeToDOM(newElement);
        
        // Reemplazar contenido
        if (container.tagName === newDomElement.tagName && container.id === newDomElement.id) {
            // Reemplazar contenido interno manteniendo el container
            container.className = newDomElement.className;
            container.innerHTML = newDomElement.innerHTML;
            
            // Copiar atributos
            Array.from(newDomElement.attributes).forEach(attr => {
                if (attr.name !== 'id') {
                    container.setAttribute(attr.name, attr.value);
                }
            });
        } else {
            // Reemplazar el elemento completo
            container.replaceWith(newDomElement);
        }
    }

    /**
     * Convertir hyperaxe object a DOM element
     */
    hyperaxeToDOM(hyperaxeObj) {
        if (typeof hyperaxeObj === 'string') {
            return document.createTextNode(hyperaxeObj);
        }

        if (!hyperaxeObj || typeof hyperaxeObj !== 'object') {
            return document.createTextNode(String(hyperaxeObj || ''));
        }

        const { tagName, attributes = {}, children = [] } = hyperaxeObj;
        const element = document.createElement(tagName);

        // Establecer atributos
        Object.entries(attributes).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                element.setAttribute(key, String(value));
            }
        });

        // Agregar children
        children.forEach(child => {
            if (child) {
                element.appendChild(this.hyperaxeToDOM(child));
            }
        });

        return element;
    }

    /**
     * Métodos de acción específicos
     */
    async editPreset(presetName) {
        const preset = await PresetDataService.fetchPreset(presetName);
        this.store.setEditing(true, preset);
        
        // Emitir evento para mostrar formulario
        this.eventBus.emit('form-show', { preset, isEditing: true });
        globalEventBus.emitDOM('preset-edit-start', { presetName, preset });
    }

    async duplicatePreset(presetName) {
        const preset = await PresetDataService.fetchPreset(presetName);
        const duplicatedPreset = {
            ...preset,
            name: `${preset.name} (Copia)`,
            id: null
        };
        
        this.store.setEditing(false, duplicatedPreset);
        this.eventBus.emit('form-show', { preset: duplicatedPreset, isEditing: false });
    }

    async deletePreset(presetName) {
        if (!confirm(`¿Estás seguro de que quieres eliminar el preset "${presetName}"?`)) {
            return;
        }

        await this.store.deletePreset(presetName);
        this.showSuccess(`Preset "${presetName}" eliminado correctamente`);
    }

    usePreset(presetName) {
        const storage = new PresetStorageManager();
        storage.setSelectedPresetForSession(presetName);
        storage.setActivePreset(presetName);
        
        globalEventBus.emitDOM('preset-use', { presetName });
        window.location.href = '/ai';
    }

    showCreateForm() {
        this.store.setEditing(false, null);
        this.eventBus.emit('form-show', { preset: null, isEditing: false });
        globalEventBus.emitDOM('preset-create-start', {});
    }

    emitPresetSelected(presetName) {
        globalEventBus.emitDOM('preset-selected', { presetName });
        this.eventBus.emit('preset-selected', { presetName });
    }

    showSuccess(message) {
        globalEventBus.emitDOM('toast-show', { type: 'success', message });
    }

    showError(message) {
        globalEventBus.emitDOM('toast-show', { type: 'error', message });
    }

    /**
     * Cleanup
     */
    destroy() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
        
        if (this.container) {
            this.container.removeEventListener('click', this.handleContainerClick);
        }
    }
}

// Factory function para crear controllers
function createPresetController(containerId, options = {}) {
    return new PresetController(containerId, options);
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PresetController, createPresetController };
} else if (typeof window !== 'undefined') {
    window.PresetController = PresetController;
    window.createPresetController = createPresetController;
}