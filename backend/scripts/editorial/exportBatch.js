/**
 * Export a batch of films for editorial writing.
 *
 * Produces a JSON worksheet with everything the writer needs and nothing else:
 * the facts (title, year, directors, country, runtime, movements, provenance),
 * the TMDB overview and keywords as *reference only*, and empty editorial
 * fields to fill. importBatch.js lints and writes the result back.
 *
 * Order: by provenanceScore descending (most important films first), skipping
 * films that already have editorial text unless --rewrite.
 *
 * Usage:
 *   node scripts/editorial/exportBatch.js --size 50 [--offset 0] [--out <file>] [--rewrite]
 *   node scripts/editorial/exportBatch.js --titles "Stalker|Persona" --out <file>
 *   node scripts/editorial/exportBatch.js --no-evidence --size 40        # films that need a curatorNote
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../../models/Movie.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const args = process.argv.slice(2);
const argValue = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const SIZE = parseInt(argValue('--size') || '50', 10);
const OFFSET = parseInt(argValue('--offset') || '0', 10);
const TITLES = (argValue('--titles') || '').split('|').map((t) => t.trim()).filter(Boolean);
const REWRITE = args.includes('--rewrite');
const NO_EVIDENCE = args.includes('--no-evidence');
const OUT = argValue('--out') || path.join(__dirname, '..', '..', 'data', 'editorial', 'batches', `batch-${Date.now()}.json`);

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const q = {};
  if (TITLES.length) q.title = { $in: TITLES };
  if (NO_EVIDENCE) q.provenanceCount = 0;
  if (!REWRITE && !TITLES.length) q['editorial.synopsis'] = null;

  const films = await Movie.find(q)
    .sort({ provenanceScore: -1, vote_count: -1 })
    .skip(TITLES.length ? 0 : OFFSET)
    .limit(TITLES.length ? 0 : SIZE)
    .select('title originalTitle year directors country countries runtime genres movements provenance provenanceCount synopsis keywords derivedTags curatorNote editorial')
    .lean();

  const sheet = films.map((f) => ({
    _id: f._id.toString(),
    title: f.title,
    originalTitle: f.originalTitle !== f.title ? f.originalTitle : undefined,
    year: f.year,
    directors: f.directors,
    country: f.country,
    runtime: f.runtime,
    movements: f.movements || [],
    provenance: (f.provenance || []).map((p) => `${p.label}${p.detail ? ' ' + p.detail : ''}`),
    reference: { tmdbOverview: f.synopsis, keywords: (f.keywords || []).slice(0, 15), regexTags: f.derivedTags },
    needsCuratorNote: (f.provenanceCount || 0) === 0,
    editorial: {
      hook: f.editorial?.hook || '',
      synopsis: f.editorial?.synopsis || '',
      whyItMatters: f.editorial?.whyItMatters || '',
      tags: f.editorial?.tags || [],
      curatorNote: f.curatorNote || ''
    }
  }));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(sheet, null, 2));
  console.log(`Exported ${sheet.length} films → ${path.relative(process.cwd(), OUT)}`);
  console.log(sheet.map((s) => `  ${s.title} (${s.year}) · ${s.directors.join(', ')}${s.needsCuratorNote ? ' · needs note' : ''}`).join('\n'));
  await mongoose.connection.close();
};

main().catch(async (err) => { console.error(err); await mongoose.connection.close().catch(() => {}); process.exit(1); });
