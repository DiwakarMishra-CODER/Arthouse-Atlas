import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gramOf, invertSPD, easeWeights } from '../../scripts/recs/lib/ease.js';
import { buildIndex, contentBits, priorsOf } from '../../scripts/recs/lib/neighbours.js';
import { rankCandidates } from '../../services/recommender.js';

const film = (tmdbId) => ({ tmdbId, directors: [], movements: [], country: null, decade: null, canonRank: null });

test('the inverse of a symmetric positive definite matrix', () => {
  const A = Float64Array.from([4, 1, 0.5, 1, 3, 1, 0.5, 1, 2]);
  const P = invertSPD(A, 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += A[i * 3 + k] * P[k * 3 + j];
      assert.ok(Math.abs(s - (i === j ? 1 : 0)) < 1e-12);
    }
  }
});

test('bad input is refused, not quietly solved', () => {
  assert.throws(() => gramOf({ films: [1], n: [3], pairs: [] }, 0), /λ > 0/);
  assert.throws(() => invertSPD(Float64Array.from([0, 1, 1, 0]), 2), /positive definite/);
});

test('no film predicts itself; films loved together point to each other; a film nobody loved is silent', () => {
  // films 0 and 1 are almost always loved together; 2 sometimes with them; nobody loved 3
  const counts = { films: [10, 20, 30, 40], n: [30, 30, 20, 0], pairs: [[0, 1, 28], [0, 2, 5], [1, 2, 5]] };
  const { B } = easeWeights(counts, 1);
  const N = 4;
  const best = (i) => [0, 1, 2, 3].filter((j) => j !== i).sort((a, b) => B[i * N + b] - B[i * N + a])[0];
  for (let i = 0; i < N; i++) assert.ok(B[i * N + i] === 0);
  assert.equal(best(0), 1);
  assert.equal(best(1), 0);
  for (let j = 0; j < N; j++) assert.ok(B[3 * N + j] === 0 && B[j * N + 3] === 0); // (=== so that -0 counts as 0)
});

test('the index reads the weights the right way round: what the seed says, not what is said of it', () => {
  // a toy where reading rows and reading columns rank film 1's picks differently
  const counts = { films: [1, 2, 3, 4, 5], n: [124, 64, 113, 202, 139], pairs: [[0, 1, 20], [0, 2, 58], [0, 3, 68], [0, 4, 5], [1, 2, 38], [1, 3, 8], [1, 4, 7], [2, 3, 67], [2, 4, 4], [3, 4, 32]] };
  const { B } = easeWeights(counts, 2);
  const N = 5;
  const films = counts.films.map(film);
  const index = buildIndex(films, priorsOf(films), B, contentBits(films), { beta: 0, k: N });
  const direct = (seeds, by) => [0, 1, 2, 3, 4]
    .filter((j) => !seeds.includes(j))
    .map((j) => [j, seeds.reduce((s, i) => s + Math.max(0, by(i, j)), 0)])
    .filter(([, s]) => s > 0)
    .sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]))
    .map(([j]) => films[j].tmdbId);
  const rows = (i, j) => B[i * N + j];
  const cols = (i, j) => B[j * N + i];
  for (const seeds of [[0], [0, 3], [1, 4]]) {
    const ranked = rankCandidates(index, { seeds: seeds.map((i) => ({ tmdbId: films[i].tmdbId, weight: 1 })), exclude: new Set(seeds.map((i) => films[i].tmdbId)), limit: N })
      .filter((r) => r.because)
      .map((r) => r.tmdbId);
    assert.deepEqual(ranked, direct(seeds, rows));
  }
  assert.notDeepEqual(direct([0], rows), direct([0], cols)); // so a transposed reading would be caught
});
