import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCard } from '../services/catalogue.js';
import { buildStudios } from '../services/studios.js';

const film = (id, extra) => toCard({ _id: id, title: `Film ${id}`, year: 1960, directors: ['Someone'], countries: ['Japan'], movements: [], ...extra });

const cards = [
    film('a', { title: 'Seven Samurai', year: 1954, directors: ['Akira Kurosawa'], canonRank: 1, productionCompanies: ['TOHO'], provenance: [{ source: 'criterion', detail: 'Spine #2' }], stills: ['https://image.tmdb.org/t/p/w780/samurai.jpg'] }),
    film('b', { title: 'Ikiru', year: 1952, directors: ['Akira Kurosawa'], canonRank: 40, productionCompanies: ['Toho'], provenance: [{ source: 'criterion', detail: 'Spine #221' }] }),
    film('c', { title: 'Le Mépris', year: 1963, productionCompanies: ['Les Films Concordia', 'Neon Productions'], provenance: [{ source: 'criterion', detail: 'Box set: Godard' }], stills: ['https://image.tmdb.org/t/p/w780/mepris.jpg'] }),
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

test('a house carries its facts and its note, its style, and its neighbours on the lot', () => {
    const [house] = buildStudios({
        cards: [
            film('x', { title: 'Ikiru', year: 1952, runtime: 143, tmdbId: 3782, directors: ['Akira Kurosawa'], productionCompanies: ['TOHO'] }),
            film('y', { title: 'Kwaidan', year: 1965, runtime: 183, tmdbId: 30959, productionCompanies: ['TOHO'] }),
            film('z', { title: 'Unknown', year: 1970, productionCompanies: ['TOHO'] }),
        ],
        records: [],
        directors: new Map(),
        facts: { toho: { founded: 1932, founders: ['Ichizō Kobayashi'], place: 'Tokyo', logo: '/toho.png' } },
        notes: { toho: 'The studio of Godzilla.' },
        colour: { 3782: 'bw', 30959: 'colour' },
    }).filter((s) => s.slug === 'toho');
    assert.equal(house.about.founded, 1932);
    assert.equal(house.note, 'The studio of Godzilla.');
    assert.deepEqual(house.style.longest, { t: 'Kwaidan', r: 183 });
    assert.deepEqual(house.style.bw, { n: 1, of: 2 });
    assert.equal(house.films[0].r, 143);
});

test('the houses that share a director are each other’s neighbours', () => {
    const all = buildStudios({ cards, records, directors });
    assert.deepEqual(of('toho').neighbours.map((n) => n.slug), ['criterion']);
    assert.equal(of('toho').neighbours[0].s, '/mepris.jpg'); // shown by a film of its own, not Seven Samurai
    assert.ok(all.every((s) => Array.isArray(s.neighbours)));
});

test('the mainstream majors are not houses here', () => {
    const paramount = toCard({ _id: 'p', title: 'Vertigo', year: 1958, directors: ['Alfred Hitchcock'], productionCompanies: ['Paramount Pictures'] });
    assert.equal(buildStudios({ cards: [paramount], records: [], directors: new Map() }).some((s) => s.slug === 'paramount'), false);
});
