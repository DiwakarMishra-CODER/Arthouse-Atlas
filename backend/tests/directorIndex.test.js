import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCard } from '../services/catalogue.js';
import { buildDirectorIndex, compact } from '../services/directorIndex.js';

const film = (id, extra) => toCard({ _id: id, title: `Film ${id}`, year: 1960, directors: [], countries: ['France'], movements: [], ...extra });

const cards = [
    film('a', { title: 'Late Spring', year: 1949, directors: ['Yasujiro Ozu'], canonRank: 30, movements: ['Japanese Golden Age'], stills: ['https://image.tmdb.org/t/p/w780/late.jpg'] }),
    film('b', { title: 'Tokyo Story', year: 1953, directors: ['Yasujirō Ozu'], canonRank: 2, movements: ['Japanese Golden Age'], stills: ['https://image.tmdb.org/t/p/w780/tokyo.jpg'] }),
    film('c', { title: 'An Autumn Afternoon', year: 1962, directors: ['Yasujirō Ozu'], canonRank: null, provenanceScore: 9, posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg' }),
    film('d', { title: 'Russian Ark', year: 2002, directors: ['Aleksandr Sokurov'], canonRank: 371 }),
];
const directors = [
    { _id: 'ozu', name: 'Yasujirō Ozu', profileUrl: 'https://image.tmdb.org/t/p/original/ozu.jpg' },
    { _id: 'sokurov', name: 'Alexander Sokurov', profileUrl: '' },
];
const movements = [{ title: 'Japanese Golden Age', tag: 'gold_age_japan', startYear: 1950, keyDirectors: [{ directorId: 'ozu' }] }];
const index = buildDirectorIndex({ directors, movements, cards });
const ozu = index.directors.find((d) => d.n === 'Yasujirō Ozu');

test('a director gets every film credited under any spelling of their name, best standing first', () => {
    assert.deepEqual(ozu.f.map((f) => f.t), ['Tokyo Story', 'Late Spring', 'An Autumn Afternoon']);
});

test('films credited under another spelling of the name are found through its aliases', () => {
    assert.deepEqual(index.directors.find((d) => d.n === 'Alexander Sokurov').f.map((f) => f.t), ['Russian Ark']);
});

test('pictures are sent compact, and a poster only when a film has no still', () => {
    assert.equal(ozu.p, '/ozu.jpg');
    assert.equal(ozu.f[0].s, '/tokyo.jpg');
    assert.equal(ozu.f[0].o, undefined);
    assert.equal(ozu.f[2].s, null);
    assert.equal(ozu.f[2].o, '/poster.jpg');
    assert.equal(compact('/stills/lavventura.jpg'), '/stills/lavventura.jpg');
});

test('movements come as tags, for a director and for each film', () => {
    assert.deepEqual(ozu.mv, ['gold_age_japan']);
    assert.deepEqual(ozu.f[0].mv, ['gold_age_japan']);
    assert.deepEqual(index.movements, [{ tag: 'gold_age_japan', title: 'Japanese Golden Age', start: 1950 }]);
});
