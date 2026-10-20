/**
 * The catalogue as Explore browses it: every film as a lean card, kept in memory.
 *
 * Under a thousand films fit easily in memory, so filtering, sorting, counting
 * and searching happen here in plain JavaScript rather than in MongoDB. That
 * keeps every count exact ("23 films from Japan"), lets each filter's options be
 * counted with the other filters applied, and makes a request take a few
 * milliseconds. Reloaded every ten minutes, like the pool in tonight.js.
 *
 * Everything below loadCatalogue() is pure (cards in, cards out) and tested in
 * tests/explore.test.js.
 */

import Movie from '../models/Movie.js';
import Director from '../models/Director.js';
import Movement from '../models/Movement.js';
import { MOODS } from './moodService.js';
import { normalizeName } from './nameUtils.js';

export { MOODS };
export const LENGTHS = ['short', 'standard', 'long', 'epic'];
export const LENGTH_WORDS = { short: 'under 90 minutes', standard: '90 minutes to 2 hours', long: '2 to 3 hours', epic: 'over 3 hours' };
export const SORTS = ['acclaimed', 'oldest', 'newest', 'surprise', 'closest'];
export const FILTERS = ['q', 'country', 'decade', 'director', 'movement', 'mood', 'genre', 'length'];
const FACETS = ['country', 'decade', 'director', 'movement', 'mood', 'genre', 'length'];

export const lengthOf = (runtime) => {
  if (!runtime) return null;
  if (runtime < 90) return 'short';
  if (runtime <= 120) return 'standard';
  if (runtime <= 180) return 'long';
  return 'epic';
};

const lower = (s) => (s || '').toLowerCase();
// words for typo-tolerant search: lowercase, accents off, three letters or more
export const words = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3);

// one typo apart: a letter added, dropped or changed, or two letters swapped ("felini", "bergamn")
export const oneTypoApart = (a, b) => {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) {
    return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  }
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
};

// A film's own frames: its stills and its backdrop, each image once (the same picture can be
// stored at two sizes, so they're told apart by file name), at most four
const FRAMES = 4;
export const framesOf = (m) => {
  const seen = new Set();
  const out = [];
  for (const url of [...(m.stills || []), m.backdropUrl]) {
    const file = url && url.split('/').pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    out.push(url);
    if (out.length === FRAMES) break;
  }
  return out;
};

// A film as Explore needs it; the `_`-prefixed fields are for matching and never leave the server
export const toCard = (m) => {
  const countries = m.countries?.length ? m.countries : m.country ? [m.country] : [];
  const others = [m.originalTitle, ...(m.altTitles || [])].filter(Boolean);
  const frames = framesOf(m);
  return {
    _id: String(m._id),
    title: m.title,
    originalTitle: m.originalTitle && m.originalTitle !== m.title ? m.originalTitle : null,
    year: m.year ?? null,
    decade: m.decade ?? (m.year ? Math.floor(m.year / 10) * 10 : null),
    directors: m.directors || [],
    country: m.country || countries[0] || null,
    countries,
    runtime: m.runtime || null,
    length: lengthOf(m.runtime),
    genres: m.genres || [],
    movements: m.movements || [],
    // moods from our own notes only: the ones guessed from keywords put Tokyo Story down as "surreal"
    moods: (m.editorial?.tags || []).filter((t) => MOODS.includes(t)),
    canonRank: m.canonRank ?? null,
    provenanceScore: m.provenanceScore || 0,
    provenanceCount: m.provenanceCount || 0,
    still: frames[0] || null,
    stills: frames,
    posterUrl: m.posterUrl || null,
    hook: m.editorial?.hook || null,
    _tmdb: m.tmdbId ?? null,
    _votes: m.vote_count || 0, // how widely known it is (TMDB votes), to find films newcomers will recognise
    _title: normalizeName(m.title),
    _others: others.map(normalizeName).filter(Boolean),
    _raw: [m.title, ...others].map(lower),
    _directors: (m.directors || []).map(normalizeName),
    _titleWords: [...new Set([m.title, ...others].flatMap(words))],
    _directorWords: [...new Set((m.directors || []).flatMap(words))],
    _companies: m.productionCompanies || [], // who made it, for the Studios room
    _criterion: (m.provenance || []).find((p) => p.source === 'criterion')?.detail || null, // its place in the Criterion Collection
  };
};

// A wall that starts from a film holds only the films it leads to (near: tmdbId -> { score, reason })
export const withinStart = (cards, near) => (near ? cards.filter((c) => near.has(c._tmdb)) : cards);

