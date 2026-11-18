// Suggestions stay on the wordmaster's device until the normal setup is submitted.
const WORDS = {
  facile: [
  ['gatto', 'cat'], ['cane', 'dog'], ['cavallo', 'horse'], ['coniglio', 'rabbit'],
  ['farfalla', 'butterfly'], ['formica', 'ant'], ['ape', 'bee'], ['gufo', 'owl'],
  ['volpe', 'fox'], ['scoiattolo', 'squirrel'], ['tartaruga', 'turtle'], ['balena', 'whale'],
  ['delfino', 'dolphin'], ['pesce', 'fish'], ['rana', 'frog'], ['pecora', 'sheep'],
  ['mucca', 'cow'], ['gallina', 'hen'], ['anatra', 'duck'], ['maiale', 'pig'],
  ['mela', 'apple'], ['pera', 'pear'], ['fragola', 'strawberry'], ['ciliegia', 'cherry'],
  ['pesca', 'peach'], ['limone', 'lemon'], ['arancia', 'orange'], ['uva', 'grapes'],
  ['carota', 'carrot'], ['patata', 'potato'], ['pomodoro', 'tomato'], ['cipolla', 'onion'],
  ['pane', 'bread'], ['formaggio', 'cheese'], ['burro', 'butter'], ['latte', 'milk'],
  ['acqua', 'water'], ['zucchero', 'sugar'], ['sale', 'salt'], ['miele', 'honey'],
  ['casa', 'house'], ['finestra', 'window'], ['porta', 'door'], ['tavolo', 'table'],
  ['sedia', 'chair'], ['letto', 'bed'], ['cuscino', 'pillow'], ['specchio', 'mirror'],
  ['cucchiaio', 'spoon'], ['forchetta', 'fork'], ['coltello', 'knife'], ['bicchiere', 'glass'],
  ['libro', 'book'], ['matita', 'pencil'], ['penna', 'pen'], ['quaderno', 'notebook'],
  ['zaino', 'backpack'], ['orologio', 'clock'], ['chiave', 'key'], ['ombrello', 'umbrella'],
  ['scarpa', 'shoe'], ['cappello', 'hat'], ['camicia', 'shirt'], ['giacca', 'jacket'],
  ['montagna', 'mountain'], ['collina', 'hill'], ['fiume', 'river'], ['lago', 'lake'],
  ['mare', 'sea'], ['isola', 'island'], ['spiaggia', 'beach'], ['foresta', 'forest'],
  ['albero', 'tree'], ['fiore', 'flower'], ['foglia', 'leaf'], ['radice', 'root'],
  ['sole', 'sun'], ['luna', 'moon'], ['stella', 'star'], ['nuvola', 'cloud'],
  ['pioggia', 'rain'], ['neve', 'snow'], ['vento', 'wind'], ['arcobaleno', 'rainbow'],
  ['treno', 'train'], ['aereo', 'airplane'], ['bicicletta', 'bicycle'], ['nave', 'ship'],
  ['strada', 'road'], ['ponte', 'bridge'], ['giardino', 'garden'], ['castello', 'castle'],
  ['cuore', 'heart'], ['sorriso', 'smile'], ['sogno', 'dream'], ['regalo', 'gift'],
  ['musica', 'music'], ['canzone', 'song'], ['colore', 'color'], ['ombra', 'shadow'],
  ],
  medio: [
    ['pipistrello', 'bat'], ['riccio', 'hedgehog'], ['lontra', 'otter'], ['gabbiano', 'seagull'],
    ['bruco', 'caterpillar'], ['coccinella', 'ladybug'], ['zanzara', 'mosquito'], ['ragno', 'spider'],
    ['ghianda', 'acorn'], ['cespuglio', 'bush'], ['fungo', 'mushroom'], ['rugiada', 'dew'],
    ['fulmine', 'lightning'], ['tuono', 'thunder'], ['grandine', 'hail'], ['nebbia', 'fog'],
    ['cascata', 'waterfall'], ['scogliera', 'cliff'], ['sentiero', 'path'], ['deserto', 'desert'],
    ['soffitta', 'attic'], ['cantina', 'cellar'], ['tetto', 'roof'], ['camino', 'fireplace'],
    ['cassetto', 'drawer'], ['scaffale', 'shelf'], ['coperta', 'blanket'], ['asciugamano', 'towel'],
    ['imbuto', 'funnel'], ['setaccio', 'sieve'], ['secchio', 'bucket'], ['scopa', 'broom'],
    ['ago', 'needle'], ['filo', 'thread'], ['tessuto', 'fabric'], ['bottoniera', 'buttonhole'],
    ['valigia', 'suitcase'], ['biglietto', 'ticket'], ['incrocio', 'crossroads'], ['marciapiede', 'sidewalk'],
    ['traguardo', 'finish line'], ['affollato', 'crowded'], ['scivoloso', 'slippery'], ['coraggioso', 'brave'],
    ['risparmiare', 'save'], ['sussurrare', 'whisper'], ['scoprire', 'discover'], ['raccogliere', 'gather'],
  ],
  difficile: [
    ['tasso', 'badger'], ['donnola', 'weasel'], ['martin pescatore', 'kingfisher'], ['lucciola', 'firefly'],
    ['libellula', 'dragonfly'], ['girino', 'tadpole'], ['lombrico', 'earthworm'], ['istrice', 'porcupine'],
    ['agrifoglio', 'holly'], ['vischio', 'mistletoe'], ['edera', 'ivy'], ['ortica', 'nettle'],
    ['corteccia', 'bark'], ['ramoscello', 'twig'], ['polline', 'pollen'], ['germoglio', 'sprout'],
    ['brina', 'frost'], ['ragnatela', 'cobweb'], ['crepuscolo', 'twilight'], ['aurora', 'dawn'],
    ['burrone', 'ravine'], ['palude', 'swamp'], ['ciottolo', 'pebble'], ['marea', 'tide'],
    ['davanzale', 'windowsill'], ['cerniera', 'hinge'], ['chiavistello', 'latch'], ['grondaia', 'gutter'],
    ['ditale', 'thimble'], ['gomitolo', 'ball of yarn'], ['scalpello', 'chisel'], ['mestolo', 'ladle'],
    ['truciolo', 'wood shaving'], ['scheggia', 'splinter'], ['fuliggine', 'soot'], ['ruggine', 'rust'],
    ['sbadiglio', 'yawn'], ['singhiozzo', 'hiccup'], ['brivido', 'shiver'], ['impronta', 'footprint'],
    ['ostinato', 'stubborn'], ['malizioso', 'mischievous'], ['friabile', 'brittle'], ['sbiadito', 'faded'],
    ['sgranocchiare', 'munch'], ['inciampare', 'stumble'], ['sbirciare', 'peek'], ['ondeggiare', 'sway'],
  ],
};

