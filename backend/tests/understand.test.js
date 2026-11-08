import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCard } from '../services/catalogue.js';
import { checkReading, vocabularyOf, schemaFor, directorFor, filmFor, fold } from '../services/understand.js';
import { scoreReading } from '../scripts/nlsearch/lib/score.js';
import { rankByFeel, kinOf } from '../services/feel.js';
import { modelHealth } from '../services/modelHealth.js';

const film = (id, extra = {}) => toCard({
  _id: id, title: `Film ${id}`, year: 1960, directors: ['Someone'], countries: ['France'], runtime: 100, genres: ['Drama'], movements: [], ...extra,
});
const cards = [
  film('a', { title: 'Tokyo Story', year: 1953, directors: ['Yasujirō Ozu'], countries: ['Japan'], runtime: 136, canonRank: 2 }),
  film('b', { title: 'Late Spring', year: 1949, directors: ['Yasujiro Ozu'], countries: ['Japan'], runtime: 108 }),
  film('c', { title: 'Seven Samurai', year: 1954, directors: ['Akira Kurosawa'], countries: ['Japan'], runtime: 207 }),
  film('d', { title: 'Ikiru', year: 1952, directors: ['Akira Kurosawa'], countries: ['Japan'] }),
  film('e', { title: 'Cure', year: 1997, directors: ['Kiyoshi Kurosawa'], countries: ['Japan'], genres: ['Horror'] }),
  film('f', { title: 'Rashomon', year: 1950, directors: ['Akira Kurosawa'], countries: ['Japan'] }),
  film('g', { title: 'Stalker', year: 1979, directors: ['Andrei Tarkovsky'], countries: ['Soviet Union'], movements: ['Slow Cinema'] }),
  film('h', { title: 'Breathless', originalTitle: 'À bout de souffle', year: 1960, directors: ['Jean-Luc Godard'], movements: ['French New Wave'] }),
  film('i', { title: 'The Leopard', year: 1963, directors: ['Luchino Visconti'], countries: ['Italy'], runtime: 186 }),
];
const vocab = vocabularyOf({ cards });
const read = (raw, text) => checkReading({ offTopic: false, ...raw }, text, { cards, vocab });
const v = (value, words) => ({ value, words });

test('the vocabulary and the schema come from the catalogue, with closed lists as enums', () => {
  assert.deepEqual(vocab.decades, ['1940', '1950', '1960', '1970', '1990']);
  assert.ok(vocab.countries.includes('Soviet Union'));
  const s = schemaFor(vocab);
  assert.deepEqual(s.properties.country.items.properties.value.enum, vocab.countries);
  assert.deepEqual(s.required, Object.keys(s.properties)); // every slot answered, so nothing is left to improvise
});

test('a value is kept only when it is in the atlas and points at the request\'s own words', () => {
  const r = read({ country: [v('Japan', 'Japanese')], decade: [v('1960', '60s')] }, 'Japanese films from the 60s');
  assert.deepEqual(r.filters.country, ['Japan']);
  assert.deepEqual(r.filters.decade, [1960]);
  // a value with no words behind it in the request (drift) is dropped, and the drop is recorded
  const drift = read({ country: [v('Japan', 'Japanese')], genre: [v('Drama', 'dramatic')] }, 'Japanese films');
  assert.deepEqual(drift.filters.genre, []);
  assert.deepEqual(drift.dropped, [{ field: 'genre', value: 'Drama', why: 'no words in the request' }]);
  // a value outside the atlas is refused even if a model ignores the enum
  const invented = read({ country: [v('Wakanda', 'Wakanda')] }, 'films from Wakanda');
  assert.deepEqual(invented.filters.country, []);
  assert.equal(invented.dropped[0].why, 'not in the atlas');
  // words are matched whole, accents and case aside: "60" is not in "1960s"
  assert.equal(read({ decade: [v('1960', '60')] }, 'films from the 1960s').filters.decade.length, 0);
  assert.equal(fold('Agnès  VARDA!'), 'agnes varda');
});

