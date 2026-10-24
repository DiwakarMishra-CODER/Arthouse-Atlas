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
 *   2. Sunday: a long one, but not a marathon — between 2½ and 3½ hours. The
 *      Sundays work through the pool's long films in rounds.
 *   3. Otherwise one of the classics: the canon's hundred best, at most two
 *      films a director. The ordinary days work through them in rounds.
 *
 * A round shows each of its films once, in an order where none shares a
 * decade, country or director with the three before it (where the round
 * allows). Occasions don't use up a Sunday's or a classic's turn.
 *
 * Everything is seeded by the date, so the choice is fixed for the day.
 * "Another film" (n = 1, 2 …) skips all three and takes a varied pick from
 * the whole pool, which is how the newer films still come up.
 */
import Movie from '../models/Movie.js';
import Director from '../models/Director.js';

const HAS_STILL = { $or: [{ 'stills.0': { $exists: true } }, { backdropUrl: { $nin: [null, ''] } }] };
const POOL_FILTER = {
  $and: [
    { $or: [{ canonRank: { $ne: null, $lte: 300 } }, { canonDecadeRank: { $ne: null, $lte: 10 } }] },
    HAS_STILL
  ]
};
const SUNDAY = { min: 150, max: 210 };   // minutes
const MARATHON = 300;                     // past this, the screen says so
const OCCASION_RANK = 600;                // how far down the canon an occasion may reach
const VARIETY_DAYS = 3;
const CLASSICS = 100;          // the round of ordinary days
const PER_DIRECTOR = 2;        // so a few masters don't fill it
const EPOCH = '2026-01-01';    // the first round began here
const CLASSIC_REASON = 'One of the hundred films the critics agree on most.';

// a stable 32-bit hash, so a date (and the nth pick) always lands on the same film
const hash = (s) => [...s].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0, 2166136261);
const decadeOf = (f) => Math.floor((f.year || 0) / 10);
const shiftDate = (date, days) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const clashes = (a, b) => decadeOf(a) === decadeOf(b) || (a.country && a.country === b.country) || (a.directors?.[0] && a.directors[0] === b.directors?.[0]);
const isSunday = (date) => new Date(`${date}T12:00:00Z`).getUTCDay() === 0;

// the classics: the canon's best, at most two films a director, topped up from further down to a hundred
export const classicsOf = (pool) => {
  const per = new Map();
  const out = [];
  for (const f of pool.filter((x) => x.canonRank != null).sort((a, b) => a.canonRank - b.canonRank)) {
    const d = f.directors?.[0] || '';
    if ((per.get(d) || 0) >= PER_DIRECTOR) continue;
    per.set(d, (per.get(d) || 0) + 1);
    out.push(f);
    if (out.length === CLASSICS) break;
  }
  return out;
};

// one round's order: shuffled by its number, then each film placed where it shares no decade, country or
// director with the days just before it (the last of the round before included), when any film left can
export const roundOrder = (classics, round, before = []) => {
  const left = [...classics].sort((a, b) => hash(`${round}#${a._id}`) - hash(`${round}#${b._id}`));
  const order = [];
  while (left.length) {
    const recent = [...before, ...order].slice(-VARIETY_DAYS);
    const i = left.findIndex((f) => !recent.some((r) => clashes(r, f)));
    order.push(left.splice(Math.max(0, i), 1)[0]);
  }
  return order;
};

// how many days since the first round began, before this date, are of a kind: ordinary days (no occasion,
// not a Sunday), or Sundays without an occasion
const daysBefore = (date, keep) => {
  let n = 0;
  for (let d = EPOCH; d < date; d = shiftDate(d, 1)) if (keep(d)) n++;
  return n;
};
export const ordinaryDaysBefore = (date, occasionDays) => daysBefore(date, (d) => !isSunday(d) && !occasionDays.has(d.slice(5)));
export const sundaysBefore = (date, occasionDays) => daysBefore(date, (d) => isSunday(d) && !occasionDays.has(d.slice(5)));

// the kth film of a list worked through in rounds (worked out in order, so each round knows how the last ended)
const nthOfRounds = (films, k, rounds) => {
  const round = Math.floor(k / films.length);
  for (let r = 0; r <= round; r++) {
    if (!rounds.has(r)) rounds.set(r, roundOrder(films, r, r ? rounds.get(r - 1).slice(-VARIETY_DAYS) : []));
  }
  return rounds.get(round)[k % films.length];
};
export const classicFor = (classics, date, occasionDays, rounds = new Map()) => nthOfRounds(classics, ordinaryDaysBefore(date, occasionDays), rounds);
export const sundayFor = (long, date, occasionDays, rounds = new Map()) => nthOfRounds(long, sundaysBefore(date, occasionDays), rounds);

let cache = { at: 0, pool: [] };
const load = async () => {
  // the pool barely changes; keep it for ten minutes
  if (Date.now() - cache.at < 10 * 60 * 1000 && cache.pool.length) return cache;
  const pool = await Movie.find(POOL_FILTER).sort({ canonRank: 1 }).select('_id year country directors runtime canonRank').lean();
  // the days of the year an occasion takes (a director with a film that occasionFor would choose)
  const named = new Set((await Movie.find({ canonRank: { $ne: null, $lte: OCCASION_RANK }, ...HAS_STILL }).select('directors').lean()).flatMap((f) => f.directors || []));
  const people = await Director.find({ $or: [{ birthDate: { $nin: [null, ''] } }, { deathDate: { $nin: [null, ''] } }] }).select('name birthDate deathDate').lean();
  const occasionDays = new Set(people.filter((p) => named.has(p.name)).flatMap((p) => [p.birthDate, p.deathDate].filter(Boolean).map((d) => d.slice(5))));
  const long = pool.filter((f) => f.runtime >= SUNDAY.min && f.runtime <= SUNDAY.max);
  cache = { at: Date.now(), pool, classics: classicsOf(pool), long, occasionDays, rounds: new Map(), sundayRounds: new Map() };
  return cache;
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
      ...HAS_STILL
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
  const { pool, classics, long, occasionDays, rounds, sundayRounds } = await load();
  if (!pool.length) return null;

  let id = null;
  let reason = null;
  if (n === 0) {
    const occasion = await occasionFor(date);
    if (occasion) {
      id = occasion.film._id;
      reason = occasion.reason;
    } else if (isSunday(date)) {
      if (long.length) {
        id = sundayFor(long, date, occasionDays, sundayRounds)._id;
        reason = 'Sunday is for a long one.';
      }
    } else if (classics.length) {
      id = classicFor(classics, date, occasionDays, rounds)._id;
      reason = CLASSIC_REASON;
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