// Shuffle without replacement; at the cycle boundary avoid repeating the last word.
function createSuggestionPicker(random = Math.random) {
  const remaining = {};
  const last = {};
  return (difficulty = 'facile') => {
    if (!Object.prototype.hasOwnProperty.call(WORDS, difficulty)) throw new RangeError('Difficoltà non valida');
    const words = WORDS[difficulty];
    if (!remaining[difficulty]?.length) {
      remaining[difficulty] = words.map((_, index) => index);
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
    const [prompt, translation] = words[last[difficulty]];
    return { prompt, translation };
  };
}

const normalize = value => value.normalize('NFKC').trim().toLowerCase();

// Preserve manually entered answers; an unchanged previous suggestion can be reused.
function applySuggestion(form, suggestion, random = Math.random) {
  const options = [...form.options];
  const previous = form.suggested;
  const reusable = previous && options[previous.index] === previous.translation ? previous.index : null;
  const matching = options.map((value, index) => normalize(value) === normalize(suggestion.translation) ? index : -1).filter(index => index !== -1);
  const available = options.map((value, index) => !value.trim() || index === reusable ? index : -1).filter(index => index !== -1);
  const candidates = matching.length ? matching : available.length ? available : options.map((_, index) => index);
  const correct = candidates[Math.floor(random() * candidates.length)];
  const replacedOption = options[correct] && correct !== reusable && normalize(options[correct]) !== normalize(suggestion.translation);
  if (reusable !== null && reusable !== correct) options[reusable] = '';
  options[correct] = suggestion.translation;
  return {
    form: { prompt: suggestion.prompt, options, correct, suggested: { index: correct, translation: suggestion.translation } },
    replacedOption: Boolean(replacedOption),
  };
}

// While a suggestion is active, only the four distractors can be edited.
function updateSetupForm(form, changes) {
  if (form.suggested && (
    ('prompt' in changes && changes.prompt !== form.prompt) ||
    ('correct' in changes && changes.correct !== form.correct) ||
    ('options' in changes && changes.options[form.suggested.index] !== form.suggested.translation) ||
    'suggested' in changes
  )) return form;
  return { ...form, ...changes };
}

module.exports = { WORDS, createSuggestionPicker, applySuggestion, updateSetupForm };