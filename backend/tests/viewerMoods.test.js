import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTag, wordIndex, moodsFor, moodEvidence } from '../scripts/moods/lib/viewerMoods.js';

const index = wordIndex({
  melancholic: ['melancholy', 'melancholic', 'sad'],
  slow: ['slow', 'slow-paced', 'slow paced'],
  dreamlike: ['dreamlike', 'dream-like'],
});
const users = (...ids) => new Set(ids);

test("viewers' spellings of one tag become the same tag", () => {
  assert.equal(normalizeTag('  Melancholy '), 'melancholy');
  assert.equal(normalizeTag('slow_paced'), 'slow paced');
  assert.equal(normalizeTag('"dream-like."'), 'dream-like');
  assert.equal(normalizeTag('Atmospheric!!'), 'atmospheric');
});

test('a word can mean only one mood', () => {
  assert.throws(() => wordIndex({ melancholic: ['sad'], bleak: ['sad'] }), /both melancholic and bleak/);
});

test('a viewer counts once per mood, however many of its words they used', () => {
  const tags = new Map([['melancholy', users(1, 2)], ['sad', users(2, 3)], ['melancholic', users(1)]]);
  const [m] = moodsFor(tags, 10, index);
  assert.equal(m.mood, 'melancholic');
  assert.equal(m.viewers, 3);
  assert.deepEqual(m.words, [['melancholy', 2], ['sad', 2], ['melancholic', 1]]);
});

test('2 viewers are enough on a film few tagged at all, not on a much-tagged one', () => {
  const tags = new Map([['slow', users(1, 2)]]);
  assert.deepEqual(moodsFor(tags, 20, index).map((m) => m.mood), ['slow']);
  assert.deepEqual(moodsFor(tags, 60, index), []);
  assert.deepEqual(moodsFor(new Map([['slow', users(1)]]), 5, index), [], 'one viewer is never enough');
});

test('on a much-tagged film, a mood needs at least 3% of its taggers', () => {
  const tags = new Map([['slow', users(1, 2, 3, 4)], ['dreamlike', users(5, 6, 7, 8, 9, 10)]]);
  // (and 3 viewers there: 50 or more tagged it)
  // 200 taggers: 4 is 2% (out), 6 is 3% (in)
  assert.deepEqual(moodsFor(tags, 200, index).map((m) => m.mood), ['dreamlike']);
});

test('words that mean no mood are ignored, and the strongest mood comes first', () => {
  const tags = new Map([['atmospheric', users(1, 2, 3, 4, 5)], ['slow', users(1, 2, 3)], ['dream-like', users(4, 5, 6, 7)]]);
  assert.deepEqual(moodsFor(tags, 20, index).map((m) => [m.mood, m.viewers]), [['dreamlike', 4], ['slow', 3]]);
  assert.deepEqual([...moodEvidence(tags, index)], [['slow', 3], ['dreamlike', 4]]);
});
