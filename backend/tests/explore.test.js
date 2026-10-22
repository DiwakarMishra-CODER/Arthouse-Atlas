import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCard, applyFilters, sortCards, facetCounts, searchScore, lengthOf, publicCard, oneTypoApart, nameMatches, framesOf, withinStart, tally } from '../services/catalogue.js';
import { makeIndex, similarTo } from '../services/recommender.js';

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

test('within one decade, most acclaimed follows the decade\'s own ranking, as the film pages count it', () => {
  // all-time, Petite Maman leads (two all-time polls); within the 2020s, the others do (prizes, year-end lists)
  const twenties = [
    film('pm', { title: 'Petite Maman', year: 2021, canonRank: 341, canonDecadeRank: 5 }),
    film('acc', { title: 'It Was Just an Accident', year: 2025, canonRank: 405, canonDecadeRank: 3 }),
    film('dmc', { title: 'Drive My Car', year: 2021, canonRank: 422, canonDecadeRank: 4 }),
    film('un', { title: 'Unranked', year: 2022, provenanceScore: 1 }),
  ];
  assert.equal(twenties[0].canonDecadeRank, 5);
  assert.deepEqual(ids(sortCards(twenties, 'acclaimed')), ['pm', 'acc', 'dmc', 'un']);
  assert.deepEqual(ids(sortCards(twenties, 'acclaimed', { decade: 2020 })), ['acc', 'dmc', 'pm', 'un']);
  assert.deepEqual(ids(sortCards(twenties, 'acclaimed', { decade: 2020, q: 'drive' })).slice(0, 1), ['dmc']); // a search still leads with its match
  assert.deepEqual(ids(sortCards(twenties, 'newest', { decade: 2020 })), ['acc', 'un', 'pm', 'dmc']); // other orders keep their own
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

const counts = (list) => list.map(({ value, n }) => ({ value, n }));

test('facets count each filter\'s options with the other filters applied, never its own', () => {
  const f = facetCounts(cards, { country: 'Japan', decade: 1950 });
  // countries ignore the country filter (Japan stays one of several choices), but respect the decade
  assert.deepEqual(counts(f.country), [{ value: 'France', n: 2 }, { value: 'Italy', n: 1 }, { value: 'Japan', n: 1 }]);
  // decades ignore the decade filter, but respect the country
  assert.deepEqual(counts(f.decade), [{ value: 1940, n: 1 }, { value: 1950, n: 1 }, { value: 1960, n: 1 }]);
  assert.deepEqual(counts(f.director), [{ value: 'Yasujirō Ozu', n: 1 }]);
  const all = facetCounts(cards, {});
  assert.deepEqual(counts(all.director).at(0), { value: 'Yasujirō Ozu', n: 2 }); // two spellings, one person
  assert.deepEqual(all.length.map((l) => l.value), ['short', 'standard', 'long']); // in order, not by count
});

test('every option is pictured by its most acclaimed film, under the other filters', () => {
  const all = facetCounts(cards, {});
  const topOf = (list, value) => list.find((o) => o.value === value).top;
  assert.equal(topOf(all.country, 'France').title, 'The 400 Blows'); // ranked beats unranked
  assert.equal(topOf(all.director, 'Yasujirō Ozu').title, 'Tokyo Story'); // across both spellings, the better ranked
  assert.equal(topOf(all.decade, 1950).title, 'Tokyo Story');
  // side by side, two options don't show the same film when another will do: Japan, the bigger,
  // keeps Tokyo Story; the 1950s (also led by Tokyo Story) shows its next best instead
  const japan = facetCounts(cards, { country: 'Japan' });
  assert.notEqual(topOf(japan.decade, 1940).title, topOf(japan.decade, 1950).title);
  // the other filters decide which films can stand for an option
  assert.equal(topOf(facetCounts(cards, { country: 'Italy' }).decade, 1950).title, 'Story of a Love Affair');
  assert.deepEqual(Object.keys(topOf(all.genre, 'Drama')).sort(), ['_id', 'still', 'title', 'year']);
});

test('a film\'s own frames: each picture once, at most four, the backdrop when it is a different picture', () => {
  const T = 'https://image.tmdb.org/t/p';
  assert.deepEqual(framesOf({ stills: [`${T}/w780/a.jpg`, `${T}/w780/b.jpg`], backdropUrl: `${T}/original/a.jpg` }), [`${T}/w780/a.jpg`, `${T}/w780/b.jpg`]);
  assert.deepEqual(framesOf({ stills: [], backdropUrl: `${T}/original/z.jpg` }), [`${T}/original/z.jpg`]);
  assert.equal(framesOf({ stills: ['1', '2', '3', '4', '5'].map((n) => `${T}/w780/${n}.jpg`) }).length, 4);
  assert.deepEqual(framesOf({}), []);
  const card = publicCard(film('z', { stills: [`${T}/w780/a.jpg`], backdropUrl: `${T}/original/b.jpg` }));
  assert.equal(card.still, `${T}/w780/a.jpg`);
  assert.equal(card.stills.length, 2);
});

test('a wall that starts from a film: closest first, the canon breaking ties', () => {
  const tm = (id, tmdbId) => film(id, { tmdbId, canonRank: { p: 5, q: 1, r: 9 }[id] });
  const wall = [tm('p', 10), tm('q', 20), tm('r', 30)];
  const near = new Map([[10, { score: 0.4 }], [20, { score: 0.9 }], [30, { score: 0.4 }]]);
  assert.deepEqual(ids(sortCards(wall, 'closest', { near })), ['q', 'p', 'r']);
  assert.deepEqual(ids(sortCards(wall, 'closest')), ['q', 'p', 'r']); // no film to start from: just the canon
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

test('a wall that starts from a film holds only the films it leads to, and counts within them', () => {
  const tm = (id, tmdbId, extra) => film(id, { tmdbId, ...extra });
  const wall = [tm('p', 10, { countries: ['Japan'] }), tm('q', 20, { countries: ['France'] }), tm('r', 30, { countries: ['Japan'] })];
  const near = new Map([[10, { score: 0.5 }], [30, { score: 0.2 }]]);
  assert.deepEqual(ids(withinStart(wall, near)), ['p', 'r']);
  assert.deepEqual(ids(withinStart(wall, null)), ['p', 'q', 'r']); // no film to start from: everything
  assert.deepEqual(counts(facetCounts(withinStart(wall, near), {}).country), [{ value: 'Japan', n: 2 }]);
  assert.deepEqual(tally(['a', 'b', 'a', 'c', 'a', 'b']), [{ value: 'a', n: 3 }, { value: 'b', n: 2 }, { value: 'c', n: 1 }]);
});

test('films like a film: its strongest links first, weak kinds of link left out when asked', () => {
  const index = makeIndex(new Map([
    [1, { prior: 0.5, nb: [[2, 0.9, 'v'], [3, 0.6, 'c'], [4, 0.3, 'd']] }],
    [2, { prior: 0.4, nb: [] }], [3, { prior: 0.3, nb: [] }], [4, { prior: 0.9, nb: [] }], [5, { prior: 1, nb: [] }],
  ]));
  assert.deepEqual(similarTo(index, 1, { limit: 10 }).map((r) => r.tmdbId), [2, 3, 4]); // never a film nothing links to
  assert.deepEqual(similarTo(index, 1, { reasons: ['v', 'd', 'm'] }).map((r) => r.tmdbId), [2, 4]);
  assert.deepEqual(similarTo(index, 99), []);
});
