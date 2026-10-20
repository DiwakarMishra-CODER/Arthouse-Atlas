import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeIndex } from '../services/recommender.js';
import { tasteWeight, howOf, contributions, recommendFrom, togetherOf } from '../services/forYou.js';

// films 1 and 2 are yours; 10, 11, 12 are what they lead to
const index = makeIndex(new Map([
  [1, { prior: 0.9, nb: [[10, 0.9, 'v'], [11, 0.3, 'd']] }],
  [2, { prior: 0.8, nb: [[10, 0.3, 'v'], [12, 0.6, 'm']] }],
  [10, { prior: 0.5, nb: [] }], [11, { prior: 0.4, nb: [] }], [12, { prior: 0.3, nb: [] }],
]));
index.params = { gamma: 0 };

test('what counts as taste, and the word for it', () => {
  assert.equal(tasteWeight({ favorite: true }), 1);
  assert.equal(tasteWeight({ rating: 5 }), 1);
  assert.equal(tasteWeight({ rating: 3, watched: true }), 0); // a low rating outranks having watched it
  assert.equal(tasteWeight({ watched: true }), 0.5);
  assert.deepEqual([howOf({ rating: 4 }), howOf({ watched: true }), howOf({ listed: true }), howOf({ rating: 2 })], ['loved', 'watched', 'watchlist', null]);
});

test('each of your films\' share of a pick, as rankCandidates adds them up', () => {
  const seeds = [{ tmdbId: 1, weight: 1 }, { tmdbId: 2, weight: 1 }];
  const parts = contributions(index, seeds, 10);
  assert.deepEqual(parts.map((p) => p.seed), [1, 2]);
  assert.ok(Math.abs(parts[0].share - 0.75) < 1e-9 && Math.abs(parts[1].share - 0.25) < 1e-9);
  assert.equal(parts[0].reason, 'v');
  assert.deepEqual(contributions(index, seeds, 99), []);
});

test('picks lead with their biggest reason, name a second when it gave a quarter, and never bring back what you set aside', () => {
  const touched = new Map([[1, { rating: 5 }], [2, { favorite: true }]]);
  const { seeds, picks } = recommendFrom(index, { touched, limit: 5 });
  assert.deepEqual(seeds.map((s) => s.how), ['loved', 'loved']);
  const ten = picks.find((p) => p.tmdbId === 10);
  assert.deepEqual(ten.because, { seed: 1, reason: 'v', share: 0.75, how: 'loved' });
  assert.deepEqual(ten.also.map((a) => a.seed), [2]); // 25%: named too
  assert.ok(!picks.some((p) => p.tmdbId === 1 || p.tmdbId === 2)); // never a film you've marked
  const without = recommendFrom(index, { touched, notFor: [10], limit: 5 }).picks;
  assert.ok(!without.some((p) => p.tmdbId === 10)); // "not for me" stays away
  assert.deepEqual(recommendFrom(index, { touched: new Map([[1, { rating: 2 }]]) }).picks, []); // nothing loved yet: no picks
});

test('people who loved both: only quoted when the counts are there', () => {
  const together = { n: { 1: 1046 }, both: { 1: { 10: 483 } } };
  assert.deepEqual(togetherOf(together, 1, 10), { loved: 1046, both: 483 });
  assert.equal(togetherOf(together, 1, 11), null);
  assert.equal(togetherOf(null, 1, 10), null);
  // with everyone counted, the pick's own loves come too (for "how much likelier than most")
  const counted = { people: 200948, n: { 1: 1046, 10: 5120 }, both: { 1: { 10: 483 } } };
  assert.deepEqual(togetherOf(counted, 1, 10), { loved: 1046, both: 483, pickLoved: 5120, people: 200948 });
});
