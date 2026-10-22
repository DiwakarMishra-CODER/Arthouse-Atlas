/**
 * Audience: what MovieLens viewers made of each film, for the film page ("On MovieLens, 41,262
 * people loved it: three in four of those who rated it").
 *
 * One pass over ratings.csv, joined onto the catalogue exactly as prepare.js joins it (TMDB id, then
 * IMDb id from its cache), counting for each film how many people rated it and how many loved it
 * (LIKE stars or more, as everywhere else). A person counts once per film. Films fewer than MIN
 * people rated are left out, so a small number is never quoted.
 *
 * Writes data/recs/audience.json: { people, minimum, films: { tmdbId: [rated, loved] } }
 * Usage: node scripts/recs/audience.js   (after recs:export and recs:prepare)
 */

import fs from 'fs';
import path from 'path';
import { ML_FILES, WORK_DIR, RECS_DIR, readJson, writeJson } from './lib/paths.js';
import { loadLinks, loadMovieTitles, buildLookup, streamRatings, imdbNumber } from './lib/movielens.js';
import { LIKE } from './lib/counting.js';

const MIN = 30;

const { films } = readJson(path.join(WORK_DIR, 'catalogue.json'));
const cacheFile = path.join(WORK_DIR, 'imdb-ids.json');
const cache = fs.existsSync(cacheFile) ? readJson(cacheFile) : {};
const imdbOf = new Map(films.map((f) => [f.tmdbId, imdbNumber(cache[f.tmdbId])]));
const { lookup, matched } = buildLookup(films, loadLinks(path.join(ML_FILES, 'links.csv')), loadMovieTitles(path.join(ML_FILES, 'movies.csv')), imdbOf);
console.log(`matched ${matched.size} of ${films.length} films to MovieLens`);

const rated = new Array(films.length).fill(0);
const loved = new Array(films.length).fill(0);
const stats = await streamRatings(path.join(ML_FILES, 'ratings.csv'), lookup, (userId, rows) => {
  for (const [i, r] of rows) {
    rated[i]++;
    if (r >= LIKE) loved[i]++;
  }
});

const out = {};
films.forEach((f, i) => { if (rated[i] >= MIN) out[f.tmdbId] = [rated[i], loved[i]]; });
writeJson(path.join(RECS_DIR, 'audience.json'), {
  source: `MovieLens ml-32m (Harper & Konstan 2015, non-commercial licence): people who rated each film, and who gave it ${LIKE} stars or more`,
  minimum: MIN,
  builtAt: new Date().toISOString(),
  people: stats.users,
  films: out,
});
console.log(`audience.json: ${Object.keys(out).length} films rated by ${MIN}+ people (of ${stats.users.toLocaleString()} people)`);
