/**
 * EventBus - Sistema centralizado de eventos para coordinar comunicación entre componentes
 * Implementa patrón Observer/Publisher-Subscriber
 */
class EventBus {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
        this.debugMode = false;
    }

    /**
     * Suscribirse a un evento
     * @param {string} event - Nombre del evento
     * @param {Function} callback - Función callback
     * @returns {Function} Función para desuscribirse
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        this.listeners.get(event).add(callback);
        
        if (this.debugMode) {
            console.log(`🔔 EventBus: Subscribed to '${event}' (${this.listeners.get(event).size} listeners)`);
        }

        // Devolver función de desuscripción
        return () => this.off(event, callback);
    }

    /**
     * Suscribirse a un evento que se ejecuta solo una vez
     * @param {string} event - Nombre del evento
     * @param {Function} callback - Función callback
     * @returns {Function} Función para desuscribirse
     */
    once(event, callback) {
        const onceWrapper = (...args) => {
            this.off(event, onceWrapper);
            callback(...args);
        };

        return this.on(event, onceWrapper);
    }

    /**
     * Desuscribirse de un evento
     * @param {string} event - Nombre del evento
     * @param {Function} callback - Función callback a remover
     */
    off(event, callback) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.delete(callback);
            
            if (eventListeners.size === 0) {
                this.listeners.delete(event);
            }
            
            if (this.debugMode) {
                console.log(`🔕 EventBus: Unsubscribed from '${event}' (${eventListeners.size} listeners remaining)`);
            }
        }
    }

    /**
     * Emitir un evento
     * @param {string} event - Nombre del evento
     * @param {*} data - Datos a enviar
     * @returns {number} Número de listeners notificados
     */
    emit(event, data) {
        const eventListeners = this.listeners.get(event);
        let notifiedCount = 0;

        if (eventListeners) {
            // Crear copia para evitar problemas si listeners se modifican durante emisión
            const listenersCopy = Array.from(eventListeners);
            
            for (const callback of listenersCopy) {
                try {
                    callback(data, event);
                    notifiedCount++;
                } catch (error) {
                    console.error(`❌ EventBus: Error in listener for '${event}':`, error);
                }
            }
        }

        if (this.debugMode) {
            console.log(`📤 EventBus: Emitted '${event}' to ${notifiedCount} listeners`, data);
        }

        return notifiedCount;
    }

    /**
     * Emitir evento personalizado del DOM (para compatibilidad)
     * @param {string} event - Nombre del evento
     * @param {*} detail - Datos del evento
     * @returns {boolean} Si el evento fue despachado exitosamente
     */
    emitDOM(event, detail) {
        try {
            const customEvent = new CustomEvent(event, { 
                detail,
                bubbles: true,
                cancelable: true
            });
            
            document.dispatchEvent(customEvent);
            
            if (this.debugMode) {
                console.log(`📤 EventBus: Emitted DOM event '${event}'`, detail);
            }
            
            return true;
        } catch (error) {
            console.error(`❌ EventBus: Error emitting DOM event '${event}':`, error);
            return false;
        }
    }

    /**
     * Remover todos los listeners de un evento
     * @param {string} event - Nombre del evento
     */
    removeAllListeners(event) {
        if (event) {
            this.listeners.delete(event);
            if (this.debugMode) {
                console.log(`🧹 EventBus: Removed all listeners for '${event}'`);
            }
        } else {
            this.listeners.clear();
            if (this.debugMode) {
                console.log('🧹 EventBus: Removed all listeners');
            }
        }
    }

    /**
     * Obtener lista de eventos activos
     * @returns {Array<string>} Lista de nombres de eventos
     */
    getActiveEvents() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Obtener número de listeners para un evento
     * @param {string} event - Nombre del evento
     * @returns {number} Número de listeners
     */
    getListenerCount(event) {
        const eventListeners = this.listeners.get(event);
        return eventListeners ? eventListeners.size : 0;
    }

    /**
     * Habilitar/deshabilitar modo debug
     * @param {boolean} enabled - Si habilitar debug
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`🐛 EventBus: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Crear un namespace aislado para eventos
     * @param {string} namespace - Namespace
     * @returns {Object} Objeto con métodos namespaced
     */
    namespace(namespace) {
        const prefixEvent = (event) => `${namespace}:${event}`;
        
        return {
            on: (event, callback) => this.on(prefixEvent(event), callback),
            once: (event, callback) => this.once(prefixEvent(event), callback),
            off: (event, callback) => this.off(prefixEvent(event), callback),
            emit: (event, data) => this.emit(prefixEvent(event), data),
            emitDOM: (event, detail) => this.emitDOM(prefixEvent(event), detail)
        };
    }
}

/**
 * Constantes de eventos para evitar typos y mantener consistencia
 */
const PRESET_EVENTS = {
    // Eventos de selección
    PRESET_SELECTED: 'preset:selected',
    PRESET_DESELECTED: 'preset:deselected',
    
    // Eventos CRUD
    PRESET_CREATED: 'preset:created',
    PRESET_UPDATED: 'preset:updated',
    PRESET_DELETED: 'preset:deleted',
    PRESET_DUPLICATED: 'preset:duplicated',
    
    // Eventos de carga
    PRESETS_LOADING: 'presets:loading',
    PRESETS_LOADED: 'presets:loaded',
    PRESETS_ERROR: 'presets:error',
    
    // Eventos de edición
    PRESET_EDIT_START: 'preset:edit-start',
    PRESET_EDIT_CANCEL: 'preset:edit-cancel',
    PRESET_EDIT_SAVE: 'preset:edit-save',
    
    // Eventos de uso
    PRESET_USE: 'preset:use',
    PRESET_CONTEXT_SYNC: 'preset:context-sync'
};

const MCP_EVENTS = {
    SELECTION_CHANGED: 'mcp:selection-changed',
    ITEM_SELECTED: 'mcp:item-selected',
    ITEM_DESELECTED: 'mcp:item-deselected',
    CONTEXT_UPDATED: 'mcp:context-updated'
};

const UI_EVENTS = {
    FORM_SHOW: 'ui:form-show',
    FORM_HIDE: 'ui:form-hide',
    MODAL_OPEN: 'ui:modal-open',
    MODAL_CLOSE: 'ui:modal-close',
    TOAST_SHOW: 'ui:toast-show'
};

/**
 * Instancia global del EventBus
 */
const globalEventBus = new EventBus();

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        EventBus, 
        PRESET_EVENTS, 
        MCP_EVENTS, 
        UI_EVENTS,
        globalEventBus
    };
} else if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
    window.PRESET_EVENTS = PRESET_EVENTS;
    window.MCP_EVENTS = MCP_EVENTS;
    window.UI_EVENTS = UI_EVENTS;
    window.globalEventBus = globalEventBus;
}