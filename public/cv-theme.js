import { CV_FONT_OPTIONS, CV_THEME_PRESETS, DEFAULT_CV_THEME, cvThemeVariables, normalizeCvTheme, themeFromPreset } from './lib/cv-theme.mjs?v=1';

const STORAGE_KEY = 'cv-forge-cv-theme-v1';
const APP_STORAGE_KEY = 'cv-forge-state-v1';
const preview = document.querySelector('#cv-preview');
const templateGrid = document.querySelector('#template-grid');
let theme = readTheme();
let controls = {};
let presetGrid;

initialize();

function initialize() {
  if (!preview || !templateGrid) return;
  injectThemeMaker();
  bindEvents();
  renderControls();
  applyTheme();
  interceptHtmlExport();
}

function injectThemeMaker() {
  const section = document.createElement('section');
  section.className = 'theme-maker';
  section.setAttribute('aria-labelledby', 'cv-theme-maker-title');
  section.innerHTML = `
    <div class="theme-maker-header">
      <div>
        <h2 id="cv-theme-maker-title">CV theme maker</h2>
        <p>Build a reusable color and typography theme for every PDF layout.</p>
      </div>
      <button id="cv-theme-reset" class="button ghost small" type="button">Reset theme</button>
    </div>
    <div id="cv-theme-presets" class="cv-theme-presets" aria-label="CV theme presets">
      ${Object.entries(CV_THEME_PRESETS).map(([key, preset]) => `
        <button class="cv-theme-preset" type="button" data-cv-theme-preset="${key}" aria-label="Use ${preset.name} theme">
          <span class="cv-theme-swatch" style="--swatch-accent:${preset.accent};--swatch-page:${preset.page};--swatch-panel:${preset.panel}"></span>
          <span>${preset.name}</span>
        </button>`).join('')}
    </div>
    <div class="cv-theme-controls">
      ${colorControl('accent', 'Accent')}
      ${colorControl('accent2', 'Accent shade')}
      ${colorControl('page', 'Page background')}
      ${colorControl('text', 'Main text')}
      ${colorControl('muted', 'Muted text')}
      ${colorControl('panel', 'Chips and panels')}
      <div class="cv-theme-control cv-theme-font">
        <label for="cv-theme-font">Typography</label>
        <select id="cv-theme-font" class="input">
          ${Object.entries(CV_FONT_OPTIONS).map(([key, option]) => `<option value="${key}">${option.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <p class="print-color-note"><strong>Printing tip:</strong> CV Forge requests exact print colors. If the print dialog still offers “Background graphics,” keep it enabled for the closest match.</p>`;
  templateGrid.insertAdjacentElement('afterend', section);

  presetGrid = section.querySelector('#cv-theme-presets');
  controls = {
    accent: section.querySelector('#cv-theme-accent'),
    accent2: section.querySelector('#cv-theme-accent2'),
    page: section.querySelector('#cv-theme-page'),
    text: section.querySelector('#cv-theme-text'),
    muted: section.querySelector('#cv-theme-muted'),
    panel: section.querySelector('#cv-theme-panel'),
    font: section.querySelector('#cv-theme-font'),
    reset: section.querySelector('#cv-theme-reset')
  };
}

function colorControl(key, label) {
  return `<div class="cv-theme-control"><label for="cv-theme-${key}">${label}</label><input id="cv-theme-${key}" class="cv-theme-color" type="color"></div>`;
}

function bindEvents() {
  presetGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cv-theme-preset]');
    if (!button) return;
    theme = themeFromPreset(button.dataset.cvThemePreset);
    saveAndApply();
  });

  Object.entries(controls).forEach(([key, element]) => {
    if (!element || key === 'reset') return;
    element.addEventListener('input', () => {
      theme = normalizeCvTheme({ ...theme, preset: 'custom', name: 'Custom', [key]: element.value });
      saveAndApply();
    });
  });

  controls.reset.addEventListener('click', () => {
    theme = normalizeCvTheme(DEFAULT_CV_THEME);
    saveAndApply();
  });
}

function renderControls() {
  Object.entries(controls).forEach(([key, element]) => {
    if (element && key !== 'reset') element.value = theme[key];
  });
  document.querySelectorAll('[data-cv-theme-preset]').forEach((button) => {
    button.classList.toggle('active', theme.preset === button.dataset.cvThemePreset);
  });
}

function saveAndApply() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  renderControls();
  applyTheme();
}

function applyTheme() {
  const variables = cvThemeVariables(theme);
  for (const [name, value] of Object.entries(variables)) {
    preview.style.setProperty(name, value);
    document.documentElement.style.setProperty(name, value);
  }
  preview.dataset.cvTheme = theme.preset;
}

function interceptHtmlExport() {
  document.querySelector('#download-html')?.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      const [appCss, themeCss] = await Promise.all([
        fetch('/styles.css').then(requireOk).then((response) => response.text()),
        fetch('/cv-theme.css?v=1').then(requireOk).then((response) => response.text())
      ]);
      const name = currentProfileName();
      const title = escapeHtml(name || 'CV');
      const markup = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — CV</title><style>${appCss}\n${themeCss}</style></head><body><article class="${escapeAttribute(preview.className)}" style="${escapeAttribute(preview.getAttribute('style') || '')}">${preview.innerHTML}</article></body></html>`;
      downloadBlob(`${fileBaseName(name)}.html`, markup, 'text/html;charset=utf-8');
      notify('The themed HTML CV was downloaded.');
    } catch {
      notify('Could not prepare the themed HTML export.', true);
    }
  }, true);
}

function currentProfileName() {
  try {
    const state = JSON.parse(localStorage.getItem(APP_STORAGE_KEY) || '{}');
    return String(state.profile?.personal?.name || '').trim();
  } catch {
    return '';
  }
}

function requireOk(response) {
  if (!response.ok) throw new Error('Asset request failed.');
  return response;
}

function fileBaseName(name) {
  return String(name || 'cv').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cv';
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function notify(message, error = false) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast${error ? ' error' : ''}`;
  window.setTimeout(() => toast.classList.add('hidden'), 3800);
}

function readTheme() {
  try {
    return normalizeCvTheme(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || DEFAULT_CV_THEME);
  } catch {
    return normalizeCvTheme(DEFAULT_CV_THEME);
  }
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  })[character]);
}

function escapeAttribute(value = '') {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
