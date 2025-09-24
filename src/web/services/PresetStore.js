/**
 * PresetStore - Gestión centralizada de estado para presets
 * Implementa patrón Observer para notificación de cambios
 */
class PresetStore {
    constructor(initialState = {}) {
        this.state = {
            presets: [],
            activePreset: null,
            selectedItems: [],
            isLoading: false,
            isEditing: false,
            error: null,
            loadingPresetName: null,
            ...initialState
        };
        
        this.listeners = new Set();
        this.storage = new PresetStorageManager();
    }

    /**
     * Obtener el estado completo
     * @returns {Object} Estado actual
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Suscribirse a cambios de estado
     * @param {Function} listener - Función que se ejecuta en cada cambio
     * @returns {Function} Función para desuscribirse
     */
    subscribe(listener) {
        this.listeners.add(listener);
        
        // Devolver función de desuscripción
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Actualizar estado y notificar listeners
     * @param {Object|Function} updater - Objeto de actualización o función que recibe estado actual
     */
    setState(updater) {
        const prevState = this.state;
        
        if (typeof updater === 'function') {
            this.state = { ...this.state, ...updater(this.state) };
        } else {
            this.state = { ...this.state, ...updater };
        }

        // Solo notificar si el estado realmente cambió
        if (this.state !== prevState) {
            this.notifyListeners();
        }
    }

    /**
     * Notificar a todos los listeners del cambio de estado
     */
    notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener(this.state);
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        });
    }

    /**
     * Acciones del store
     */

    async loadPresets() {
        this.setState({ isLoading: true, error: null });
        
        try {
            const presets = await PresetDataService.fetchPresets();
            this.setState({ 
                presets, 
                isLoading: false 
            });

            // Restaurar preset activo desde localStorage
            this.restoreActivePreset();
        } catch (error) {
            this.setState({ 
                error: error.message, 
                isLoading: false,
                presets: []
            });
        }
    }

    async selectPreset(presetName) {
        // Evitar selecciones duplicadas
        if (this.state.loadingPresetName === presetName) {
            return;
        }

        // Si ya está seleccionado, solo actualizar UI
        if (this.state.activePreset && this.state.activePreset.name === presetName) {
            this.storage.setActivePreset(presetName);
            return;
        }

        this.setState({ 
            loadingPresetName: presetName,
            error: null
        });

        try {
            const preset = await PresetDataService.fetchPreset(presetName);
            
            this.setState({
                activePreset: preset,
                selectedItems: preset.selectedItems || [],
                loadingPresetName: null
            });

            // Persistir selección
            this.storage.setActivePreset(presetName);

        } catch (error) {
            this.setState({
                error: `Error al cargar preset: ${error.message}`,
                loadingPresetName: null
            });
        }
    }

    async createPreset(presetData) {
        this.setState({ isLoading: true, error: null });

        try {
            const validatedData = PresetDataService.validatePresetData(presetData);
            const newPreset = await PresetDataService.createPreset(validatedData);
            
            // Agregar a la lista local
            const updatedPresets = [...this.state.presets, newPreset];
            
            this.setState({
                presets: updatedPresets,
                activePreset: newPreset,
                isLoading: false,
                isEditing: false
            });

            return newPreset;
        } catch (error) {
            this.setState({
                error: `Error al crear preset: ${error.message}`,
                isLoading: false
            });
            throw error;
        }
    }

    async updatePreset(presetName, presetData) {
        this.setState({ isLoading: true, error: null });

        try {
            const validatedData = PresetDataService.validatePresetData(presetData);
            const updatedPreset = await PresetDataService.updatePreset(presetName, validatedData);
            
            // Actualizar en la lista local
            const updatedPresets = this.state.presets.map(preset =>
                preset.name === presetName ? updatedPreset : preset
            );
            
            this.setState({
                presets: updatedPresets,
                activePreset: updatedPreset,
                isLoading: false,
                isEditing: false
            });

            return updatedPreset;
        } catch (error) {
            this.setState({
                error: `Error al actualizar preset: ${error.message}`,
                isLoading: false
            });
            throw error;
        }
    }

    async deletePreset(presetName) {
        this.setState({ isLoading: true, error: null });

        try {
            await PresetDataService.deletePreset(presetName);
            
            // Remover de la lista local
            const updatedPresets = this.state.presets.filter(preset => preset.name !== presetName);
            
            // Si era el preset activo, limpiarlo
            const newActivePreset = this.state.activePreset && this.state.activePreset.name === presetName 
                ? null 
                : this.state.activePreset;

            this.setState({
                presets: updatedPresets,
                activePreset: newActivePreset,
                isLoading: false
            });

            if (newActivePreset === null) {
                this.storage.clearActivePreset();
            }

        } catch (error) {
            this.setState({
                error: `Error al eliminar preset: ${error.message}`,
                isLoading: false
            });
            throw error;
        }
    }

    updateSelectedItems(items) {
        this.setState({ selectedItems: items });
    }

    setEditing(isEditing, preset = null) {
        this.setState({ 
            isEditing, 
            activePreset: preset || this.state.activePreset 
        });
    }

    clearError() {
        this.setState({ error: null });
    }

    restoreActivePreset() {
        const savedPresetName = this.storage.getActivePreset();
        if (savedPresetName && this.state.presets.length > 0) {
            const preset = this.state.presets.find(p => p.name === savedPresetName);
            if (preset) {
                // No llamar selectPreset para evitar otra carga de API
                this.setState({ activePreset: preset });
            }
        }
    }
}

/**
 * Gestión de persistencia en localStorage
 */
class PresetStorageManager {
    static KEYS = {
        ACTIVE_PRESET: 'activePreset',
        SELECTED_PRESET_SESSION: 'selectedPreset' // Para sesión AI
    };

    setActivePreset(presetName) {
        try {
            localStorage.setItem(PresetStorageManager.KEYS.ACTIVE_PRESET, String(presetName));
        } catch (error) {
            console.warn('Failed to save active preset to localStorage:', error);
        }
    }

    getActivePreset() {
        try {
            return localStorage.getItem(PresetStorageManager.KEYS.ACTIVE_PRESET);
        } catch (error) {
            console.warn('Failed to read active preset from localStorage:', error);
            return null;
        }
    }

    clearActivePreset() {
        try {
            localStorage.removeItem(PresetStorageManager.KEYS.ACTIVE_PRESET);
        } catch (error) {
            console.warn('Failed to clear active preset from localStorage:', error);
        }
    }

    setSelectedPresetForSession(presetName) {
        try {
            sessionStorage.setItem(PresetStorageManager.KEYS.SELECTED_PRESET_SESSION, presetName);
        } catch (error) {
            console.warn('Failed to save selected preset to sessionStorage:', error);
        }
    }

    getSelectedPresetForSession() {
        try {
            return sessionStorage.getItem(PresetStorageManager.KEYS.SELECTED_PRESET_SESSION);
        } catch (error) {
            console.warn('Failed to read selected preset from sessionStorage:', error);
            return null;
        }
    }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PresetStore, PresetStorageManager };
} else if (typeof window !== 'undefined') {
    window.PresetStore = PresetStore;
    window.PresetStorageManager = PresetStorageManager;
}