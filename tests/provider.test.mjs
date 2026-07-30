import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectChatText,
  collectResponsesText,
  extractJsonObject,
  normalizeBaseUrl,
  normalizeProvider,
  providerEndpoint,
  providerHeaders
} from '../lib/provider.mjs';

test('normalizes a full compatible endpoint to its base URL', () => {
  assert.equal(normalizeBaseUrl('http://127.0.0.1:1234/v1/chat/completions'), 'http://127.0.0.1:1234/v1');
});

test('supports providers with no API key', () => {
  const provider = normalizeProvider({ baseUrl: 'http://localhost:8080/v1', model: 'local-model', authType: 'none' });
  assert.equal(provider.apiKey, '');
  assert.deepEqual(providerHeaders(provider), { 'Content-Type': 'application/json' });
});

test('adds optional bearer authentication only when configured', () => {
  const provider = normalizeProvider({
    baseUrl: 'https://example.test/v1',
    model: 'example',
    apiKey: 'secret',
    authType: 'bearer'
  });
  assert.equal(providerHeaders(provider).Authorization, 'Bearer secret');
});

test('builds responses and chat completion endpoints', () => {
  const provider = normalizeProvider({ baseUrl: 'https://example.test/v1', model: 'example' });
  assert.equal(providerEndpoint(provider, 'responses'), 'https://example.test/v1/responses');
  assert.equal(providerEndpoint(provider, 'chat_completions'), 'https://example.test/v1/chat/completions');
});

test('extracts JSON from markdown fences or surrounding prose', () => {
  assert.deepEqual(extractJsonObject('```json\n{"ok":true}\n```'), { ok: true });
  assert.deepEqual(extractJsonObject('Result: {"ok":true} done'), { ok: true });
});

test('collects text from both compatible response formats', () => {
  assert.equal(collectResponsesText({ output: [{ type: 'message', content: [{ type: 'output_text', text: '{"ok":true}' }] }] }), '{"ok":true}');
  assert.equal(collectChatText({ choices: [{ message: { content: '{"ok":true}' } }] }), '{"ok":true}');
});