test('directors are matched by the site\'s matcher; an unknown name is unplaced, never swapped', () => {
  assert.equal(directorFor('tarkovski', cards), 'Andrei Tarkovsky'); // one typo
  assert.equal(directorFor('ozu', cards), 'Yasujirō Ozu'); // two spellings, one person
  assert.equal(directorFor('Kurosawa', cards), 'Akira Kurosawa'); // three films here to one
  assert.equal(directorFor('Michael Bay', cards), null);
  const r = read({ director: [{ name: 'Michael Bay', words: 'Michael Bay' }] }, 'films by Michael Bay');
  assert.deepEqual(r.filters.director, []);
  assert.deepEqual(r.unplaced, ['Michael Bay']);
});

test('a film to start from must be in the atlas, by any of its titles', () => {
  assert.equal(filmFor('Stalker', cards).id, 'g');
  assert.equal(filmFor('a bout de souffle', cards).id, 'h');
  assert.equal(filmFor('Leopard', cards).id, 'i'); // a leading article aside
  assert.equal(filmFor('The Avengers', cards), null);
  assert.deepEqual(read({ like: [{ title: 'The Avengers', words: 'The Avengers' }] }, 'something like The Avengers').unplaced, ['The Avengers']);
});

test('spans of years, feel words, off-topic, and only the request\'s own words come back', () => {
  const r = read({ until: [{ year: 1949, words: 'before 1950' }], feel: ['sad', 'heartbreaking'], unplaced: ['not American'] }, 'sad films made before 1950, not American');
  assert.deepEqual(r.filters.years, { since: null, until: 1949 });
  assert.deepEqual(r.feel, ['sad']); // "heartbreaking" isn't in the request
  assert.deepEqual(r.unplaced, ['not American']);
  assert.equal(read({ since: [{ year: 2999, words: '2999' }] }, 'films from 2999').filters.years, '');
  const off = checkReading({ offTopic: true, country: [v('Japan', 'Japan')] }, 'weather in Japan', { cards, vocab });
  assert.equal(off.offTopic, true);
  assert.deepEqual(off.filters.country, []);
  assert.throws(() => checkReading('not json', 'x', { cards, vocab }));
});

test('a genre counts only when the request names it; a describing word goes to feel instead', () => {
  const funny = read({ genre: [v('Drama', 'funny')], feel: [] }, 'something funny');
  assert.deepEqual(funny.filters.genre, []);
  assert.deepEqual(funny.feel, ['funny']);
  assert.equal(funny.dropped[0].why, 'a describing word, not a genre named');
  // named, in the plural or by a plain synonym, it stays
  assert.deepEqual(read({ genre: [v('Drama', 'dramas')] }, 'Italian dramas').filters.genre, ['Drama']);
  // the check as first evaluated (version 1) let it through
  assert.deepEqual(checkReading({ genre: [v('Drama', 'funny')] }, 'something funny', { cards, vocab }, { check: 1 }).filters.genre, ['Drama']);
});

test('scoring: exact filters, any-of lists, all-of lists, time by the films it picks, drift', () => {
  const req = (expect, extra = {}) => ({ id: 't', kind: 'x', text: '', expect, ...extra });
  const japanSixties = read({ country: [v('Japan', 'Japanese')], decade: [v('1960', '60s')] }, 'Japanese films from the 60s');
  assert.equal(scoreReading(req({ country: 'Japan', decade: 1960 }), japanSixties, cards).right, true);
  assert.equal(scoreReading(req({ country: 'Japan' }), japanSixties, cards).drift, true); // a decade nobody asked for
  // "before 1950" as a span, or as every decade up to the 1940s: the same films, the same answer
  const span = read({ until: [{ year: 1949, words: 'before 1950' }] }, 'before 1950');
  const decades = read({ decade: [v('1940', '1940s')] }, 'the 1940s');
  assert.equal(scoreReading(req({ years: { until: 1949 } }), span, cards).right, true);
  assert.equal(scoreReading(req({ years: { until: 1949 } }), decades, cards).right, true);
  // any of a list; all of an "each"
  const short = read({ length: [v('short', 'too long')] }, 'nothing too long');
  assert.equal(scoreReading(req({ length: ['short', 'standard'] }), short, cards).right, true);
  assert.equal(scoreReading(req({ length: { each: ['short', 'standard'] } }), short, cards).right, false);
  // another complete answer that's also right
  const ninetyFour = read({ decade: [v('1990', '1994')] }, 'made in 1994');
  assert.equal(scoreReading(req({ years: { since: 1994, until: 1994 } }, { alsoRight: [{ decade: 1990 }] }), ninetyFour, cards).right, true);
  // unplaced and off-topic answers
  assert.equal(scoreReading(req({ unplaced: true }), read({ unplaced: ['not American'] }, 'not American'), cards).right, true);
  assert.equal(scoreReading(req({ offTopic: true }), checkReading({ offTopic: true }, 'pizza', { cards, vocab }), cards).right, true);
  assert.equal(scoreReading(req({ country: 'Japan' }), checkReading({ offTopic: true }, 'Japanese films', { cards, vocab }), cards).right, false);
});

