// Suggestions stay on the wordmaster's device until the normal setup is submitted.
const DICTIONARY = require('./it-en-dictionary.json');
const DIFFICULTIES = ['facile', 'medio', 'difficile'];
const WORDS = Object.fromEntries(DIFFICULTIES.map(level => [
  level,
  DICTIONARY.entries[level].map(({ prompt, translation }) => [prompt, translation]),
]));

// Shuffle without replacement; at the cycle boundary avoid repeating the last word.
function createSuggestionPicker(random = Math.random) {
  const remaining = {};
  const last = {};
  return (difficulty = 'facile') => {
    if (!Object.prototype.hasOwnProperty.call(WORDS, difficulty)) throw new RangeError('Difficoltà non valida');
    const entries = DICTIONARY.entries[difficulty];
    if (!remaining[difficulty]?.length) {
      remaining[difficulty] = entries.map((_, index) => index);
      for (let i = remaining[difficulty].length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [remaining[difficulty][i], remaining[difficulty][j]] = [remaining[difficulty][j], remaining[difficulty][i]];
      }
      const deck = remaining[difficulty];
      if (deck[deck.length - 1] === last[difficulty]) {
        [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
      }
    }
    last[difficulty] = remaining[difficulty].pop();
    const { prompt, translation, synonyms, sense, pos } = entries[last[difficulty]];
    return { prompt, translation, synonyms, sense, pos, difficulty };
  };
}

const normalize = value => value.normalize('NFKC').trim().toLowerCase();
const DICTIONARY_TRANSLATIONS = new Map();
for (const level of DIFFICULTIES) {
  for (const { prompt, translation } of DICTIONARY.entries[level]) {
    const key = normalize(prompt);
    if (!DICTIONARY_TRANSLATIONS.has(key)) DICTIONARY_TRANSLATIONS.set(key, new Set());
    DICTIONARY_TRANSLATIONS.get(key).add(normalize(translation));
  }
}

function isPromptInDictionary(prompt) {
  return DICTIONARY_TRANSLATIONS.has(normalize(prompt));
}

function findDictionaryAnswerIndex(prompt, options) {
  const translations = DICTIONARY_TRANSLATIONS.get(normalize(prompt));
  if (!translations) return null;
  const matches = options.flatMap((option, index) => translations.has(normalize(option)) ? [index] : []);
  return matches.length === 1 ? matches[0] : null;
}

function pickDistractors(suggestion, random) {
  const difficulty = DIFFICULTIES.includes(suggestion.difficulty) ? suggestion.difficulty : 'facile';
  const translations = new Map();
  for (const entry of DICTIONARY.entries[difficulty]) {
    const translation = entry.translation.trim();
    const key = normalize(translation);
    if (key && key !== normalize(suggestion.translation) && !translations.has(key)) translations.set(key, translation);
  }
  const candidates = [...translations.values()];
  return Array.from({ length: 4 }, () => candidates.splice(Math.min(candidates.length - 1, Math.floor(random() * candidates.length)), 1)[0]);
}

function applySuggestion(form, suggestion, random = Math.random) {
  const correct = Math.floor(random() * 5);
  const options = Array(5);
  options[correct] = suggestion.translation;
  const distractors = pickDistractors(suggestion, random);
  let distractorIndex = 0;
  for (let index = 0; index < options.length; index++) {
    if (index !== correct) options[index] = distractors[distractorIndex++];
  }
  const replacedOption = !form.suggested && (
    (form.prompt.trim() && normalize(form.prompt) !== normalize(suggestion.prompt)) ||
    form.options.some((option, index) => option.trim() && normalize(option) !== normalize(options[index]))
  );
  return {
    form: { prompt: suggestion.prompt, options, correct, suggested: { index: correct, translation: suggestion.translation, synonyms: suggestion.synonyms || [], sense: suggestion.sense || '' } },
    replacedOption: Boolean(replacedOption),
  };
}

// While a suggestion is active, only the four distractors can be edited.
function updateSetupForm(form, changes) {
  if (form.suggested && (
    ('prompt' in changes && changes.prompt !== form.prompt) ||
    ('correct' in changes && changes.correct !== form.correct) ||
    'options' in changes ||
    'suggested' in changes
  )) return form;
  const updated = { ...form, ...changes };
  const dictionaryAnswer = findDictionaryAnswerIndex(updated.prompt, updated.options);
  if (dictionaryAnswer !== null) updated.correct = dictionaryAnswer;
  return updated;
}

module.exports = { WORDS, createSuggestionPicker, applySuggestion, updateSetupForm, isPromptInDictionary, findDictionaryAnswerIndex };