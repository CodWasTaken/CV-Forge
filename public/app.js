import { renderTemplate } from './lib/template.mjs';
import { emptyProfile, normalizeProfile, demoProfile } from './lib/profile.mjs';

const STORAGE_KEY = 'cv-forge-state-v1';
const DEFAULT_CUSTOM_TEMPLATE = `{{personal.name}}
{{personal.title}}

{{personal.email}} · {{personal.phone}} · {{personal.location}}
{{personal.linkedin}} · {{personal.website}}

PROFILE
{{summary}}

SKILLS
{{skills}}

EXPERIENCE
{{#experience}}
{{role}} — {{organization}}
{{start}}–{{end}} · {{location}}
{{summary}}
Achievements: {{achievements}}

{{/experience}}
EDUCATION
{{#education}}
{{degree}} — {{institution}} ({{start}}–{{end}})
{{details}}

{{/education}}
PROJECTS
{{#projects}}
{{name}} — {{link}}
{{description}}
Achievements: {{achievements}}

{{/projects}}
CERTIFICATIONS
{{certifications}}

AWARDS
{{awards}}

LANGUAGES
{{languages}}

ADDITIONAL ACHIEVEMENTS
{{achievements}}
`;

const sectionDefaults = {
  experience: { role: '', organization: '', location: '', start: '', end: '', summary: '', achievements: [] },
  education: { degree: '', institution: '', location: '', start: '', end: '', details: '' },
  projects: { name: '', link: '', description: '', achievements: [] }
};

const state = loadState();
let saveTimer;
let toastTimer;

const els = {
  apiStatus: document.querySelector('#api-status'),
  tabs: [...document.querySelectorAll('.tab')],
  panels: [...document.querySelectorAll('.tab-panel')],
  targetRole: document.querySelector('#target-role'),
  storyInput: document.querySelector('#story-input'),
  storyFile: document.querySelector('#story-file'),
  storyCount: document.querySelector('#story-count'),
  extractAi: document.querySelector('#extract-ai'),
  improveAi: document.querySelector('#improve-ai'),
  aiProgress: document.querySelector('#ai-progress'),
  coachCard: document.querySelector('#coach-card'),
  coachNotes: document.querySelector('#coach-notes'),
  followUpQuestions: document.querySelector('#follow-up-questions'),
  detailsForm: document.querySelector('#details-form'),
  templateGrid: document.querySelector('#template-grid'),
  customTemplate: document.querySelector('#custom-template'),
  templateFile: document.querySelector('#template-file'),
  preview: document.querySelector('#cv-preview'),
  previewLabel: document.querySelector('#preview-label'),
  printCv: document.querySelector('#print-cv'),
  downloadHtml: document.querySelector('#download-html'),
  downloadJson: document.querySelector('#download-json'),
  downloadTxt: document.querySelector('#download-txt'),
  loadDemo: document.querySelector('#load-demo'),
  resetApp: document.querySelector('#reset-app'),
  toast: document.querySelector('#toast')
};

initialize();

function initialize() {
  els.targetRole.value = state.targetRole;
  els.storyInput.value = state.story;
  els.customTemplate.value = state.customTemplate;
  setActiveTemplate(state.template, false);
  updateStoryCount();
  renderDetailsForm();
  renderCv();
  renderCoach();
  bindEvents();
  checkHealth();
}

