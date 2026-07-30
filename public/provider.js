(() => {
  const STORAGE_KEY = 'cv-forge-provider-v1';
  const DEFAULTS = {
    name: 'Custom provider',
    baseUrl: '',
    model: '',
    apiStyle: 'auto',
    authType: 'none',
    authHeader: 'Authorization',
    authScheme: 'Bearer',
    extraHeaders: ''
  };
  const nativeFetch = window.fetch.bind(window);
  let state = loadState();
  let els = {};

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (url === '/api/ai/parse' && String(init.method || 'GET').toUpperCase() === 'POST') {
      try {
        const body = JSON.parse(init.body || '{}');
        body.provider = currentProvider();
        return nativeFetch(input, { ...init, body: JSON.stringify(body) });
      } catch {
        return nativeFetch(input, init);
      }
    }
    return nativeFetch(input, init);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }

  function initialize() {
    const actions = document.querySelector('.ai-actions');
    if (!actions || document.querySelector('#provider-base-url')) return;

    actions.insertAdjacentHTML('beforebegin', providerMarkup());
    els = {
      status: document.querySelector('#api-status'),
      name: document.querySelector('#provider-name'),
      baseUrl: document.querySelector('#provider-base-url'),
      model: document.querySelector('#provider-model'),
      apiStyle: document.querySelector('#provider-style'),
      authType: document.querySelector('#provider-auth-type'),
      apiKey: document.querySelector('#provider-api-key'),
      authHeader: document.querySelector('#provider-auth-header'),
      authScheme: document.querySelector('#provider-auth-scheme'),
      extraHeaders: document.querySelector('#provider-extra-headers'),
      testButton: document.querySelector('#test-provider'),
      testResult: document.querySelector('#provider-test-result')
    };

    const privacy = document.querySelector('.privacy-note');
    if (privacy) {
      privacy.textContent = 'Your draft stays in this browser. Requests go only to the endpoint you configure. Authentication is optional, and the browser key field is never saved.';
    }

    render();
    bind();
    loadServerDefaults();
  }

  function bind() {
    const bindings = [
      [els.name, 'name'], [els.baseUrl, 'baseUrl'], [els.model, 'model'],
      [els.apiStyle, 'apiStyle'], [els.authType, 'authType'],
      [els.authHeader, 'authHeader'], [els.authScheme, 'authScheme'],
      [els.extraHeaders, 'extraHeaders']
    ];
    for (const [element, key] of bindings) {
      element.addEventListener('input', () => {
        state[key] = element.value;
        saveState();
        updateAuthFields();
        updateStatus();
      });
    }
    els.apiKey.addEventListener('input', updateStatus);
    els.testButton.addEventListener('click', testProvider);
  }

  async function loadServerDefaults() {
    try {
      const response = await nativeFetch('/api/health', { cache: 'no-store' });
      const data = await response.json();
      const defaults = data.provider || {};
      let changed = false;
      for (const key of ['name', 'baseUrl', 'model', 'apiStyle', 'authType', 'authHeader', 'authScheme']) {
        if (!state[key] && defaults[key]) {
          state[key] = defaults[key];
          changed = true;
        }
      }
      if (!state.extraHeaders && defaults.extraHeaders && Object.keys(defaults.extraHeaders).length) {
        state.extraHeaders = JSON.stringify(defaults.extraHeaders, null, 2);
        changed = true;
      }
      if (changed) {
        saveState();
        render();
      }
      updateStatus(Boolean(defaults.hasServerApiKey));
    } catch {
      updateStatus();
    }
  }

  function render() {
    els.name.value = state.name;
    els.baseUrl.value = state.baseUrl;
    els.model.value = state.model;
    els.apiStyle.value = state.apiStyle;
    els.authType.value = state.authType;
    els.authHeader.value = state.authHeader;
    els.authScheme.value = state.authScheme;
    els.extraHeaders.value = state.extraHeaders;
    updateAuthFields();
    updateStatus();
  }

  function updateAuthFields() {
    const noAuth = els.authType.value === 'none';
    els.apiKey.disabled = noAuth;
    els.authHeader.disabled = noAuth;
    els.authScheme.disabled = els.authType.value !== 'bearer';
    document.querySelectorAll('.provider-auth-option').forEach((node) => {
      node.classList.toggle('disabled', noAuth);
    });
  }

  function updateStatus(hasServerApiKey = false) {
    if (!els.status) return;
    if (!state.baseUrl || !state.model) {
      els.status.textContent = 'Configure AI provider';
      els.status.className = 'status-pill demo';
      return;
    }
    const auth = state.authType === 'none'
      ? 'no auth'
      : (els.apiKey.value || hasServerApiKey ? 'authenticated' : 'key not set');
    els.status.textContent = `${state.model} · ${auth}`;
    els.status.className = 'status-pill ready';
  }

  function currentProvider() {
    return {
      ...state,
      apiKey: els.apiKey?.value || ''
    };
  }

  async function testProvider() {
    if (!state.baseUrl || !state.model) {
      setTestResult('Enter a base URL and model first.', true);
      return;
    }
    els.testButton.disabled = true;
    setTestResult('Checking…');
    try {
      const response = await nativeFetch('/api/provider/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: currentProvider() })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Provider check failed.');
      const result = data.models?.length
        ? `${data.models.length} model${data.models.length === 1 ? '' : 's'} found${data.selectedModelFound === false ? '; selected model was not listed' : ''}.`
        : 'Connected; no model list was returned.';
      setTestResult(result);
      updateStatus();
    } catch (error) {
      setTestResult(error.message || 'Provider check failed.', true);
    } finally {
      els.testButton.disabled = false;
    }
  }

  function setTestResult(message, error = false) {
    els.testResult.textContent = message;
    els.testResult.classList.toggle('error-text', error);
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { ...DEFAULTS, ...parsed, apiKey: undefined };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function providerMarkup() {
    return `
      <details class="provider-card" open>
        <summary>
          <span><strong>AI provider</strong><small>Any OpenAI-compatible endpoint</small></span>
          <span class="provider-summary-note">API key optional</span>
        </summary>
        <div class="provider-body">
          <div class="form-grid provider-grid">
            <div class="field-group"><label for="provider-name">Provider name</label><input id="provider-name" class="input" type="text" placeholder="My local provider"></div>
            <div class="field-group"><label for="provider-style">API format</label><select id="provider-style" class="input"><option value="auto">Auto-detect</option><option value="responses">Responses API</option><option value="chat_completions">Chat Completions</option></select></div>
            <div class="field-group full"><label for="provider-base-url">Base URL</label><input id="provider-base-url" class="input" type="url" placeholder="http://127.0.0.1:1234/v1" spellcheck="false"><p class="comma-hint">Use the API root, not the full /chat/completions path.</p></div>
            <div class="field-group full"><label for="provider-model">Model</label><input id="provider-model" class="input" type="text" placeholder="Model ID exposed by your endpoint" spellcheck="false"></div>
            <div class="field-group"><label for="provider-auth-type">Authentication</label><select id="provider-auth-type" class="input"><option value="none">None</option><option value="bearer">Bearer token</option><option value="header">Custom key header</option></select></div>
            <div class="field-group"><label for="provider-api-key">Key or token</label><input id="provider-api-key" class="input" type="password" autocomplete="off" placeholder="Leave blank for no-auth endpoints"></div>
            <div class="field-group provider-auth-option"><label for="provider-auth-header">Auth header</label><input id="provider-auth-header" class="input" type="text" placeholder="Authorization"></div>
            <div class="field-group provider-auth-option"><label for="provider-auth-scheme">Auth scheme</label><input id="provider-auth-scheme" class="input" type="text" placeholder="Bearer"></div>
            <div class="field-group full"><label for="provider-extra-headers">Extra headers (JSON, optional)</label><textarea id="provider-extra-headers" class="textarea code-textarea provider-code" rows="3" spellcheck="false" placeholder='{"X-Custom-Header":"value"}'></textarea></div>
          </div>
          <div class="provider-actions"><button id="test-provider" class="button ghost" type="button">Test provider</button><span id="provider-test-result" class="muted"></span></div>
        </div>
      </details>`;
  }
})();
