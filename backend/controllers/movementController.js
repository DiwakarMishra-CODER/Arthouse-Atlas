import mongoose from 'mongoose';
import Movement from '../models/Movement.js';
import Movie from '../models/Movie.js';
import Director from '../models/Director.js';
import { getErrorResponse } from '../utils/errorResponse.js';

// Fields a film row/card needs
const CARD_FIELDS = 'title year posterUrl backdropUrl stills directors trailerUrl genres runtime country provenanceScore provenanceCount editorial.hook';

// Movements are addressed by slug (`tag`) in URLs; ids still work
const findMovement = (idOrSlug) =>
  mongoose.isValidObjectId(idOrSlug)
    ? Movement.findById(idOrSlug)
    : Movement.findOne({ tag: idOrSlug });

const stillOf = (f) => f?.backdropUrl || f?.stills?.[0] || null;

// Curated hero films → { title: { url, film } }
const resolveHeroes = async (movements) => {
  const titles = movements.map((m) => m.heroFilm).filter(Boolean);
  if (!titles.length) return {};
  const films = await Movie.find({ title: { $in: titles } }).select('title year backdropUrl stills').lean();
  const byTitle = Object.fromEntries(films.map((f) => [f.title, f]));
  return Object.fromEntries(movements.map((m) => {
    const f = byTitle[m.heroFilm];
    return [m.title, f && stillOf(f) ? { url: stillOf(f), film: { _id: f._id, title: f.title, year: f.year } } : null];
  }));
};

// Per movement: film count, fallback hero, and stills of its top films for hover montages
const movementStats = async () => {
  const rows = await Movie.aggregate([
    { $match: { 'movements.0': { $exists: true } } },
    { $unwind: '$movements' },
    { $sort: { provenanceScore: -1, vote_count: -1 } },
    {
      $group: {
        _id: '$movements',
        filmCount: { $sum: 1 },
        topFilms: {
          $push: {
            title: '$title', year: '$year', posterUrl: '$posterUrl',
            still: { $ifNull: ['$backdropUrl', { $arrayElemAt: ['$stills', 0] }] }
          }
        }
      }
    },
    { $project: { filmCount: 1, topFilms: { $slice: ['$topFilms', 6] } } }
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r]));
};

const withHero = (m, heroes, stats) => {
  const curated = heroes[m.title];
  const fallback = stats[m.title]?.topFilms?.find((f) => f.still);
  return {
    heroBackdrop: m.backdropUrl || curated?.url || fallback?.still || null,
    heroCredit: curated?.film || (fallback ? { title: fallback.title, year: fallback.year } : null)
  };
};

// @desc    Get all cinematic movements, with counts, heroes and montage stills
// @route   GET /api/movements
// @access  Public
export const getMovements = async (req, res) => {
  try {
    const [movements, stats] = await Promise.all([
      Movement.find({}).sort({ startYear: 1, sortOrder: 1 }).lean(),
      movementStats()
    ]);
    const heroes = await resolveHeroes(movements);
    res.json(movements.map((m) => ({
      ...m,
      ...withHero(m, heroes, stats),
      filmCount: stats[m.title]?.filmCount || 0,
      topFilms: (stats[m.title]?.topFilms || []).filter((f) => f.still)
    })));
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    Catalogue-level numbers the movements page quotes
// @route   GET /api/movements/stats
// @access  Public
export const getMovementStats = async (req, res) => {
  try {
    const [totalFilms, unassignedFilms] = await Promise.all([
      Movie.countDocuments(),
      Movie.countDocuments({ $or: [{ movements: { $size: 0 } }, { movements: { $exists: false } }] })
    ]);
    res.json({ totalFilms, unassignedFilms });
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    Get one movement by slug or id, with its films, lineage and the next reel
// @route   GET /api/movements/:id
// @access  Public
export const getMovementById = async (req, res) => {
  try {
    const movement = await findMovement(req.params.id).lean();
    if (!movement) {
      return res.status(404).json({ message: 'Movement not found' });
    }

    const [films, all, stats] = await Promise.all([
      Movie.find({ movements: movement.title }).sort({ year: 1 }).select(CARD_FIELDS).lean(),
      Movement.find({}).select('title tag era startYear endYear region cardColor tagline vibe heroFilm heroFocus backdropUrl').sort({ startYear: 1, sortOrder: 1 }).lean(),
      movementStats()
    ]);

    const idx = all.findIndex((m) => m.title === movement.title);
    const next = all[(idx + 1) % all.length];
    // lineage neighbours get their stills too, so the family tree can show faces
    const kin = all.filter((m) => [...(movement.editorial?.grewFrom || []), ...(movement.editorial?.fed || [])].includes(m.title));
    const heroes = await resolveHeroes([movement, next, ...kin]);

    // Where-to-start films resolved to catalogue records where possible
    const byTitle = new Map(films.map((f) => [f.title.toLowerCase(), f]));
    const startWith = (movement.editorial?.startWith || []).map((s) => ({
      ...s,
      film: (s.movieId && films.find((f) => f._id.toString() === s.movieId.toString())) || byTitle.get((s.title || '').toLowerCase()) || null
    }));

    // Lineage titles → slugs, so the page can link
    const slugOf = Object.fromEntries(all.map((m) => [m.title, {
      title: m.title, tag: m.tag, era: m.era, startYear: m.startYear, endYear: m.endYear,
      heroBackdrop: withHero(m, heroes, stats).heroBackdrop, heroFocus: m.heroFocus
    }]));
    const grewFrom = (movement.editorial?.grewFrom || []).map((t) => slugOf[t] || { title: t, tag: null });
    const fed = (movement.editorial?.fed || []).map((t) => slugOf[t] || { title: t, tag: null });

    // Portraits for the people, where the directors are in the atlas
    const dirIds = (movement.keyDirectors || []).map((d) => d.directorId).filter(Boolean);
    const portraits = dirIds.length
      ? Object.fromEntries((await Director.find({ _id: { $in: dirIds } }).select('profileUrl').lean()).map((d) => [d._id.toString(), d.profileUrl]))
      : {};
    const keyDirectors = (movement.keyDirectors || []).map((d) => ({ ...d, profileUrl: d.directorId ? portraits[d.directorId.toString()] || null : null }));

    res.json({
      ...movement,
      ...withHero(movement, heroes, stats),
      keyDirectors,
      filmCount: films.length,
      films,
      startWith,
      lineage: { grewFrom, fed },
      next: next && next.title !== movement.title ? {
        ...next,
        ...withHero(next, heroes, stats),
        filmCount: stats[next.title]?.filmCount || 0,
        topFilms: (stats[next.title]?.topFilms || []).filter((f) => f.still)
      } : null
    });
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};
