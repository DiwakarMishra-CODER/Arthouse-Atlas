import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeIndex, rankCandidates } from '../../services/recommender.js';

// Seeds 1 and 2; candidates 10, 11, 12; film 13 is only reachable by canon nudge
const index = makeIndex(new Map([
  [1, { prior: 0.5, nb: [[10, 0.4, 'v'], [11, 0.2, 'd']] }],
  [2, { prior: 0.5, nb: [[10, 0.1, 'm'], [12, 0.6, 'v']] }],
  [10, { prior: 0.2, nb: [] }],
  [11, { prior: 0.9, nb: [] }],
  [12, { prior: 0, nb: [] }],
  [13, { prior: 1, nb: [] }],
]));
const ids = (r) => r.map((x) => x.tmdbId);
const exclude = new Set([1, 2]);

test('score is the weighted average similarity to your films', () => {
  const r = rankCandidates(index, { seeds: [{ tmdbId: 1, weight: 1 }, { tmdbId: 2, weight: 1 }], exclude, limit: 3 });
  assert.deepEqual(ids(r), [12, 10, 11]);
  assert.equal(r[0].score, 0.3); // 0.6 / 2
  assert.equal(r[1].score, 0.25); // (0.4 + 0.1) / 2
  assert.deepEqual(r[1].because, { seed: 1, reason: 'v' }); // seed 1 contributed most
});

test('a duplicated seed keeps its highest weight instead of adding up', () => {
  const once = rankCandidates(index, { seeds: [{ tmdbId: 1, weight: 1 }, { tmdbId: 2, weight: 0.5 }], exclude });
  const twice = rankCandidates(index, { seeds: [{ tmdbId: 1, weight: 1 }, { tmdbId: 2, weight: 0.5 }, { tmdbId: 2, weight: 0.5 }], exclude });
  assert.deepEqual(twice, once);
});

test('excluded films never come back, and unknown seeds are ignored', () => {
  const r = rankCandidates(index, { seeds: [{ tmdbId: 1, weight: 1 }, { tmdbId: 999, weight: 1 }], exclude: new Set([1, 10]), limit: 5 });
  assert.ok(!ids(r).includes(10));
  assert.equal(r[0].tmdbId, 11);
  assert.equal(r[0].score, 0.2); // 999 didn't dilute the average
});

test('the canon nudge can lift a film no seed points at; ties fall to prior then tmdbId', () => {
  const r = rankCandidates(index, { seeds: [{ tmdbId: 1, weight: 1 }], exclude, gamma: 0.5, limit: 2 });
  // 13: 0.5·1 = 0.5 · 11: 0.2 + 0.45 = 0.65 · 10: 0.4 + 0.1 = 0.5 (ties 13, lower prior)
  assert.deepEqual(ids(r), [11, 13]);
  assert.equal(r[1].because, null);
});

test('with no seeds it is plain canon order', () => {
  assert.deepEqual(ids(rankCandidates(index, { exclude, limit: 4 })), [13, 11, 10, 12]);
});
