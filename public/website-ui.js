import { normalizeProfile } from './lib/profile.mjs';
import { createDefaultWebsite, inlineWebsitePreview, normalizeWebsite, renderWebsiteFiles, sanitizeFolderName } from './lib/website.mjs';
import { generateWebsiteAction, loadExportStatusAction, saveWebsiteAction } from './website-ui-actions.mjs';

const STORAGE_KEY = 'cv-forge-state-v1';
const accents = { aurora: '#7c5cff', studio: '#e35b36', mono: '#2f61ff' };
const els = {
  cvPreview: document.querySelector('#cv-preview'), websitePreview: document.querySelector('#website-preview'), previewLabel: document.querySelector('#preview-label'),
  outputOptions: [...document.querySelectorAll('[data-output-mode]')], exportMenus: [...document.querySelectorAll('[data-export-menu]')],
  themeGrid: document.querySelector('#website-theme-grid'), accent: document.querySelector('#website-accent'), folder: document.querySelector('#website-folder'),
  headline: document.querySelector('#website-headline'), subheadline: document.querySelector('#website-subheadline'), about: document.querySelector('#website-about'), contact: document.querySelector('#website-contact'),
  generate: document.querySelector('#generate-website-ai'), save: document.querySelector('#save-website'), saveToolbar: document.querySelector('#save-website-toolbar'),
  settings: document.querySelector('#website-tab-button'), exportDir: document.querySelector('#website-export-directory'), result: document.querySelector('#website-save-result'),
  savedPath: document.querySelector('#website-saved-path'), open: document.querySelector('#open-saved-website'), toast: document.querySelector('#toast')
};

let state = readState();
let lastProfileDigest = profileDigest(state);
let toastTimer;
let lastSavedUrl = state.lastWebsiteUrl || '';

initialize();

function initialize() {
  if (!els.websitePreview) return;
  bind();
  renderForm();
  setOutputMode(state.outputMode || 'pdf', false);
  loadExportStatusAction(els.exportDir);
  setInterval(syncFromEditor, 450);
}

function bind() {
  els.outputOptions.forEach((button) => button.addEventListener('click', () => setOutputMode(button.dataset.outputMode)));
  els.settings?.addEventListener('click', () => { setTab('website'); setOutputMode('website'); });
  document.querySelector('[data-tab="website"]')?.addEventListener('click', () => setOutputMode('website'));
  els.themeGrid?.addEventListener('click', (event) => {
    const card = event.target.closest('[data-website-theme]');
    if (!card) return;
    state.website.theme = card.dataset.websiteTheme;
    state.website.accent = accents[state.website.theme] || state.website.accent;
    updateWebsite(state.website);
  });
  [[els.accent, 'accent'], [els.headline, 'headline'], [els.subheadline, 'subheadline'], [els.about, 'aboutBody'], [els.contact, 'contactText']]
    .forEach(([element, key]) => element?.addEventListener('input', () => { state.website[key] = element.value; updateWebsite(state.website, false); }));
  els.folder?.addEventListener('input', persist);
  els.generate?.addEventListener('click', () => {
    syncFromEditor();
    generateWebsiteAction({ state, notify, setTab, updateWebsite, button: els.generate, profileHasContent });
  });
  els.save?.addEventListener('click', saveWebsite);
  els.saveToolbar?.addEventListener('click', saveWebsite);
  els.open?.addEventListener('click', () => { if (lastSavedUrl) window.open(lastSavedUrl, '_blank', 'noopener'); });
}

