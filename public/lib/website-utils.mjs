export function renderBulletList(items = []) {
  const clean = items.filter(Boolean);
  return clean.length ? `<ul>${clean.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';
}

export function collectHighlights(profile) {
  return [
    ...(profile.experience || []).flatMap((item) => item.achievements || []),
    ...(profile.projects || []).flatMap((item) => item.achievements || []),
    ...(profile.achievements || [])
  ].filter(Boolean);
}

export function normalizeIndexes(value, length = 0, fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  return unique(source.map(Number).filter((index) => Number.isInteger(index) && index >= 0 && index < Number(length || 0))).slice(0, 6);
}

export function unique(items) { return [...new Set(items)]; }
export function text(value, fallback) { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
export function initials(name) { return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CV'; }
export function navLabel(section) { return section === 'credentials' ? 'Credentials' : section[0].toUpperCase() + section.slice(1); }
export function normalizeUrl(value) { const clean = String(value || '').trim(); return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`; }
export function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character]); }
export function escapeAttribute(value = '') { return escapeHtml(value).replace(/`/g, '&#096;'); }