function bindEvents() {
  els.tabs.forEach((tab) => tab.addEventListener('click', () => setTab(tab.dataset.tab)));

  els.targetRole.addEventListener('input', () => {
    state.targetRole = els.targetRole.value;
    queueSave();
  });

  els.storyInput.addEventListener('input', () => {
    state.story = els.storyInput.value;
    updateStoryCount();
    queueSave();
  });

  els.customTemplate.addEventListener('input', () => {
    state.customTemplate = els.customTemplate.value;
    if (state.template === 'custom') renderCv();
    queueSave();
  });

  els.storyFile.addEventListener('change', async () => {
    const file = els.storyFile.files?.[0];
    if (!file) return;
    try {
      state.story = await file.text();
      els.storyInput.value = state.story;
      updateStoryCount();
      queueSave();
      showToast(`Imported ${file.name}.`);
    } catch {
      showToast('Could not read that text file.', true);
    } finally {
      els.storyFile.value = '';
    }
  });

  els.templateFile.addEventListener('change', async () => {
    const file = els.templateFile.files?.[0];
    if (!file) return;
    try {
      state.customTemplate = await file.text();
      els.customTemplate.value = state.customTemplate;
      setActiveTemplate('custom');
      showToast(`Imported template ${file.name}.`);
    } catch {
      showToast('Could not read that template.', true);
    } finally {
      els.templateFile.value = '';
    }
  });

  els.extractAi.addEventListener('click', () => runAi('extract'));
  els.improveAi.addEventListener('click', () => runAi(state.targetRole ? 'tailor' : 'improve'));

  els.detailsForm.addEventListener('input', handleDetailsInput);
  els.detailsForm.addEventListener('click', handleDetailsClick);

  els.templateGrid.addEventListener('click', (event) => {
    const card = event.target.closest('[data-template]');
    if (card) setActiveTemplate(card.dataset.template);
  });

  els.printCv.addEventListener('click', () => window.print());
  els.downloadJson.addEventListener('click', downloadJson);
  els.downloadTxt.addEventListener('click', downloadTxt);
  els.downloadHtml.addEventListener('click', downloadHtml);

  els.loadDemo.addEventListener('click', () => {
    state.profile = normalizeProfile(demoProfile);
    state.story = 'Demo profile loaded. Replace this text with your own career story, then use Build CV with AI.';
    els.storyInput.value = state.story;
    updateStoryCount();
    renderDetailsForm();
    renderCv();
    queueSave();
    showToast('Demo profile loaded.');
  });

  els.resetApp.addEventListener('click', () => {
    if (!window.confirm('Reset the CV, story, and template settings in this browser?')) return;
    const fresh = createInitialState();
    Object.assign(state, fresh);
    localStorage.removeItem(STORAGE_KEY);
    els.targetRole.value = '';
    els.storyInput.value = '';
    els.customTemplate.value = state.customTemplate;
    setActiveTemplate('slate', false);
    updateStoryCount();
    renderDetailsForm();
    renderCoach();
    renderCv();
    showToast('CV Forge was reset.');
  });
}

function createInitialState() {
  return {
    profile: emptyProfile(),
    story: '',
    targetRole: '',
    template: 'slate',
    customTemplate: DEFAULT_CUSTOM_TEMPLATE,
    coachNotes: [],
    followUpQuestions: [],
    clientId: crypto.randomUUID()
  };
}

function loadState() {
  const initial = createInitialState();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      ...initial,
      ...parsed,
      profile: normalizeProfile(parsed.profile),
      template: ['slate', 'halo', 'editorial', 'custom'].includes(parsed.template) ? parsed.template : 'slate',
      customTemplate: typeof parsed.customTemplate === 'string' ? parsed.customTemplate : DEFAULT_CUSTOM_TEMPLATE,
      coachNotes: Array.isArray(parsed.coachNotes) ? parsed.coachNotes : [],
      followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions : [],
      clientId: typeof parsed.clientId === 'string' ? parsed.clientId : crypto.randomUUID()
    };
  } catch {
    return initial;
  }
}

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), 220);
}

function setTab(name) {
  els.tabs.forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  els.panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === name));
}

async function checkHealth() {
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    const data = await response.json();
    if (data.apiConfigured) {
      els.apiStatus.textContent = `${data.model} connected`;
      els.apiStatus.className = 'status-pill ready';
    } else {
      els.apiStatus.textContent = `${data.model} · add API key`;
      els.apiStatus.className = 'status-pill demo';
    }
  } catch {
    els.apiStatus.textContent = 'AI server unavailable';
    els.apiStatus.className = 'status-pill demo';
  }
}

async function runAi(mode) {
  if (mode === 'extract' && !state.story.trim()) {
    showToast('Add some career notes first.', true);
    els.storyInput.focus();
    return;
  }

  setAiBusy(true);
  try {
    const response = await fetch('/api/ai/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        story: state.story,
        targetRole: state.targetRole,
        existingProfile: state.profile,
        clientId: state.clientId
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'AI request failed.');

    state.profile = normalizeProfile(data.profile);
    state.coachNotes = Array.isArray(data.coachNotes) ? data.coachNotes : [];
    state.followUpQuestions = Array.isArray(data.followUpQuestions) ? data.followUpQuestions : [];
    queueSave();
    renderDetailsForm();
    renderCoach();
    renderCv();
    setTab('details');
    showToast(`CV updated with ${data.meta?.model || 'AI'}.`);
  } catch (error) {
    showToast(error.message || 'AI request failed.', true);
  } finally {
    setAiBusy(false);
  }
}

