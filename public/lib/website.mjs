export { createDefaultWebsite, normalizeWebsite } from './website-config.mjs';
export { renderWebsiteFiles } from './website-render.mjs';

export function inlineWebsitePreview(files) {
  return files.indexHtml
    .replace('<link rel="stylesheet" href="styles.css">', `<style>${files.stylesCss}</style>`)
    .replace('  <script src="script.js" defer></script>\n', '');
}

export function sanitizeFolderName(value, fallback = 'cv-website') {
  const clean = String(value || '').toLowerCase().trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 80);
  return clean || fallback;
}

export function websiteFileList() {
  return ['index.html', 'styles.css', 'script.js', 'profile.json', 'site.json'];
}

