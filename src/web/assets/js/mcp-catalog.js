(function(){
  var search = (typeof location !== 'undefined' && location.search) ? location.search : '';
  var params = new URLSearchParams(search);
  var verbose = params.get('mcpDebug') === '1' || params.get('mcpDebug') === 'true';
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
  }

  function onChange(e){
    const el = e.target;
    if(!(el instanceof HTMLInputElement)) return;
    if(el.type !== 'checkbox') return;
    if(!el.name || el.name !== 'selected[]') return;
    const pill = document.querySelector('.mcp-select-pill[data-checkbox-id="' + el.id + '"]');
    if(pill){ applyPillVisual(pill, el.checked); }
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
    log('Initialized');

    // Build and update selected context tree
    function parseValue(v){
      // expected format: server|type|name
      const parts = String(v || '').split('|');
      return { server: parts[0] || '', type: parts[1] || '', name: parts[2] || '' };
    }

    function collectSelected(){
      const list = Array.from(document.querySelectorAll('input[type="checkbox"][name="selected[]"]:checked'));
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
      const summary = document.getElementById('mcp-selected-summary');
      const tree = document.getElementById('mcp-selected-tree');
      if(summary){ summary.textContent = 'Seleccionados: ' + total; }
      if(tree){ tree.innerHTML = renderTreeHTML(grouped); }
      log('Selected updated', { total, grouped });
    }

    // Initial and reactive updates
    updateSelectedContextTree();
    document.addEventListener('change', function(ev){
      const el = ev.target;
      if(el && el.matches && el.matches('input[type="checkbox"][name="selected[]"]')){
        updateSelectedContextTree();
      }
    });
    document.addEventListener('click', function(ev){
      const btn = ev.target.closest && ev.target.closest('.mcp-select-pill');
      if(btn && btn.getAttribute('data-disabled') !== 'true'){
        // after pill toggles, reflect in tree
        setTimeout(updateSelectedContextTree, 0);
      }
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
