/**
 * AI Form Enhancements
 * Provides keyboard shortcuts and improved UX for AI chat
 */

(function() {
    'use strict';
    
    /**
     * Initialize AI form enhancements
     */
    function initAIFormEnhancements() {
        addKeyboardShortcuts();
        addFormValidation();
        addAutoResize();
    }
    
    /**
     * Add keyboard shortcuts (Ctrl+Enter to submit)
     */
    function addKeyboardShortcuts() {
        const textarea = document.getElementById('ai-input');
        const form = document.querySelector('.ai-input-form');
        
        if (!textarea || !form) return;
        
        textarea.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                if (textarea.value.trim()) {
                    form.submit();
                }
            }
        });
    }
    
    /**
     * Add form validation feedback
     */
    function addFormValidation() {
        const form = document.querySelector('.ai-input-form');
        const textarea = document.getElementById('ai-input');
        
        if (!form || !textarea) return;
        
        form.addEventListener('submit', function(e) {
            if (!textarea.value.trim()) {
                e.preventDefault();
                textarea.focus();
                showValidationMessage('Please enter a message before sending.', 'warning');
                return false;
            }
        });
    }
    
    /**
     * Add textarea auto-resize functionality
     */
    function addAutoResize() {
        const textarea = document.getElementById('ai-input');
        if (!textarea) return;
        
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 200) + 'px';
        });
    }
    
    /**
     * Show validation message using toast system
     */
    function showValidationMessage(message, type = 'info') {
        if (window.ToastManager) {
            window.ToastManager.show(message, type, 3000);
        } else {
            alert(message);
        }
    }
    
    /**
     * Initialize when DOM is ready
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAIFormEnhancements);
    } else {
        initAIFormEnhancements();
    }
    
})();