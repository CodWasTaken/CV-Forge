import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTemplate, listPlaceholders } from '../public/lib/template.mjs';

const data = {
  personal: { name: 'Ada Lovelace' },
  skills: ['Math', 'Programming'],
  experience: [
    { role: 'Analyst', organization: 'Engine Co.' },
    { role: 'Writer', organization: 'Science Review' }
  ]
};

test('renders nested scalar placeholders', () => {
  assert.equal(renderTemplate('{{personal.name}}', data), 'Ada Lovelace');
});

test('renders arrays as comma-separated values', () => {
  assert.equal(renderTemplate('{{skills}}', data), 'Math, Programming');
});

test('renders loops with object properties', () => {
  const result = renderTemplate('{{#experience}}{{role}} @ {{organization}}\n{{/experience}}', data);
  assert.equal(result, 'Analyst @ Engine Co.\nWriter @ Science Review\n');
});

test('lists unique placeholders', () => {
  assert.deepEqual(listPlaceholders('{{personal.name}} {{#experience}}{{role}}{{/experience}}'), ['personal.name', 'experience', 'role']);
});
