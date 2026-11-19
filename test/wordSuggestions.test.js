const { test } = require('node:test');
const assert = require('node:assert/strict');
const { WORDS, createSuggestionPicker, applySuggestion, updateSetupForm, isPromptInDictionary, findDictionaryAnswerIndex, findDictionarySynonyms } = require('../services/wordSuggestions');
const { generateFakeEnglishCandidates } = require('../services/fakeEnglishGenerator');
const dictionary = require('../services/it-en-dictionary.json');

const emptyForm = () => ({ prompt: '', options: ['', '', '', '', ''], correct: null, suggested: null });

test('offline dictionary has attribution and valid entries for every difficulty', () => {
  assert.equal(dictionary.metadata.license, 'CC BY-SA 4.0');
  assert.match(dictionary.metadata.attribution, /Wiktionary.*contributors/);
  assert.ok(dictionary.metadata.licenseUrl);
  const entries = Object.values(dictionary.entries).flat();
  assert.equal(entries.length, 4500);
  assert.equal(new Set(entries.map(entry => entry.prompt.normalize('NFKC').toLowerCase())).size, entries.length);
  assert.ok(entries.some(entry => entry.synonyms.length > 0));
  assert.ok(entries.every(entry => entry.prompt && entry.translation && Array.isArray(entry.synonyms)));
});

test('dictionary lookup matches normalized Italian prompts and rejects absent words', () => {
  const prompt = dictionary.entries.facile[0].prompt;
  assert.equal(isPromptInDictionary(`  ${prompt.toUpperCase()}  `), true);
  assert.equal(isPromptInDictionary('parolainventatainesistente'), false);
});

test('dictionary translation selects and locks its unique matching option', () => {
  const { prompt, translation } = dictionary.entries.facile[0];
  const options = ['wrong', translation, 'other', 'another', 'last'];
  assert.equal(findDictionaryAnswerIndex(prompt, options), 1);
  assert.equal(findDictionaryAnswerIndex('parolainventatainesistente', options), null);
  assert.equal(findDictionaryAnswerIndex(prompt, [translation, translation, '', '', '']), null);
  const form = { prompt, options, correct: 0, suggested: null };
  assert.equal(updateSetupForm(form, { options }).correct, 1);
  assert.equal(updateSetupForm({ ...form, correct: 1 }, { correct: 3 }).correct, 1);
});

test('dictionary lookup returns Italian synonyms for the fake-English generator', () => {
  const entry = Object.values(dictionary.entries).flat().find(word => word.synonyms.length > 0);
  assert.ok(findDictionarySynonyms(entry.prompt).some(synonym => entry.synonyms.includes(synonym)));
  assert.deepEqual(findDictionarySynonyms('parolainventatainesistente'), []);
});

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

test('a suggestion mixes two dictionary distractors with two fake-English options', () => {
  for (let index = 0; index < 5; index++) {
    const suggestion = { prompt: 'gatto', translation: 'cat', synonyms: ['micio', 'felino'], difficulty: 'facile' };
    const { form, replacedOption } = applySuggestion(emptyForm(), suggestion, () => (index + 0.1) / 5);
    assert.equal(form.prompt, 'gatto');
    assert.equal(form.correct, index);
    assert.equal(form.options[index], 'cat');
    assert.equal(form.options.length, 5);
    assert.ok(form.options.every(Boolean));
    assert.equal(new Set(form.options.map(value => value.normalize('NFKC').trim().toLowerCase())).size, 5);
    const levelTranslations = new Set(WORDS.facile.map(([, translation]) => translation.normalize('NFKC').trim().toLowerCase()));
    const fakeCandidates = new Set(generateFakeEnglishCandidates({ prompt: suggestion.prompt, answer: suggestion.translation, synonyms: suggestion.synonyms }));
    const distractors = form.options.filter((_, optionIndex) => optionIndex !== index);
    assert.equal(distractors.filter(option => levelTranslations.has(option.normalize('NFKC').trim().toLowerCase())).length, 2);
    assert.equal(distractors.filter(option => fakeCandidates.has(option)).length, 2);
    assert.equal(replacedOption, false);
  }
});

test('changing suggestion generates a fresh set of options without mutating the previous form', () => {
  const first = applySuggestion(emptyForm(), { prompt: 'gatto', translation: 'cat' }, () => 0).form;
  const next = applySuggestion(first, { prompt: 'casa', translation: 'house' }, () => 0.9).form;
  assert.equal(next.options.filter(Boolean).length, 5);
  assert.equal(next.correct, 4);
  assert.equal(next.options[next.correct], 'house');
  assert.equal(new Set(next.options.map(value => value.toLowerCase())).size, 5);
  assert.equal(first.options[0], 'cat');
});

test('generating a suggestion replaces existing manual options and can be undone by restoring the source form', () => {
  const form = { prompt: 'originale', options: ['one', 'two', 'three', 'four', 'five'], correct: 2, suggested: null };
  const result = applySuggestion(form, { prompt: 'casa', translation: 'house' }, () => 0.4);
  assert.equal(result.form.options.filter(Boolean).length, 5);
  assert.equal(result.form.options[result.form.correct], 'house');
  assert.equal(result.replacedOption, true);
  assert.deepEqual(form.options, ['one', 'two', 'three', 'four', 'five']);
});

test('when all options are occupied, replacement is reported and the source remains intact', () => {
  const form = { prompt: 'originale', options: ['one', 'two', 'three', 'four', 'five'], correct: 2, suggested: null };
  const result = applySuggestion(form, { prompt: 'casa', translation: 'house' }, () => 0.4);
  assert.equal(result.form.options.filter(Boolean).length, 5);
  assert.equal(result.form.options[result.form.correct], 'house');
  assert.equal(result.replacedOption, true);
  assert.deepEqual(form.options, ['one', 'two', 'three', 'four', 'five']);
});

test('dictionary translation remains locked in manual mode until its prompt or option changes', () => {
  const form = applySuggestion(emptyForm(), { prompt: 'gatto', translation: 'cat' }, () => 0).form;
  assert.equal(updateSetupForm(form, { prompt: 'cane' }), form);
  assert.equal(updateSetupForm(form, { correct: 1 }), form);
  assert.equal(updateSetupForm(form, { options: ['dog', '', '', '', ''] }), form);
  assert.equal(updateSetupForm(form, { suggested: null }), form);
  const manual = { ...form, suggested: null };
  const changedOptions = updateSetupForm(manual, { options: ['fox', 'dog', 'bird', 'fish', 'horse'] });
  assert.equal(changedOptions.options[0], 'fox');
  const changedCorrect = updateSetupForm(manual, { correct: 1 });
  assert.equal(changedCorrect.correct, 0);
  const changedPrompt = updateSetupForm(manual, { prompt: 'parolainventatainesistente' });
  assert.equal(changedPrompt.prompt, 'parolainventatainesistente');
  const unlocked = updateSetupForm(changedPrompt, { correct: 1 });
  assert.equal(unlocked.correct, 1);
});