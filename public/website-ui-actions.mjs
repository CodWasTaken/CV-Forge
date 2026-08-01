import { sanitizeFolderName } from './lib/website.mjs';

export async function generateWebsiteAction({ state, notify, setTab, updateWebsite, button, profileHasContent }) {
  if (!profileHasContent(state.profile)) { notify('Add your CV data before generating a website.', true); setTab('details'); return; }
  setBusy(button, true, 'Generating…');
  try {
    const response = await fetch('/api/ai/website', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: state.profile, website: state.website, story: state.story, targetRole: state.targetRole, clientId: state.clientId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Website generation failed.');
    updateWebsite(data.website);
    notify(`Website created with ${data.meta?.model || 'AI'}.`);
  } catch (error) { notify(error.message || 'Website generation failed.', true); }
  finally { setBusy(button, false, 'Generate website with AI'); }
}

export async function loadExportStatusAction(element) {
  try {
    const response = await fetch('/api/export/status', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not resolve export directory.');
    element.textContent = data.exportDirectory;
  } catch (error) { element.textContent = error.message || 'Unavailable'; }
}

export async function saveWebsiteAction({ state, els, notify, persist, fileBaseName, setLastSavedUrl, profileHasContent }) {
  if (!profileHasContent(state.profile)) { notify('Add your CV details before saving a website.', true); return; }
  const buttons = [els.save, els.saveToolbar].filter(Boolean);
  buttons.forEach((button) => { button.disabled = true; button.dataset.label = button.textContent; button.textContent = 'Saving…'; });
  try {
    const folderName = sanitizeFolderName(els.folder?.value, `${fileBaseName()}-website`);
    state.websiteFolder = folderName;
    const response = await fetch('/api/export/website', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: state.profile, website: state.website, folderName })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Website export failed.');
    setLastSavedUrl(data.previewUrl);
    if (els.folder) els.folder.value = data.folderName;
    els.savedPath.textContent = data.savedPath;
    els.result.classList.remove('hidden');
    persist();
    notify(`Website saved to ${data.savedPath}.`);
  } catch (error) { notify(error.message || 'Website export failed.', true); }
  finally { buttons.forEach((button) => { button.disabled = false; button.textContent = button.dataset.label || 'Save website'; }); }
}

function setBusy(button, busy, label) { if (!button) return; button.disabled = busy; button.textContent = label; }
