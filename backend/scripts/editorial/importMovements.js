/**
 * Import movement editorial: essay, before/broke, where-to-start, lineage.
 *
 * Input: JSON array of
 *   { title, editorial: { essay, before, broke, startWith: [{title, why}], grewFrom: [], fed: [] } }
 *
 * Lint (errors block; warnings print):
 *   ERROR  essay outside 250–520 words · before/broke over 90 words · startWith not 3 entries
 *          startWith film not in the catalogue · lineage title not a known movement
 *          banned phrases · exclamation marks
 *   WARN   question marks · a year in the prose outside the movement's era ±5
 *
 * Usage:  node scripts/editorial/importMovements.js --file <file.json> [--dry-run] [--force]
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Movement from '../../models/Movement.js';
import Movie from '../../models/Movie.js';
import { normalizeName } from '../../services/nameUtils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const args = process.argv.slice(2);
const argValue = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const FILE = argValue('--file');
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

const BANNED = ['stunning', 'masterpiece', 'tour de force', 'haunting', 'powerful', 'visually striking', 'breathtaking',
  'must-see', 'must see', 'iconic', 'timeless classic', 'explores themes', 'viewers will', 'audiences will', 'a testament to',
  'gripping', 'compelling', 'thought-provoking', 'unforgettable', 'mesmerizing', 'mesmerising', 'groundbreaking', 'seminal'];
const words = (s = '') => s.trim().split(/\s+/).filter(Boolean).length;

const main = async () => {
  if (!FILE) throw new Error('--file required');
  const batch = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  await mongoose.connect(process.env.MONGODB_URI);
  const movements = await Movement.find({}).select('title tag startYear endYear').lean();
  const known = new Set(movements.map((m) => m.title));
  const films = await Movie.find({}).select('title originalTitle altTitles year').lean();
  const findFilm = (t) => films.find((f) => [f.title, f.originalTitle, ...(f.altTitles || [])].some((x) => x && normalizeName(x) === normalizeName(t)));

  let written = 0, blocked = 0, held = 0;
  for (const entry of batch) {
    const m = movements.find((x) => x.title === entry.title);
    if (!m) { console.log(`✗ ${entry.title}: not a movement in the DB`); blocked++; continue; }
    const e = entry.editorial || {};
    const errors = []; const warns = [];
    const prose = `${e.essay || ''} ${e.before || ''} ${e.broke || ''} ${(e.startWith || []).map((s) => s.why).join(' ')}`;

    const ew = words(e.essay);
    if (ew < 250 || ew > 520) errors.push(`essay ${ew} words (250–520)`);
    if (e.before && words(e.before) > 90) errors.push(`before ${words(e.before)} words (max 90)`);
    if (e.broke && words(e.broke) > 90) errors.push(`broke ${words(e.broke)} words (max 90)`);
    if (!Array.isArray(e.startWith) || e.startWith.length !== 3) errors.push(`startWith has ${e.startWith?.length ?? 0} entries (need 3)`);
    const startWith = (e.startWith || []).map((s) => {
      const f = findFilm(s.title);
      if (!f) errors.push(`startWith "${s.title}" not in catalogue`);
      return { title: f?.title || s.title, movieId: f?._id || null, why: s.why };
    });
    [...(e.grewFrom || []), ...(e.fed || [])].forEach((t) => { if (!known.has(t)) errors.push(`lineage "${t}" is not a movement`); });
    const lower = prose.toLowerCase();
    BANNED.filter((b) => lower.includes(b)).forEach((b) => errors.push(`banned phrase "${b}"`));
    if (/!/.test(prose)) errors.push('exclamation mark');
    if (/\?/.test(prose)) warns.push('question mark');
    const lo = (m.startYear || 1900) - 5, hi = (m.endYear || new Date().getFullYear()) + 5;
    (prose.match(/\b(1[89]\d\d|20\d\d)\b/g) || []).map(Number).forEach((y) => { if (y < lo || y > hi) warns.push(`year ${y} outside era`); });

    if (errors.length) { console.log(`✗ ${m.title}\n     ${errors.join('\n     ')}`); blocked++; continue; }
    if (warns.length) { console.log(`⚠ ${m.title}\n     ${[...new Set(warns)].join('\n     ')}`); if (!FORCE) { held++; continue; } }
    const set = {
      'editorial.essay': e.essay.trim(), 'editorial.before': e.before?.trim() || null, 'editorial.broke': e.broke?.trim() || null,
      'editorial.startWith': startWith, 'editorial.grewFrom': e.grewFrom || [], 'editorial.fed': e.fed || [],
      'editorial.writtenAt': new Date()
    };
    if (!DRY_RUN) await Movement.updateOne({ _id: m._id }, { $set: set });
    written++;
    if (!warns.length) console.log(`✓ ${m.title} (${ew} words)`);
  }
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}written ${written} · held ${held} · blocked ${blocked}`);
  await mongoose.connection.close();
};

main().catch(async (err) => { console.error(err); await mongoose.connection.close().catch(() => {}); process.exit(1); });
