/**
 * Resolve every parsed canon entry to a TMDB id, so provenance joins on ids
 * instead of fuzzy titles — and so the acquisition list for films we don't
 * have yet is directly seedable.
 *
 * Search is title + year (±1, or the entry's own yearTolerance), confirmed by
 * a director-surname match on the credits. Results are cached in
 * data/canon/tmdb-resolution.json keyed by title|year|director, so re-runs
 * only hit TMDB for new entries.
 *
 * Usage:  node scripts/canon/resolveCanonTmdb.js [--in <dir>] [--limit N]
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { tmdbGet, createLimiter, namesMatch, surnamesMatch, normalizeName } from '../lib/tmdbResolve.js';
import { SOURCES } from './sources.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const args = process.argv.slice(2);
const argValue = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const IN_DIR = argValue('--in') || path.join(__dirname, '..', '..', 'data', 'canon');
const LIMIT = parseInt(argValue('--limit') || '0', 10);
const RETRY_UNRESOLVED = args.includes('--retry-unresolved');
const CACHE_PATH = path.join(IN_DIR, 'tmdb-resolution.json');

const keyOf = (e) => `${normalizeName(e.title)}|${e.year || ''}|${normalizeName(e.directors?.[0] || '')}`;

// Lighter than lib.findCandidate: one search per year in the window, confirm on credits
const resolve = async (entry, tolOverride) => {
  // Lists disagree about years (production vs. festival vs. release — Beau
  // travail is 1998, 1999 or 2000 depending who you ask), so the first pass is
  // tight and a second pass widens to ±2 when the director can confirm.
  const tol = tolOverride || entry.yearTolerance || 1;
  const years = entry.year ? [entry.year, ...Array.from({ length: tol }, (_, i) => entry.year - i - 1), ...Array.from({ length: tol }, (_, i) => entry.year + i + 1)] : [undefined];
  const queries = [entry.title, entry.originalTitle].filter(Boolean);
  const seen = new Set();
  const pool = [];
  for (const q of queries) {
    for (const y of years) {
      const res = await tmdbGet('/search/movie', { query: q, ...(y ? { primary_release_year: y } : {}) });
      for (const r of res?.results || []) if (!seen.has(r.id)) { seen.add(r.id); pool.push(r); }
      if (pool.length >= 5) break;
    }
    if (pool.length >= 5) break;
  }
  if (pool.length === 0 && entry.title) {
    const res = await tmdbGet('/search/movie', { query: entry.title });
    for (const r of (res?.results || []).slice(0, 5)) pool.push(r);
  }
  const director = entry.directors?.[0];
  for (const r of pool.slice(0, 6)) {
    const d = await tmdbGet(`/movie/${r.id}`, { append_to_response: 'credits' });
    if (!d) continue;
    const dirs = (d.credits?.crew || []).filter((c) => c.job === 'Director').map((c) => c.name);
    const y = d.release_date ? parseInt(d.release_date.slice(0, 4), 10) : null;
    const yearOk = !entry.year || !y || Math.abs(y - entry.year) <= tol;
    // Title + year already constrain the search, so a surname match is enough
    // ("Charles"/"Charlie" Chaplin, "Ozu Yasujirō"/"Yasujirō Ozu")
    const dirOk = !director || dirs.some((n) => namesMatch(n, director) || surnamesMatch(n, director));
    if (yearOk && dirOk) return { tmdbId: d.id, tmdbTitle: d.title, year: y, directors: dirs, confidence: director ? 'director' : 'year' };
  }
  return { tmdbId: null, confidence: 'unresolved' };
};

const main = async () => {
  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};
  if (RETRY_UNRESOLVED) {
    for (const k of Object.keys(cache)) if (!cache[k].tmdbId) delete cache[k];
  }
  const entries = [];
  for (const id of Object.keys(SOURCES)) {
    const p = path.join(IN_DIR, `${id}.json`);
    if (fs.existsSync(p)) entries.push(...JSON.parse(fs.readFileSync(p, 'utf8')));
  }
  // Awards already carry ids from Wikidata; dedupe the rest across sources
  const todo = new Map();
  for (const e of entries) {
    if (e.tmdbId) continue;
    const k = keyOf(e);
    if (!cache[k] && !todo.has(k)) todo.set(k, e);
  }
  let list = [...todo.values()];
  if (LIMIT) list = list.slice(0, LIMIT);
  console.log(`${entries.length} canon entries · ${Object.keys(cache).length} cached · ${list.length} to resolve`);

  const limiter = createLimiter(4);
  let done = 0, hit = 0;
  const save = () => fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 1));
  await Promise.all(list.map((e) => limiter(async () => {
    try {
      let r = await resolve(e);
      if (!r.tmdbId && e.directors?.[0]) r = await resolve(e, 2);
      cache[keyOf(e)] = { ...r, title: e.title, year: e.year, director: e.directors?.[0] || null };
      if (r.tmdbId) hit++;
    } catch (err) {
      cache[keyOf(e)] = { tmdbId: null, confidence: 'error', error: err.message, title: e.title, year: e.year };
    } finally {
      done++;
      if (done % 100 === 0) { console.log(`  ${done}/${list.length} (${hit} resolved)`); save(); }
    }
  })));
  save();

  const all = Object.values(cache);
  const resolved = all.filter((r) => r.tmdbId).length;
  console.log(`Done. ${resolved}/${all.length} unique canon titles resolved to TMDB ids (${all.length - resolved} unresolved) → ${path.relative(process.cwd(), CACHE_PATH)}`);
};

main().catch((err) => { console.error(err); process.exit(1); });
