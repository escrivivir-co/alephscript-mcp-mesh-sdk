(function(){
  var search = (typeof location !== 'undefined' && location.search) ? location.search : '';
  var params = new URLSearchParams(search);
  var verbose = true // params.get('mcpDebug') === '1' || params.get('mcpVerbose') === 'true';
  function log(){
    if(!verbose) return;
    try { console.log('[MCP Catalog]', ...arguments); } catch (_) {}
  }

  function applyPillVisual(btn, selected){
    btn.setAttribute('aria-pressed', String(selected));
    btn.setAttribute('aria-checked', String(selected));
    btn.setAttribute('role', 'switch');
    btn.style.backgroundColor = selected ? 'var(--primary-color)' : 'var(--background-primary)';
    btn.style.color = selected ? '#fff' : 'var(--text-primary)';
    btn.style.borderColor = selected ? 'var(--primary-color)' : 'var(--border-color)';
    const notAvailable = btn.getAttribute('data-disabled') === 'true';
    if(!notAvailable){
      btn.textContent = selected ? '✔ Seleccionado' : 'Seleccionar';
    }
  }

  function parseValue(v){
    // expected format: server|type|name
    const parts = String(v || '').split('|');
    return { server: parts[0] || '', type: parts[1] || '', name: parts[2] || '' };
  }

  function collectSelected(){
    const list = Array.from(document.querySelectorAll('input[type="checkbox"][name="selected[]"]:checked'));
    log('collectSelected found', list.length, 'checked checkboxes');
    return list.map(function(cb){ return parseValue(cb.value); });
  }

  function groupByServerAndType(items){
    const map = {};
    items.forEach(function(it){
      if(!it.server) return;
      map[it.server] = map[it.server] || { tools: [], resources: [], prompts: [] };
      if(it.type === 'tool') map[it.server].tools.push(it.name);
      else if(it.type === 'resource') map[it.server].resources.push(it.name);
      else if(it.type === 'prompt') map[it.server].prompts.push(it.name);
    });
    return map;
  }

  function renderTreeHTML(grouped){
    const servers = Object.keys(grouped);
    if(servers.length === 0){
      return '<em>Ningún elemento seleccionado</em>';
    }
    function renderList(title, arr){
      if(!arr || arr.length === 0) return '';
      return '<div style="margin: 0.25rem 0 0.25rem 0.5rem;">' +
             '<strong>' + title + ':</strong> ' +
             arr.map(function(n){ return '<code>' + n + '</code>'; }).join(', ') +
             '</div>';
    }
    return servers.map(function(s){
      const g = grouped[s];
      return '<div style="margin-bottom: 0.5rem;">' +
             '<div><strong>🖥️ ' + s + '</strong></div>' +
             renderList('Tools', g.tools) +
             renderList('Resources', g.resources) +
             renderList('Prompts', g.prompts) +
             '</div>';
    }).join('');
  }

  function updateSelectedContextTree(){
    const items = collectSelected();
    const grouped = groupByServerAndType(items);
    const total = items.length;
    log('updateSelectedContextTree - items collected:', items.length, 'total:', total);
    const summary = document.getElementById('mcp-selected-summary');
    const tree = document.getElementById('mcp-selected-tree');
    log('Updating summary element found:', !!summary, 'tree element found:', !!tree);
    if(summary){
      summary.textContent = 'Seleccionados: ' + total;
      log('Updated summary text to:', summary.textContent);
    }
    if(tree){
      tree.innerHTML = renderTreeHTML(grouped);
      log('Updated tree HTML');
    }
    log('Selected updated', { total, grouped });
  }

  function updateSelectedHidden(){
    const hidden = document.getElementById('selectedItems');
    if(hidden){
      const selected = Array.from(document.querySelectorAll('input[type="checkbox"][name="selected[]"]:checked')).map(cb => cb.value);
      hidden.value = JSON.stringify(selected);
      log('Updated selectedItems:', selected.length);
    }
    // Also update AI form hidden
    const aiHidden = document.getElementById('ai-selected-items');
    if(aiHidden){
      const selected = Array.from(document.querySelectorAll('input[type="checkbox"][name="selected[]"]:checked')).map(cb => cb.value);
      aiHidden.value = JSON.stringify(selected);
    }
  }

  function generateSafeId(serverName, type, name) {
    return 'chk-' + serverName.replace(/[^a-zA-Z0-9]/g, '_') + '-' + type + '-' + name.replace(/[^a-zA-Z0-9]/g, '_');
  }

  function loadPreset(name) {
    console.log('loadPreset called with:', name);
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
                // Uncheck all
                document.querySelectorAll('input[type="checkbox"][name="selected[]"]').forEach(cb => cb.checked = false);
                // Check preset items
                items.forEach(item => {
                    const id = generateSafeId(item.serverName, item.type, item.name);
                    log('Processing item:', item, 'Generated id:', id);
                    const cb = document.getElementById(id);
                    log('Checkbox found for', id, ':', !!cb);
                    if (cb) cb.checked = true;
                });
                log('Updating UI after preset load');
                updateSelectedHidden();
                updateSelectedContextTree();
                // Update visual indication of active preset
                log('Setting active preset visual for:', name);
                updateActivePresetVisual(name);
                // Save to localStorage
                localStorage.setItem('mcp-selected-preset', name);
                console.log('Preset loaded and saved:', name);
            } else {
                log('Failed to load preset - invalid response');
            }
        })
        .catch(error => {
            log('Error loading preset:', error);
        });
  }

  function updateActivePresetVisual(activePresetName) {
    log('updateActivePresetVisual called with:', activePresetName);
    // Remove active styling from all presets
    const allButtons = document.querySelectorAll('.mcp-load-preset');
    log('Found preset buttons:', allButtons.length);
    allButtons.forEach(btn => {
      const container = btn.closest('div');
      if(container) {
        container.style.backgroundColor = 'transparent';
        container.style.borderLeft = 'none';
        const nameSpan = container.querySelector('span');
        if(nameSpan) nameSpan.style.fontWeight = '500';
        // Remove any existing "Activo" text
        const activeText = container.querySelector('span[style*="var(--primary-color)"]');
        if(activeText) activeText.remove();
        // Show the button again
        btn.style.display = 'inline-block';
      }
    });

    if(activePresetName) {
      log('Setting active preset to:', activePresetName);
      // Add active styling to the active preset
      const activeBtn = document.querySelector(`.mcp-load-preset[data-preset-name="${activePresetName}"]`);
      log('Active button found:', !!activeBtn);
      if(activeBtn) {
        const container = activeBtn.closest('div');
        log('Active button container found:', !!container);
        if(container) {
          container.style.backgroundColor = 'var(--primary-color-light)';
          container.style.borderLeft = '3px solid var(--primary-color)';
          const nameSpan = container.querySelector('span');
          if(nameSpan) {
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
      } else {
        log('Active button not found for preset:', activePresetName);
      }
    } else {
      log('Clearing active preset visual');
    }
  }

  function syncInitialState(root){
    const pills = (root || document).querySelectorAll('.mcp-select-pill[data-checkbox-id]');
    pills.forEach(function(btn){
      const id = btn.getAttribute('data-checkbox-id');
      const cb = id && document.getElementById(id);
      if(cb){
        applyPillVisual(btn, !!cb.checked);
      }
    });
    log('Pills ready:', pills.length);
    updateSelectedHidden();
  }

  function toggleFromButton(btn){
    if(!btn) return;
    if(btn.getAttribute('data-disabled') === 'true'){
      log('Inline toggle ignored (disabled)');
      return;
    }
    const id = btn.getAttribute('data-checkbox-id');
    const cb = id && document.getElementById(id);
    if(!cb){
      log('Inline toggle: no checkbox found for pill', id);
      return;
    }
    cb.checked = !cb.checked;
    applyPillVisual(btn, cb.checked);
    log('Inline toggle selection', { id, checked: cb.checked });
  }

  function onClick(e){
    const btn = e.target.closest && e.target.closest('.mcp-select-pill');
    if(!btn) return;
    log('Pill click', { id: btn.getAttribute('data-checkbox-id') });
    if(btn.getAttribute('data-disabled') === 'true') {
      log('Pill click ignored (disabled)');
      return;
    }
    const id = btn.getAttribute('data-checkbox-id');
    const cb = id && document.getElementById(id);
    if(!cb){
      log('No checkbox found for pill', id);
      return;
    }
    cb.checked = !cb.checked;
    log('Toggle selection', { id: id, checked: cb.checked });
    applyPillVisual(btn, cb.checked);
    updateSelectedHidden();
  }

  function onChange(e){
    const el = e.target;
    if(!(el instanceof HTMLInputElement)) return;
    if(el.type !== 'checkbox') return;
    if(!el.name || el.name !== 'selected[]') return;
    const pill = document.querySelector('.mcp-select-pill[data-checkbox-id="' + el.id + '"]');
    if(pill){ applyPillVisual(pill, el.checked); }
    updateSelectedHidden();
  }

  function init(){
    const root = document;
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    syncInitialState(root);
    // Expose global fallback for inline onclick
    window.__mcpTogglePill = function(btn){
      log('Inline toggle invoked', { id: btn && btn.getAttribute && btn.getAttribute('data-checkbox-id') });
      toggleFromButton(btn);
    };
    log('Initialized - starting preset loading process');

    // Load saved preset if exists
    const savedPreset = localStorage.getItem('mcp-selected-preset');
    log('Checking for saved preset:', savedPreset);
    if(savedPreset){
      console.log('Loading saved preset:', savedPreset);
      loadPreset(savedPreset);
      // Update visual indication after preset loads
      setTimeout(() => {
        const currentActive = localStorage.getItem('mcp-selected-preset');
        log('Updating active preset visual after delay:', currentActive);
        updateActivePresetVisual(currentActive);
      }, 500);
    } else {
      log('No saved preset found');
      // No saved preset, clear any active visual indication
      setTimeout(() => {
        log('Clearing active preset visual');
        updateActivePresetVisual(null);
      }, 100);
    }

    // Initial and reactive updates
    updateSelectedContextTree();
    updateSelectedHidden();
    document.addEventListener('change', function(ev){
      const el = ev.target;
      if(el && el.matches && el.matches('input[type="checkbox"][name="selected[]"]')){
        // Clear saved preset when user manually changes selections
        localStorage.removeItem('mcp-selected-preset');
        updateActivePresetVisual(null);
        updateSelectedContextTree();
        updateSelectedHidden();
      }
    });
    document.addEventListener('click', function(ev){
      const btn = ev.target.closest && ev.target.closest('.mcp-select-pill');
      if(btn && btn.getAttribute('data-disabled') !== 'true'){
        // Clear saved preset when user manually changes selections
        localStorage.removeItem('mcp-selected-preset');
        updateActivePresetVisual(null);
        // after pill toggles, reflect in tree
        setTimeout(function(){
          updateSelectedContextTree();
          updateSelectedHidden();
        }, 0);
      }
    });

    // Load preset buttons
    document.addEventListener('click', function(ev){
      const btn = ev.target.closest('.mcp-load-preset');
      if(btn){
        const name = btn.getAttribute('data-preset-name');
        if(name){
          console.log('Loading preset:', name);
          loadPreset(name);
        }
      }
    });

    // Log form submission with payload details (verbose-only)
    const form = document.querySelector('form.mcp-form');
    if(form){
      form.addEventListener('submit', function(e){
        e.preventDefault(); // Prevent page reload
        const presetName = form.querySelector('input[name="presetName"]').value;
        const selectedItems = JSON.parse(form.querySelector('#selectedItems').value || '[]');
        const payload = { presetName, selectedItems };
        console.log('Sending payload:', payload);
        
        fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(response => {
          console.log('Response status:', response.status);
          return response.text();
        }).then(data => {
          console.log('Response data:', data);
          // For now, reload the page to show the result
          window.location.reload();
        }).catch(error => {
          console.error('Error sending form:', error);
        });
      });
      
      form.addEventListener('submit', function(e){
        if(!verbose) return; // don't interfere, just log when verbose
        try {
          const nameInput = form.querySelector('input[name="presetName"]');
          const presetName = nameInput && nameInput.value || '';
          const selected = collectSelected();
          console.group('[MCP Catalog] Submit preset');
          console.log('presetName:', presetName);
          console.log('selectedItems:', selected);
          console.groupEnd();
        } catch(_) {}
      });
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
