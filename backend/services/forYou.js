/**
 * For You: what the engine picks for one person, and why, in a form the page can say.
 *
 * The picks are the same ranking For You always used (rankCandidates over the films you
 * loved, watched or listed). What this adds is the reasons, honestly: for each pick, which
 * of your films led to it and how much of its score that film gave (another film that gave a
 * quarter or more is named too), what kind of link it was (people who loved one loved the
 * other; the same director; the same movement...), and, where MovieLens has enough people to
 * say it, how many of those who loved your film loved this one too.
 *
 * Everything here is pure except getTogether(), which reads data/recs/together.json once.
 */

import fs from 'fs';
import { rankCandidates } from './recommender.js';

const TOGETHER = new URL('../data/recs/together.json', import.meta.url);

// How much each film someone has touched says about their taste. A favourite or 4–5 stars
// counts fully; a watched or watchlisted film counts half; a rating of 1–3 outranks a watched
// mark and counts for nothing.
export const tasteWeight = ({ favorite, rating, listed, watched }) => {
  if (favorite) return 1;
  if (rating) return rating >= 4 ? 1 : 0;
  return listed || watched ? 0.5 : 0;
};

// what they did with it, in the word the page uses ("because you loved / watched / listed it")
export const howOf = ({ favorite, rating, watched, listed }) => {
  if (favorite || rating >= 4) return 'loved';
  if (rating) return null;
  if (watched) return 'watched';
  return listed ? 'watchlist' : null;
};

// Each of your films' part in a pick's score: weight(film) × link(film → pick), as a share of
// the pick's whole score. The same sum rankCandidates makes, taken apart.
export const contributions = (index, seeds, tmdbId) => {
  const parts = [];
  for (const s of seeds) {
    const link = index.films.get(s.tmdbId)?.nb.find(([id]) => id === tmdbId);
    if (link) parts.push({ seed: s.tmdbId, part: s.weight * link[1], reason: link[2] });
  }
  const sum = parts.reduce((total, p) => total + p.part, 0);
  return parts
    .map((p) => ({ seed: p.seed, reason: p.reason, share: sum > 0 ? p.part / sum : 0 }))
    .sort((a, b) => (b.share - a.share) || (a.seed - b.seed));
};

/**
 * touched: Map tmdbId -> { favorite?, rating?, watched?, listed? }  (everything they've marked)
 * notFor:  tmdbIds they've said aren't for them (never picked)
 * Returns { seeds: [{ tmdbId, weight, how }], picks: [{ tmdbId, score, because, also }] } where
 * because = { seed, reason, share, how } (null for a film no seed leads to) and also lists one
 * more film that gave a quarter or more of the score.
 */
export const recommendFrom = (index, { touched, notFor = [], limit = 30 }) => {
  const seeds = [...touched]
    .map(([tmdbId, t]) => ({ tmdbId, weight: tasteWeight(t), how: howOf(t) }))
    .filter((s) => s.weight > 0 && index.films.has(s.tmdbId))
    .sort((a, b) => (b.weight - a.weight) || (a.tmdbId - b.tmdbId));
  if (!seeds.length) return { seeds, picks: [] };
  const how = new Map(seeds.map((s) => [s.tmdbId, s.how]));
  const exclude = new Set([...touched.keys(), ...notFor]);
  const ranked = rankCandidates(index, { seeds, exclude, gamma: index.params?.gamma ?? 0, limit });
  const picks = ranked.map((r) => {
    const parts = r.because ? contributions(index, seeds, r.tmdbId) : [];
    const lead = parts[0];
    return {
      tmdbId: r.tmdbId,
      score: r.score,
      because: lead ? { seed: lead.seed, reason: lead.reason, share: lead.share, how: how.get(lead.seed) } : null,
      also: parts.slice(1).filter((p) => p.share >= 0.25).slice(0, 1).map((p) => ({ seed: p.seed, share: p.share, how: how.get(p.seed) })),
    };
  });
  return { seeds, picks };
};

// "of the n people who loved your film, both loved this one too" (only links with enough people);
// with how many loved the pick, out of everyone, so the page can say how much likelier than most
export const togetherOf = (together, seed, pick) => {
  const both = together?.both?.[seed]?.[pick];
  const loved = together?.n?.[seed];
  if (!both || !loved) return null;
  const pickLoved = together.n?.[pick];
  return pickLoved && together.people ? { loved, both, pickLoved, people: together.people } : { loved, both };
};

let together;
export const getTogether = () => {
  if (together !== undefined) return together;
  try {
    together = JSON.parse(fs.readFileSync(TOGETHER, 'utf8'));
  } catch (err) {
    console.warn(`For You: no counts of people who loved both (${err.message}); the reasons go without numbers`);
    together = null;
  }
  return together;
};