function setAiBusy(busy) {
  els.aiProgress.classList.toggle('hidden', !busy);
  els.extractAi.disabled = busy;
  els.improveAi.disabled = busy;
  els.extractAi.textContent = busy ? 'Building…' : 'Build CV with AI';
}

function renderCoach() {
  const notes = state.coachNotes.filter(Boolean);
  const questions = state.followUpQuestions.filter(Boolean);
  els.coachCard.classList.toggle('hidden', notes.length === 0 && questions.length === 0);
  els.coachNotes.innerHTML = notes.length
    ? `<ul>${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>`
    : '';
  els.followUpQuestions.innerHTML = questions.length
    ? `<h3>Useful follow-ups</h3><ul>${questions.map((question) => `<li>${escapeHtml(question)}</li>`).join('')}</ul>`
    : '';
}

function updateStoryCount() {
  els.storyCount.textContent = `${state.story.length.toLocaleString()} characters`;
}

function renderDetailsForm() {
  const p = state.profile;
  els.detailsForm.innerHTML = `
    ${renderPersonalSection(p.personal)}
    ${renderSummarySection(p.summary)}
    ${renderStringListSection('skills', 'Skills', p.skills, 'One skill per line or comma-separated')}
    ${renderExperienceSection(p.experience)}
    ${renderEducationSection(p.education)}
    ${renderProjectsSection(p.projects)}
    ${renderStringListSection('certifications', 'Certifications', p.certifications)}
    ${renderStringListSection('awards', 'Awards', p.awards)}
    ${renderStringListSection('languages', 'Languages', p.languages)}
    ${renderStringListSection('achievements', 'Additional achievements', p.achievements)}
  `;
}

function renderPersonalSection(personal) {
  const fields = [
    ['name', 'Full name'], ['title', 'Professional title'], ['email', 'Email'], ['phone', 'Phone'],
    ['location', 'Location'], ['website', 'Website'], ['linkedin', 'LinkedIn']
  ];
  return `
    <details class="form-section" open>
      <summary>Personal details</summary>
      <div class="form-section-body form-grid">
        ${fields.map(([key, label]) => fieldInput(`personal.${key}`, label, personal[key], key === 'name' || key === 'title' ? 'full' : '')).join('')}
      </div>
    </details>`;
}

function renderSummarySection(summary) {
  return `
    <details class="form-section" open>
      <summary>Professional summary</summary>
      <div class="form-section-body">
        <div class="field-group">
          <label for="field-summary">Summary</label>
          <textarea id="field-summary" class="textarea" data-path="summary" rows="5">${escapeHtml(summary)}</textarea>
        </div>
      </div>
    </details>`;
}

function renderStringListSection(key, title, values, hint = 'One item per line') {
  return `
    <details class="form-section">
      <summary>${escapeHtml(title)} <span class="muted">${values.length}</span></summary>
      <div class="form-section-body">
        <div class="field-group">
          <label for="field-${key}">${escapeHtml(title)}</label>
          <textarea id="field-${key}" class="textarea" data-list-path="${key}" rows="5">${escapeHtml(values.join('\n'))}</textarea>
          <p class="comma-hint">${escapeHtml(hint)}</p>
        </div>
      </div>
    </details>`;
}

function renderExperienceSection(items) {
  return `
    <details class="form-section" open>
      <summary>Experience <span class="muted">${items.length}</span></summary>
      <div class="form-section-body">
        ${items.map((item, index) => `
          <div class="array-item">
            <div class="array-item-header"><strong>Role ${index + 1}</strong><button class="remove-item" data-action="remove" data-section="experience" data-index="${index}" type="button">Remove</button></div>
            <div class="form-grid">
              ${fieldInput(`experience.${index}.role`, 'Role', item.role)}
              ${fieldInput(`experience.${index}.organization`, 'Organization', item.organization)}
              ${fieldInput(`experience.${index}.location`, 'Location', item.location)}
              ${fieldInput(`experience.${index}.start`, 'Start', item.start)}
              ${fieldInput(`experience.${index}.end`, 'End', item.end)}
              ${fieldTextarea(`experience.${index}.summary`, 'Scope / context', item.summary, 'full')}
              ${fieldTextarea(`experience.${index}.achievements`, 'Achievement bullets', item.achievements.join('\n'), 'full', true)}
            </div>
          </div>`).join('')}
        <button class="button ghost add-item" data-action="add" data-section="experience" type="button">Add experience</button>
      </div>
    </details>`;
}

