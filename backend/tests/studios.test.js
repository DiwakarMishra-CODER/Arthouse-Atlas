import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCard } from '../services/catalogue.js';
import { buildStudios } from '../services/studios.js';

const film = (id, extra) => toCard({ _id: id, title: `Film ${id}`, year: 1960, directors: ['Someone'], countries: ['Japan'], movements: [], ...extra });

const cards = [
    film('a', { title: 'Seven Samurai', year: 1954, directors: ['Akira Kurosawa'], canonRank: 1, productionCompanies: ['TOHO'], provenance: [{ source: 'criterion', detail: 'Spine #2' }], stills: ['https://image.tmdb.org/t/p/w780/samurai.jpg'] }),
    film('b', { title: 'Ikiru', year: 1952, directors: ['Akira Kurosawa'], canonRank: 40, productionCompanies: ['Toho'], provenance: [{ source: 'criterion', detail: 'Spine #221' }] }),
    film('c', { title: 'Le Mépris', year: 1963, productionCompanies: ['Les Films Concordia', 'Neon Productions'], provenance: [{ source: 'criterion', detail: 'Box set: Godard' }] }),
    film('d', { title: 'Drive My Car', year: 2021 }),
    film('e', { title: 'Parasite', year: 2019 }),
];
const records = [{ name: 'NEON', featuredFilms: [{ movieId: 'd' }, { movieId: 'e' }] }];
const directors = new Map([['akirakurosawa', { _id: 'k', profileUrl: 'https://image.tmdb.org/t/p/original/k.jpg' }]]);
const all = buildStudios({ cards, records, directors });
const of = (slug) => all.find((s) => s.slug === slug);

test("a house holds every film credited to any of its spellings, in the order they were made", () => {
    assert.deepEqual(of('toho').films.map((f) => f.t), ['Ikiru', 'Seven Samurai']);
    assert.deepEqual(of('toho').years, [1952, 1954]);
});

test('look-alike credits belong to no house', () => {
    assert.equal(all.some((s) => s.films.some((f) => f.t === 'Le Mépris') && s.slug !== 'criterion'), false);
});

test('Criterion holds what the canon cites from its collection, in spine order, box sets last', () => {
    assert.deepEqual(of('criterion').films.map((f) => [f.spine ?? null, f.t]), [[2, 'Seven Samurai'], [221, 'Ikiru'], [null, 'Le Mépris']]);
});

test("a label holds its record's films, less the ones checked as another company's", () => {
    assert.deepEqual(of('neon').films.map((f) => f.t), ['Parasite']);
});

test('directors are counted, most films first, with their page where there is one', () => {
    assert.deepEqual(of('toho').directors, [{ name: 'Akira Kurosawa', n: 2, id: 'k', p: '/k.jpg' }]);
});
