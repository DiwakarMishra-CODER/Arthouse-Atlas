/**
 * What viewers said about each film, in their own words: the tags MovieLens viewers wrote
 * (data/movielens/ml-32m/tags.csv), counted by how many different viewers used each, for the
 * feel ranking of natural-language search ("something slow and sad set in winter").
 *
 *   node scripts/nlsearch/feelTags.js        reads the database and tags.csv; writes data/feel/tags.json
 *
 * Unlike the moods (a strict rule, 21 words), these are every word viewers used often enough for a
 * film: 2 viewers or more (1 for a film fewer than 50 viewers tagged, as the mood rule allows for thin
 * films), the 20 most used. Housekeeping tags ("dvd", "own it", "seen more than once", "criterion")
 * say nothing about the film and are left out. They're used only to rank search results and to say
 * why a film matched ("matched: snow, loneliness"); film pages show the moods, not these.
 *
 * MovieLens films are matched to the atlas as the recommender and the moods do it (by TMDB id, then
 * the cached IMDb id). MovieLens data: GroupLens Research, University of Minnesota, non-commercial
 * use with credit.
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { normalizeTag } from '../moods/lib/viewerMoods.js';
import { parseCsvLine, loadLinks, loadMovieTitles, buildLookup, imdbNumber } from '../recs/lib/movielens.js';
import Movie from '../../models/Movie.js';

const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(BACKEND, '.env') });
const ML = path.join(BACKEND, 'data/movielens/ml-32m');
const OUT = path.join(BACKEND, 'data/feel/tags.json');
const TOP = 20;

// tags about the viewer's shelf or habits, not the film
const HOUSEKEEPING = /^(dvd|dvd-r|dvd-video|bd-r|bd-video|blu-ray|vhs|clv|own it|owned|own|seen|seen it|watched|seen more than once|to see|want to see|watchlist|netflix|netflix queue|amazon|imdb top 250|criterion|tivo|in netflix queue|library|might like|my movies|favorite|favorites|recommended|r|pg|pg-13|nr|unrated|\d+|\d+ stars?|\d+\/\d+)$/;

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const films = (await Movie.find({ tmdbId: { $ne: null } }).select('title year tmdbId').lean()).map((f) => ({ ...f, _id: String(f._id) }));
  await mongoose.disconnect();

  const links = loadLinks(path.join(ML, 'links.csv'));
  const titles = loadMovieTitles(path.join(ML, 'movies.csv'));
  const imdbCache = JSON.parse(fs.readFileSync(path.join(BACKEND, 'data/recs/work/imdb-ids.json'), 'utf8'));
  const imdbOf = new Map(Object.entries(imdbCache).map(([t, id]) => [Number(t), imdbNumber(id)]));
  const { lookup } = buildLookup(films, links, titles, imdbOf);

  const tagUsers = films.map(() => new Map());
  const taggers = films.map(() => new Set());
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(ML, 'tags.csv')) });
  let header = true;
  for await (const line of rl) {
    if (header) { header = false; continue; }
    const [user, movieId, raw] = parseCsvLine(line);
    const i = lookup[Number(movieId)] ?? -1;
    if (i < 0) continue;
    const tag = normalizeTag(raw);
    if (!tag || tag.length > 40 || HOUSEKEEPING.test(tag)) continue;
    taggers[i].add(user);
    const users = tagUsers[i].get(tag) || new Set();
    users.add(user);
    tagUsers[i].set(tag, users);
  }

  const out = {};
  let withTags = 0;
  films.forEach((f, i) => {
    const min = taggers[i].size < 50 ? 1 : 2;
    const top = [...tagUsers[i]].map(([tag, users]) => [tag, users.size]).filter(([, n]) => n >= min)
      .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0])).slice(0, TOP);
    if (top.length) { out[f._id] = { taggers: taggers[i].size, tags: top }; withTags++; }
  });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify({ builtAt: new Date().toISOString(), source: 'MovieLens 32M tags (GroupLens Research)', top: TOP, films: out })}\n`);
  console.log(`${withTags} of ${films.length} films have viewer tags; wrote ${path.relative(BACKEND, OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
};

main().catch((e) => { console.error(e); process.exit(1); });
