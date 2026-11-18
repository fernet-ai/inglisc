const { test } = require('node:test');
const assert = require('node:assert/strict');
const { WORDS, createSuggestionPicker, applySuggestion, updateSetupForm } = require('../services/wordSuggestions');

const emptyForm = () => ({ prompt: '', options: ['', '', '', '', ''], correct: null, suggested: null });

test('each difficulty has a distinct shuffled deck without boundary repetitions', () => {
  const allWords = Object.values(WORDS).flat();
  assert.equal(new Set(allWords.map(([prompt]) => prompt)).size, allWords.length);
  const next = createSuggestionPicker(() => 0.999);
  for (const [difficulty, words] of Object.entries(WORDS)) {
    assert.ok(words.length > 12);
    assert.ok(words.every(([prompt, translation]) => prompt && translation));
    const firstCycle = Array.from({ length: words.length }, () => next(difficulty));
    assert.equal(new Set(firstCycle.map(word => word.prompt)).size, words.length);
    assert.ok(firstCycle.every(word => words.some(([prompt, translation]) => prompt === word.prompt && translation === word.translation)));
    const nextCycle = Array.from({ length: words.length }, () => next(difficulty));
    assert.notEqual(firstCycle.at(-1).prompt, nextCycle[0].prompt);
    assert.equal(new Set(nextCycle.map(word => word.prompt)).size, words.length);
  }
  assert.throws(() => next('inesistente'), RangeError);
});

test('switching difficulty preserves each deck and never repeats the preceding suggestion', () => {
  const next = createSuggestionPicker(() => 0.5);
  const first = next('facile');
  const medium = next('medio');
  const back = next('facile');
  assert.notEqual(first.prompt, medium.prompt);
  assert.notEqual(medium.prompt, back.prompt);
  assert.notEqual(first.prompt, back.prompt);
});

test('a suggestion fills any of the five random positions and selects it', () => {
  for (let index = 0; index < 5; index++) {
    const { form, replacedOption } = applySuggestion(emptyForm(), { prompt: 'gatto', translation: 'cat' }, () => (index + 0.1) / 5);
    assert.equal(form.prompt, 'gatto');
    assert.equal(form.correct, index);
    assert.equal(form.options[index], 'cat');
    assert.equal(form.options.filter(Boolean).length, 1);
    assert.equal(replacedOption, false);
  }
});

test('changing suggestion preserves manual answers and removes the old unedited suggestion', () => {
  const first = applySuggestion(emptyForm(), { prompt: 'gatto', translation: 'cat' }, () => 0).form;
  first.options[2] = 'dog';
  const next = applySuggestion(first, { prompt: 'casa', translation: 'house' }, () => 0.9).form;
  assert.deepEqual(next.options, ['', '', 'dog', '', 'house']);
  assert.equal(next.correct, 4);
  assert.equal(first.options[0], 'cat');
});

test('a manually edited suggested answer is preserved and a matching translation is reused', () => {
  const form = { prompt: 'gatto', options: ['fox', ' HOUSE ', '', '', ''], correct: 0, suggested: { index: 0, translation: 'cat' } };
  const result = applySuggestion(form, { prompt: 'casa', translation: 'house' }, () => 0);
  assert.deepEqual(result.form.options, ['fox', 'house', '', '', '']);
  assert.equal(result.form.correct, 1);
  assert.equal(result.replacedOption, false);
});

test('when all options are occupied, replacement is reported and the source remains intact', () => {
  const form = { prompt: 'originale', options: ['one', 'two', 'three', 'four', 'five'], correct: 2, suggested: null };
  const result = applySuggestion(form, { prompt: 'casa', translation: 'house' }, () => 0.4);
  assert.deepEqual(result.form.options, ['one', 'two', 'house', 'four', 'five']);
  assert.equal(result.form.correct, 2);
  assert.equal(result.replacedOption, true);
  assert.deepEqual(form.options, ['one', 'two', 'three', 'four', 'five']);
});

test('suggested prompt, translation and correct selection cannot be edited until manual mode', () => {
  const form = applySuggestion(emptyForm(), { prompt: 'gatto', translation: 'cat' }, () => 0).form;
  assert.equal(updateSetupForm(form, { prompt: 'cane' }), form);
  assert.equal(updateSetupForm(form, { correct: 1 }), form);
  assert.equal(updateSetupForm(form, { options: ['dog', '', '', '', ''] }), form);
  assert.equal(updateSetupForm(form, { suggested: null }), form);
  const edited = updateSetupForm(form, { options: ['cat', 'dog', '', '', ''] });
  assert.equal(edited.options[1], 'dog');
  assert.equal(edited.correct, 0);
  const manual = { ...edited, suggested: null };
  assert.equal(updateSetupForm(manual, { correct: 1 }).correct, 1);
  assert.equal(updateSetupForm(manual, { prompt: 'cane' }).prompt, 'cane');
  assert.equal(updateSetupForm(manual, { options: ['fox', 'dog', '', '', ''] }).options[0], 'fox');
});