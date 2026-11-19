const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateFakeEnglish, generateFakeEnglishCandidates } = require('../services/fakeEnglishGenerator');
const { WORDS } = require('../services/wordSuggestions');

test('fake-English candidates combine Italian roots, synonyms and English-style morphology', () => {
  const candidates = generateFakeEnglishCandidates({ prompt: 'caciara', answer: 'noise', synonyms: ['baccano'] });
  assert.ok(candidates.length > 20);
  assert.ok(candidates.includes('caciaraness'));
  assert.ok(candidates.includes('baccanoy'));
  assert.ok(candidates.includes('noisefication'));
});

test('generated options avoid the correct answer and words already in the option list', () => {
  const answer = 'noise';
  const existing = ['caciarness', 'baccanoy'];
  const result = generateFakeEnglish({ prompt: 'caciara', answer, synonyms: ['baccano'], exclude: existing }, () => 0);
  assert.ok(result);
  assert.notEqual(result, answer);
  assert.ok(!existing.includes(result));
  const next = generateFakeEnglish({ prompt: 'caciara', answer, synonyms: ['baccano'], exclude: [...existing, result] }, () => 0);
  assert.notEqual(next, result);
  const realTranslations = new Set(Object.values(WORDS).flatMap(words => words.map(([, translation]) => translation.toLowerCase().replace(/[^a-z]/g, ''))));
  assert.ok(generateFakeEnglishCandidates({ prompt: 'caciara', answer, synonyms: ['baccano'] }).every(candidate => !realTranslations.has(candidate)));
});

test('generator falls back to the available roots and returns null for empty input', () => {
  assert.ok(generateFakeEnglish({ prompt: 'puzza', answer: 'smell' }, () => 0));
  assert.equal(generateFakeEnglish({ prompt: '', answer: '' }), null);
  assert.deepEqual(generateFakeEnglishCandidates({ prompt: '', answer: '' }), []);
});