// How many times each value turns up (a film's countries, moods, genres...), most first
export const tally = (values) => {
  const n = new Map();
  values.forEach((v) => n.set(v, (n.get(v) || 0) + 1));
  return [...n].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, n: count }));
};

// what the page gets: the card without its private search fields (but with its id)
export const publicCard = (c) => Object.fromEntries(Object.entries(c).filter(([k]) => k === '_id' || !k.startsWith('_')));

// How well a card answers a search: title starts with it (4), title contains it (3), another
// title does (2), a director does (1); then, allowing one typo per word, a title (1.5) or a
// director (0.5); 0 when nothing matches. Accents and punctuation are ignored, and scripts the
// normaliser can't read (東京物語) are matched as typed.
export const searchScore = (c, q) => {
  const n = normalizeName(q);
  if (n) {
    if (c._title.startsWith(n)) return 4;
    if (c._title.includes(n)) return 3;
    if (c._others.some((t) => t.includes(n))) return 2;
    if (c._directors.some((d) => d.includes(n))) return 1;
    const typed = words(q).filter((w) => w.length >= 4);
    if (typed.length) {
      const near = (list) => typed.every((w) => list.some((t) => t.startsWith(w) || oneTypoApart(w, t)));
      if (near(c._titleWords)) return 1.5;
      if (near(c._directorWords)) return 0.5;
    }
  }
  const raw = lower(q).trim();
  if (raw && !n && c._raw.some((t) => t.includes(raw))) return 2;
  return 0;
};

// Does a director's name answer a search (allowing one typo per word)?
export const nameMatches = (name, q) => {
  const n = normalizeName(q);
  if (!n) return false;
  if (normalizeName(name).includes(n)) return true;
  const typed = words(q).filter((w) => w.length >= 4);
  const mine = words(name);
  return typed.length > 0 && typed.every((w) => mine.some((t) => t.startsWith(w) || oneTypoApart(w, t)));
};

const MATCHES = {
  q: (c, v) => searchScore(c, v) > 0,
  country: (c, v) => c.countries.includes(v),
  decade: (c, v) => c.decade === Number(v),
  director: (c, v) => c._directors.includes(normalizeName(v)),
  movement: (c, v) => c.movements.includes(v),
  mood: (c, v) => c.moods.includes(v),
  genre: (c, v) => c.genres.includes(v),
  length: (c, v) => c.length === v,
};

const isSet = (v) => v !== undefined && v !== null && v !== '';
const accents = (s) => (s.normalize('NFD').match(/[\u0300-\u036f]/g) || []).length;

// Cards matching every set filter (except `skip`, when counting that filter's own options)
export const applyFilters = (cards, filters, skip = null) => {
  const active = Object.entries(filters).filter(([k, v]) => k !== skip && MATCHES[k] && isSet(v));
  return cards.filter((c) => active.every(([k, v]) => MATCHES[k](c, v)));
};

// The canon: ranked films in rank order, then the unranked by strength of evidence, then age
const byCanon = (a, b) => ((a.canonRank ?? Infinity) - (b.canonRank ?? Infinity))
  || (b.provenanceScore - a.provenanceScore)
  || ((a.year ?? 9999) - (b.year ?? 9999))
  || a.title.localeCompare(b.title);

// mulberry32: a small seeded generator, so a shuffled wall is the same shuffle when you come back
const seeded = (seed) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

// near: on a wall that starts from a film, tmdbId -> { score } for every film it leads to
export const sortCards = (cards, sort = 'acclaimed', { seed = 1, q = '', near = null } = {}) => {
  const list = [...cards].sort(byCanon);
  if (sort === 'closest' && near) return list.sort((a, b) => ((near.get(b._tmdb)?.score ?? 0) - (near.get(a._tmdb)?.score ?? 0)) || byCanon(a, b));
  if (sort === 'oldest') return list.sort((a, b) => ((a.year ?? 9999) - (b.year ?? 9999)) || byCanon(a, b));
  if (sort === 'newest') return list.sort((a, b) => ((b.year ?? 0) - (a.year ?? 0)) || byCanon(a, b));
  if (sort === 'surprise') {
    const rand = seeded(Number(seed) || 1);
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }
  // most acclaimed first; while searching, the best matches lead
  if (isSet(q)) return list.sort((a, b) => (searchScore(b, q) - searchScore(a, q)) || byCanon(a, b));
  return list;
};