function readState() {
  let parsed = {};
  try { parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch {}
  const profile = normalizeProfile(parsed.profile);
  return {
    ...parsed,
    profile,
    story: typeof parsed.story === 'string' ? parsed.story : '',
    targetRole: typeof parsed.targetRole === 'string' ? parsed.targetRole : '',
    website: normalizeWebsite(parsed.website || createDefaultWebsite(profile), profile),
    websiteFolder: typeof parsed.websiteFolder === 'string' ? parsed.websiteFolder : '',
    outputMode: parsed.outputMode === 'website' ? 'website' : 'pdf'
  };
}

function persist() {
  let current = {};
  try { current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch {}
  state.websiteFolder = els.folder?.value || state.websiteFolder || '';
  const merged = { ...current, website: state.website, websiteFolder: state.websiteFolder, outputMode: state.outputMode, lastWebsiteUrl: lastSavedUrl };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

function syncFromEditor() {
  const next = readState();
  const digest = profileDigest(next);
  if (digest === lastProfileDigest) return;
  const previousDefault = createDefaultWebsite(state.profile);
  const wasDefault = ['headline', 'subheadline', 'aboutBody', 'contactText'].every((key) => state.website[key] === previousDefault[key]);
  state.profile = next.profile;
  state.story = next.story;
  state.targetRole = next.targetRole;
  state.website = wasDefault
    ? normalizeWebsite({ ...createDefaultWebsite(next.profile), theme: state.website.theme, accent: state.website.accent }, next.profile)
    : normalizeWebsite(state.website, next.profile);
  lastProfileDigest = digest;
  renderForm();
  renderPreview();
  persist();
}

function profileDigest(value) { return JSON.stringify([value.profile, value.story, value.targetRole]); }
function profileHasContent(profile) { return Boolean(profile.personal?.name || profile.summary || profile.experience?.length || profile.projects?.length || profile.education?.length); }

function updateWebsite(value, renderFields = true) {
  state.website = normalizeWebsite(value, state.profile);
  if (renderFields) renderForm();
  setOutputMode('website', false);
  renderPreview();
  persist();
}

function renderForm() {
  state.website = normalizeWebsite(state.website, state.profile);
  if (els.accent) els.accent.value = state.website.accent;
  if (els.headline && document.activeElement !== els.headline) els.headline.value = state.website.headline;
  if (els.subheadline && document.activeElement !== els.subheadline) els.subheadline.value = state.website.subheadline;
  if (els.about && document.activeElement !== els.about) els.about.value = state.website.aboutBody;
  if (els.contact && document.activeElement !== els.contact) els.contact.value = state.website.contactText;
  if (els.folder && document.activeElement !== els.folder) els.folder.value = state.websiteFolder || `${fileBaseName()}-website`;
  document.querySelectorAll('[data-website-theme]').forEach((card) => card.classList.toggle('active', card.dataset.websiteTheme === state.website.theme));
}

function setOutputMode(mode, shouldPersist = true) {
  state.outputMode = mode === 'website' ? 'website' : 'pdf';
  els.outputOptions.forEach((button) => button.classList.toggle('active', button.dataset.outputMode === state.outputMode));
  els.exportMenus.forEach((menu) => menu.classList.toggle('hidden', menu.dataset.exportMenu !== state.outputMode));
  els.cvPreview?.classList.toggle('hidden', state.outputMode === 'website');
  els.websitePreview.classList.toggle('hidden', state.outputMode !== 'website');
  if (state.outputMode === 'website') {
    els.previewLabel.textContent = `${capitalize(state.website.theme)} website`;
    renderPreview();
  }
  if (shouldPersist) persist();
}

function renderPreview() {
  state.website = normalizeWebsite(state.website, state.profile);
  els.websitePreview.srcdoc = inlineWebsitePreview(renderWebsiteFiles(state.profile, state.website));
}

function saveWebsite() {
  syncFromEditor();
  return saveWebsiteAction({ state, els, notify, persist, fileBaseName, profileHasContent, setLastSavedUrl: (url) => { lastSavedUrl = url; } });
}

function setTab(name) {
  document.querySelectorAll('.tab').forEach((tab) => { const active = tab.dataset.tab === name; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); });
  document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === name));
}

function notify(message, error = false) {
  if (!els.toast) return;
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  els.toast.classList.toggle('error', error);
  toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 3600);
}

function fileBaseName() { return sanitizeFolderName(state.profile.personal?.name || 'cv', 'cv'); }
function capitalize(value) { return value ? value[0].toUpperCase() + value.slice(1) : ''; }
