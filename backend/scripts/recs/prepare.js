/**
 * Prepare: join MovieLens onto the catalogue and count
 *
 * One pass over ratings.csv (32M rows), person by person:
 *   - keeps only ratings of films in our catalogue (joined on TMDB id),
 *   - adds every pair of films a person loved to two count grids: one from the
 *     training group only (for honest evaluation) and one from everyone (for
 *     the model the site ships),
 *   - keeps the full rating history of validation and test people who loved at
 *     least 5 of our films, for evaluate.js.
 *
 * Writes data/recs/work/{counts-train,counts-all,eval-users}.json and
 * scripts/reports/recs-coverage.md. Stops before counting if fewer than 600
 * films match MovieLens, unless --force.
 *
 * Usage:  node scripts/recs/prepare.js [--force]
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ML_FILES, WORK_DIR, REPORTS_DIR, ENV_FILE, readJson, writeJson } from './lib/paths.js';
import { loadLinks, loadMovieTitles, buildLookup, streamRatings, imdbNumber } from './lib/movielens.js';
import { tmdbGet } from '../lib/tmdbResolve.js';
import { LIKE, TEST_GROUP, VALIDATION_GROUP, createCounter, countsToJson } from './lib/counting.js';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const MIN_MATCHED = 600;
const MIN_EVAL_LIKES = 5;

dotenv.config({ path: ENV_FILE });

// IMDb ids, from TMDB, for films MovieLens doesn't know by TMDB id (cached: one request per film, ever)
const imdbIdsFor = async (films) => {
  const cacheFile = path.join(WORK_DIR, 'imdb-ids.json');
  const cache = fs.existsSync(cacheFile) ? readJson(cacheFile) : {};
  for (const f of films) {
    if (f.tmdbId in cache) continue;
    try {
      cache[f.tmdbId] = (await tmdbGet(`/movie/${f.tmdbId}/external_ids`)).imdb_id || null;
    } catch (err) {
      console.warn(`  no IMDb id for ${f.title}: ${err.message}`);
    }
  }
  writeJson(cacheFile, cache, 1);
  return new Map(films.map((f) => [f.tmdbId, imdbNumber(cache[f.tmdbId])]));
};

const pct = (a, b) => `${((100 * a) / b).toFixed(1)}%`;
const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

const main = async () => {
  const started = Date.now();
  const { films } = readJson(path.join(WORK_DIR, 'catalogue.json'));
  const N = films.length;

  const links = loadLinks(path.join(ML_FILES, 'links.csv'));
  const titles = loadMovieTitles(path.join(ML_FILES, 'movies.csv'));
  const byTmdb = buildLookup(films, links, titles);
  const imdbOf = await imdbIdsFor(films.filter((_, i) => !byTmdb.matched.has(i)));
  const { lookup, matched, merges, yearFlags, byImdb } = buildLookup(films, links, titles, imdbOf);
  console.log(`matched ${matched.size} of ${N} films to MovieLens (${byImdb.length} of them by IMDb id)`);

  const R = [];
  R.push(`# Recommendations — MovieLens coverage — ${new Date().toISOString().slice(0, 10)}`, '');
  R.push(`Catalogue films: **${N}** · matched to MovieLens: **${matched.size}** (${pct(matched.size, N)}), ${byImdb.length} of them by IMDb id because MovieLens's TMDB link was stale`, '');
  const unmatched = films.filter((_, i) => !matched.has(i)).sort((a, b) => (b.year || 0) - (a.year || 0));
  R.push(`## Not in MovieLens (${unmatched.length})`, '', 'These get neighbours from content alone (director, movement, country, decade).', '');
  unmatched.forEach((f) => R.push(`- ${f.title} (${f.year ?? '?'}) — ${f.directors.join(', ')}`));
  R.push('', `## Matched by IMDb id (${byImdb.length}) — check these`, '');
  byImdb.forEach((m) => R.push(`- ${m.title} ↔ ${m.mlTitle}`));
  R.push('', `## Films with more than one MovieLens id (${merges.length})`, '');
  merges.forEach((m) => R.push(`- ${m.title} — movieIds ${m.movieIds.join(', ')}`));
  R.push('', `## Year differs by more than 1 (${yearFlags.length}) — check the TMDB link`, '');
  yearFlags.forEach((y) => R.push(`- ${y.title} (${y.year}) ↔ MovieLens #${y.movieId} "${y.mlTitle}"`));
  const reportPath = path.join(REPORTS_DIR, 'recs-coverage.md');
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  if (matched.size < MIN_MATCHED && !FORCE) {
    fs.writeFileSync(reportPath, R.join('\n'));
    throw new Error(`only ${matched.size} films matched (< ${MIN_MATCHED}); see ${reportPath}. Re-run with --force to count anyway.`);
  }

  const counter = createCounter(N);
  const { train, all } = counter;
  const evalUsers = [];
  let likesTotal = 0;
  let usersWithOurs = 0;

  const stats = await streamRatings(path.join(ML_FILES, 'ratings.csv'), lookup, (userId, rows) => {
    usersWithOurs++;
    const { split, liked } = counter.add(userId, rows);
    likesTotal += liked.length;
    if (split !== 'train' && liked.length >= MIN_EVAL_LIKES) {
      evalUsers.push({ userId, split, rows: rows.map(([i, r, t]) => [films[i].tmdbId, r, t]) });
    }
  });

  const matchedIds = films.filter((_, i) => matched.has(i)).map((f) => f.tmdbId);
  // the split travels with the files, so evaluate.js can refuse files made under a different split
  const groups = { testGroup: TEST_GROUP, validationGroup: VALIDATION_GROUP };
  writeJson(path.join(WORK_DIR, 'counts-train.json'), { ...countsToJson(train, films), matched: matchedIds, ...groups });
  writeJson(path.join(WORK_DIR, 'counts-all.json'), { ...countsToJson(all, films), matched: matchedIds, ...groups });
  writeJson(path.join(WORK_DIR, 'eval-users.json'), { minLikes: MIN_EVAL_LIKES, ...groups, users: evalUsers });

  const likesPerFilm = films.map((f, i) => ({ f, i, n: all.n[i] })).filter((x) => matched.has(x.i));
  const sorted = likesPerFilm.map((x) => x.n).sort((a, b) => a - b);
  const byLikes = [...likesPerFilm].sort((a, b) => b.n - a.n);
  const head = [
    '## Ratings', '',
    `- ratings read: ${stats.lines.toLocaleString()} from ${stats.users.toLocaleString()} people`,
    `- ratings of our films: ${stats.ourRatings.toLocaleString()} from ${usersWithOurs.toLocaleString()} people`,
    `- loved (${LIKE}+ stars): ${likesTotal.toLocaleString()}`,
    `- evaluation people (loved ${MIN_EVAL_LIKES}+ of our films): validation ${evalUsers.filter((u) => u.split === 'val').length.toLocaleString()}, test ${evalUsers.filter((u) => u.split === 'test').length.toLocaleString()}`,
    '', '## How many people loved each matched film', '',
    `- median ${quantile(sorted, 0.5)}, 10th percentile ${quantile(sorted, 0.1)}, 90th percentile ${quantile(sorted, 0.9)}`,
    `- fewer than 10 people: ${sorted.filter((v) => v < 10).length} films · fewer than 50: ${sorted.filter((v) => v < 50).length} films`,
    `- most loved: ${byLikes.slice(0, 8).map((x) => `${x.f.title} (${x.n.toLocaleString()})`).join(', ')}`,
    `- least loved: ${byLikes.slice(-8).map((x) => `${x.f.title} (${x.n})`).join(', ')}`,
    '',
  ];
  R.splice(4, 0, ...head);
  fs.writeFileSync(reportPath, R.join('\n'));

  console.log(head.filter((l) => l.startsWith('-')).join('\n'));
  console.log(`report → ${path.relative(process.cwd(), reportPath)} · ${((Date.now() - started) / 1000).toFixed(0)} s`);
};

main().catch((err) => { console.error(err.message || err); process.exit(1); });
