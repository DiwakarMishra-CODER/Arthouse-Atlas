/**
 * Apply Catalogue Fixes
 *
 * Acts on a verify-report.json produced by verifyCatalogue.js:
 *   REMATCH          repoint the record at the correct TMDB id and refetch everything
 *   REFETCH_SAME_ID  keep the id, refetch the fields the schema bug dropped
 *   --remove         delete films by exact title (and pull them from user lists)
 *
 * After the TMDB fields are refreshed, tags, moods and every stored score are
 * recomputed for the touched films, then director spellings are unified across
 * the catalogue (the Director page virtual joins on the exact string).
 *
 * Usage:
 *   node scripts/applyCatalogueFixes.js --report <verify-report.json> [--remove "Title A|Title B"] [--dry-run] [--out <dir>]
 *
 * --dry-run fetches from TMDB and prints every change but writes nothing.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js';
import User from '../models/User.js';
import Director from '../models/Director.js';
import { generateTags } from '../services/taggingService.js';
import { assignMoods } from '../services/moodService.js';
import { calculateArthouseScore } from '../services/arthouseScoring.js';
import {
  calculateBaseCanonScore, calculateCriticalConsensus, calculateFormalInnovation,
  calculateCulturalInfluence, calculateDepthScore
} from '../services/baseCanonScoring.js';
import { normalizeName, fetchMovieFields, sleep } from './lib/tmdbResolve.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const args = process.argv.slice(2);
const argValue = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const DRY_RUN = args.includes('--dry-run');
const REPORT_PATH = argValue('--report');
const REMOVE_TITLES = (argValue('--remove') || '').split('|').map((t) => t.trim()).filter(Boolean);
const OUT_DIR = argValue('--out') || path.join(__dirname, 'reports');

const log = [];
const say = (line) => { console.log(line); log.push(line); };

// ============================================================================
// SCORES — same pipeline the seed scripts run, on the merged document
// ============================================================================
const recomputeDerived = (doc) => {
  const derivedTags = generateTags({ synopsis: doc.synopsis, keywords: doc.keywords, genres: doc.genres });
  const merged = { ...doc, derivedTags };
  merged.moods = assignMoods(merged);
  merged.criticalConsensus = calculateCriticalConsensus(merged);
  merged.formalInnovation = calculateFormalInnovation(merged);
  merged.culturalInfluence = calculateCulturalInfluence(merged);
  merged.depthScore = calculateDepthScore(merged);
  merged.arthouseScore = calculateArthouseScore(merged);
  merged.baseCanonScore = calculateBaseCanonScore(merged);
  return {
    derivedTags, moods: merged.moods,
    criticalConsensus: merged.criticalConsensus, formalInnovation: merged.formalInnovation,
    culturalInfluence: merged.culturalInfluence, depthScore: merged.depthScore,
    arthouseScore: merged.arthouseScore, baseCanonScore: merged.baseCanonScore
  };
};

// ============================================================================
// REFETCH / REMATCH
// ============================================================================
const fixFilm = async (row) => {
  const movie = await Movie.findById(row._id).lean();
  if (!movie) { say(`  ✗ ${row.title}: no longer in DB, skipped`); return null; }

  const targetId = row.action === 'REMATCH' ? row.candidate.tmdbId : movie.tmdbId;

  // tmdbId is unique — a rematch onto an id another record already holds would
  // be a duplicate, so flag it instead of writing
  if (row.action === 'REMATCH') {
    const clash = await Movie.findOne({ tmdbId: targetId, _id: { $ne: movie._id } }).select('title year').lean();
    if (clash) { say(`  ✗ ${row.title}: target #${targetId} already held by "${clash.title}" (${clash.year}) — remove the broken record instead`); return { title: row.title, status: 'CLASH', clash }; }
  }

  const fetched = await fetchMovieFields(targetId);
  if (!fetched) { say(`  ✗ ${row.title}: TMDB #${targetId} not found`); return { title: row.title, status: 'NOT_FOUND' }; }
  const f = fetched.fields;

  // Refetch keeps the curated title and any stored synopsis; a rematch was
  // pointing at the wrong work, so TMDB's values win.
  const isRematch = row.action === 'REMATCH';
  const set = {
    tmdbId: f.tmdbId,
    title: isRematch ? f.title : movie.title,
    year: f.year ?? movie.year,
    decade: f.decade ?? movie.decade,
    synopsis: isRematch || !movie.synopsis ? f.synopsis : movie.synopsis,
    directors: f.directors.length ? f.directors : movie.directors,
    runtime: f.runtime ?? movie.runtime,
    country: f.country ?? movie.country,
    countries: f.countries,
    posterUrl: isRematch || !movie.posterUrl ? (f.posterUrl ?? movie.posterUrl) : movie.posterUrl,
    backdropUrl: f.backdropUrl ?? movie.backdropUrl,
    genres: f.genres.length ? f.genres : movie.genres,
    keywords: f.keywords.length ? f.keywords : movie.keywords,
    vote_average: f.vote_average,
    vote_count: f.vote_count,
    popularity: f.popularity,
    trailerUrl: f.trailerUrl ?? movie.trailerUrl,
    stills: f.stills.length ? f.stills : movie.stills,
    cinematographers: f.cinematographers.length ? f.cinematographers : movie.cinematographers,
    composers: f.composers.length ? f.composers : movie.composers,
    productionCompanies: f.productionCompanies.length ? f.productionCompanies : movie.productionCompanies
  };
  Object.assign(set, recomputeDerived({ ...movie, ...set }));

  const before = `${movie.title} (${movie.year}) · ${(movie.directors || []).join(', ') || '—'} · ${movie.country || '—'} · ${movie.vote_count || 0} votes · AS ${movie.arthouseScore} · CS ${movie.baseCanonScore}`;
  const after = `${set.title} (${set.year}) · ${set.directors.join(', ')} · ${set.country || '—'} · ${set.vote_count} votes · AS ${set.arthouseScore} · CS ${set.baseCanonScore}`;
  say(`  ${isRematch ? '↪' : '↻'} ${before}`);
  say(`      → ${after}${isRematch ? ` · #${movie.tmdbId} → #${f.tmdbId}` : ''}`);

  if (!DRY_RUN) await Movie.updateOne({ _id: movie._id }, { $set: set });
  return { title: movie.title, status: isRematch ? 'REMATCHED' : 'REFETCHED', before, after };
};

// ============================================================================
// REMOVALS
// ============================================================================
const removeFilm = async (title) => {
  const movie = await Movie.findOne({ title }).lean();
  if (!movie) { say(`  ✗ "${title}": not found, skipped`); return { title, status: 'NOT_FOUND' }; }
  const inLists = await User.countDocuments({ $or: [{ favorites: movie._id }, { watchlist: movie._id }, { watched: movie._id }] });
  say(`  − ${movie.title} (${movie.year}) · ${(movie.directors || []).join(', ') || '—'}${inLists ? ` · in ${inLists} user list(s)` : ''}`);
  if (!DRY_RUN) {
    await User.updateMany({}, { $pull: { favorites: movie._id, watchlist: movie._id, watched: movie._id } });
    await Movie.deleteOne({ _id: movie._id });
  }
  return { title: movie.title, status: 'REMOVED' };
};

// ============================================================================
// DIRECTOR SPELLING UNIFICATION
// ============================================================================
// Director.name is the join key for a director's filmography, so where the
// same person appears under several spellings we standardise on the Director
// document's spelling, else the most common one.
const unifyDirectorNames = async () => {
  const movies = await Movie.find({}).select('title directors').lean();
  const directorDocs = await Director.find({}).select('name').lean();
  const docByKey = new Map(directorDocs.map((d) => [normalizeName(d.name), d.name]));

  const spellings = new Map(); // key -> Map(spelling -> count)
  movies.forEach((m) => (m.directors || []).forEach((name) => {
    const key = normalizeName(name);
    if (!spellings.has(key)) spellings.set(key, new Map());
    spellings.get(key).set(name, (spellings.get(key).get(name) || 0) + 1);
  }));

  const canonical = new Map();
  for (const [key, counts] of spellings) {
    if (counts.size < 2 && !docByKey.has(key)) continue;
    const preferred = docByKey.get(key) || [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    if (counts.size >= 2 || !counts.has(preferred)) canonical.set(key, preferred);
  }

  const changes = [];
  for (const m of movies) {
    const fixed = (m.directors || []).map((name) => canonical.get(normalizeName(name)) || name);
    if (fixed.some((n, i) => n !== m.directors[i])) {
      changes.push({ title: m.title, from: m.directors, to: fixed });
      say(`  ≈ ${m.title}: ${m.directors.join(', ')} → ${fixed.join(', ')}`);
      if (!DRY_RUN) await Movie.updateOne({ _id: m._id }, { $set: { directors: fixed } });
    }
  }
  if (!changes.length) say('  (no spelling variants found)');
  return changes;
};

// ============================================================================
// MAIN
// ============================================================================
const main = async () => {
  if (!REPORT_PATH) throw new Error('--report <verify-report.json> is required');
  const rows = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const toFix = rows.filter((r) => r.action === 'REMATCH' || r.action === 'REFETCH_SAME_ID');

  await mongoose.connect(process.env.MONGODB_URI);
  const startCount = await Movie.countDocuments();
  say(`${DRY_RUN ? '[DRY RUN] ' : ''}Catalogue: ${startCount} films · ${toFix.length} to fix · ${REMOVE_TITLES.length} to remove\n`);

  const results = { fixed: [], removed: [], renamed: [] };

  say(`── Rematch (${toFix.filter((r) => r.action === 'REMATCH').length}) and refetch (${toFix.filter((r) => r.action === 'REFETCH_SAME_ID').length}) ──`);
  for (const row of toFix) {
    try {
      const res = await fixFilm(row);
      if (res) results.fixed.push(res);
    } catch (err) {
      say(`  ✗ ${row.title}: ${err.message}`);
      results.fixed.push({ title: row.title, status: 'ERROR', error: err.message });
    }
    await sleep(120);
  }

  if (REMOVE_TITLES.length) {
    say(`\n── Remove (${REMOVE_TITLES.length}) ──`);
    for (const title of REMOVE_TITLES) results.removed.push(await removeFilm(title));
  }

  say('\n── Unify director spellings ──');
  results.renamed = await unifyDirectorNames();

  const endCount = await Movie.countDocuments();
  const tally = (arr) => Object.entries(arr.reduce((o, r) => ({ ...o, [r.status]: (o[r.status] || 0) + 1 }), {})).map(([k, v]) => `${k} ${v}`).join(', ');
  say(`\nDone${DRY_RUN ? ' (nothing written)' : ''}. Films: ${startCount} → ${endCount}. Fixes: ${tally(results.fixed) || 'none'}. Removals: ${tally(results.removed) || 'none'}. Spellings unified: ${results.renamed.length}.`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  fs.writeFileSync(path.join(OUT_DIR, `apply-${DRY_RUN ? 'dryrun' : 'live'}-${stamp}.json`), JSON.stringify({ dryRun: DRY_RUN, startCount, endCount, results, log }, null, 2));
  await mongoose.connection.close();
};

main().catch(async (err) => {
  console.error(err);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
