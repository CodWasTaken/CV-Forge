import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultWebsite, inlineWebsitePreview, normalizeWebsite, renderWebsiteFiles, sanitizeFolderName, websiteFileList } from '../public/lib/website.mjs';

const profile = {
  personal: { name: 'Ada Lovelace', title: 'Computing Pioneer', email: 'ada@example.com', phone: '', location: 'London', website: '', linkedin: '' },
  summary: 'Translated mathematical ideas into practical computing concepts.',
  skills: ['Mathematics', 'Technical writing'],
  experience: [{ role: 'Analyst', organization: 'Engine Lab', location: 'London', start: '1842', end: '1843', summary: 'Documented the Analytical Engine.', achievements: ['Published the first algorithm intended for a machine.'] }],
  education: [],
  projects: [{ name: 'Bernoulli Notes', link: 'example.com', description: 'A machine-oriented algorithm.', achievements: [] }],
  certifications: [], awards: [], languages: ['English'], achievements: []
};

test('creates a complete website plan from a profile', () => {
  const website = createDefaultWebsite(profile);
  assert.match(website.headline, /Ada Lovelace/);
  assert.deepEqual(website.featuredExperience, [0]);
});

test('normalizes themes, colors, section order, and indexes', () => {
  const website = normalizeWebsite({ theme: 'bad', accent: 'red', sectionOrder: ['projects', 'projects'], featuredExperience: [0, 99] }, profile);
  assert.equal(website.theme, 'aurora');
  assert.equal(website.accent, '#7c5cff');
  assert.equal(website.sectionOrder[0], 'projects');
  assert.deepEqual(website.featuredExperience, [0]);
});

test('renders a portable static website bundle and escapes profile data', () => {
  const unsafe = structuredClone(profile);
  unsafe.personal.name = '<script>alert(1)</script>';
  const files = renderWebsiteFiles(unsafe, createDefaultWebsite(unsafe));
  assert.deepEqual(Object.keys(files), ['indexHtml', 'stylesCss', 'scriptJs', 'profileJson', 'siteJson']);
  assert.ok(files.indexHtml.includes('&lt;script&gt;'));
  assert.ok(!files.indexHtml.includes('<script>alert(1)</script>'));
  assert.ok(files.indexHtml.includes('styles.css'));
  assert.ok(files.stylesCss.includes('--accent'));
  assert.ok(files.scriptJs.includes('getFullYear'));
  assert.deepEqual(websiteFileList(), ['index.html', 'styles.css', 'script.js', 'profile.json', 'site.json']);
});

test('sanitizes local export folder names', () => {
  assert.equal(sanitizeFolderName('../../Ada Portfolio'), 'ada-portfolio');
  assert.equal(sanitizeFolderName('', 'cv-website'), 'cv-website');
});

test('renders an iframe-safe website preview', () => {
  const files = renderWebsiteFiles(profile, createDefaultWebsite(profile));
  const preview = inlineWebsitePreview(files);
  assert.ok(preview.includes('<style>'));
  assert.ok(!preview.includes('src="script.js"'));
  assert.ok(!preview.includes('href="#about"'));
  assert.ok(!preview.includes('class="hero-copy reveal"'));
  assert.ok(preview.includes('target="_blank"'));
});
