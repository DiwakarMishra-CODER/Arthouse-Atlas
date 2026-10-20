/**
 * Reading MovieLens and joining it onto the catalogue.
 *
 * links.csv gives each MovieLens movieId its TMDB id, which is the key our
 * catalogue already uses, so the join is exact rather than by title. Two
 * movieIds can point at the same film; both are mapped to it, and a person who
 * rated both counts once (their higher rating).
 */

import fs from 'fs';
import readline from 'readline';

// Split one CSV line, honouring double quotes ("Misérables, Les (1995)") and "" escapes
export const parseCsvLine = (line) => {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
};

const readLines = (file) => fs.readFileSync(file, 'utf8').split('\n').slice(1).filter(Boolean);

// [{ movieId, imdbId, tmdbId }]; imdbId as a number (tt0101985 → 101985), tmdbId null when missing
export const loadLinks = (file) => readLines(file)
  .map((l) => l.split(','))
  .map(([movieId, imdb, tmdb]) => ({ movieId: Number(movieId), imdbId: Number(imdb), tmdbId: tmdb && tmdb.trim() ? Number(tmdb) : null }));

export const imdbNumber = (id) => (id ? Number(String(id).replace(/^tt/, '')) : null);

// movieId -> { title, year } from movies.csv ("Title (1995)")
export const loadMovieTitles = (file) => {
  const map = new Map();
  for (const line of readLines(file)) {
    const [movieId, raw] = parseCsvLine(line);
    const m = raw.trim().match(/\((\d{4})(?:[–-]\d{0,4})?\)$/);
    map.set(Number(movieId), { title: raw.trim(), year: m ? Number(m[1]) : null });
  }
  return map;
};

/**
 * Map MovieLens movieIds onto catalogue films (films sorted by tmdbId; a film's
 * position in that array is its index everywhere in the pipeline).
 * First by TMDB id. MovieLens's TMDB links are sometimes stale (TMDB merges
 * duplicate entries), so a film still unmatched can be matched on its IMDb id
 * instead: imdbOf maps tmdbId -> IMDb number for those films.
 * Returns the lookup (movieId -> film index, -1 when not ours) and what the
 * coverage report needs.
 */
export const buildLookup = (films, links, titles, imdbOf = new Map()) => {
  const indexOfTmdb = new Map(films.map((f, i) => [f.tmdbId, i]));
  const maxMovieId = links.reduce((m, l) => Math.max(m, l.movieId), 0);
  const lookup = new Int32Array(maxMovieId + 1).fill(-1);
  const movieIdsOf = new Map(); // film index -> [movieId]

  for (const { movieId, tmdbId } of links) {
    const i = indexOfTmdb.get(tmdbId);
    if (i === undefined) continue;
    lookup[movieId] = i;
    if (!movieIdsOf.has(i)) movieIdsOf.set(i, []);
    movieIdsOf.get(i).push(movieId);
  }

  const byImdb = [];
  films.forEach((film, i) => {
    if (movieIdsOf.has(i) || !imdbOf.get(film.tmdbId)) return;
    const ids = links.filter((l) => l.imdbId === imdbOf.get(film.tmdbId) && lookup[l.movieId] === -1).map((l) => l.movieId);
    if (!ids.length) return;
    ids.forEach((id) => { lookup[id] = i; });
    movieIdsOf.set(i, ids);
    byImdb.push({ tmdbId: film.tmdbId, title: film.title, mlTitle: ids.map((id) => titles.get(id)?.title).join(' / ') });
  });

  const merges = [];
  const yearFlags = [];
  for (const [i, ids] of movieIdsOf) {
    const film = films[i];
    if (ids.length > 1) merges.push({ tmdbId: film.tmdbId, title: film.title, movieIds: ids });
    for (const id of ids) {
      const ml = titles.get(id);
      if (ml?.year && film.year && Math.abs(ml.year - film.year) > 1) {
        yearFlags.push({ tmdbId: film.tmdbId, title: film.title, year: film.year, movieId: id, mlTitle: ml.title });
      }
    }
  }
  return { lookup, matched: new Set(movieIdsOf.keys()), merges, yearFlags, byImdb };
};

/**
 * Stream ratings.csv once, person by person. The file is sorted by userId
 * (MovieLens README), so a person's ratings arrive together; this throws if
 * that ever stops being true rather than silently splitting someone in two.
 *
 * onUser(userId, rows) gets that person's ratings of OUR films only, one row
 * per film as [filmIndex, rating, timestamp], sorted by film index. When a
 * person rated two movieIds of the same film, the higher rating wins (on a tie,
 * the earlier one).
 */
export const streamRatings = async (file, lookup, onUser) => {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { highWaterMark: 1 << 20 }), crlfDelay: Infinity });
  let header = true;
  let current = -1;
  let rows = new Map();
  const stats = { lines: 0, users: 0, ourRatings: 0 };

  const flush = () => {
    if (current < 0) return;
    stats.users++;
    if (rows.size) {
      const list = [...rows].map(([i, [r, t]]) => [i, r, t]).sort((a, b) => a[0] - b[0]);
      onUser(current, list);
    }
    rows = new Map();
  };

  for await (const line of rl) {
    if (header) { header = false; continue; }
    if (!line) continue;
    stats.lines++;
    const c1 = line.indexOf(',');
    const c2 = line.indexOf(',', c1 + 1);
    const c3 = line.indexOf(',', c2 + 1);
    const userId = Number(line.slice(0, c1));
    if (userId !== current) {
      if (userId < current) throw new Error(`ratings.csv is not sorted by userId (line ${stats.lines + 1}: ${userId} after ${current})`);
      flush();
      current = userId;
    }
    const movieId = Number(line.slice(c1 + 1, c2));
    const film = movieId < lookup.length ? lookup[movieId] : -1;
    if (film < 0) continue;
    const rating = Number(line.slice(c2 + 1, c3));
    const ts = Number(line.slice(c3 + 1));
    stats.ourRatings++;
    const prev = rows.get(film);
    if (!prev || rating > prev[0] || (rating === prev[0] && ts < prev[1])) rows.set(film, [rating, ts]);
  }
  flush();
  return stats;
};
