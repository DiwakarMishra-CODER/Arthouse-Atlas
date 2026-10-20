/**
 * Recommendations from a precomputed list per film.
 *
 * data/recs/neighbours.json (built offline by scripts/recs/build.js from
 * MovieLens ratings plus the catalogue) gives every film the 50 films that
 * loving it says most about, each with a weight (EASE: how much loving one film
 * predicts loving the other, once everything else a person loved is accounted
 * for). To recommend, each film you love votes for those films with that weight:
 *
 *   score(c) = Σ weight(s)·w(s, c) / Σ weight(s)  +  γ·canonPrior(c)
 *
 * i.e. what the films you love say together, plus an optional nudge towards the
 * canon. rankCandidates() is pure and is the same function the offline
 * evaluation scores, so the numbers in EVALUATION.md describe this code.
 */

import fs from 'fs';

const ARTIFACT = new URL('../data/recs/neighbours.json', import.meta.url);

export const REASONS = { v: 'viewers', d: 'director', m: 'movement', c: 'country', y: 'decade' };

// One ordering everywhere: higher score, then more canonical, then lower tmdbId
export const compareRanked = (a, b) => (b.score - a.score) || (b.prior - a.prior) || (a.tmdbId - b.tmdbId);

// films: Map tmdbId -> { prior, nb: [[tmdbId, score, reason]] }
export const makeIndex = (films) => ({
  films,
  byPrior: [...films].map(([tmdbId, f]) => ({ tmdbId, prior: f.prior, score: 0 })).sort(compareRanked).map((x) => x.tmdbId),
});

export const indexFromArtifact = (json) => makeIndex(new Map(Object.entries(json.films).map(([id, f]) => [Number(id), f])));

/**
 * seeds:   [{ tmdbId, weight }] films the person likes (duplicates keep the highest weight)
 * exclude: Set of tmdbIds never to return (everything they've already seen or listed)
 * Returns the top `limit` as [{ tmdbId, score, prior, because: { seed, reason } | null }].
 * With no usable seeds this is simply canon order.
 */
export const rankCandidates = (index, { seeds = [], exclude = new Set(), gamma = 0, limit = 10 }) => {
  const weights = new Map();
  for (const { tmdbId, weight } of seeds) {
    if (weight > 0 && index.films.has(tmdbId)) weights.set(tmdbId, Math.max(weight, weights.get(tmdbId) || 0));
  }
  let total = 0;
  for (const w of weights.values()) total += w;

  const acc = new Map();
  for (const [seed, w] of weights) {
    for (const [tmdbId, sim, reason] of index.films.get(seed).nb) {
      if (exclude.has(tmdbId)) continue;
      const part = w * sim;
      const a = acc.get(tmdbId);
      if (!a) acc.set(tmdbId, { sum: part, best: part, seed, reason });
      else {
        a.sum += part;
        if (part > a.best || (part === a.best && seed < a.seed)) Object.assign(a, { best: part, seed, reason });
      }
    }
  }

  const ranked = [];
  for (const [tmdbId, a] of acc) {
    const prior = index.films.get(tmdbId)?.prior || 0;
    ranked.push({ tmdbId, prior, score: a.sum / total + gamma * prior, because: { seed: a.seed, reason: a.reason } });
  }
  // Films no seed points at still compete on the canon nudge alone; only the best `limit` of them can matter
  let taken = 0;
  for (const tmdbId of index.byPrior) {
    if (taken >= limit) break;
    if (acc.has(tmdbId) || exclude.has(tmdbId)) continue;
    const prior = index.films.get(tmdbId).prior;
    ranked.push({ tmdbId, prior, score: gamma * prior, because: null });
    taken++;
  }
  return ranked.sort(compareRanked).slice(0, limit);
};

// What every film card on the site reads: PosterCard and its hover panel, and
// the box office ticket (still, hook, country, first laurel)
export const CARD_FIELDS = {
  title: 1, year: 1, posterUrl: 1, directors: 1, trailerUrl: 1, runtime: 1, genres: 1,
  country: 1, backdropUrl: 1, tmdbId: 1, 'editorial.hook': 1,
  stills: { $slice: 1 }, provenance: { $slice: 1 },
};

// Mongo's $in returns documents in its own order; put them back in ranked
// order, dropping any ranked film that no longer exists
export const inRankedOrder = (docs, ranked) => {
  const byTmdb = new Map(docs.map((d) => [d.tmdbId, d]));
  return ranked.filter((r) => byTmdb.has(r.tmdbId)).map((r) => ({ ...r, film: byTmdb.get(r.tmdbId) }));
};

// The shipped model, loaded once. null (and a logged reason) if it's missing or
// unreadable, so callers fall back to the old scoring instead of failing.
let cached;
export const getIndex = () => {
  if (cached !== undefined) return cached;
  try {
    const json = JSON.parse(fs.readFileSync(ARTIFACT, 'utf8'));
    cached = { ...indexFromArtifact(json), params: json.params };
  } catch (err) {
    console.error(`recommender: no model (${err.message}); using the old scoring`);
    cached = null;
  }
  return cached;
};
