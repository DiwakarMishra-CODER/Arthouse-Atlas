/**
 * How test people become test cases: three ways of asking "did the engine know
 * what they'd love?", from strict to generous. The same people are in all three
 * (everyone who loved at least 5 of our films), so the lenses are views of one
 * test, not independent confirmations.
 *
 *   makeCase         Next film (strict). Hide the last film they loved and rewind
 *                    to that moment: everything rated before it is history,
 *                    anything later never happened. A hit is the hidden film in
 *                    the top 10.
 *   makeLaterCase    Any later love (time-ordered). Rewind to when they had loved
 *                    80% of their films; every film they loved after that is a
 *                    target.
 *   makeHeldOutCase  The published protocol (Liang et al. 2018; Steck 2019): a
 *                    fixed random 20% of their loves is held out and the other
 *                    80% is the input, in no time order. Generous, because the
 *                    input can include films loved after the held-out ones.
 *
 * MovieLens people often enter dozens of ratings in the same second, so "before"
 * needs a tie-break, and the held-out 20% needs a coin toss. Both use a mixing
 * hash of (person, film), each with its own salt: random-looking, independent of
 * each other, and the same on every run.
 */

import { LIKE } from './counting.js';

export const MIN_HISTORY_LIKES = 4;
export const MIN_LOVES = MIN_HISTORY_LIKES + 1;
export const LATER_CUT = 0.8;
export const HELD_OUT = 0.2;

// splitmix32's finaliser: every input bit moves every output bit, so films with
// neighbouring ids (a trilogy, a franchise) don't fall on the same side together
const mix = (x) => {
  let h = (x + 0x9e3779b9) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};
const saltedHash = (salt) => (userId, tmdbId) => mix(mix(userId ^ salt) ^ tmdbId);
export const tieHash = saltedHash(0x7a1e5eed);
export const splitHash = saltedHash(0x51ce0ff5);

// earlier first; within the same second, by the tie-break (then by id, so the order is total)
export const ordering = (userId) => (a, b) => (a[2] - b[2]) || (tieHash(userId, a[0]) - tieHash(userId, b[0])) || (a[0] - b[0]);

// rows: [[tmdbId, rating, ts]]. maxSeeds: 1 ("Double Bill") or 5 ("For You").
export const makeCase = (userId, rows, { maxSeeds }) => {
  const later = ordering(userId);
  const loved = rows.filter((r) => r[1] >= LIKE).sort(later);
  if (!loved.length) return null;
  const hidden = loved[loved.length - 1];

  const history = rows.filter((r) => r !== hidden && later(r, hidden) < 0);
  const historyLikes = history.filter((r) => r[1] >= LIKE).sort(later);
  if (historyLikes.length < MIN_HISTORY_LIKES) return null;

  return {
    userId,
    hidden: hidden[0],
    seeds: historyLikes.slice(-maxSeeds).map((r) => r[0]),
    history: new Set(history.map((r) => r[0])),
  };
};

// Any later love: the first target is the love at 80%; history is everything strictly before it
export const makeLaterCase = (userId, rows, { maxSeeds = 5 } = {}) => {
  const later = ordering(userId);
  const loved = rows.filter((r) => r[1] >= LIKE).sort(later);
  if (loved.length < MIN_LOVES) return null;
  const cut = Math.floor(loved.length * LATER_CUT);
  const first = loved[cut];
  const history = new Set(rows.filter((r) => later(r, first) < 0).map((r) => r[0]));
  const inputs = loved.slice(0, cut).map((r) => r[0]);
  const targets = loved.slice(cut).map((r) => r[0]);
  // true by construction; checked, because a target hidden in the history could never be found
  if (targets.some((t) => history.has(t)) || inputs.some((t) => !history.has(t))) {
    throw new Error(`later-loves cut is inconsistent for user ${userId}`);
  }
  return { userId, seeds: inputs.slice(-maxSeeds), targets, history };
};

// The published protocol: hold out exactly floor(20%) of their loves, chosen by the coin toss
export const makeHeldOutCase = (userId, rows) => {
  const loved = rows.filter((r) => r[1] >= LIKE).map((r) => r[0]);
  if (loved.length < MIN_LOVES) return null;
  const k = Math.floor(loved.length * HELD_OUT);
  const byCoin = [...loved].sort((a, b) => (splitHash(userId, b) - splitHash(userId, a)) || (a - b));
  const held = new Set(byCoin.slice(0, k));
  const inputs = loved.filter((t) => !held.has(t));
  return { userId, seeds: inputs, targets: [...held], history: new Set(inputs) };
};
