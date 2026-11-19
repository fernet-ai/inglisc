const DICTIONARY = require('./it-en-dictionary.json');
const DIFFICULTIES = ['facile', 'medio', 'difficile'];

const normalize = value => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').trim().toLowerCase();
const clean = value => normalize(value).replace(/[^a-z]/g, '');
const ENGLISH_TRANSLATIONS = new Set(DIFFICULTIES.flatMap(level => DICTIONARY.entries[level].map(({ translation }) => clean(translation))));
const SUFFIX_REPLACEMENTS = [
  ['azione', 'ation'], ['itudine', 'itude'], ['zione', 'tion'], ['ità', 'ity'],
  ['ezza', 'essness'], ['anza', 'ance'], ['enza', 'ence'], ['aggio', 'age'],
  ['eria', 'ery'], ['ismo', 'ism'], ['ista', 'ist'], ['abile', 'able'],
  ['ibile', 'ible'], ['mente', 'ly'], ['oso', 'ous'], ['osa', 'ous'], ['one', 'oon'],
];
const ENGLISH_ENDINGS = ['ness', 'hood', 'ship', 'ful', 'less', 'ish', 'y', 'er', 'ing', 'able', 'like', 'wise', 'some', 'worthy', 'ize', 'ify', 'inator'];
const PREFIXES = ['un', 'over', 'under', 'mis', 're', 'super', 'anti', 'mega', 'ultra', 'self', 'pro'];
const COMPOUNDS = ['time', 'stuff', 'party', 'mode', 'sound', 'feeling', 'moment', 'mood'];
const SPELLING_RULES = [
  [/gli/gi, 'ly'], [/gn/gi, 'ny'], [/sc(?=[ie])/gi, 'sh'], [/ch/gi, 'k'],
  [/c(?=[aou])/gi, 'k'], [/c(?=[ie])/gi, 'ch'], [/g(?=[ie])/gi, 'j'],
  [/z/gi, 'zz'], [/qu/gi, 'kw'], [/f/gi, 'ph'], [/u/gi, 'oo'], [/i/gi, 'y'],
];
const ENGLISHISH = /(tion|ation|ity|ness|hood|ship|ful|less|ish|ing|able|like|wise|some|worthy|ize|ify|inator|sh|ck|ph|oo|y)$/;

function sharedPrefixLength(left, right) {
  let length = 0;
  while (length < left.length && length < right.length && left[length] === right[length]) length++;
  return length;
}

function candidateScore(candidate, roots) {
  const length = candidate.length;
  const sourceSimilarity = Math.max(...roots.map(root => sharedPrefixLength(candidate, root)), 0);
  let score = Math.min(sourceSimilarity, 6);
  if (length >= 6 && length <= 18) score += 2;
  if (ENGLISHISH.test(candidate)) score += 3;
  if (/(ck|sh|ph|oo|ow|wr|kn|igh)/.test(candidate)) score += 2;
  if (/(.)\1\1/.test(candidate)) score -= 1;
  if (/^[^aeiou]{4}/.test(candidate)) score -= 2;
  return score;
}

function generateFakeEnglishCandidates({ prompt, answer, synonyms = [], exclude = [] }) {
  const italianRoots = [...new Set([prompt, ...synonyms].map(clean).filter(root => root.length >= 2))];
  const englishRoot = clean(answer);
  const roots = [...new Set([...italianRoots, englishRoot].filter(root => root.length >= 2))];
  if (!roots.length) return [];

  const excluded = new Set([answer, ...exclude].map(clean).filter(Boolean));
  const candidates = new Set();
  const add = value => {
    const candidate = clean(value);
    if (candidate.length < 4 || candidate.length > 26 || excluded.has(candidate) || ENGLISH_TRANSLATIONS.has(candidate)) return;
    candidates.add(candidate);
  };

  for (const root of roots) {
    const italianRootSource = italianRoots.includes(root);
    add(root);
    if (italianRootSource) {
      for (const [italianEnding, englishEnding] of SUFFIX_REPLACEMENTS) {
        if (root.endsWith(italianEnding) && root.length > italianEnding.length) {
          add(`${root.slice(0, -italianEnding.length)}${englishEnding}`);
        }
      }
    }
    for (const ending of italianRootSource ? ENGLISH_ENDINGS : ['ishness', 'ification', 'efication', 'inator']) {
      add(`${root}${ending}`);
      if (root.endsWith('e')) add(`${root.slice(0, -1)}${ending}`);
    }
    for (const prefix of PREFIXES) add(`${prefix}${root}`);
    for (const compound of COMPOUNDS) add(`${root}${compound}`);
    add(`${root}x`);
    add(`${root}oon`);
    add(`${root}ishness`);
    add(`${root}ification`);

    for (const [pattern, replacement] of SPELLING_RULES) {
      const respelled = root.replace(pattern, replacement);
      if (respelled !== root) {
        add(respelled);
        add(`${respelled}ish`);
        add(`${respelled}ation`);
      }
    }

    if (root.length >= 7) {
      add(root[0] + root.slice(1, -1).replace(/[aeiou]/g, '') + root.at(-1));
      add(root.slice(0, -1));
    }
    add(root.replace(/([bcdfghjklmnpqrstvwxyz])([aeiou])/g, '$1$1$2'));
  }

  return [...candidates]
    .map(candidate => ({ candidate, score: candidateScore(candidate, roots) }))
    .sort((left, right) => right.score - left.score || left.candidate.localeCompare(right.candidate))
    .map(({ candidate }) => candidate);
}

function generateFakeEnglish(options, random = Math.random) {
  const candidates = generateFakeEnglishCandidates(options).slice(0, 20);
  if (!candidates.length) return null;
  const index = Math.max(0, Math.min(candidates.length - 1, Math.floor(random() * candidates.length)));
  return candidates[index];
}

module.exports = { generateFakeEnglish, generateFakeEnglishCandidates };