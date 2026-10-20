import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCase, tieHash } from '../../scripts/recs/lib/protocol.js';
import { hitAndGain, randomExpectation, meanMargin, pairedDiff } from '../../scripts/recs/lib/metrics.js';

// [tmdbId, rating, timestamp]
const rows = [
  [1, 5, 10], [2, 4, 20], [3, 4.5, 30], [4, 4, 40], [5, 2, 45],
  [6, 5, 50], // the last loved film: hidden
  [7, 3, 60], // rated after the hidden moment: never happened
];

test('hide the last loved film and rewind to that moment', () => {
  const c = makeCase(1, rows, { maxSeeds: 5 });
  assert.equal(c.hidden, 6);
  assert.deepEqual(c.seeds, [1, 2, 3, 4]);
  assert.deepEqual([...c.history].sort(), [1, 2, 3, 4, 5]);
  assert.deepEqual(makeCase(1, rows, { maxSeeds: 1 }).seeds, [4]); // the most recent loved film
});

test('fewer than 4 loved films before the hidden one: not a test case', () => {
  assert.equal(makeCase(1, rows.filter((r) => r[0] !== 1), { maxSeeds: 5 }), null);
});

test('same-second ratings: a fixed hash decides, the same way every run', () => {
  const tied = [[1, 4, 9], [2, 4, 9], [3, 4, 9], [4, 4, 9], [5, 4, 9]];
  const expected = [...tied].sort((a, b) => tieHash(7, a[0]) - tieHash(7, b[0])).at(-1)[0];
  assert.equal(makeCase(7, tied, { maxSeeds: 5 }).hidden, expected);
  assert.equal(makeCase(7, [...tied].reverse(), { maxSeeds: 5 }).hidden, expected);
});

test('hit rate and NDCG for one hidden film', () => {
  assert.deepEqual(hitAndGain([6, 1], 6), { hit: 1, gain: 1 });
  assert.equal(hitAndGain([1, 2, 6], 6).gain, 0.5); // rank 3: 1/log2(4)
  assert.deepEqual(hitAndGain(Array.from({ length: 10 }, (_, i) => i), 99), { hit: 0, gain: 0 });
});

test('random baseline is exact', () => {
  assert.equal(randomExpectation(10).hit, 1);
  assert.equal(randomExpectation(100).hit, 0.1);
  const all = Array.from({ length: 10 }, (_, r) => 1 / Math.log2(r + 2)).reduce((a, b) => a + b);
  assert.ok(Math.abs(randomExpectation(100).gain - all / 100) < 1e-12);
});

test('margins and paired differences', () => {
  const m = meanMargin([1, 0, 1, 0]);
  assert.equal(m.mean, 0.5);
  assert.ok(Math.abs(m.margin - 1.96 * Math.sqrt(1 / 3 / 4)) < 1e-12);
  assert.equal(pairedDiff([1, 1, 0], [0, 1, 0]).mean, 1 / 3);
});

// ---- any later love (time-ordered) and held-out loves (published protocol) ----
import { makeLaterCase, makeHeldOutCase, splitHash } from '../../scripts/recs/lib/protocol.js';

// 8 loves (ratings ≥ 4) and 3 other ratings, all at different moments
const story = [
  [1, 5, 10], [2, 4, 20], [3, 2, 25], [4, 4.5, 30], [5, 4, 40], [6, 5, 50],
  [7, 3, 55], [8, 4, 60], [9, 4, 70], [10, 4.5, 80], [11, 1, 90],
];

test('any later love: rewind to 80% of their loves; every love after is a target', () => {
  const c = makeLaterCase(1, story);
  // floor(0.8 × 8) = 6 loves in; the 7th love (film 9) is the first target
  assert.deepEqual(c.targets, [9, 10]);
  assert.deepEqual([...c.history].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]); // strictly before film 9
  assert.deepEqual(c.seeds, [2, 4, 5, 6, 8]); // their last 5 loves before the cut
  assert.ok(c.targets.every((t) => !c.history.has(t)));
  assert.equal(makeLaterCase(1, story.slice(0, 5)), null); // 4 loves: not enough
});

