/**
 * preset-architecture-init.js - Inicialización de la nueva arquitectura de presets
 * Este script debe incluirse ANTES que los componentes legacy para asegurar 
 * que los servicios estén disponibles cuando se necesiten
 */

(function() {
    'use strict';

    // Client-side API service for presets
    class ClientPresetService {
        static async fetchPresets() {
            try {
                const response = await fetch('/api/presets');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                
                // Handle both direct array and object with presets property
                if (Array.isArray(data)) {
                    return data;
                } else if (data && Array.isArray(data.presets)) {
                    return data.presets;
                } else {
                    console.warn('Unexpected presets response format:', data);
                    return [];
                }
            } catch (error) {
                console.error('Failed to fetch presets:', error);
                return [];
            }
        }

        static async createPreset(name, description, items) {
            try {
                const response = await fetch('/api/presets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, description, items })
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('Failed to create preset:', error);
                return { success: false, error: error.message };
            }
        }
    }

    // Client-side event bus (simplified)
    class ClientEventBus {
        constructor() {
            this.listeners = new Map();
        }

        on(event, callback) {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, []);
            }
            this.listeners.get(event).push(callback);
        }

        emit(event, data) {
            if (this.listeners.has(event)) {
                this.listeners.get(event).forEach(callback => callback(data));
            }
        }
    }

    // Initialize client-side services
    function initializeArchitecture() {
        console.log('🚀 Initializing client preset architecture...');
        
        try {
            // Make services globally available
            window.ClientPresetService = ClientPresetService;
            window.ClientEventBus = new ClientEventBus();
            
            console.log('✅ Client preset architecture initialized');
            
            // Emit ready event
            document.dispatchEvent(new CustomEvent('preset-architecture-ready', {
                detail: { 
                    timestamp: Date.now(),
                    services: ['ClientPresetService', 'ClientEventBus']
                }
            }));
            
        } catch (error) {
            console.error('❌ Failed to initialize preset architecture:', error);
            
            // Emit error event
            document.dispatchEvent(new CustomEvent('preset-architecture-error', {
                detail: { error: error.message }
            }));
        }
    }

    // Initialize preset functionality after architecture is ready
    document.addEventListener('preset-architecture-ready', () => {
        console.log('🎯 Preset architecture ready - initializing client features');
        
        // Test API connectivity
        window.ClientPresetService.fetchPresets().then(presets => {
            // fetchPresets now returns an array directly
            console.log(`📋 Found ${presets.length} presets available`);
            window.ClientEventBus.emit('presets-loaded', presets);
            
            // Also emit as DOM event for fallback mode
            document.dispatchEvent(new CustomEvent('presets-loaded', {
                detail: presets
            }));
        });
    });

    // Función para verificar compatibilidad
    function checkCompatibility() {
        const required = [
            'fetch', 'Promise', 'CustomEvent', 'localStorage', 'sessionStorage'
        ];
        
        const missing = required.filter(feature => typeof window[feature] === 'undefined');
        
        if (missing.length > 0) {
            console.warn('⚠️ Missing browser features for preset architecture:', missing);
            return false;
        }
        
        return true;
    }

    // Auto-ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (checkCompatibility()) {
                initializeArchitecture();
            }
        });
    } else {
        if (checkCompatibility()) {
            initializeArchitecture();
        }
    }

    // Simplified preset manager for basic operations
    window.createPresetManager = function(containerId, options = {}) {
        return {
            loadPresets: () => window.ClientPresetService.fetchPresets(),
            createPreset: (name, description, items) => window.ClientPresetService.createPreset(name, description, items),
            containerId: containerId,
            options: options
        };
    };

    // Funciones de utilidad para compatibilidad
    window.PresetArchitecture = {
        isReady: () => typeof window.ClientPresetService !== 'undefined',
        
        waitForReady: () => new Promise((resolve) => {
            if (window.PresetArchitecture.isReady()) {
                resolve();
            } else {
                document.addEventListener('preset-architecture-ready', resolve, { once: true });
            }
        }),
        
        getService: () => window.ClientPresetService,
        getEventBus: () => window.ClientEventBus
    };

})();