test('feel order: films viewers described that way first, the rest as given; the story only when no viewer did', () => {
  const kin = kinOf({ melancholic: ['sad', 'melancholy'], funny: ['funny', 'hilarious'] });
  const v = (x) => Float32Array.from([x, Math.sqrt(1 - x * x)]);
  const index = {
    films: new Map([['a', v(0.45)], ['b', v(0.9)], ['c', v(0.5)], ['d', v(0.99)]]),
    countsOf: new Map([['a', [['melancholy', 10], ['slow', 4]]], ['c', [['war', 9], ['sad', 2]]], ['b', [['body horror', 20]]], ['d', [['creepy', 5]]]]),
    tagsOf: new Map([['a', ['melancholy', 'slow']], ['c', ['war', 'sad']], ['b', ['body horror']], ['d', ['creepy']]]),
    kin,
  };
  const cards = ['d', 'b', 'c', 'a'].map((id) => ({ _id: id }));
  const query = Float32Array.from([1, 0]);
  const sad = rankByFeel(cards, query, ['sad'], index);
  // a and c have viewers' words for it; b and d don't, and keep the order given (not their closer stories)
  assert.deepEqual(sad.map((x) => x.card._id), ['a', 'c', 'd', 'b']);
  assert.deepEqual(sad.map((x) => x.sure), [true, true, false, false]);
  assert.deepEqual(sad[0].matched, ['melancholy']);
  // no viewer said it at all: the story orders everything
  assert.deepEqual(rankByFeel(cards, query, ['set in winter'], index).map((x) => x.card._id), ['d', 'b', 'c', 'a']);
  // the embedding unreachable: the viewers' evidence still orders what it can
  assert.deepEqual(rankByFeel(cards, null, ['sad'], index).map((x) => x.card._id), ['a', 'c', 'd', 'b']);
});

test('a feeling described through a reference may be translated, only into the fixed list, pointing at its words', () => {
  const text = 'a film that feels like listening to Dillinger Escape Plan';
  const r = read({ inferred: [{ value: 'intense', from: 'listening to Dillinger Escape Plan' }, { value: 'violent', from: 'Dillinger Escape Plan' }] }, text);
  assert.deepEqual(r.inferred.map((x) => x.value), ['intense', 'violent']);
  // a word not in the list, or one translating words that aren't in the request, is refused
  const bad = read({ inferred: [{ value: 'chaotic', from: 'Dillinger Escape Plan' }, { value: 'tense', from: 'a mosh pit' }] }, text);
  assert.deepEqual(bad.inferred, []);
  assert.deepEqual(bad.dropped.map((d) => d.why), ['not in the list of feelings', 'no words in the request']);
  assert.ok(vocab.feelings.includes('intense') && !vocab.feelings.includes('chaotic'));
});

test('a model failing three times in a row rests five minutes; one answer clears it; all resting means all are tried', () => {
  const h = modelHealth({ failsToRest: 3, restMs: 1000 });
  const both = ['gemini', 'groq'];
  h.failed('gemini', 0); h.failed('gemini', 0);
  assert.deepEqual(h.order(both, 0), both); // two fails: still asked first
  h.failed('gemini', 0);
  assert.deepEqual(h.order(both, 10), ['groq']); // the third: set aside
  assert.deepEqual(h.order(both, 1001), both); // after its rest, tried again
  h.failed('gemini', 2000); h.answered('gemini'); h.failed('gemini', 2000); h.failed('gemini', 2000);
  assert.deepEqual(h.order(both, 2001), both); // an answer between fails starts the count again
  h.failed('gemini', 3000); h.failed('groq', 3000); h.failed('groq', 3000); h.failed('groq', 3000);
  assert.deepEqual(h.order(both, 3001), both); // both resting: both tried, in order
});
