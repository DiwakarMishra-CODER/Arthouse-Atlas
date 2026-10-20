/**
 * Cache every film's TMDB keywords for the mood model (data/moods/tmdb-keywords.json).
 *
 * Read-only on the database. The Movie.keywords field is older and thinner (758
 * films have any), so the model reads this cache instead; the field is untouched.
 *
 *   node scripts/moods/fetchKeywords.js
 */
import fs from 'fs';
import mongoose from 'mongoose';
import Movie from '../../models/Movie.js';
import { tmdbGet, createLimiter } from '../lib/tmdbResolve.js';
import { KEYWORDS_FILE, MOODS_DIR } from './lib/data.js';

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const films = await Movie.find({ tmdbId: { $ne: null } }).select('tmdbId').lean();
  await mongoose.disconnect();
  const limit = createLimiter(3);
  const out = {};
  let done = 0;
  await Promise.all(films.map((f) => limit(async () => {
    const res = await tmdbGet(`/movie/${f.tmdbId}/keywords`);
    out[f.tmdbId] = (res?.keywords || []).map((k) => k.name);
    if (++done % 200 === 0) console.log(`  ${done}/${films.length}`);
  })));
  fs.mkdirSync(MOODS_DIR, { recursive: true });
  const sorted = Object.fromEntries(Object.entries(out).sort((a, b) => a[0] - b[0]));
  fs.writeFileSync(KEYWORDS_FILE, `${JSON.stringify({ fetchedAt: new Date().toISOString(), films: sorted }, null, 0)}\n`);
  console.log(`${films.length} films, ${Object.values(out).filter((k) => k.length).length} with keywords → ${KEYWORDS_FILE}`);
};

main().catch((err) => { console.error(err); process.exit(1); });
