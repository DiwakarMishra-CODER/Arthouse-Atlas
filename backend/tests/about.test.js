import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { toCard } from '../services/catalogue.js';
import { listIndex, listFilms, countFor } from '../services/about.js';
import { breakdown, scoreFilm } from '../scripts/canon/scoring.js';

const SOURCES = JSON.parse(fs.readFileSync(new URL('../data/listSources.json', import.meta.url), 'utf8'));
const film = (id, extra) => toCard({ _id: id, title: `Film ${id}`, year: 1960, directors: ['Someone'], countries: ['France'], movements: [], ...extra });
const cards = [
    film('a', { title: 'Vertigo', year: 1958, canonRank: 2, stills: ['https://image.tmdb.org/t/p/w780/v.jpg'], provenance: [
        { source: 'ss2022-critics', detail: '#2', rank: 2, weight: 2.99 },
        { source: 'ss2012-critics', detail: '#1', rank: 1, weight: 2.2 },
        { source: 'ss-historic', detail: '#1 · 2002 critics', rank: 1, pollYear: 2002, weight: 2.0 },
        { source: 'criterion', detail: 'Spine #300', weight: 0.66 },
    ] }),
    film('b', { title: 'Seven Samurai', year: 1954, canonRank: 1, provenance: [
        { source: 'ss2022-critics', detail: '#20', rank: 20, weight: 2.8 },
        { source: 'criterion', detail: 'Spine #2', weight: 0.66 },
        { source: 'cahiers-top10', detail: '#3 of 1955', rank: 3, weight: 1.5 },
    ] }),
    film('c', { title: 'The River', year: 1951, canonRank: 3, provenance: [{ source: 'cahiers-top10', detail: '#1 of 1951', rank: 1, weight: 1.8 }] }),
];
const catalogue = { cards, byId: new Map(cards.map((c) => [c._id, c])) };

test('a list keeps its own order: a poll by rank, Criterion by spine, a list of the year by year', () => {
    assert.deepEqual(listFilms(cards, 'ss2022-critics').films.map((f) => f.t), ['Vertigo', 'Seven Samurai']);
    assert.deepEqual(listFilms(cards, 'criterion').films.map((f) => f.t), ['Seven Samurai', 'Vertigo']);
    assert.deepEqual(listFilms(cards, 'cahiers-top10').films.map((f) => f.t), ['The River', 'Seven Samurai']);
    assert.equal(listFilms(cards, 'no-such-list'), null);
});

test('the index names every list with its count, the most films first', () => {
    const idx = listIndex(cards);
    assert.equal(idx.length, Object.keys(SOURCES).length);
    assert.deepEqual(idx.slice(0, 3).map((l) => [l.source, l.count]).sort(), [['cahiers-top10', 2], ['criterion', 2], ['ss2022-critics', 2]]);
    assert.equal(idx.find((l) => l.source === 'ss2022-critics').top.t, 'Vertigo');
});

test('each list shows its number one and its rarest pick, and chosen firsts never repeat', () => {
    const still = { stills: ['https://image.tmdb.org/t/p/w780/s.jpg'] };
    const deck = [
        film('x', { ...still, provenance: [{ source: 'ss2022-critics', rank: 1 }, { source: 'ss2012-critics', rank: 1 }, { source: 'ebert-great' }, { source: 'rosenbaum-1000' }] }),
        film('y', { ...still, provenance: [{ source: 'ss2022-critics', rank: 5 }, { source: 'ss2012-critics', rank: 3 }] }),
        film('z', { ...still, provenance: [{ source: 'ss2022-critics', rank: 9 }] }),
        film('w', { ...still, provenance: [{ source: 'ebert-great' }, { source: 'rosenbaum-1000' }, { source: 'ss2022-critics', rank: 50 }] }),
        film('v', { ...still, provenance: [{ source: 'ebert-great' }, { source: 'rosenbaum-1000' }] }),
    ];
    const idx = Object.fromEntries(listIndex(deck).map((l) => [l.source, l]));
    // a real number one may repeat
    assert.equal(idx['ss2022-critics'].top.t, 'Film x');
    assert.equal(idx['ss2012-critics'].top.t, 'Film x');
    // the rarest pick: on the fewest lists, and no two lists the same
    assert.deepEqual([idx['ss2022-critics'].own.t, idx['ss2022-critics'].own.lists], ['Film z', 1]);
    assert.equal(idx['ss2012-critics'].own.t, 'Film y');
    // lists with no order take the most shared film not already shown (x is the polls' number one)
    assert.deepEqual([idx['ebert-great'].top.t, idx['rosenbaum-1000'].top.t], ['Film w', 'Film v']);
});

test("a film's count, step by step, adds up to the canon score", () => {
    const k = countFor(catalogue, 'a');
    const evidence = cards[0]._prov.map((p) => ({ source: p.source, strength: p.strength, pollYear: p.pollYear }));
    assert.equal(k.score, scoreFilm({ year: 1958 }, evidence, SOURCES).score);
    assert.equal(k.families[0].family, 'all-time-poll');
    assert.equal(k.families[0].votes.length, 3);
    assert.deepEqual(k.endurance.decades, [2000, 2010, 2020]);
    assert.deepEqual(k.neighbours.map((n) => [n.t, n.rank, !!n.self]), [['Seven Samurai', 1, false], ['Vertigo', 2, true], ['The River', 3, false]]);
});

test('a family never credits past its cap', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ source: 'criticstop10', strength: 2.2 - i * 0.1 }));
    const b = breakdown(many, SOURCES);
    assert.equal(b.families[0].credited, 3.5);
    assert.ok(b.families[0].uncapped > 3.5);
});
