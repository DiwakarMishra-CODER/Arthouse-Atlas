/**
 * A trailer that plays on the film page, for every film that can have one.
 *
 * Each film's trailer is checked against YouTube's oEmbed (200: public and can be played on our
 * page; 401: plays only on YouTube itself; 403 / 404: private or removed). A film whose trailer
 * can't play on the page, or that has none, gets the first of TMDB's YouTube videos for it that
 * can: a trailer before a teaser before a clip, official ones first. When none can, a trailer that
 * still plays on YouTube itself is kept (the page offers it there); anything else is cleared, and
 * the page plays the film's own frames instead.
 *
 *   node scripts/media/trailers.js                    dry run: writes the plan, nothing else
 *   node scripts/media/trailers.js --apply            backs up every changed film's trailerUrl, applies the plan
 *   node scripts/media/trailers.js --restore <file>   (with --apply) puts them back from a backup
 *
 * Plan:    scripts/reports/trailers-plan.json
 * Backups: data/backups/backup-trailers-<time>.json
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
const PLAN = path.join(REPORTS, 'trailers-plan.json');

const KINDS = ['Trailer', 'Teaser', 'Clip'];
const api = createLimiter(4);
const tube = createLimiter(6);
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

export const youTubeId = (url) => (url || '').match(/(?:v=|embed\/|youtu\.be\/)([\w-]{11})/)?.[1] || null;
export const embedOf = (key) => `https://www.youtube.com/embed/${key}`;

// TMDB's videos for a film → YouTube keys worth trying, best first (pure)
export const rankVideos = (videos) => (videos || [])
  .filter((v) => v.site === 'YouTube' && KINDS.includes(v.type) && v.key)
  .sort((a, b) => KINDS.indexOf(a.type) - KINDS.indexOf(b.type) || (b.official === true) - (a.official === true) || (b.size || 0) - (a.size || 0))
  .map((v) => v.key)
  .filter((k, i, all) => all.indexOf(k) === i);

// what to do with one film, given how each key answers (pure): keep, replace, keep for YouTube only, or clear
export const decide = (current, status, candidates) => {
  if (current && status[current] === 200) return { action: 'keep', key: current };
  const playable = candidates.find((k) => k !== current && status[k] === 200);
  if (playable) return { action: 'replace', key: playable };
  if (current && status[current] === 401) return { action: 'youtube-only', key: current };
  return { action: current ? 'clear' : 'none', key: null };
};

const oembed = (key) => tube(async () => {
  for (let tries = 3; ; tries--) {
    try {
      return (await fetch(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${key}`)).status;
    } catch (err) {
      if (!tries) throw err;
      await sleep(1500);
    }
  }
});
const videosOf = (tmdbId) => api(async () => {
  for (let tries = 3; ; tries--) {
    try {
      // in every language: an arthouse film's only trailer is often not in English
      return (await tmdbGet(`/movie/${tmdbId}/videos`, { include_video_language: 'null,en,fr,de,it,es,ja,sv,ru,pt,zh,ko,pl,cs,hu,da,fa' }))?.results || [];
    } catch (err) {
      if (err.response || !tries) throw err;
      await sleep(1500);
    }
  }
});

const dryRun = async () => {
  const films = await Movie.find({}).select('title year tmdbId trailerUrl canonRank').lean();
  let done = 0;
  const plan = await Promise.all(films.map(async (f) => {
    const current = youTubeId(f.trailerUrl);
    const status = {};
    if (current) status[current] = await oembed(current);
    let candidates = [];
    if (status[current] !== 200) {
      candidates = rankVideos(await videosOf(f.tmdbId));
      for (const k of candidates) {
        if (k === current) continue;
        status[k] = await oembed(k);
        if (status[k] === 200) break;
      }
    }
    if (++done % 100 === 0) console.log(`  ${done}/${films.length}`);
    const d = decide(current, status, candidates);
    return { _id: String(f._id), title: f.title, year: f.year, rank: f.canonRank || null, before: f.trailerUrl || null, was: current ? status[current] : null, ...d, after: d.key ? embedOf(d.key) : null };
  }));
  plan.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
  const summary = plan.reduce((o, p) => ({ ...o, [p.action]: (o[p.action] || 0) + 1 }), {});
  fs.mkdirSync(REPORTS, { recursive: true });
  fs.writeFileSync(PLAN, JSON.stringify({ generatedAt: new Date().toISOString(), summary, films: plan.filter((p) => p.action !== 'keep') }, null, 1));
  console.log('Dry run:', summary);
  for (const a of ['replace', 'youtube-only', 'clear', 'none']) {
    const some = plan.filter((p) => p.action === a);
    if (some.length) console.log(`${a}: ${some.slice(0, 10).map((p) => `${p.title} (${p.year})`).join(', ')}${some.length > 10 ? ' …' : ''}`);
  }
  console.log(`\nPlan: ${path.relative(BACKEND, PLAN)}. Add --apply to write it.`);
};

const apply = async () => {
  const { films: plan } = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  const change = plan.filter((p) => (p.after || null) !== (p.before || null) && p.action !== 'youtube-only');
  const films = await Movie.find({ _id: { $in: change.map((p) => new mongoose.Types.ObjectId(p._id)) } }).select('title trailerUrl').lean();
  fs.mkdirSync(BACKUPS, { recursive: true });
  const backup = path.join(BACKUPS, `backup-trailers-${stamp()}.json`);
  fs.writeFileSync(backup, JSON.stringify(films.map((f) => ({ _id: String(f._id), title: f.title, trailerUrl: f.trailerUrl ?? null }))));
  console.log(`Backed up the trailerUrl of ${films.length} films → ${path.relative(BACKEND, backup)}`);
  const ops = change.map((p) => ({ updateOne: { filter: { _id: new mongoose.Types.ObjectId(p._id) }, update: { $set: { trailerUrl: p.after } } } }));
  const res = ops.length ? await Movie.bulkWrite(ops, { ordered: false }) : { matchedCount: 0, modifiedCount: 0 };
  console.log(`Matched ${res.matchedCount}, modified ${res.modifiedCount}`);
};

const restore = async (file) => {
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ops = saved.map((s) => ({ updateOne: { filter: { _id: new mongoose.Types.ObjectId(s._id) }, update: { $set: { trailerUrl: s.trailerUrl } } } }));
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
