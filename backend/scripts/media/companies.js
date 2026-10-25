/**
 * Who made each film, from TMDB, for the films that have no production companies yet. The Studios
 * room puts a film in a house by these credits (services/studios.js), so a film without them sits in
 * no house: Rohmer's films missed Les Films du Losange, Throne of Blood missed Toho. Films that
 * already have credits are left as they are.
 *
 *   node scripts/media/companies.js                    dry run: writes the plan, nothing else
 *   node scripts/media/companies.js --apply            backs up the planned films' credits, applies the plan, re-reads to verify
 *   node scripts/media/companies.js --restore <file>   (with --apply) puts them back from a backup
 *
 * Plan:    scripts/reports/companies-plan.json
 * Backups: data/backups/backup-companies-<time>.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Movie from '../../models/Movie.js';
import { tmdbGet, createLimiter, sleep } from '../lib/tmdbResolve.js';
import { HOUSES } from '../../data/studios.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(BACKEND, '.env') });

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const RESTORE = args.includes('--restore') ? args[args.indexOf('--restore') + 1] : null;
const REPORTS = path.join(BACKEND, 'scripts/reports');
const BACKUPS = path.join(BACKEND, 'data/backups');
const PLAN = path.join(REPORTS, 'companies-plan.json');

const api = createLimiter(4);
// a dropped connection is tried again (tmdbGet itself retries only TMDB's own errors)
const get = async (url, params, tries = 4) => {
  try { return await tmdbGet(url, params); } catch (err) {
    if (err.response || !tries) throw err;
    await sleep(1500);
    return get(url, params, tries - 1);
  }
};
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const houseOf = new Map(HOUSES.flatMap((h) => h.credits.map((c) => [c.trim().toLowerCase(), h.name])));

const dryRun = async () => {
  // films only: a series (Dekalog) has no TMDB film id, and its credits came with it
  const films = await Movie.find({ tmdbId: { $type: 'number' }, $or: [{ productionCompanies: { $exists: false } }, { productionCompanies: { $size: 0 } }] }).select('title year tmdbId').lean();
  const plan = await Promise.all(films.map((f) => api(async () => {
    const d = await get(`/movie/${f.tmdbId}`);
    const productionCompanies = [...new Set((d?.production_companies || []).map((c) => c.name).filter(Boolean))];
    const houses = [...new Set(productionCompanies.map((c) => houseOf.get(c.trim().toLowerCase())).filter(Boolean))];
    return { _id: String(f._id), title: f.title, year: f.year, productionCompanies, houses };
  })));
  plan.sort((a, b) => a.title.localeCompare(b.title));
  const summary = { without: plan.length, found: plan.filter((p) => p.productionCompanies.length).length, joinAHouse: plan.filter((p) => p.houses.length).length };
  fs.mkdirSync(REPORTS, { recursive: true });
  fs.writeFileSync(PLAN, JSON.stringify({ generatedAt: new Date().toISOString(), summary, films: plan }, null, 1));
  console.log('Dry run:', summary);
  for (const p of plan.filter((x) => x.houses.length)) console.log(`  ${p.title} (${p.year}) → ${p.houses.join(', ')}`);
  console.log(`\nPlan: ${path.relative(BACKEND, PLAN)}. Add --apply to write it.`);
};

const apply = async () => {
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8')).films.filter((p) => p.productionCompanies.length);
  const ids = plan.map((p) => new mongoose.Types.ObjectId(p._id));
  const films = await Movie.find({ _id: { $in: ids } }).select('title productionCompanies').lean();
  fs.mkdirSync(BACKUPS, { recursive: true });
  const backup = path.join(BACKUPS, `backup-companies-${stamp()}.json`);
  fs.writeFileSync(backup, JSON.stringify(films.map((f) => ({ _id: String(f._id), title: f.title, productionCompanies: f.productionCompanies ?? null }))));
  console.log(`Backed up the production companies of ${films.length} films → ${path.relative(BACKEND, backup)}`);
  // (only where they're still empty, so credits added since the dry run are kept)
  const ops = plan.map((p) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(p._id), $or: [{ productionCompanies: { $exists: false } }, { productionCompanies: { $size: 0 } }] },
      update: { $set: { productionCompanies: p.productionCompanies } },
    },
  }));
  const res = ops.length ? await Movie.bulkWrite(ops, { ordered: false }) : { matchedCount: 0, modifiedCount: 0 };
  console.log(`Matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  const left = await Movie.countDocuments({ $or: [{ productionCompanies: { $exists: false } }, { productionCompanies: { $size: 0 } }] });
  console.log(`Verified: ${left} films still have no production companies (TMDB has none for them)`);
};

const restore = async (file) => {
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ops = saved.map((s) => ({ updateOne: { filter: { _id: new mongoose.Types.ObjectId(s._id) }, update: { $set: { productionCompanies: s.productionCompanies ?? [] } } } }));
  console.log(`${ops.length} films in the backup`);
  if (!APPLY) return console.log('Dry run: add --apply to restore them.');
  const res = await Movie.bulkWrite(ops, { ordered: false });
  console.log(`Restored: modified ${res.modifiedCount}`);
};

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    if (RESTORE) await restore(RESTORE);
    else if (APPLY) await apply();
    else await dryRun();
  } finally {
    await mongoose.disconnect();
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((err) => { console.error(err); process.exit(1); });
