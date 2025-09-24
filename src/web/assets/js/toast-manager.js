/**
 * Toast Notification System
 * Sistema de notificaciones para feedback de usuario
 */
class ToastManager {
    static container = null;

    /**
     * Initialize toast container
     */
    static init() {
        this.createContainer();
    }

    /**
     * Create toast container if it doesn't exist
     */
    static createContainer() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    }

    /**
     * Show success toast
     */
    static showSuccess(message, duration = 4000) {
        this.showToast(message, 'success', duration);
    }

    /**
     * Show error toast
     */
    static showError(message, duration = 6000) {
        this.showToast(message, 'error', duration);
    }

    /**
     * Show info toast
     */
    static showInfo(message, duration = 4000) {
        this.showToast(message, 'info', duration);
    }

    /**
     * Show warning toast
     */
    static showWarning(message, duration = 5000) {
        this.showToast(message, 'warning', duration);
    }

    /**
     * Show toast with specified type
     */
    static showToast(message, type = 'info', duration = 4000) {
        this.createContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const colors = {
            success: { bg: '#4caf50', icon: '✅' },
            error: { bg: '#f44336', icon: '❌' },
            warning: { bg: '#ff9800', icon: '⚠️' },
            info: { bg: '#2196f3', icon: 'ℹ️' }
        };

        const color = colors[type] || colors.info;

        toast.style.cssText = `
            background: ${color.bg};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            margin-bottom: 0.5rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
            max-width: 400px;
            word-wrap: break-word;
            display: flex;
            align-items: center;
            font-weight: 500;
        `;

        toast.innerHTML = `
            <span style="margin-right: 0.5rem; font-size: 1.1em;">${color.icon}</span>
            <span>${message}</span>
            <button style="
                background: none;
                border: none;
                color: white;
                margin-left: auto;
                padding: 0;
                cursor: pointer;
                font-size: 1.2em;
                opacity: 0.7;
                transition: opacity 0.2s ease;
            " onclick="this.parentElement.remove()">×</button>
        `;

        // Add click to dismiss
        toast.addEventListener('click', () => {
            this.removeToast(toast);
        });

        this.container.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);

        // Auto remove
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
    }

    /**
     * Remove toast with animation
     */
    static removeToast(toast) {
        if (!toast || !toast.parentElement) return;

        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Clear all toasts
     */
    static clearAll() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ToastManager.init();
});

// Make globally available
window.ToastManager = ToastManager;