// For each filter, how many films each option would give, with all the other filters applied,
// and the most acclaimed of those films (`top`): the picture each option is shown with
const topOf = (c) => ({ _id: c._id, title: c.title, year: c.year, still: c.still || c.posterUrl || null });
export const facetCounts = (cards, filters) => {
  const out = {};
  const ordered = [...cards].sort(byCanon); // so the first film seen for an option is its best
  for (const key of FACETS) {
    const counts = new Map();
    const tops = new Map(); // each option's first few films, best first
    let c;
    const add = (value) => {
      if (!isSet(value)) return;
      counts.set(value, (counts.get(value) || 0) + 1);
      const list = tops.get(value);
      if (!list) tops.set(value, [c]);
      else if (list.length < 6) list.push(c);
    };
    for (c of applyFilters(ordered, filters, key)) {
      if (key === 'country') c.countries.forEach(add);
      else if (key === 'decade') add(c.decade);
      else if (key === 'director') {
        // one entry per person, under the spelling of their first film here
        c.directors.forEach((d, i) => add(c._directors[i] && d));
      } else if (key === 'movement') c.movements.forEach(add);
      else if (key === 'mood') c.moods.forEach(add);
      else if (key === 'genre') c.genres.forEach(add);
      else if (key === 'length') add(c.length);
    }
    let list = [...counts].map(([value, n]) => ({ value, n, top: tops.get(value)[0], candidates: tops.get(value) }));
    if (key === 'decade') list.sort((a, b) => a.value - b.value);
    else if (key === 'length') list.sort((a, b) => LENGTHS.indexOf(a.value) - LENGTHS.indexOf(b.value));
    else list.sort((a, b) => (b.n - a.n) || String(a.value).localeCompare(String(b.value)));
    if (key === 'director') {
      // the same person spelled two ways counts once, under the spelling most of their films use
      // (on a tie, the one that keeps the accents: Yasujirō, not Yasujiro)
      const merged = new Map();
      for (const d of list) {
        const k = normalizeName(d.value);
        const m = merged.get(k);
        if (!m) merged.set(k, { value: d.value, n: d.n, best: d.n, top: d.top, candidates: d.candidates });
        else {
          if (d.n > m.best || (d.n === m.best && accents(d.value) > accents(m.value))) Object.assign(m, { value: d.value, best: d.n });
          m.n += d.n;
          if (byCanon(d.top, m.top) < 0) m.top = d.top;
          m.candidates = [...m.candidates, ...d.candidates].sort(byCanon);
        }
      }
      list = [...merged.values()].map(({ value, n, top, candidates }) => ({ value, n, top, candidates })).sort((a, b) => (b.n - a.n) || a.value.localeCompare(b.value));
    }
    // seen side by side (a mood board, a strip of decades), no two options show the same film
    // when they can help it: the biggest options choose first, each its best film not yet shown
    const shown = new Set();
    const pictured = [...list].sort((a, b) => b.n - a.n).map((o) => {
      const pick = o.candidates.find((f) => !shown.has(f._id)) || o.top;
      shown.add(pick._id);
      return [o.value, pick];
    });
    const pictureOf = new Map(pictured);
    out[key] = list.map(({ value, n }) => ({ value, n, top: topOf(pictureOf.get(value)) }));
  }
  return out;
};

// ---------------------------------------------------------------------------
// the catalogue, loaded and kept for ten minutes
// ---------------------------------------------------------------------------
const FIELDS = 'tmdbId vote_count title originalTitle altTitles year decade directors country countries runtime genres movements canonRank provenanceScore provenanceCount stills backdropUrl posterUrl editorial.hook editorial.tags productionCompanies provenance.source provenance.detail';

let cache = { at: 0, value: null };
export const loadCatalogue = async () => {
  if (cache.value && Date.now() - cache.at < 10 * 60 * 1000) return cache.value;
  const [films, directors, movements] = await Promise.all([
    Movie.find({}).select(FIELDS).lean(),
    Director.find({}).select('name profileUrl birthDate deathDate placeOfBirth').lean(),
    Movement.find({}).select('title tag era tagline heroFilm heroFocus').lean(),
  ]);
  const cards = films.map(toCard);
  const byTitle = new Map(cards.map((c) => [c.title, c]));
  // a movement is pictured by its curated hero film's still (as on the Movements page)
  movements.forEach((m) => { m.heroStill = byTitle.get(m.heroFilm)?.still || null; });
  const value = {
    cards,
    byId: new Map(cards.map((c) => [c._id, c])),
    byTmdb: new Map(cards.filter((c) => c._tmdb != null).map((c) => [c._tmdb, c])),
    directors: new Map(directors.map((d) => [normalizeName(d.name), d])),
    movementsByTag: new Map(movements.filter((m) => m.tag).map((m) => [m.tag, m])),
    movementsByTitle: new Map(movements.map((m) => [m.title, m])),
  };
  cache = { at: Date.now(), value };
  return value;
};
