import Movie from '../models/Movie.js';
import { getErrorResponse } from '../utils/errorResponse.js';
import { getIndex, inRankedOrder, CARD_FIELDS, REASONS } from '../services/recommender.js';
import { recommendFrom, togetherOf, getTogether } from '../services/forYou.js';
import { loadCatalogue } from '../services/catalogue.js';

/**
 * For You, as the page reads it: the picks with their reasons, the films they come from, and
 * the films set aside. The same answer for an account (userController.getRecommendations) and
 * for someone signed out, whose ratings live in their browser (POST /api/recs/preview).
 */

// a film as the reasons name it
const filmOf = (c) => c && { _id: c._id, title: c.title, year: c.year, still: c.still || c.posterUrl || null, directors: c.directors };

// what's simply true of both films (shown as a small fact, never as the reason)
const sharedFacts = (a, b) => {
  if (!a || !b) return null;
  const director = a.directors.find((d) => b.directors.includes(d));
  if (director) return { director };
  const movement = a.movements.find((m) => b.movements.includes(m));
  if (movement) return { movement };
  if (a.country && a.country === b.country) return { country: a.country };
  if (a.decade && a.decade === b.decade) return { decade: a.decade };
  return null;
};

const round = (x) => Math.round(x * 1000) / 1000;

/**
 * touched: Map tmdbId -> { favorite?, rating?, watched?, listed? }; notFor: tmdbIds set aside.
 * Returns null when the model file is missing (the caller falls back to the old scoring).
 */
export const buildForYou = async ({ touched, notFor = [] }) => {
  const index = getIndex();
  if (!index) return null;
  const { byTmdb } = await loadCatalogue();
  const { seeds, picks } = recommendFrom(index, { touched, notFor, limit: 30 });
  const together = getTogether();

  const docs = picks.length
    ? await Movie.find({ tmdbId: { $in: picks.map((p) => p.tmdbId) } }).select({ ...CARD_FIELDS, movements: 1, canonRank: 1 }).lean()
    : [];
  const recommendations = inRankedOrder(docs, picks).slice(0, 20).map(({ film, tmdbId, score, because, also }, i) => {
    const card = byTmdb.get(tmdbId);
    const seed = because && byTmdb.get(because.seed);
    return {
      ...film,
      rank: i + 1,
      stills: card?.stills?.length ? card.stills : film.stills,
      recommendationScore: Math.round(score * 1e4) / 1e4,
      because: because && {
        film: filmOf(seed),
        how: because.how,
        reason: REASONS[because.reason],
        share: round(because.share),
        together: because.reason === 'v' ? togetherOf(together, because.seed, tmdbId) : null,
        shared: sharedFacts(seed, card),
      },
      also: also.map((a) => ({ film: filmOf(byTmdb.get(a.seed)), how: a.how, share: round(a.share) })),
    };
  });

  const markOf = (tmdbId) => touched.get(tmdbId) || {};
  return {
    recommendations,
    basedOn: {
      films: seeds.map((s) => ({ ...filmOf(byTmdb.get(s.tmdbId)), how: s.how, weight: s.weight, rating: markOf(s.tmdbId).rating || null })).filter((f) => f._id),
    },
    notFor: notFor.map((t) => byTmdb.get(t)?._id).filter(Boolean),
  };
};

// @desc    For You for someone signed out: their ratings travel with the request
// @route   POST /api/recs/preview   body: { ratings: [{ id, value }], notFor: [id] }
// @access  Public (rate-limited)
export const previewForYou = async (req, res) => {
  try {
    const { byId } = await loadCatalogue();
    const ratings = Array.isArray(req.body?.ratings) ? req.body.ratings.slice(0, 200) : [];
    const notForIds = Array.isArray(req.body?.notFor) ? req.body.notFor.slice(0, 200) : [];
    const touched = new Map();
    for (const r of ratings) {
      const card = byId.get(String(r?.id));
      const value = Number(r?.value);
      if (card?._tmdb && value >= 1 && value <= 5) touched.set(card._tmdb, { rating: value });
    }
    const notFor = notForIds.map((id) => byId.get(String(id))?._tmdb).filter(Boolean);
    if (!touched.size) return res.json({ recommendations: [], basedOn: { films: [] }, notFor: [] });
    const out = await buildForYou({ touched, notFor });
    res.json(out || { recommendations: [], basedOn: { films: [] }, notFor: [] });
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    Films most people have seen, one per director: the deck a newcomer rates to begin
// @route   GET /api/recs/starters
// @access  Public
export const getStarters = async (req, res) => {
  try {
    const { cards } = await loadCatalogue();
    const seen = new Set();
    const starters = [];
    for (const c of [...cards].sort((a, b) => b._votes - a._votes)) {
      const who = c.directors[0];
      if (!c.still || !who || seen.has(who)) continue;
      seen.add(who);
      starters.push({ _id: c._id, title: c.title, year: c.year, still: c.still, directors: c.directors });
      if (starters.length === 30) break;
    }
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.json({ starters });
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};