test('any later love: same-second ratings are cut the same way every run, never hiding a target', () => {
  const tied = [[1, 4, 9], [2, 4, 9], [3, 4, 9], [4, 4, 9], [5, 4, 9], [6, 2, 9]];
  const a = makeLaterCase(3, tied);
  const b = makeLaterCase(3, [...tied].reverse());
  assert.deepEqual(a.targets, b.targets);
  assert.deepEqual([...a.history].sort(), [...b.history].sort());
  assert.equal(a.targets.length, 1);
  assert.ok(a.targets.every((t) => !a.history.has(t)));
});

test('held-out loves: exactly floor(20%) held out, chosen the same way every run, a clean split', () => {
  const loves = Array.from({ length: 12 }, (_, i) => [100 + i, 4 + (i % 2) / 2, i]);
  const rows = [...loves, [999, 2, 50]]; // a low rating is never an input or a target
  const c = makeHeldOutCase(5, rows);
  assert.equal(c.targets.length, 2); // floor(0.2 × 12)
  assert.equal(c.seeds.length, 10);
  assert.deepEqual([...c.seeds, ...c.targets].sort(), loves.map((r) => r[0]).sort());
  assert.ok(c.targets.every((t) => !c.history.has(t)));
  assert.deepEqual(makeHeldOutCase(5, [...rows].reverse()).targets.sort(), c.targets.sort());
  assert.equal(makeHeldOutCase(5, loves.slice(0, 4)), null);
});

test('the coin toss mixes: neighbouring film ids are not held out together', () => {
  // with a weak hash, film 108 vs 109 came out in the same order for almost everyone
  let first = 0;
  for (let u = 1; u <= 2000; u++) if (splitHash(u, 108) > splitHash(u, 109)) first++;
  assert.ok(first > 900 && first < 1100, `ordered one way for ${first} of 2000 people`);
  assert.notEqual(splitHash(1, 1), tieHash(1, 1)); // the two coins are independent
});

// ---- several films to find ----
import { hitRateAt, precisionAt, recallAt, ndcgAt, randomMany, idealDcg } from '../../scripts/recs/lib/metrics.js';

test('hit rate, precision, recall and NDCG with several targets', () => {
  const ranked = [5, 1, 7, 2, 9];
  const T = new Set([1, 2, 3]);
  assert.equal(hitRateAt(ranked, T, 5), 1);
  assert.equal(hitRateAt(ranked, T, 1), 0);
  assert.equal(precisionAt(ranked, T, 5), 2 / 5);
  assert.equal(recallAt(ranked, T, 5), 2 / 3); // hits over min(k, targets)
  assert.equal(recallAt([1, 2], new Set([1, 2, 3, 4]), 2), 1); // k smaller than the targets
  const ideal = 1 + 1 / Math.log2(3) + 1 / Math.log2(4);
  assert.ok(Math.abs(ndcgAt(ranked, T, 5) - (1 / Math.log2(3) + 1 / Math.log2(5)) / ideal) < 1e-12);
  assert.ok(Math.abs(idealDcg(2) - (1 + 1 / Math.log2(3))) < 1e-12);
});

const choose = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return k > n ? 0 : r; };
const permutations = (xs) => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));

test('random baselines are exact: hit rate against the binomial formula', () => {
  for (const [C, T, k] of [[12, 1, 10], [12, 3, 10], [12, 11, 10], [30, 3, 10], [100, 5, 20]]) {
    const exact = 1 - choose(C - T, k) / choose(C, k);
    assert.ok(Math.abs(randomMany(C, T, k).hitRate - exact) < 1e-12, `C=${C} T=${T} k=${k}`);
  }
  assert.equal(randomMany(12, 3, 10).hitRate, 1); // 10 picks from 12 can't miss all 3
});

test('random baselines are exact: every metric against all orderings', () => {
  const C = 5, T = 2, k = 3;
  const targets = new Set([0, 1]);
  const all = permutations([0, 1, 2, 3, 4]);
  const avg = (f) => all.reduce((s, p) => s + f(p), 0) / all.length;
  const r = randomMany(C, T, k);
  assert.ok(Math.abs(r.hitRate - avg((p) => hitRateAt(p, targets, k))) < 1e-12);
  assert.ok(Math.abs(r.precision - avg((p) => precisionAt(p, targets, k))) < 1e-12);
  assert.ok(Math.abs(r.recall - avg((p) => recallAt(p, targets, k))) < 1e-12);
  assert.ok(Math.abs(r.ndcg - avg((p) => ndcgAt(p, targets, k))) < 1e-12);
});
