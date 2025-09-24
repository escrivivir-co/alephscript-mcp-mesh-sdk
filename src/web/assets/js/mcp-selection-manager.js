/**
 * MCP Catalog Selection Manager - Cliente JavaScript
 * Maneja la lógica de selección usando los nuevos componentes
 * Compatible con la funcionalidad existente
 */

(function(){
    // Prevent multiple instances
    if (window.mcpSelectionManager) {
        console.log('[MCP Selection Manager] Instance already exists, skipping initialization');
        return;
    }

    var search = (typeof location !== 'undefined' && location.search) ? location.search : '';
    var params = new URLSearchParams(search);
    var verbose = true; // params.get('mcpDebug') === '1' || params.get('mcpVerbose') === 'true';
    
    function log(){
        if(!verbose) return;
        try { console.log('[MCP Selection Manager]', ...arguments); } catch (_) {}
    }

    /**
     * MCPSelectionManager - Clase principal para manejar selecciones
     */
    class MCPSelectionManager {
        constructor() {
            // Singleton pattern - prevent multiple instances
            if (window.mcpSelectionManager && window.mcpSelectionManager instanceof MCPSelectionManager) {
                log('🛡️ MCPSelectionManager singleton - returning existing instance');
                return window.mcpSelectionManager;
            }
            
            this.selectedItems = []; // Items selected via checkboxes (for AI)
            this.explorerSelectedItems = []; // Items manually selected from explorer (for context display)
            this.activePreset = null;
            this.contextTreeRenderer = null;
            this.isLoadingPreset = false; // Flag to differentiate preset loading from manual selection
            this.processingChange = false; // Flag to prevent duplicate change processing
            this.changeTimeout = null; // Debounce timeout for change events
            this.init();
        }

        init() {
            log('Initializing MCP Selection Manager');
            this.bindEvents();
            this.syncInitialState();
            this.updateSelections(); // Initialize selections and context
            this.handleURLParameters(); // Check for edit/duplicate parameters
            this.loadSavedPreset();
        }

        bindEvents() {
            log('🔗 Binding events...');
            
            document.addEventListener('click', (e) => {
                log('🖱️ Click detected on:', e.target, 'Classes:', e.target.classList.toString());
                
                // Handle action buttons first
                const buttonId = e.target.id;
                if (buttonId) {
                    switch (buttonId) {
                        case 'save-selection-as-preset':
                            log('💾 Save button clicked');
                            e.preventDefault();
                            this.saveCurrentSelection();
                            return;
                        case 'clear-all-selections':
                            log('🗑️ Clear button clicked');
                            e.preventDefault();
                            this.clearAll();
                            return;
                        case 'export-context':
                            log('📄 Export button clicked');
                            e.preventDefault();
                            this.exportContext();
                            return;
                    }
                }
                
                // Check for create preset button clicks
                if (e.target.matches('button[type="submit"]') || e.target.closest('button[type="submit"]')) {
                    log('🎯 Submit button clicked:', e.target);
                }
                
                this.handlePillClick(e);
                this.handlePresetLoad(e);
                this.handlePresetListInteractions(e);
            });
            
            document.addEventListener('change', (e) => {
                log('🔄 Change detected on:', e.target);
                this.handleCheckboxChange(e);
            });
            
            document.addEventListener('submit', (e) => {
                log('📤 Submit detected on:', e.target);
                this.handleFormSubmit(e);
            });
            
            log('✅ Events bound successfully');
        }

        handlePresetListInteractions(e) {
            // Click on preset list item
            const li = e.target.closest('.preset-list-item');
            if (li && li.dataset && (li.dataset.presetId || li.dataset.presetName)) {
                const name = li.dataset.presetName || li.dataset.presetId;
                log('📌 Preset list item clicked:', name);
                // Guard: avoid re-selecting if already active or click originates from action buttons
                if (li.classList.contains('is-active')) {
                    log('⏭️ Skipping selection, already active');
                    return;
                }
                if (window.PresetManager && typeof window.PresetManager.selectPreset === 'function') {
                    window.PresetManager.selectPreset(name);
                }
                return;
            }

            // Specific action buttons inside preset actions
            const editBtn = e.target.closest('button[title="Editar preset"], .preset-actions .btn.btn-secondary');
            if (editBtn) {
                const container = e.target.closest('.preset-list-item');
                const name = container && container.dataset ? container.dataset.presetId : null;
                if (name && window.PresetManager && typeof window.PresetManager.editPreset === 'function') {
                    e.stopPropagation();
                    log('✏️ Edit preset via list:', name);
                    window.PresetManager.editPreset(name);
                }
                return;
            }
        }

        handlePillClick(e) {
            // First try to find the pill button directly
            let btn = e.target.closest('.mcp-select-pill');
            
            // If not found, check if click was on the item selector container
            if (!btn) {
                const itemSelector = e.target.closest('.mcp-item-selector');
                if (itemSelector) {
                    btn = itemSelector.querySelector('.mcp-select-pill');
                }
            }
            
            if (!btn) return;
            
            log('Pill click detected', { id: btn.getAttribute('data-checkbox-id') });
            
            if (btn.getAttribute('data-disabled') === 'true') {
                log('Pill click ignored (disabled)');
                return;
            }

            const id = btn.getAttribute('data-checkbox-id');
            const checkbox = id && document.getElementById(id);
            
            if (!checkbox) {
                log('No checkbox found for pill', id);
                return;
            }

            const wasChecked = checkbox.checked;
            checkbox.checked = !checkbox.checked;
            const isNowChecked = checkbox.checked;
            
            log('Toggle selection', { 
                id: id, 
                wasChecked: wasChecked,
                isNowChecked: isNowChecked,
                disabled: checkbox.disabled,
                hasDisabledAttr: checkbox.hasAttribute('disabled')
            });
            
            // Apply visual immediately
            this.applyPillVisual(btn, checkbox.checked);
            
            // Immediately update selections to reflect the change
            this.updateSelections();
            
            // If not loading preset, clear active preset
            if (!this.isLoadingPreset) {
                this.clearActivePreset();
            }
            
            // Dispatch change event for other listeners, but mark it as handled
            try {
                const ev = new Event('change', { bubbles: true });
                ev.mcpHandled = true; // Mark as already handled
                checkbox.dispatchEvent(ev);
            } catch (_) {
                // Fallback para navegadores antiguos
                try { 
                    const ev = document.createEvent('HTMLEvents');
                    ev.initEvent('change', true, false);
                    ev.mcpHandled = true;
                    checkbox.dispatchEvent(ev);
                } catch (_) {}
            }
        }

        handleCheckboxChange(e) {
            const el = e.target;
            if (!(el instanceof HTMLInputElement)) return;
            if (el.type !== 'checkbox') return;
            if (!el.name || el.name !== 'selected[]') return;
            
            // Skip if this event was already handled by pill click
            if (e.mcpHandled) {
                log('🛡️ Skipping already handled change event');
                return;
            }
            
            // Prevent duplicate processing with debouncing
            if (this.processingChange) {
                log('🛡️ Skipping duplicate change event');
                return;
            }
            
            this.processingChange = true;
            
            // Clear any existing timeout
            if (this.changeTimeout) {
                clearTimeout(this.changeTimeout);
            }
            
            // Debounce the actual processing
            this.changeTimeout = setTimeout(() => {
                log('🔄 Processing debounced change for:', el.id, 'checked:', el.checked);
                
                const pill = document.querySelector('.mcp-select-pill[data-checkbox-id="' + el.id + '"]');
                if (pill) { 
                    this.applyPillVisual(pill, el.checked); 
                }
                
                // Update selections
                this.updateSelections();
                
                // If not loading preset, also update context and clear active preset
                if (!this.isLoadingPreset) {
                    this.clearActivePreset();
                }
                
                this.processingChange = false;
            }, 50); // 50ms debounce
        }

        handlePresetLoad(e) {
            const btn = e.target.closest('.mcp-load-preset');
            if (!btn) return;
            
            const name = btn.getAttribute('data-preset-name');
            if (name) {
                log('Loading preset:', name);
                this.loadPreset(name);
            }
        }

        handleFormSubmit(e) {
            log('🎯 Form submit event triggered', e.target);
            
            const form = e.target.closest('form.mcp-form');
            if (!form) {
                log('❌ No form found with class mcp-form', e.target);
                return;
            }
            
            log('✅ Form found:', form);
            e.preventDefault();
            
            const presetNameInput = form.querySelector('input[name="presetName"]');
            if (!presetNameInput) {
                log('❌ No presetName input found in form');
                return;
            }
            
            const presetName = presetNameInput.value;
            log('📝 Preset name:', presetName);
            
            const selectedItems = this.collectSelected();
            log('📦 Selected items:', selectedItems);
            
            if (selectedItems.length === 0) {
                log('⚠️ No items selected for preset');
                alert('Por favor selecciona al menos un elemento para crear el preset');
                return;
            }
            
            const payload = { presetName, items: selectedItems };
            log('🚀 Sending preset payload:', payload);
            
            const actionUrl = form.action || '/ai/ui/mcp/set';
            log('🎯 Sending to URL:', actionUrl);
            
            fetch(actionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(response => {
                log('📡 Response status:', response.status);
                log('📡 Response headers:', response.headers);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.text();
            }).then(data => {
                log('✅ Response data:', data);
                try {
                    const jsonData = JSON.parse(data);
                    log('✅ Parsed response:', jsonData);
                    if (jsonData.success) {
                        alert(`✅ Preset "${presetName}" guardado exitosamente`);
                        window.location.reload();
                    } else {
                        alert(`❌ Error guardando preset: ${jsonData.error || 'Unknown error'}`);
                    }
                } catch (parseError) {
                    log('⚠️ Response is not JSON, treating as success');
                    alert(`✅ Preset "${presetName}" guardado`);
                    window.location.reload();
                }
            }).catch(error => {
                log('❌ Error sending form:', error);
                console.error('❌ Error sending form:', error);
                alert(`❌ Error guardando preset: ${error.message}`);
            });
        }

        applyPillVisual(btn, selected) {
            if (!btn) {
                log('❌ applyPillVisual: btn is null');
                return;
            }
            
            log('🎨 Applying visual state to pill:', btn.getAttribute('data-checkbox-id'), 'selected:', selected);
            
            btn.setAttribute('aria-pressed', String(selected));
            btn.setAttribute('aria-checked', String(selected));
            btn.setAttribute('role', 'switch');
            
            // Force CSS property updates
            btn.style.setProperty('background-color', selected ? 'var(--primary-color)' : 'var(--background-primary)', 'important');
            btn.style.setProperty('color', selected ? '#fff' : 'var(--text-primary)', 'important');
            btn.style.setProperty('border-color', selected ? 'var(--primary-color)' : 'var(--border-color)', 'important');
            
            const notAvailable = btn.getAttribute('data-disabled') === 'true';
            if (!notAvailable) {
                btn.textContent = selected ? '✔ ' : ' -- ';
            }
            
            log('✅ Visual state applied - background:', btn.style.backgroundColor, 'text:', btn.textContent);
        }

        syncInitialState() {
            const pills = document.querySelectorAll('.mcp-select-pill[data-checkbox-id]');
            pills.forEach((btn) => {
                const id = btn.getAttribute('data-checkbox-id');
                const checkbox = id && document.getElementById(id);
                if (checkbox) {
                    this.applyPillVisual(btn, !!checkbox.checked);
                }
            });
            log('Pills synced:', pills.length);
        }

        collectSelected() {
            const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"][name="selected[]"]:checked'));
            log('collectSelected found', checkboxes.length, 'checked checkboxes');
            
            return checkboxes.map(cb => this.parseValue(cb.value));
        }

        parseValue(value) {
            // expected format: server|type|name
            const parts = String(value || '').split('|');
            return { 
                server: parts[0] || '', 
                type: parts[1] || '', 
                name: parts[2] || '' 
            };
        }

        updateSelections() {
            this.selectedItems = this.collectSelected();
            
            // Update explorer selections to mirror current selections when not loading presets
            if (!this.isLoadingPreset) {
                this.explorerSelectedItems = [...this.selectedItems];
            }
            
            this.updateHiddenInputs();
            this.updateContextTree();
            this.updateSelectionDependentButtons();
            
            log('Selections updated', { 
                total: this.selectedItems.length, 
                explorerTotal: this.explorerSelectedItems.length,
                isLoadingPreset: this.isLoadingPreset
            });
        }

        /**
         * Update buttons that depend on selection state
         */
        updateSelectionDependentButtons() {
            const hasSelections = this.selectedItems.length > 0;
            
            // Enable/disable export button
            const exportBtn = document.getElementById('export-context');
            if (exportBtn) {
                exportBtn.disabled = !hasSelections;
                exportBtn.title = hasSelections ? 'Exportar contexto seleccionado' : 'Selecciona elementos para exportar';
            }
            
            // Enable/disable save as preset button
            const savePresetBtn = document.getElementById('save-selection-as-preset');
            if (savePresetBtn) {
                savePresetBtn.disabled = !hasSelections;
                savePresetBtn.title = hasSelections ? 'Guardar selección como preset' : 'Selecciona elementos para crear preset';
            }
        }

        updateHiddenInputs() {
            // All checkbox selections (for AI use and main form submission)
            const checkboxSelected = Array.from(document.querySelectorAll('input[type="checkbox"][name="selected[]"]:checked')).map(cb => cb.value);
            
            // Explorer selections for context display (independent of presets)
            const contextSelected = this.explorerSelectedItems.map(item => `${item.server}|${item.type}|${item.name}`);
            
            // Update main catalog form (AI submissions)
            const hidden = document.getElementById('selectedItems');
            if (hidden) {
                hidden.value = JSON.stringify(checkboxSelected);
            }
            
            // Update header form (AI submissions)
            const headerHidden = document.getElementById('selectedItems-header');
            if (headerHidden) {
                headerHidden.value = JSON.stringify(checkboxSelected);
            }
            
            // Update context form (preset creation from context display)
            const contextHidden = document.getElementById('selectedItems-context');
            if (contextHidden) {
                contextHidden.value = JSON.stringify(contextSelected);
            }
            
            // Update AI form if present
            const aiHidden = document.getElementById('ai-selected-items');
            if (aiHidden) {
                aiHidden.value = JSON.stringify(checkboxSelected);
                this.updateAIPresetIndicator(checkboxSelected);
            }
            
            log('Updated hidden inputs:', { 
                checkboxCount: checkboxSelected.length, 
                contextCount: contextSelected.length 
            });
        }

        updateAIPresetIndicator(selectedPresets) {
            const indicator = document.getElementById('selected-presets-indicator');
            const list = document.getElementById('selected-presets-list');
            
            if (!indicator || !list) return;
            
            if (selectedPresets.length === 0) {
                indicator.style.display = 'none';
                return;
            }
            
            // Show indicator and populate with preset pills
            indicator.style.display = 'block';
            list.innerHTML = '';
            
            selectedPresets.forEach(preset => {
                const pill = document.createElement('span');
                pill.style.cssText = `
                    background: var(--primary-color);
                    color: var(--primary-text);
                    padding: 0.25em 0.75em;
                    border-radius: 12px;
                    font-size: 0.8em;
                    font-weight: 500;
                `;
                pill.textContent = preset;
                list.appendChild(pill);
            });
            
            log('🎯 AI preset indicator updated with', selectedPresets.length, 'presets');
        }

        updateContextTree() {
            const items = this.explorerSelectedItems;
            const total = items.length;
            
            log('🌳 Updating context tree with', total, 'items');
            
            // Update summary
            const summary = document.getElementById('mcp-selected-summary');
            log('📊 Summary element search result:', !!summary);
            if (summary) {
                summary.textContent = 'T>: ' + total + '<';
                log('✅ Updated summary text to:', summary.textContent);
            } else {
                log('❌ Summary element not found with ID: mcp-selected-summary');
                // Try alternative selectors
                const altSummary = document.querySelector('.mcp-context-summary');
                log('🔍 Alternative summary search:', !!altSummary);
            }
            
            // Update context stats in the new layout
            const contextStats = document.getElementById('context-stats');
            if (contextStats) {
                contextStats.textContent = `${total} elementos seleccionados`;
                log('✅ Updated context stats to:', contextStats.textContent);
            }
            
            // Update tree
            const tree = document.getElementById('mcp-selected-tree');
            log('🌲 Tree element search result:', !!tree);
            if (tree) {
                const treeHTML = this.renderTreeHTML(this.groupByServerAndType(items));
                tree.innerHTML = treeHTML;
                log('✅ Updated tree HTML:', treeHTML.substring(0, 100) + '...');
            } else {
                log('❌ Tree element not found with ID: mcp-selected-tree');
                // Try alternative selectors
                const altTree = document.querySelector('.mcp-context-tree-content');
                log('🔍 Alternative tree search:', !!altTree);
                
                // List all elements with 'tree' in their ID or class
                const treeElements = document.querySelectorAll('[id*="tree"], [class*="tree"]');
                log('🔍 Elements with "tree" in ID/class:', Array.from(treeElements).map(el => el.id || el.className));
            }
        }

        groupByServerAndType(items) {
            const map = {};
            items.forEach((item) => {
                if (!item.server) return;
                map[item.server] = map[item.server] || { tools: [], resources: [], prompts: [] };
                if (item.type === 'tool') map[item.server].tools.push(item.name);
                else if (item.type === 'resource') map[item.server].resources.push(item.name);
                else if (item.type === 'prompt') map[item.server].prompts.push(item.name);
            });
            return map;
        }

        renderTreeHTML(grouped) {
            const servers = Object.keys(grouped);
            if (servers.length === 0) {
                return '<em>Ningún elemento seleccionado</em>';
            }
            
            return servers.map((serverName) => {
                const g = grouped[serverName];
                return '<div style="margin-bottom: 0.5rem;">' +
                       '<div><strong>🖥️ ' + serverName + '</strong></div>' +
                       this.renderList('Tools', g.tools) +
                       this.renderList('Resources', g.resources) +
                       this.renderList('Prompts', g.prompts) +
                       '</div>';
            }).join('');
        }

        renderList(title, arr) {
            if (!arr || arr.length === 0) return '';
            return '<div style="margin: 0.25rem 0 0.25rem 0.5rem;">' +
                   '<strong>' + title + ':</strong> ' +
                   arr.map((n) => '<code>' + n + '</code>').join(', ') +
                   '</div>';
        }

        generateSafeId(serverName, type, name) {
            return 'chk-' + serverName.replace(/[^a-zA-Z0-9]/g, '_') + '-' + type + '-' + name.replace(/[^a-zA-Z0-9]/g, '_');
        }

        loadPreset(name) {
            log('Starting preset load process for:', name);
            
            fetch('/ai/ui/mcp/preset/' + encodeURIComponent(name))
                .then(response => {
                    log('Preset fetch response status:', response.status);
                    return response.json();
                })
                .then(data => {
                    log('Preset data received:', data);
                    if (data.success && data.preset) {
                        const items = data.preset.items || [];
                        log('Processing preset items:', items.length);
                        
                        // Set flag to indicate we're loading a preset
                        this.isLoadingPreset = true;
                        
                        // Uncheck all
                        document.querySelectorAll('input[type="checkbox"][name="selected[]"]').forEach(cb => cb.checked = false);
                        
                        // Check preset items
                        items.forEach(item => {
                            const id = this.generateSafeId(item.serverName, item.type, item.name);
                            log('Processing item:', item, 'Generated id:', id);
                            const cb = document.getElementById(id);
                            log('Checkbox found for', id, ':', !!cb);
                            if (cb) cb.checked = true;
                        });
                        
                        log('Updating UI after preset load');
                        this.syncInitialState();
                        this.updateSelections();
                        this.setActivePreset(name);
                        
                        // Clear flag after loading
                        this.isLoadingPreset = false;
                        
                        console.log('Preset loaded and saved:', name);
                    } else {
                        log('Failed to load preset - invalid response');
                    }
                })
                .catch(error => {
                    log('Error loading preset:', error);
                    this.isLoadingPreset = false;
                });
        }

        setActivePreset(name) {
            this.activePreset = name;
            this.updateActivePresetVisual(name);
            localStorage.setItem('mcp-selected-preset', name);
            log('Active preset set to:', name);
        }

        clearActivePreset() {
            this.activePreset = null;
            this.updateActivePresetVisual(null);
            localStorage.removeItem('mcp-selected-preset');
            log('Active preset cleared');
        }

        /**
         * Clear all selections and reset the interface
         */
        clearAll() {
            log('🗑️ Clearing all selections');
            
            // Uncheck all checkboxes
            const checkboxes = document.querySelectorAll('input[type="checkbox"][name="selected[]"]');
            checkboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    checkbox.checked = false;
                    
                    // Update pill visual
                    const pill = document.querySelector(`.mcp-select-pill[data-checkbox-id="${checkbox.id}"]`);
                    if (pill) {
                        this.applyPillVisual(pill, false);
                    }
                }
            });
            
            // Clear internal arrays
            this.selectedItems = [];
            this.explorerSelectedItems = [];
            
            // Clear active preset
            this.clearActivePreset();
            
            // Update UI
            this.updateSelections();
            
            // Show toast notification
            if (window.ToastManager) {
                window.ToastManager.showSuccess('Todas las selecciones han sido limpiadas');
            }
            
            log('✅ All selections cleared');
        }

        /**
         * Save current selection as a preset
         */
        saveCurrentSelection() {
            log('💾 Saving current selection as preset');
            
            // Get preset name from input field
            const presetNameInput = document.getElementById('new-preset-name');
            if (!presetNameInput) {
                log('❌ No preset name input found');
                if (window.ToastManager) {
                    window.ToastManager.showError('No se encontró el campo de nombre del preset');
                }
                return;
            }
            
            const presetName = presetNameInput.value.trim();
            if (!presetName) {
                log('❌ Empty preset name');
                if (window.ToastManager) {
                    window.ToastManager.showError('Por favor ingresa un nombre para el preset');
                }
                presetNameInput.focus();
                return;
            }
            
            // Get selected items
            const selectedItems = this.collectSelected();
            if (selectedItems.length === 0) {
                log('❌ No items selected');
                if (window.ToastManager) {
                    window.ToastManager.showError('Por favor selecciona al menos un elemento para crear el preset');
                }
                return;
            }
            
            log('📦 Saving preset:', { name: presetName, itemsCount: selectedItems.length });
            
            // Prepare payload - match server expectations
            const payload = { 
                presetName: presetName,
                selectedItems: selectedItems,
                presetDescription: '' // Optional description
            };
            
            // Save to server using relative URL
            const actionUrl = '/ai/ui/mcp/set';
            
            fetch(actionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(response => {
                log('📡 Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(data => {
                log('✅ Response data:', data);
                try {
                    const jsonData = JSON.parse(data);
                    if (jsonData.success) {
                        if (window.ToastManager) {
                            window.ToastManager.showSuccess(`Preset "${presetName}" guardado exitosamente`);
                        }
                        // Clear the preset name input
                        presetNameInput.value = '';
                        // Mark that presets need refresh
                        sessionStorage.setItem('mcp-presets-need-refresh', 'true');
                        // Optionally reload or redirect
                        setTimeout(() => {
                            window.location.href = '/presets';
                        }, 1500);
                    } else {
                        throw new Error(jsonData.error || 'Unknown error');
                    }
                } catch (parseError) {
                    // Treat non-JSON responses as success (legacy compatibility)
                    log('⚠️ Response is not JSON, treating as success');
                    if (window.ToastManager) {
                        window.ToastManager.showSuccess(`Preset "${presetName}" guardado correctamente`);
                    }
                    presetNameInput.value = '';
                    // Mark that presets need refresh
                    sessionStorage.setItem('mcp-presets-need-refresh', 'true');
                    setTimeout(() => {
                        window.location.href = '/presets';
                    }, 1500);
                }
            })
            .catch(error => {
                log('❌ Error saving preset:', error);
                if (window.ToastManager) {
                    window.ToastManager.showError(`Error guardando preset: ${error.message}`);
                }
            });
        }

        /**
         * Export current selection context
         */
        exportContext() {
            log('📄 Exporting current context');
            
            // Get selected items
            const selectedItems = this.collectSelected();
            if (selectedItems.length === 0) {
                log('❌ No items selected for export');
                if (window.ToastManager) {
                    window.ToastManager.showError('No hay elementos seleccionados para exportar');
                }
                return;
            }
            
            // Create export data
            const exportData = {
                timestamp: new Date().toISOString(),
                totalItems: selectedItems.length,
                selection: selectedItems
            };
            
            // Create downloadable file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mcp-selection-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            log('✅ Context exported successfully');
            if (window.ToastManager) {
                window.ToastManager.showSuccess(`Exportados ${selectedItems.length} elementos`);
            }
        }

        /**
         * Handle URL parameters for edit/duplicate operations
         */
        handleURLParameters() {
            const urlParams = new URLSearchParams(window.location.search);
            const editPreset = urlParams.get('edit');
            const duplicatePreset = urlParams.get('duplicate');
            
            if (editPreset) {
                log('🛠️ Edit mode detected for preset:', editPreset);
                this.loadPresetForEdit(editPreset);
            } else if (duplicatePreset) {
                log('📋 Duplicate mode detected for preset:', duplicatePreset);
                this.loadPresetForDuplicate(duplicatePreset);
            }
        }

        /**
         * Load preset for editing
         */
        loadPresetForEdit(presetName) {
            log('🛠️ Loading preset for edit:', presetName);
            
            // Show loading feedback
            if (window.ToastManager) {
                window.ToastManager.showInfo(`Cargando preset "${presetName}" para edición...`);
            }
            
            // Use existing loadPreset method
            this.loadPreset(presetName);
            
            // Update the preset name field with current name for editing
            setTimeout(() => {
                const presetNameInput = document.getElementById('new-preset-name');
                if (presetNameInput) {
                    presetNameInput.value = presetName;
                    presetNameInput.focus();
                    presetNameInput.select(); // Select text for easy editing
                }
                
                // Show success feedback
                if (window.ToastManager) {
                    window.ToastManager.showSuccess(`Preset "${presetName}" cargado para edición`);
                }
            }, 1000); // Delay to ensure preset loading completes
            
            // Clean URL
            window.history.replaceState({}, '', '/explorer');
        }

        /**
         * Load preset for duplication
         */
        loadPresetForDuplicate(presetName) {
            log('📋 Loading preset for duplicate:', presetName);
            
            // Show loading feedback
            if (window.ToastManager) {
                window.ToastManager.showInfo(`Cargando preset "${presetName}" para duplicar...`);
            }
            
            // Use existing loadPreset method
            this.loadPreset(presetName);
            
            // Update the preset name field with "Copia de" prefix for duplication
            setTimeout(() => {
                const presetNameInput = document.getElementById('new-preset-name');
                if (presetNameInput) {
                    presetNameInput.value = `Copia de ${presetName}`;
                    presetNameInput.focus();
                    presetNameInput.select(); // Select text for easy editing
                }
                
                // Show success feedback
                if (window.ToastManager) {
                    window.ToastManager.showSuccess(`Preset "${presetName}" cargado para duplicar`);
                }
            }, 1000); // Delay to ensure preset loading completes
            
            // Clean URL
            window.history.replaceState({}, '', '/explorer');
        }

        updateActivePresetVisual(activePresetName) {
            log('updateActivePresetVisual called with:', activePresetName);
            
            // Remove active styling from all presets
            const allButtons = document.querySelectorAll('.mcp-load-preset');
            log('Found preset buttons:', allButtons.length);
            
            allButtons.forEach(btn => {
                const container = btn.closest('div');
                if (container) {
                    container.style.backgroundColor = 'transparent';
                    container.style.borderLeft = 'none';
                    const nameSpan = container.querySelector('span');
                    if (nameSpan) nameSpan.style.fontWeight = '500';
                    
                    // Remove any existing "Activo" text
                    const activeText = container.querySelector('span[style*="var(--primary-color)"]');
                    if (activeText) activeText.remove();
                    
                    // Show the button again
                    btn.style.display = 'inline-block';
                }
            });

            if (activePresetName) {
                log('Setting active preset to:', activePresetName);
                const activeBtn = document.querySelector(`.mcp-load-preset[data-preset-name="${activePresetName}"]`);
                log('Active button found:', !!activeBtn);
                
                if (activeBtn) {
                    const container = activeBtn.closest('div');
                    log('Active button container found:', !!container);
                    
                    if (container) {
                        container.style.backgroundColor = 'var(--primary-color-light)';
                        container.style.borderLeft = '3px solid var(--primary-color)';
                        const nameSpan = container.querySelector('span');
                        if (nameSpan) {
                            nameSpan.style.fontWeight = '600';
                            log('Updated name span font weight');
                        }
                        
                        // Hide the button and add "Activo" text
                        activeBtn.style.display = 'none';
                        const activeText = document.createElement('span');
                        activeText.style.marginLeft = '0.5rem';
                        activeText.style.color = 'var(--primary-color)';
                        activeText.style.fontSize = '0.8em';
                        activeText.style.fontWeight = '600';
                        activeText.textContent = '✓ Activo';
                        activeBtn.parentNode.insertBefore(activeText, activeBtn);
                        log('Added active text indicator');
                    }
                }
            }
        }

        loadSavedPreset() {
            const savedPreset = localStorage.getItem('mcp-selected-preset');
            log('Checking for saved preset:', savedPreset);
            
            if (savedPreset) {
                console.log('Loading saved preset:', savedPreset);
                this.loadPreset(savedPreset);
                
                // Update visual indication after preset loads
                setTimeout(() => {
                    const currentActive = localStorage.getItem('mcp-selected-preset');
                    log('Updating active preset visual after delay:', currentActive);
                    this.updateActivePresetVisual(currentActive);
                }, 500);
            } else {
                log('No saved preset found');
                setTimeout(() => {
                    log('Clearing active preset visual');
                    this.updateActivePresetVisual(null);
                }, 100);
            }
        }
    }

    // Initialize when DOM is ready
    function init() {
        log('DOM ready, initializing MCP Selection Manager');
        window.mcpSelectionManager = new MCPSelectionManager();
        
        // Backward compatibility - expose functions
        window.__mcpTogglePill = function(btn) {
            log('Legacy inline toggle invoked', { id: btn && btn.getAttribute && btn.getAttribute('data-checkbox-id') });
            if (window.mcpSelectionManager) {
                window.mcpSelectionManager.handlePillClick({ target: btn });
            }
        };
    }

    // Expose the class to window for external usage
    window.MCPSelectionManager = MCPSelectionManager;

    /**
     * Función global para refrescar el catálogo desde QuickActionsBar
     */
    window.refreshCatalogFromQuickBar = async function() {
        const refreshBtn = document.querySelector('.refresh-catalog-btn');
        if (!refreshBtn) return;
        
        // Indicar que estamos cargando
        const originalText = refreshBtn.innerHTML;
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<span class="icon">⏳</span> Actualizando...';
        
        try {
            // 1. Llamar al endpoint de refresh del servidor
            log('Calling server catalog refresh...');
            const refreshResponse = await fetch('/api/catalog/refresh', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!refreshResponse.ok) {
                throw new Error('Server refresh failed: ' + refreshResponse.status);
            }
            
            log('Server refresh completed, waiting for processing...');
            
            // 2. Esperar un poco para que el servidor procese los cambios
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 3. Recargar la página para mostrar los datos actualizados
            log('Reloading page to show updated catalog...');
            
            // Mostrar éxito temporalmente antes de recargar
            refreshBtn.innerHTML = '<span class="icon">✅</span> Actualizado';
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Recargar la página
            window.location.reload();
            
        } catch (error) {
            console.error('Error refreshing catalog:', error);
            
            // Mostrar error
            refreshBtn.innerHTML = '<span class="icon">❌</span> Error';
            
            // Restaurar botón después de un tiempo
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = originalText;
            }, 3000);
            
            // Mostrar toast de error si está disponible
            if (window.ToastManager) {
                window.ToastManager.show('Error al actualizar el catálogo', 'error');
            }
        }
    };

    /**
     * Función global para refrescar estadísticas
     */
    window.refreshStatsFromQuickBar = async function() {
        try {
            log('Refreshing stats from quick bar...');
            
            // Buscar elementos de estadísticas y actualizarlos
            const statsElements = document.querySelectorAll('.quick-stat');
            
            // Llamar al endpoint de estadísticas
            const statsResponse = await fetch('/api/catalog/stats');
            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                log('Stats refreshed:', stats);
                
                // Actualizar elementos de estadísticas si existen
                // Esto se puede expandir para actualizar elementos específicos
            }
            
        } catch (error) {
            console.error('Error refreshing stats:', error);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();