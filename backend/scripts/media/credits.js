/**
 * The rest of a film's credits from TMDB, for the film page's billing block: who's in it (the
 * first six billed, with their parts), who wrote it (screenplay first, then story, then the book it
 * came from), who cut it, what language it's in, and the tagline its posters carried.
 *
 *   node scripts/media/credits.js                    dry run: writes the plan, nothing else
 *   node scripts/media/credits.js --apply            backs up these fields for every film, applies the plan, re-reads to verify
 *   node scripts/media/credits.js --restore <file>   (with --apply) puts them back from a backup
 *
 * Plan:    scripts/reports/credits-plan.json
 * Backups: data/backups/backup-credits-<time>.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Movie from '../../models/Movie.js';
import { tmdbGet, createLimiter, sleep } from '../lib/tmdbResolve.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(BACKEND, '.env') });

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const RESTORE = args.includes('--restore') ? args[args.indexOf('--restore') + 1] : null;
const REPORTS = path.join(BACKEND, 'scripts/reports');
const BACKUPS = path.join(BACKEND, 'data/backups');
const PLAN = path.join(REPORTS, 'credits-plan.json');
const FIELDS = ['cast', 'writers', 'editors', 'originalLanguage', 'languages', 'tagline'];

const CAST = 6;
// who wrote it, in the order a billing block names them
const WRITING = ['Screenplay', 'Writer', 'Story', 'Novel', 'Book', 'Author', 'Play', 'Short Story', 'Comic Book', 'Original Story'];
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
const languageName = (code) => {
  try { return code ? new Intl.DisplayNames(['en'], { type: 'language' }).of(code) : null; } catch { return null; }
};

// a TMDB film (with credits) → the fields this adds; pure, so the tests can check it
export const creditsOf = (d) => {
  const crew = d?.credits?.crew || [];
  const writers = [];
  for (const job of WRITING) {
    for (const c of crew.filter((x) => x.job === job)) {
      if (!writers.some((w) => w.name === c.name)) writers.push({ name: c.name, job });
    }
  }
  const spoken = (d?.spoken_languages || []).map((l) => l.english_name || languageName(l.iso_639_1)).filter(Boolean);
  const original = languageName(d?.original_language);
  return {
    // (never someone seen only in archive footage)
    cast: (d?.credits?.cast || []).filter((c) => c.name && !/archive footage/i.test(c.character || '')).sort((a, b) => a.order - b.order).slice(0, CAST)
      .map((c) => ({ name: c.name, character: (c.character || '').replace(/\s*\((uncredited|voice)\)\s*/gi, '').trim() || null })),
    writers: writers.slice(0, 4),
    editors: [...new Set(crew.filter((c) => c.job === 'Editor').map((c) => c.name))].slice(0, 2),
    originalLanguage: original,
    // the language it's in first, then the others it speaks
    languages: [...new Set([original, ...spoken].filter(Boolean))].slice(0, 4),
    tagline: (d?.tagline || '').trim() || null,
  };
};

const dryRun = async () => {
  const films = await Movie.find({}).select('title year tmdbId').lean();
  let done = 0;
  const plan = await Promise.all(films.map((f) => api(async () => {
    const d = await get(`/movie/${f.tmdbId}`, { append_to_response: 'credits' });
    if (++done % 100 === 0) console.log(`  ${done}/${films.length}`);
    return { _id: String(f._id), title: f.title, year: f.year, found: !!d, ...creditsOf(d) };
  })));
  plan.sort((a, b) => a.title.localeCompare(b.title));
  const n = (k) => plan.filter((p) => (Array.isArray(p[k]) ? p[k].length : p[k])).length;
  const summary = { films: plan.length, notOnTmdb: plan.filter((p) => !p.found).length, ...Object.fromEntries(FIELDS.map((k) => [k, n(k)])) };
  fs.mkdirSync(REPORTS, { recursive: true });
  fs.writeFileSync(PLAN, JSON.stringify({ generatedAt: new Date().toISOString(), summary, films: plan }, null, 1));
  console.log('Dry run. Films with each field:', summary);
  for (const t of ['Persona', 'Jeanne Dielman, 23, quai du Commerce, 1080 Bruxelles', 'Late Spring']) {
    const p = plan.find((x) => x.title === t);
    if (p) console.log(`\n${t}:`, JSON.stringify({ cast: p.cast.map((c) => `${c.name} (${c.character})`), writers: p.writers, editors: p.editors, languages: p.languages, tagline: p.tagline }));
  }
  console.log(`\nPlan: ${path.relative(BACKEND, PLAN)}. Add --apply to write it.`);
};

const apply = async () => {
  const { films: plan } = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  const films = await Movie.find({}).select(['title', ...FIELDS].join(' ')).lean();
  fs.mkdirSync(BACKUPS, { recursive: true });
  const backup = path.join(BACKUPS, `backup-credits-${stamp()}.json`);
  fs.writeFileSync(backup, JSON.stringify(films.map((f) => ({ _id: String(f._id), title: f.title, ...Object.fromEntries(FIELDS.map((k) => [k, f[k] ?? null])) }))));
  console.log(`Backed up ${FIELDS.join(', ')} of ${films.length} films → ${path.relative(BACKEND, backup)}`);
  const ops = plan.filter((p) => p.found).map((p) => ({
    updateOne: { filter: { _id: new mongoose.Types.ObjectId(p._id) }, update: { $set: Object.fromEntries(FIELDS.map((k) => [k, p[k]])) } },
  }));
  const res = ops.length ? await Movie.bulkWrite(ops, { ordered: false }) : { matchedCount: 0, modifiedCount: 0 };
  console.log(`Matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  const after = await Movie.find({}).select('cast tagline').lean();
  console.log(`Verified: ${after.filter((f) => f.cast?.length).length} films now have a cast, ${after.filter((f) => f.tagline).length} a tagline`);
};

const restore = async (file) => {
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ops = saved.map((s) => ({ updateOne: { filter: { _id: new mongoose.Types.ObjectId(s._id) }, update: { $set: Object.fromEntries(FIELDS.map((k) => [k, s[k]])) } } }));
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