function renderEducationSection(items) {
  return `
    <details class="form-section">
      <summary>Education <span class="muted">${items.length}</span></summary>
      <div class="form-section-body">
        ${items.map((item, index) => `
          <div class="array-item">
            <div class="array-item-header"><strong>Education ${index + 1}</strong><button class="remove-item" data-action="remove" data-section="education" data-index="${index}" type="button">Remove</button></div>
            <div class="form-grid">
              ${fieldInput(`education.${index}.degree`, 'Degree / qualification', item.degree, 'full')}
              ${fieldInput(`education.${index}.institution`, 'Institution', item.institution)}
              ${fieldInput(`education.${index}.location`, 'Location', item.location)}
              ${fieldInput(`education.${index}.start`, 'Start', item.start)}
              ${fieldInput(`education.${index}.end`, 'End', item.end)}
              ${fieldTextarea(`education.${index}.details`, 'Details', item.details, 'full')}
            </div>
          </div>`).join('')}
        <button class="button ghost add-item" data-action="add" data-section="education" type="button">Add education</button>
      </div>
    </details>`;
}

function renderProjectsSection(items) {
  return `
    <details class="form-section">
      <summary>Projects <span class="muted">${items.length}</span></summary>
      <div class="form-section-body">
        ${items.map((item, index) => `
          <div class="array-item">
            <div class="array-item-header"><strong>Project ${index + 1}</strong><button class="remove-item" data-action="remove" data-section="projects" data-index="${index}" type="button">Remove</button></div>
            <div class="form-grid">
              ${fieldInput(`projects.${index}.name`, 'Project name', item.name)}
              ${fieldInput(`projects.${index}.link`, 'Link', item.link)}
              ${fieldTextarea(`projects.${index}.description`, 'Description', item.description, 'full')}
              ${fieldTextarea(`projects.${index}.achievements`, 'Achievement bullets', item.achievements.join('\n'), 'full', true)}
            </div>
          </div>`).join('')}
        <button class="button ghost add-item" data-action="add" data-section="projects" type="button">Add project</button>
      </div>
    </details>`;
}

function fieldInput(path, label, value, extraClass = '') {
  const id = `field-${path.replaceAll('.', '-')}`;
  return `<div class="field-group ${extraClass}"><label for="${id}">${escapeHtml(label)}</label><input id="${id}" class="input" data-path="${path}" value="${escapeAttribute(value)}"></div>`;
}

function fieldTextarea(path, label, value, extraClass = '', list = false) {
  const id = `field-${path.replaceAll('.', '-')}`;
  const attr = list ? `data-list-path="${path}"` : `data-path="${path}"`;
  return `<div class="field-group ${extraClass}"><label for="${id}">${escapeHtml(label)}</label><textarea id="${id}" class="textarea" ${attr} rows="4">${escapeHtml(value)}</textarea>${list ? '<p class="comma-hint">One bullet per line</p>' : ''}</div>`;
}

function handleDetailsInput(event) {
  const target = event.target;
  if (target.dataset.path) {
    setByPath(state.profile, target.dataset.path, target.value);
  } else if (target.dataset.listPath) {
    setByPath(state.profile, target.dataset.listPath, parseList(target.value));
  } else {
    return;
  }
  state.profile = normalizeProfile(state.profile);
  renderCv();
  queueSave();
}

function handleDetailsClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const section = button.dataset.section;
  if (!['experience', 'education', 'projects'].includes(section)) return;

  if (button.dataset.action === 'add') {
    state.profile[section].push(structuredClone(sectionDefaults[section]));
  }
  if (button.dataset.action === 'remove') {
    state.profile[section].splice(Number(button.dataset.index), 1);
  }
  renderDetailsForm();
  renderCv();
  queueSave();
}

function setByPath(object, path, value) {
  const parts = path.split('.');
  const final = parts.pop();
  const target = parts.reduce((current, part) => current[part], object);
  target[final] = value;
}

