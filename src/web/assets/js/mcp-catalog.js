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
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
