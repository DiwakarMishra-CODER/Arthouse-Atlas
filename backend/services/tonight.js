/**
 * Tonight's film: one film a day, the same for everyone, with a reason.
 *
 * The pool is the films worth an evening: the canon's top 300, plus the top
 * ten of every decade (so a recent film that the all-time ranking still places
 * low can be chosen), each with a still. The day's pick, in order of priority:
 *
 *   1. An occasion. A director born or died on this day gets their strongest
 *      film (looser here: anything in the canon's top 600) — "Because Agnès
 *      Varda was born on this day in 1928." Births before deaths, and the
 *      better film first when several directors share the day.
 *   2. Sunday: a long one, but not a marathon — between 2½ and 3½ hours.
 *   3. Otherwise a pick from the pool that shares no decade, country or
 *      director with the past three days', so the week moves across cinema.
 *
 * Everything is seeded by the date, so the choice is fixed for the day.
 * "Another film" (n = 1, 2 …) skips the occasion and the Sunday rule and
 * takes the next varied pick.
 */
import Movie from '../models/Movie.js';
import Director from '../models/Director.js';

const POOL_FILTER = {
  $and: [
    { $or: [{ canonRank: { $ne: null, $lte: 300 } }, { canonDecadeRank: { $ne: null, $lte: 10 } }] },
    { $or: [{ 'stills.0': { $exists: true } }, { backdropUrl: { $nin: [null, ''] } }] }
  ]
};
const SUNDAY = { min: 150, max: 210 };   // minutes
const MARATHON = 300;                     // past this, the screen says so
const OCCASION_RANK = 600;                // how far down the canon an occasion may reach
const VARIETY_DAYS = 3;

// a stable 32-bit hash, so a date (and the nth pick) always lands on the same film
const hash = (s) => [...s].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0, 2166136261);
const decadeOf = (f) => Math.floor((f.year || 0) / 10);
const shiftDate = (date, days) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

let cache = { at: 0, pool: [] };
const loadPool = async () => {
  // the pool barely changes; keep it for ten minutes
  if (Date.now() - cache.at < 10 * 60 * 1000 && cache.pool.length) return cache.pool;
  const pool = await Movie.find(POOL_FILTER).sort({ canonRank: 1 }).select('_id year country directors runtime canonRank').lean();
  cache = { at: Date.now(), pool };
  return pool;
};

// the plain pick for a date: no occasion, no variety (so earlier days can be recomputed cheaply)
const plainPick = (pool, date, n = 0) => pool[hash(`${date}#${n}`) % pool.length];

// a pick from the pool that shares nothing with the past few days' plain picks, nor with the
// night's earlier picks when someone asks for another film
const variedPick = (pool, date, n, earlier = []) => {
  const recent = [...Array.from({ length: VARIETY_DAYS }, (_, i) => plainPick(pool, shiftDate(date, -(i + 1)))), ...earlier];
  const clash = (f) => recent.some((r) => decadeOf(r) === decadeOf(f) || (r.country && r.country === f.country) || (r.directors?.[0] && r.directors[0] === f.directors?.[0]));
  const taken = new Set(earlier.map((f) => f._id.toString()));
  const fresh = pool.filter((f) => !clash(f) && !taken.has(f._id.toString()));
  const from = fresh.length ? fresh : pool;
  return from[hash(`${date}#${n}#varied`) % from.length];
};

const occasionFor = async (date) => {
  const md = date.slice(5); // "MM-DD"
  const people = await Director.find({ $or: [{ birthDate: { $regex: `-${md}$` } }, { deathDate: { $regex: `-${md}$` } }] })
    .select('name birthDate deathDate')
    .lean();
  const options = [];
  for (const p of people) {
    const film = await Movie.findOne({
      directors: p.name,
      canonRank: { $ne: null, $lte: OCCASION_RANK },
      $or: [{ 'stills.0': { $exists: true } }, { backdropUrl: { $nin: [null, ''] } }]
    }).sort({ canonRank: 1 }).select('_id canonRank').lean();
    if (!film) continue;
    const born = p.birthDate?.endsWith(md);
    const year = (born ? p.birthDate : p.deathDate).slice(0, 4);
    options.push({
      film,
      born,
      reason: born ? `Because ${p.name} was born on this day in ${year}.` : `In memory of ${p.name}, who died on this day in ${year}.`
    });
  }
  options.sort((a, b) => (b.born - a.born) || (a.film.canonRank - b.film.canonRank));
  return options[0] || null;
};

export const pickTonight = async (date, n = 0) => {
  const pool = await loadPool();
  if (!pool.length) return null;

  let id = null;
  let reason = null;
  if (n === 0) {
    const occasion = await occasionFor(date);
    if (occasion) {
      id = occasion.film._id;
      reason = occasion.reason;
    } else if (new Date(`${date}T12:00:00Z`).getUTCDay() === 0) {
      const long = pool.filter((f) => f.runtime >= SUNDAY.min && f.runtime <= SUNDAY.max);
      if (long.length) {
        id = long[hash(`${date}#sunday`) % long.length]._id;
        reason = 'Sunday is for a long one.';
      }
    }
  }
  if (!id) {
    // "another film" moves away from everything already shown tonight
    const earlier = [];
    for (let k = 0; k < n; k++) {
      const prev = await pickTonight(date, k);
      const f = pool.find((x) => x._id.toString() === prev.id.toString());
      if (f) earlier.push(f);
    }
    id = variedPick(pool, date, n, earlier)._id;
  }
  return { id, reason };
};

export { MARATHON };