function parseList(value) {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function setActiveTemplate(template, shouldSave = true) {
  state.template = template;
  document.querySelectorAll('[data-template]').forEach((card) => card.classList.toggle('active', card.dataset.template === template));
  els.previewLabel.textContent = `${template[0].toUpperCase()}${template.slice(1)} template`;
  els.downloadTxt.disabled = template !== 'custom';
  renderCv();
  if (shouldSave) queueSave();
}

function renderCv() {
  const profile = state.profile;
  els.preview.className = `cv-paper template-${state.template}`;

  if (!profileHasContent(profile)) {
    els.preview.innerHTML = `<div class="cv-empty"><div><strong>Your CV will appear here</strong>Start with a career story, load the demo, or edit the details manually.</div></div>`;
    return;
  }

  if (state.template === 'custom') {
    els.preview.textContent = renderTemplate(state.customTemplate, profile).replace(/\n{3,}/g, '\n\n').trim();
    return;
  }

  els.preview.innerHTML = state.template === 'halo'
    ? renderHalo(profile)
    : state.template === 'editorial'
      ? renderEditorial(profile)
      : renderSlate(profile);
}

function renderSlate(profile) {
  return `
    ${renderHeader(profile)}
    ${section('Profile', profile.summary ? `<p>${escapeHtml(profile.summary)}</p>` : '')}
    ${section('Skills', renderSkills(profile.skills))}
    ${section('Experience', profile.experience.map(renderExperience).join(''))}
    ${section('Projects', profile.projects.map(renderProject).join(''))}
    ${section('Education', profile.education.map(renderEducation).join(''))}
    ${section('Certifications', renderSimpleList(profile.certifications))}
    ${section('Awards', renderSimpleList(profile.awards))}
    ${section('Languages', renderSimpleList(profile.languages))}
    ${section('Additional achievements', renderSimpleList(profile.achievements))}
  `;
}

function renderHalo(profile) {
  return `
    <aside class="halo-side">
      <h1 class="cv-name">${escapeHtml(profile.personal.name || 'Your name')}</h1>
      ${profile.personal.title ? `<p class="cv-title">${escapeHtml(profile.personal.title)}</p>` : ''}
      ${renderContact(profile.personal)}
      ${section('Skills', renderSkills(profile.skills))}
      ${section('Languages', renderSimpleList(profile.languages, 'side-list'))}
      ${section('Certifications', renderSimpleList(profile.certifications, 'side-list'))}
      ${section('Awards', renderSimpleList(profile.awards, 'side-list'))}
    </aside>
    <main class="halo-main">
      ${section('Profile', profile.summary ? `<p>${escapeHtml(profile.summary)}</p>` : '')}
      ${section('Experience', profile.experience.map(renderExperience).join(''))}
      ${section('Projects', profile.projects.map(renderProject).join(''))}
      ${section('Education', profile.education.map(renderEducation).join(''))}
      ${section('Additional achievements', renderSimpleList(profile.achievements))}
    </main>
  `;
}

function renderEditorial(profile) {
  return `
    <header class="cv-header">
      <div>
        <h1 class="cv-name">${escapeHtml(profile.personal.name || 'Your name')}</h1>
        ${profile.personal.title ? `<p class="cv-title">${escapeHtml(profile.personal.title)}</p>` : ''}
      </div>
      ${renderContact(profile.personal)}
    </header>
    ${profile.summary ? `<div class="editorial-intro"><p class="editorial-label">Profile</p><p>${escapeHtml(profile.summary)}</p></div>` : ''}
    ${section('Experience', profile.experience.map(renderExperience).join(''))}
    ${section('Projects', profile.projects.map(renderProject).join(''))}
    ${section('Education', profile.education.map(renderEducation).join(''))}
    ${section('Skills', renderSkills(profile.skills))}
    ${section('Selected achievements', renderSimpleList([...profile.achievements, ...profile.awards]))}
    ${section('Languages & certifications', renderSimpleList([...profile.languages, ...profile.certifications]))}
  `;
}

function renderHeader(profile) {
  return `<header class="cv-header"><h1 class="cv-name">${escapeHtml(profile.personal.name || 'Your name')}</h1>${profile.personal.title ? `<p class="cv-title">${escapeHtml(profile.personal.title)}</p>` : ''}${renderContact(profile.personal)}</header>`;
}

function renderContact(personal) {
  const entries = [
    ['email', personal.email], ['phone', personal.phone], ['location', personal.location],
    ['linkedin', personal.linkedin], ['website', personal.website]
  ].filter(([, value]) => value);

  if (!entries.length) return '';
  return `<div class="cv-contact">${entries.map(([type, value]) => {
    const safe = escapeHtml(value);
    if (type === 'email') return `<a href="mailto:${escapeAttribute(value)}">${safe}</a>`;
    if (type === 'phone') return `<a href="tel:${escapeAttribute(value.replace(/\s/g, ''))}">${safe}</a>`;
    if (type === 'website' || type === 'linkedin') return `<a href="${escapeAttribute(normalizeUrl(value))}">${safe}</a>`;
    return `<span>${safe}</span>`;
  }).join('')}</div>`;
}

function section(title, content) {
  if (!content || !content.trim()) return '';
  return `<section class="cv-section"><h2>${escapeHtml(title)}</h2><div>${content}</div></section>`;
}

function renderExperience(item) {
  if (![item.role, item.organization, item.summary, ...item.achievements].some(Boolean)) return '';
  const dates = [item.start, item.end].filter(Boolean).join('–');
  const meta = [dates, item.location].filter(Boolean).join(' · ');
  return `<div class="cv-item"><div class="cv-row"><div><h3>${escapeHtml(item.role || item.organization)}</h3>${item.organization && item.role ? `<p class="cv-org">${escapeHtml(item.organization)}</p>` : ''}</div>${meta ? `<p class="cv-meta">${escapeHtml(meta)}</p>` : ''}</div>${item.summary ? `<p class="cv-summary">${escapeHtml(item.summary)}</p>` : ''}${renderSimpleList(item.achievements)}</div>`;
}

function renderEducation(item) {
  if (![item.degree, item.institution, item.details].some(Boolean)) return '';
  const dates = [item.start, item.end].filter(Boolean).join('–');
  const meta = [dates, item.location].filter(Boolean).join(' · ');
  return `<div class="cv-item"><div class="cv-row"><div><h3>${escapeHtml(item.degree || item.institution)}</h3>${item.institution && item.degree ? `<p class="cv-org">${escapeHtml(item.institution)}</p>` : ''}</div>${meta ? `<p class="cv-meta">${escapeHtml(meta)}</p>` : ''}</div>${item.details ? `<p class="cv-summary">${escapeHtml(item.details)}</p>` : ''}</div>`;
}

function renderProject(item) {
  if (![item.name, item.description, ...item.achievements].some(Boolean)) return '';
  return `<div class="cv-item"><div class="cv-row"><div><h3>${escapeHtml(item.name || 'Project')}</h3>${item.link ? `<p class="cv-org"><a href="${escapeAttribute(normalizeUrl(item.link))}">${escapeHtml(item.link)}</a></p>` : ''}</div></div>${item.description ? `<p class="cv-summary">${escapeHtml(item.description)}</p>` : ''}${renderSimpleList(item.achievements)}</div>`;
}

function renderSkills(items) {
  const clean = items.filter(Boolean);
  return clean.length ? `<ul class="skills-list">${clean.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';
}

function renderSimpleList(items, className = '') {
  const clean = items.filter(Boolean);
  return clean.length ? `<ul class="${className}">${clean.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';
}

function profileHasContent(profile) {
  return Boolean(
    profile.personal.name || profile.personal.title || profile.summary || profile.skills.length ||
    profile.experience.length || profile.education.length || profile.projects.length ||
    profile.certifications.length || profile.awards.length || profile.languages.length || profile.achievements.length
  );
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function downloadJson() {
  downloadBlob(`${fileBaseName()}.json`, JSON.stringify(state.profile, null, 2), 'application/json');
}

function downloadTxt() {
  const rendered = renderTemplate(state.customTemplate, state.profile).replace(/\n{3,}/g, '\n\n').trim();
  downloadBlob(`${fileBaseName()}.txt`, rendered, 'text/plain;charset=utf-8');
}

async function downloadHtml() {
  try {
    const css = await fetch('/styles.css').then((response) => response.text());
    const title = escapeHtml(state.profile.personal.name || 'CV');
    const markup = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — CV</title><style>${css}</style></head><body><article class="${els.preview.className}">${els.preview.innerHTML}</article></body></html>`;
    downloadBlob(`${fileBaseName()}.html`, markup, 'text/html;charset=utf-8');
  } catch {
    showToast('Could not prepare the HTML export.', true);
  }
}

function fileBaseName() {
  return (state.profile.personal.name || 'cv').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cv';
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

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.className = `toast${isError ? ' error' : ''}`;
  toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 4300);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  })[character]);
}

function escapeAttribute(value = '') {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
