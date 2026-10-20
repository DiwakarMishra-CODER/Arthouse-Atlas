import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cfMatrix, contentBits, buildIndex, priorsOf } from '../../scripts/recs/lib/neighbours.js';

const film = (tmdbId, extra = {}) => ({ tmdbId, directors: [], movements: [], country: null, decade: null, canonRank: null, ...extra });

test('cosine divides by popularity, and shrinkage discounts thin evidence', () => {
  const counts = { films: [1, 2, 3], n: [100, 25, 4], pairs: [[0, 1, 20], [0, 2, 2]] };
  const plain = cfMatrix(counts, 0);
  assert.ok(Math.abs(plain[0 * 3 + 1] - 20 / Math.sqrt(100 * 25)) < 1e-6);
  assert.equal(plain[1 * 3 + 0], plain[0 * 3 + 1]); // symmetric
  const shrunk = cfMatrix(counts, 10);
  // 20 people: kept at 2/3; 2 people: kept at 1/6
  assert.ok(Math.abs(shrunk[1] - plain[1] * (20 / 30)) < 1e-6);
  assert.ok(Math.abs(shrunk[2] - plain[2] * (2 / 12)) < 1e-6);
});

test('content similarity: director spellings match, decade alone is weak', () => {
  const films = [
    film(1, { directors: ['Wong Kar-wai'], decade: 1990 }),
    film(2, { directors: ['Wong Kar-Wai'], decade: 2000 }),
    film(3, { decade: 1990 }),
  ];
  const bits = contentBits(films);
  assert.equal(bits[0 * 3 + 1], 1); // director only
  assert.equal(bits[0 * 3 + 2], 8); // decade only
  const index = buildIndex(films, priorsOf(films), new Float32Array(9), bits, { beta: 1 });
  assert.deepEqual(index.films.get(1).nb, [[2, 1, 'd'], [3, 0.1, 'y']]);
});

test('films with no viewer data still get content neighbours; reason follows the bigger part', () => {
  const films = [film(1, { country: 'Japan' }), film(2, { country: 'Japan' }), film(3)];
  const cf = new Float32Array(9);
  cf[0 * 3 + 2] = cf[2 * 3 + 0] = 0.05;
  const index = buildIndex(films, priorsOf(films), cf, contentBits(films), { beta: 0.5 });
  // film 2 (country, 0.5·0.25 = 0.125) beats film 3 (viewers, 0.05)
  assert.deepEqual(index.films.get(1).nb, [[2, 0.125, 'c'], [3, 0.05, 'v']]);
  assert.deepEqual(index.films.get(2).nb, [[1, 0.125, 'c']]);
});

test('canon prior: rank 1 is 1, unranked is 0', () => {
  assert.deepEqual(priorsOf([film(1, { canonRank: 1 }), film(2, { canonRank: 3 }), film(3)]), [1, 0.3333, 0]);
});

test('a film with no viewer data gets content neighbours; other films point to it weakly', () => {
  const films = [
    film(1, { directors: ['A'], decade: 1990 }),
    film(2, { directors: ['A'], decade: 1990 }), // nobody's data: an all-zero row and column
    film(3, { decade: 1990 }),
    film(4, { directors: ['B'] }),
  ];
  const V = new Float32Array(16);
  V[0 * 4 + 2] = V[2 * 4 + 0] = 0.8;
  V[0 * 4 + 3] = V[3 * 4 + 0] = 0.4;
  V[2 * 4 + 3] = V[3 * 4 + 2] = 0.2;
  const bits = contentBits(films);
  const index = buildIndex(films, priorsOf(films), V, bits, { beta: 0, cold: true });
  // its own list: by content, on the viewers' scale (a typical strongest link here is 0.8)
  const own = index.films.get(2).nb;
  assert.deepEqual(own.map((x) => [x[0], x[2]]), [[1, 'd'], [3, 'y']]);
  assert.ok(Math.abs(own[0][1] - (0.8 * 1.1) / 1.85) < 1e-4);
  // seen from film 1: below its viewer links, at a fraction of the content score
  const fromOne = index.films.get(1).nb;
  assert.deepEqual(fromOne.map((x) => x[0]), [3, 4, 2]);
  assert.ok(Math.abs(fromOne[2][1] - (0.15 * 0.8 * 1.1) / 1.85) < 1e-4);
  // without the rule (the first engine), the silent film has no neighbours and nobody points to it
  const plain = buildIndex(films, priorsOf(films), V, bits, { beta: 0 });
  assert.deepEqual(plain.films.get(2).nb, []);
  assert.deepEqual(plain.films.get(1).nb.map((x) => x[0]), [3, 4]);
});
