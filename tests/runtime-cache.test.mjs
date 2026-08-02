import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('website UI is cache-busted and browser actions do not depend on sanitizeFolderName', async () => {
  const [httpSource, uiSource, actionsSource] = await Promise.all([
    readFile(new URL('../lib/http.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../public/website-ui.js', import.meta.url), 'utf8'),
    readFile(new URL('../public/website-ui-actions.mjs', import.meta.url), 'utf8')
  ]);

  assert.match(httpSource, /website-ui\.js\?v=4/);
  assert.doesNotMatch(uiSource, /sanitizeFolderName/);
  assert.doesNotMatch(actionsSource, /sanitizeFolderName/);
});
