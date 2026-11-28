const { test } = require('node:test');
const assert = require('node:assert/strict');
const { shuffleWords } = require('../services/flashcards');

test('shuffles a copy of the word list without losing entries', () => {
  const words = ['ciao', 'gatto', 'casa'];
  const shuffled = shuffleWords(words, () => 0);

  assert.deepEqual(shuffled, ['gatto', 'casa', 'ciao']);
  assert.deepEqual(words, ['ciao', 'gatto', 'casa']);
});

test('supports empty and single-word decks', () => {
  assert.deepEqual(shuffleWords([]), []);
  assert.deepEqual(shuffleWords(['ciao']), ['ciao']);
});