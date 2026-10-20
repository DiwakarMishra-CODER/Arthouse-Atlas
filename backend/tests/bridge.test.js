import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBridge, outsideCard } from '../services/bridge.js';

const bridge = makeBridge({
  27205: { t: 'Inception', y: 2010, poster: '/i.jpg', fans: 30000, near: [[11, 0.5], [12, 0.25]] },
  313369: { t: 'La La Land', y: 2016, poster: '/l.jpg', fans: 9000, near: [[13, 0.4]] },
  278: { t: 'The Shawshank Redemption', y: 1994, poster: null, fans: 60000, near: [] },
  194: { t: 'Amélie', o: 'Le Fabuleux Destin d\'Amélie Poulain', y: 2001, poster: '/a.jpg', fans: 20000, near: [[11, 0.3]] },
});

test('outside films are found by title, accents and one typo forgiven, best match first', () => {
  assert.deepEqual(bridge.search('incep').map((f) => f.t), ['Inception']);
  assert.deepEqual(bridge.search('inceptoin').map((f) => f.t), ['Inception']); // two letters swapped
  assert.deepEqual(bridge.search('amelie').map((f) => f.t), ['Amélie']);
  assert.deepEqual(bridge.search('fabuleux').map((f) => f.t), ['Amélie']); // the original title
  assert.deepEqual(bridge.search('land').map((f) => f.t), ['La La Land']);
  assert.deepEqual(bridge.search('kurosawa'), []);
});

test('the films most people know: the most loved, from a given year on', () => {
  assert.deepEqual(bridge.popular({ limit: 2 }).map((f) => f.t), ['The Shawshank Redemption', 'Inception']);
  assert.deepEqual(bridge.popular({ since: 2000 }).map((f) => f.t), ['Inception', 'Amélie', 'La La Land']);
});

test('an outside film leads to the atlas films its fans loved, and shows its poster', () => {
  const near = bridge.nearOf(27205);
  assert.deepEqual([...near.keys()], [11, 12]);
  assert.deepEqual(near.get(11), { score: 0.5, reason: 'v' });
  assert.equal(bridge.nearOf(999).size, 0);
  assert.deepEqual(outsideCard(bridge.get('27205')), { tmdbId: 27205, title: 'Inception', year: 2010, poster: 'https://image.tmdb.org/t/p/w342/i.jpg', fans: 30000, leadsTo: 2 });
});
