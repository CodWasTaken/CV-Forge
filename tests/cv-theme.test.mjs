import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { CV_THEME_PRESETS, cvThemeVariables, normalizeCvTheme, readableTextColor, themeFromPreset } from '../public/lib/cv-theme.mjs';

const execFileAsync = promisify(execFile);

test('normalizes CV themes and rejects invalid colors', () => {
  const theme = normalizeCvTheme({ preset: 'ocean', accent: 'not-a-color', page: '#ABCDEF', font: 'missing' });
  assert.equal(theme.accent, CV_THEME_PRESETS.ocean.accent);
  assert.equal(theme.page, '#abcdef');
  assert.equal(theme.font, CV_THEME_PRESETS.ocean.font);
});

test('theme presets produce printable CSS variables', () => {
  const theme = themeFromPreset('forest');
  const variables = cvThemeVariables(theme);
  assert.equal(variables['--cv-accent'], CV_THEME_PRESETS.forest.accent);
  assert.equal(variables['--cv-page-bg'], CV_THEME_PRESETS.forest.page);
  assert.match(variables['--cv-body-font'], /sans-serif|serif|monospace/);
});

test('selects readable text for accent backgrounds', () => {
  assert.equal(readableTextColor('#111111'), '#ffffff');
  assert.equal(readableTextColor('#f8fafc'), '#111111');
});

test('server injects the theme assets and print CSS preserves backgrounds', async () => {
  const [css, ui, http] = await Promise.all([
    readFile(new URL('../public/cv-theme.css', import.meta.url), 'utf8'),
    readFile(new URL('../public/cv-theme.js', import.meta.url), 'utf8'),
    readFile(new URL('../lib/http.mjs', import.meta.url), 'utf8')
  ]);
  assert.match(css, /print-color-adjust:\s*exact/);
  assert.match(css, /-webkit-print-color-adjust:\s*exact/);
  assert.match(css, /template-halo \.halo-side/);
  assert.match(ui, /CV theme maker/);
  assert.match(ui, /stopImmediatePropagation/);
  assert.match(ui, /fetch\('\/cv-theme\.css\?v=1'\)/);
  assert.match(http, /cv-theme\.css\?v=1/);
  assert.match(http, /cv-theme\.js\?v=1/);
});

test('theme browser module has valid JavaScript syntax', async () => {
  await execFileAsync(process.execPath, ['--check', new URL('../public/cv-theme.js', import.meta.url).pathname]);
});
