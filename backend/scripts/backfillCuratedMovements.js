/**
 * Backfill curatedMovements from the curation lists (data/canon/round*-additions.json)
 * for films added before the field existed. Matches by title + year (±1) + director.
 *
 * Usage:  node scripts/backfillCuratedMovements.js [--dry-run]
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js';
import { namesMatch, surnamesMatch, normalizeName } from '../services/nameUtils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const DRY_RUN = process.argv.includes('--dry-run');

const main = async () => {
  const dir = path.join(__dirname, '..', 'data', 'canon');
  const entries = fs.readdirSync(dir).filter((f) => /^round\d+-additions\.json$/.test(f))
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    .filter((e) => e.movements?.length);
  await mongoose.connect(process.env.MONGODB_URI);
  const films = await Movie.find({}).select('title originalTitle altTitles year directors curatedMovements').lean();
  let hit = 0, miss = 0;
  for (const e of entries) {
    const f = films.find((m) =>
      [m.title, m.originalTitle, ...(m.altTitles || [])].some((t) => t && normalizeName(t) === normalizeName(e.title)) &&
      (!e.year || Math.abs(m.year - e.year) <= 1) &&
      (!e.director || (m.directors || []).some((d) => namesMatch(d, e.director) || surnamesMatch(d, e.director))));
    if (!f) { miss++; console.log(`  ✗ ${e.title} (${e.year}) not found`); continue; }
    hit++;
    if (!DRY_RUN) await Movie.updateOne({ _id: f._id }, { $addToSet: { curatedMovements: { $each: e.movements } } });
  }
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}curatedMovements set on ${hit} films · ${miss} not found`);
  await mongoose.connection.close();
};

main().catch(async (err) => { console.error(err); await mongoose.connection.close().catch(() => {}); process.exit(1); });
