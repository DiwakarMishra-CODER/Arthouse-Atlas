import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCard, applyFilters, sortCards, facetCounts, searchScore, lengthOf, publicCard, oneTypoApart, nameMatches } from '../services/catalogue.js';

const film = (id, extra = {}) => toCard({
  _id: id, title: `Film ${id}`, year: 1960, directors: ['Someone'], countries: ['France'], runtime: 100, genres: ['Drama'],
  movements: [], canonRank: null, ...extra,
});

const cards = [
  film('a', { title: 'Tokyo Story', originalTitle: '東京物語', year: 1953, directors: ['Yasujirō Ozu'], countries: ['Japan'], runtime: 136, movements: ['Japanese Golden Age'], editorial: { tags: ['melancholic', 'contemplative', 'not-a-mood'] }, canonRank: 2 }),
  film('b', { title: 'Late Spring', year: 1949, directors: ['Yasujiro Ozu'], countries: ['Japan'], runtime: 108, movements: ['Japanese Golden Age'], editorial: { tags: ['intimate'] }, moods: { surreal: 1 }, canonRank: 30 }),
  film('c', { title: 'The 400 Blows', originalTitle: 'Les Quatre Cents Coups', year: 1959, directors: ['François Truffaut'], countries: ['France'], runtime: 99, movements: ['French New Wave'], canonRank: 12 }),
  film('d', { title: 'Tokyo Drifter', year: 1966, directors: ['Seijun Suzuki'], countries: ['Japan'], runtime: 82, genres: ['Crime'], canonRank: null, provenanceScore: 5 }),
  film('e', { title: 'Story of a Love Affair', year: 1950, directors: ['Michelangelo Antonioni'], countries: ['Italy', 'France'], runtime: 98, canonRank: null, provenanceScore: 9 }),
];
const ids = (list) => list.map((c) => c._id);

test('a card keeps what Explore shows and hides what it matches on', () => {
  const c = publicCard(cards[0]);
  assert.equal(c.originalTitle, '東京物語');
  assert.deepEqual(c.moods, ['melancholic', 'contemplative']); // from our notes, in the mood vocabulary only
  assert.deepEqual(publicCard(cards[1]).moods, ['intimate']); // never the keyword guesses
  assert.equal(c.length, 'long');
  assert.equal(c._id, 'a'); // the link to the film
  assert.ok(!Object.keys(c).some((k) => k.startsWith('_') && k !== '_id'));
  assert.deepEqual([lengthOf(80), lengthOf(90), lengthOf(120), lengthOf(121), lengthOf(181), lengthOf(0)], ['short', 'standard', 'standard', 'long', 'epic', null]);
});

test('every filter, and filters combined', () => {
  assert.deepEqual(ids(applyFilters(cards, { country: 'Japan' })), ['a', 'b', 'd']);
  assert.deepEqual(ids(applyFilters(cards, { country: 'France' })), ['c', 'e']); // a co-production counts for every country
  assert.deepEqual(ids(applyFilters(cards, { decade: 1950 })), ['a', 'c', 'e']);
  assert.deepEqual(ids(applyFilters(cards, { director: 'Yasujiro Ozu' })), ['a', 'b']); // spellings of one person match
  assert.deepEqual(ids(applyFilters(cards, { movement: 'French New Wave' })), ['c']);
  assert.deepEqual(ids(applyFilters(cards, { mood: 'intimate' })), ['b']);
  assert.deepEqual(ids(applyFilters(cards, { genre: 'Crime' })), ['d']);
  assert.deepEqual(ids(applyFilters(cards, { length: 'short' })), ['d']);
  assert.deepEqual(ids(applyFilters(cards, { country: 'Japan', decade: 1950 })), ['a']);
  assert.deepEqual(ids(applyFilters(cards, { country: '', decade: '', q: '' })), ids(cards)); // unset filters are ignored
});

test('search: accents and punctuation ignored; title beats other titles beats director', () => {
  assert.equal(searchScore(cards[0], 'tokyo'), 4); // title starts with it
  assert.equal(searchScore(cards[0], 'story'), 3); // title contains it
  assert.equal(searchScore(cards[2], 'quatre cents'), 2); // the original title
  assert.equal(searchScore(cards[2], 'Francois'), 1); // the director, without the cedilla
  assert.equal(searchScore(cards[0], '東京'), 2); // a script the normaliser can't read, matched as typed
  assert.equal(searchScore(cards[0], 'kurosawa'), 0);
  // while searching, the best matches lead, then the canon
  assert.deepEqual(ids(sortCards(applyFilters(cards, { q: 'story' }), 'acclaimed', { q: 'story' })), ['e', 'a']);
  assert.deepEqual(ids(sortCards(applyFilters(cards, { q: 'tokyo' }), 'acclaimed', { q: 'tokyo' })), ['a', 'd']);
});

test('sorts: the canon (unranked after, by evidence), oldest, newest, and a seeded shuffle', () => {
  assert.deepEqual(ids(sortCards(cards, 'acclaimed')), ['a', 'c', 'b', 'e', 'd']);
  assert.deepEqual(ids(sortCards(cards, 'oldest')), ['b', 'e', 'a', 'c', 'd']);
  assert.deepEqual(ids(sortCards(cards, 'newest')), ['d', 'c', 'a', 'e', 'b']);
  const once = ids(sortCards(cards, 'surprise', { seed: 42 }));
  assert.deepEqual(ids(sortCards([...cards].reverse(), 'surprise', { seed: 42 })), once); // the same shuffle every time
  assert.deepEqual([...once].sort(), ids(cards).sort());
  const others = [1, 2, 3, 4, 5].map((seed) => ids(sortCards(cards, 'surprise', { seed })).join(''));
  assert.ok(new Set(others).size > 1, 'different seeds, different shuffles');
});

test('facets count each filter\'s options with the other filters applied, never its own', () => {
  const f = facetCounts(cards, { country: 'Japan', decade: 1950 });
  // countries ignore the country filter (Japan stays one of several choices), but respect the decade
  assert.deepEqual(f.country, [{ value: 'France', n: 2 }, { value: 'Italy', n: 1 }, { value: 'Japan', n: 1 }]);
  // decades ignore the decade filter, but respect the country
  assert.deepEqual(f.decade, [{ value: 1940, n: 1 }, { value: 1950, n: 1 }, { value: 1960, n: 1 }]);
  assert.deepEqual(f.director, [{ value: 'Yasujirō Ozu', n: 1 }]);
  const all = facetCounts(cards, {});
  assert.deepEqual(all.director[0], { value: 'Yasujirō Ozu', n: 2 }); // two spellings, one person
  assert.deepEqual(all.length.map((l) => l.value), ['short', 'standard', 'long']); // in order, not by count
});

test('search forgives one typo per word, in titles and in directors\' names', () => {
  assert.ok(oneTypoApart('felini', 'fellini') && oneTypoApart('bergamn', 'bergman') && oneTypoApart('ozu', 'ozo'));
  assert.ok(!oneTypoApart('fellini', 'felinni2x') && !oneTypoApart('kurosawa', 'kitano'));
  const fellini = film('f', { title: 'La Strada', directors: ['Federico Fellini'] });
  assert.equal(searchScore(fellini, 'felini'), 0.5); // the director, one letter off
  assert.equal(searchScore(cards[0], 'tokio story'), 1.5); // the title, one letter off
  assert.equal(searchScore(cards[0], 'kurosawa'), 0);
  assert.ok(nameMatches('Federico Fellini', 'felini') && nameMatches('Yasujirō Ozu', 'yasujiro'));
  assert.ok(!nameMatches('Federico Fellini', 'bergman'));
});
