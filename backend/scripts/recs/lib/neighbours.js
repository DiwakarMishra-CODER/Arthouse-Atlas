/**
 * From counts to each film's nearest neighbours.
 *
 * The "viewers" part is a dense N×N matrix, row i = what loving film i says about
 * every other film. The shipped engine uses EASE weights (lib/ease.js); the first
 * engine, kept as a baseline, used item-to-item cosine:
 *
 * Viewers (item-to-item collaborative filtering), for films i and j:
 *   cosine = co / √(nᵢ·nⱼ)      people who loved both, divided by how popular each
 *                               film is, so famous films don't sit next to everything
 *   shrink = co / (co + λ)      a pair backed by 3 people counts for less than a
 *                               pair backed by 300
 *   cf     = cosine · shrink
 *
 * Content, fixed weights: same director 1 · any shared movement 0.5 ·
 * same country 0.25 · same decade 0.1.
 *
 * hybrid = cf + β·content. Every film keeps its K best neighbours, each with the
 * reason that contributed most. Films MovieLens doesn't have get neighbours from
 * content alone.
 */

import { normalizeName } from '../../../services/nameUtils.js';
import { compareRanked, makeIndex } from '../../../services/recommender.js';

export const K = 50;

// The shipped file stores rounded numbers; the evaluation uses the same ones
const round = (v, places) => Math.round(v * 10 ** places) / 10 ** places;
export const CONTENT_WEIGHTS = { d: 1, m: 0.5, c: 0.25, y: 0.1 };

// Canon nudge: rank 1 → 1, the last ranked film → ~0, unranked → 0
export const priorsOf = (films) => {
  const maxRank = films.reduce((m, f) => Math.max(m, f.canonRank || 0), 0);
  return films.map((f) => (f.canonRank ? round(1 - (f.canonRank - 1) / maxRank, 4) : 0));
};

// Dense N×N cf similarity (symmetric) from the counts file
export const cfMatrix = (counts, lambda) => {
  const N = counts.films.length;
  const { n, pairs } = counts;
  const cf = new Float32Array(N * N);
  for (const [i, j, co] of pairs) {
    const v = (co / Math.sqrt(n[i] * n[j])) * (co / (co + lambda));
    cf[i * N + j] = v;
    cf[j * N + i] = v;
  }
  return cf;
};

// Dense N×N content features: the four matches packed as bits (d=1, m=2, c=4, y=8)
export const contentBits = (films) => {
  const N = films.length;
  const dirs = films.map((f) => new Set(f.directors.map(normalizeName).filter(Boolean)));
  const movs = films.map((f) => new Set(f.movements));
  const bits = new Uint8Array(N * N);
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      let b = 0;
      if ([...dirs[i]].some((d) => dirs[j].has(d))) b |= 1;
      if ([...movs[i]].some((m) => movs[j].has(m))) b |= 2;
      if (films[i].country && films[i].country === films[j].country) b |= 4;
      if (films[i].decade && films[i].decade === films[j].decade) b |= 8;
      bits[i * N + j] = b;
      bits[j * N + i] = b;
    }
  }
  return bits;
};

const W = CONTENT_WEIGHTS;
export const contentScore = (b) => (b & 1 ? W.d : 0) + (b & 2 ? W.m : 0) + (b & 4 ? W.c : 0) + (b & 8 ? W.y : 0);

// The single biggest contributor to a pair's score
const reasonOf = (cf, b, beta) => {
  let best = 'v';
  let top = cf;
  for (const [bit, code] of [[1, 'd'], [2, 'm'], [4, 'c'], [8, 'y']]) {
    const part = b & bit ? beta * W[code] : 0;
    if (part > top) { top = part; best = code; }
  }
  return best;
};

// Films with no viewer data (MovieLens lacks them, or nobody in the counts loved them) still need
// neighbours whatever β is: their own list comes from content alone, on the viewers' scale, and other
// films can point at them through a weaker content link (COLD_LINK of that). A product choice that
// MovieLens can't test, since it can't hide a film it doesn't have.
export const COLD_LINK = 0.15;
const ALL_CONTENT = 1.85; // contentScore with all four matches

/**
 * Build the index rankCandidates() reads (films: Map tmdbId -> { prior, nb: [[tmdbId, score, reason]] }).
 * films: catalogue films in counts order. viewers and bits from the helpers above.
 * cold: give films without viewer data content neighbours as above (the first engine didn't).
 */
export const buildIndex = (films, priors, viewers, bits, { beta, k = K, cold = false }) => {
  const N = films.length;
  // which films have viewer data, and what a typical strongest link is worth
  const warm = new Uint8Array(N).fill(1);
  let typical = 1;
  if (cold) {
    const tops = [];
    for (let i = 0; i < N; i++) {
      let m = 0;
      for (let j = 0; j < N; j++) m = Math.max(m, viewers[i * N + j]);
      warm[i] = m > 0 ? 1 : 0;
      if (m > 0) tops.push(m);
    }
    tops.sort((a, b) => a - b);
    if (tops.length) typical = tops[Math.floor(tops.length / 2)];
  }
  const map = new Map();
  for (let i = 0; i < N; i++) {
    const row = i * N;
    const list = [];
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      const v = viewers[row + j];
      const b = bits[row + j];
      let score;
      let reason;
      if (!warm[i] || !warm[j]) {
        score = (typical * contentScore(b)) / ALL_CONTENT * (warm[i] ? COLD_LINK : 1);
        reason = reasonOf(0, b, 1);
      } else {
        score = v + beta * contentScore(b);
        reason = reasonOf(v, b, beta);
      }
      score = round(score, 5);
      if (score > 0) list.push({ tmdbId: films[j].tmdbId, prior: priors[j], score, reason });
    }
    list.sort(compareRanked);
    map.set(films[i].tmdbId, { prior: priors[i], nb: list.slice(0, k).map((x) => [x.tmdbId, x.score, x.reason]) });
  }
  return makeIndex(map);
};
