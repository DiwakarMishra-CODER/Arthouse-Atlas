/**
 * Export the catalogue for the recommendation pipeline
 *
 * Reads every film from MongoDB (read-only) and writes the fields the pipeline
 * needs to data/recs/work/catalogue.json, sorted by tmdbId so every later step
 * is deterministic. Films are keyed by tmdbId, never by Mongo _id: tmdbId is
 * what MovieLens links to, and it survives a re-seed.
 *
 * derivedTags, genres, baseCanonScore and arthouseScore are exported only so
 * the evaluation can replay the old engine as a baseline.
 *
 * Usage:  node scripts/recs/exportCatalogue.js
 */

import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../../models/Movie.js';
import { ENV_FILE, WORK_DIR, writeJson } from './lib/paths.js';

dotenv.config({ path: ENV_FILE });

const FIELDS = 'tmdbId title year decade directors movements country countries canonRank derivedTags genres baseCanonScore arthouseScore';

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const films = await Movie.find({ tmdbId: { $type: 'number' } }).select(FIELDS).sort({ tmdbId: 1 }).lean();
  const missing = await Movie.countDocuments({ tmdbId: { $not: { $type: 'number' } } });
  await mongoose.connection.close();

  const catalogue = films.map((f) => ({
    tmdbId: f.tmdbId,
    title: f.title,
    year: f.year ?? null,
    decade: f.decade ?? null,
    directors: f.directors || [],
    movements: f.movements || [],
    country: f.country || f.countries?.[0] || null,
    canonRank: f.canonRank ?? null,
    legacy: {
      derivedTags: f.derivedTags || [],
      genres: f.genres || [],
      baseCanonScore: f.baseCanonScore || 0,
      arthouseScore: f.arthouseScore || 0,
    },
  }));

  const out = path.join(WORK_DIR, 'catalogue.json');
  writeJson(out, { exportedAt: new Date().toISOString(), films: catalogue });
  console.log(`${catalogue.length} films → ${path.relative(process.cwd(), out)}`);
  if (missing) console.warn(`⚠ ${missing} films have no tmdbId and were skipped`);
};

main().catch(async (err) => {
  console.error(err);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
