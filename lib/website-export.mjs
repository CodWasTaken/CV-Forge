import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { json, readJsonBody } from './http.mjs';
import { normalizeWebsite, renderWebsiteFiles, sanitizeFolderName, websiteFileList } from '../public/lib/website.mjs';

export function exportDirectory(env = process.env) {
  const configured = String(env.CV_EXPORT_DIR || './exports').trim() || './exports';
  const projectRoot = fileURLToPath(new URL('../', import.meta.url));
  return isAbsolute(configured) ? resolve(configured) : resolve(projectRoot, configured);
}

export async function handleExportStatus(_req, res, context) {
  const root = exportDirectory(context.env);
  await mkdir(root, { recursive: true });
  return json(res, 200, { ok: true, exportDirectory: root });
}

export async function handleWebsiteExport(req, res, context) {
  if (!context.allowRequest(req, 20)) return json(res, 429, { error: 'Too many export requests. Please wait and try again.' });
  const body = await readJsonBody(req, context.maxBodyBytes);
  const profile = body.profile && typeof body.profile === 'object' ? body.profile : {};
  const website = normalizeWebsite(body.website, profile);
  const fallback = `${sanitizeFolderName(profile.personal?.name || 'cv')}-website`;
  const folderName = sanitizeFolderName(body.folderName, fallback);
  const root = exportDirectory(context.env);
  const destination = resolve(root, folderName);
  const relativePath = relative(root, destination);
  if (relativePath.startsWith('..') || isAbsolute(relativePath) || !relativePath) return json(res, 400, { error: 'Invalid export folder name.' });

  const files = renderWebsiteFiles(profile, website);
  await mkdir(destination, { recursive: true });
  await Promise.all([
    writeFile(resolve(destination, 'index.html'), files.indexHtml, 'utf8'),
    writeFile(resolve(destination, 'styles.css'), files.stylesCss, 'utf8'),
    writeFile(resolve(destination, 'script.js'), files.scriptJs, 'utf8'),
    writeFile(resolve(destination, 'profile.json'), files.profileJson, 'utf8'),
    writeFile(resolve(destination, 'site.json'), files.siteJson, 'utf8')
  ]);

  return json(res, 200, {
    ok: true,
    folderName,
    savedPath: destination,
    files: websiteFileList(),
    previewUrl: `/exports/${encodeURIComponent(folderName)}/index.html`
  });
}
