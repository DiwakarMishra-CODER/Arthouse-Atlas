/**
 * Keeps nudity and sex scenes off the site.
 *
 * data/blockedFrames.json lists every picture taken down: the TMDB file, its film, and why. This takes
 * each one out of wherever the catalogue shows it:
 * - a film's stills: dropped;
 * - a film's backdrop (the frame its page and Tonight open on): its first clean still, at backdrop size, or
 *   with none left, TMDB's best-voted backdrop that isn't blocked;
 * - a film's poster: TMDB's best-voted other poster that isn't blocked (look at the plan's posters before applying);
 * - a director's or movement's backdrop: the new backdrop of the film it came from;
 * - a movement's or studio's list of its films' posters: each film's own (new) poster.
 * Anywhere else a blocked picture turns up is listed in the plan to fix by hand.
 * addStills.js skips everything listed, so a later run can't bring a picture back. After applying,
 * rebuild the home wall (buildMosaic.js) and the link previews (exportMeta.js).
 *
 *   node scripts/media/explicit.js                    dry run: writes the plan, nothing else
 *   node scripts/media/explicit.js --apply            backs up what it changes, applies the plan, re-reads to verify
 *   node scripts/media/explicit.js --restore <file>   (with --apply) puts the pictures back from a backup
 *
 * Plan:    scripts/reports/explicit-plan.json
 * Backups: data/backups/backup-explicit-<time>.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Movie from '../../models/Movie.js';
import Director from '../../models/Director.js';
import Movement from '../../models/Movement.js';
import Studio from '../../models/Studio.js';
import { tmdbGet, TMDB_IMAGE } from '../lib/tmdbResolve.js';
import { blockedPictures, fileOf } from './lib/blocked.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(BACKEND, '.env') });

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const RESTORE = args.includes('--restore') ? args[args.indexOf('--restore') + 1] : null;
const REPORTS = path.join(BACKEND, 'scripts/reports');
const BACKUPS = path.join(BACKEND, 'data/backups');
const PLAN = path.join(REPORTS, 'explicit-plan.json');

const MODELS = { movies: Movie, directors: Director, movements: Movement, studios: Studio };
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// a still as a backdrop: the same file at backdrop size (a self-hosted /stills/ path stays as it is)
const asBackdrop = (still) => (still.startsWith('/') ? still : `${TMDB_IMAGE.backdrop}/${fileOf(still)}`);

// TMDB's best-voted poster for the film that isn't blocked and isn't the one it has
const otherPoster = async (m, blocked) => {
  const where = typeof m.tmdbId === 'number' ? `/movie/${m.tmdbId}/images` : m.tmdbTv ? `/tv/${m.tmdbTv}/images` : null;
  if (!where) return null;
  const res = await tmdbGet(where, { include_image_language: 'en,null' });
  const pick = (res?.posters || [])
    .filter((p) => !blocked.has(fileOf(p.file_path)) && fileOf(p.file_path) !== fileOf(m.posterUrl))
    .sort((a, b) => (b.iso_639_1 === 'en') - (a.iso_639_1 === 'en') || b.vote_average - a.vote_average || b.vote_count - a.vote_count)[0];
  return pick ? `${TMDB_IMAGE.poster}${pick.file_path}` : null;
};

// for a film left with no frame at all: TMDB's best-voted backdrop that isn't blocked (look at it in the plan too)
const otherFrame = async (m, blocked) => {
  const where = typeof m.tmdbId === 'number' ? `/movie/${m.tmdbId}/images` : m.tmdbTv ? `/tv/${m.tmdbTv}/images` : null;
  if (!where) return null;
  const res = await tmdbGet(where, {});
  const pick = (res?.backdrops || [])
    .filter((b) => !blocked.has(fileOf(b.file_path)))
    .sort((a, b) => (b.iso_639_1 == null) - (a.iso_639_1 == null) || b.vote_average - a.vote_average || b.width - a.width)[0];
  return pick ? `${TMDB_IMAGE.backdrop}${pick.file_path}` : null;
};

const dryRun = async () => {
  const blocked = new Set(blockedPictures().map((p) => p.file));
  const isBlocked = (url) => blocked.has(fileOf(url));
  const changes = [];
  const byFile = new Map(); // a blocked file → the backdrop that replaces it on its film

  for (const m of await Movie.find({}).select('title year tmdbId tmdbTv stills backdropUrl posterUrl').lean()) {
    const set = {};
    const stills = (m.stills || []).filter((s) => !isBlocked(s));
    if (stills.length !== (m.stills || []).length) set.stills = stills;
    if (isBlocked(m.backdropUrl)) set.backdropUrl = stills[0] ? asBackdrop(stills[0]) : await otherFrame(m, blocked);
    if (isBlocked(m.posterUrl)) set.posterUrl = await otherPoster(m, blocked);
    if (!Object.keys(set).length) continue;
    const backdrop = set.backdropUrl !== undefined ? set.backdropUrl : m.backdropUrl;
    for (const s of [...(m.stills || []), m.backdropUrl].filter(isBlocked)) byFile.set(fileOf(s), backdrop);
    changes.push({ collection: 'movies', _id: String(m._id), title: `${m.title} (${m.year})`, before: Object.fromEntries(Object.keys(set).map((k) => [k, m[k] ?? null])), set });
  }

  // a director's or movement's backdrop is one of its films' frames: it follows that film's new backdrop,
  // or, for a frame no film carries, a director takes the first clean frame of their best-ranked film
  const firstCleanOf = async (name) => {
    const films = (await Movie.find({ directors: name }).select('canonRank stills backdropUrl').lean())
      .sort((x, y) => (x.canonRank ?? Infinity) - (y.canonRank ?? Infinity));
    const still = films.flatMap((f) => [f.backdropUrl, ...(f.stills || [])]).find((s) => s && !isBlocked(s));
    return still ? asBackdrop(still) : null;
  };
  for (const [collection, Model] of [['directors', Director], ['movements', Movement]]) {
    for (const d of await Model.find({ backdropUrl: { $nin: [null, ''] } }).select('name title backdropUrl').lean()) {
      if (!isBlocked(d.backdropUrl)) continue;
      const next = byFile.get(fileOf(d.backdropUrl)) ?? (collection === 'directors' ? await firstCleanOf(d.name) : null);
      changes.push({ collection, _id: String(d._id), title: d.name || d.title, before: { backdropUrl: d.backdropUrl }, set: { backdropUrl: next } });
    }
  }

  // a movement's or studio's own list of its films' posters follows each film's poster
  const posterOf = new Map((await Movie.find({}).select('posterUrl').lean()).map((m) => [String(m._id), m.posterUrl]));
  for (const c of changes) if (c.set.posterUrl) posterOf.set(c._id, c.set.posterUrl);
  for (const [collection, Model, field] of [['movements', Movement, 'essentialFilms'], ['studios', Studio, 'featuredFilms']]) {
    for (const d of await Model.find({}).select(`name title ${field}`).lean()) {
      const list = d[field] || [];
      if (!list.some((f) => isBlocked(f.posterUrl))) continue;
      const next = list.map((f) => (isBlocked(f.posterUrl) ? { ...f, posterUrl: posterOf.get(String(f.movieId)) ?? null } : f));
      changes.push({ collection, _id: String(d._id), title: d.name || d.title, before: { [field]: list }, set: { [field]: next } });
    }
  }

  // anywhere else (portraits, a studio's other pictures, the hand-picked frames in the frontend): by hand
  const elsewhere = [];
  const look = (where, v) => {
    if (typeof v === 'string') { if (isBlocked(v)) elsewhere.push({ where, url: v }); return; }
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) look(`${where}.${k}`, x);
  };
  for (const d of await Director.find({}).select('name profileUrl').lean()) look(`directors/${d.name}`, { profileUrl: d.profileUrl });
  for (const d of await Movement.find({}).select('title keyDirectors').lean()) look(`movements/${d.title}`, { keyDirectors: d.keyDirectors });
  for (const d of await Studio.find({}).lean()) look(`studios/${d.name}`, { ...d, featuredFilms: undefined });
  const FRONTEND = path.resolve(BACKEND, '../frontend/src');
  for (const f of ['components/about/note.js', 'components/about/maker.js', 'components/home/ArthouseBreath.jsx']) {
    for (const [hit] of fs.readFileSync(path.join(FRONTEND, f), 'utf8').matchAll(/[A-Za-z0-9]{20,40}\.jpg/g)) if (blocked.has(hit)) elsewhere.push({ where: `frontend/src/${f}`, url: hit });
  }

  const summary = {
    blocked: blocked.size,
    films: changes.filter((c) => c.collection === 'movies').length,
    stillsRemoved: changes.reduce((n, c) => n + (c.set.stills ? c.before.stills.length - c.set.stills.length : 0), 0),
    backdropsReplaced: changes.filter((c) => c.set.backdropUrl).length,
    postersReplaced: changes.filter((c) => c.set.posterUrl).length,
    leftWithout: changes.filter((c) => Object.values(c.set).some((v) => v === null || (Array.isArray(v) && !v.length))).map((c) => c.title),
    byHand: elsewhere
  };
  fs.mkdirSync(REPORTS, { recursive: true });
  fs.writeFileSync(PLAN, JSON.stringify({ generatedAt: new Date().toISOString(), summary, changes }, null, 1));
  console.log('Summary:', JSON.stringify(summary, null, 1));
  console.log(`Plan: ${path.relative(BACKEND, PLAN)}\nDry run: nothing written to the database. Look at the new posters, then re-run with --apply.`);
};

const apply = async () => {
  if (!fs.existsSync(PLAN)) throw new Error('no plan: run the dry run first');
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));

  // back up exactly what changes, as it is now
  const backup = path.join(BACKUPS, `backup-explicit-${stamp()}.json`);
  const saved = [];
  for (const c of plan.changes) {
    const now = await MODELS[c.collection].findById(c._id).select(Object.keys(c.set).join(' ')).lean();
    saved.push({ collection: c.collection, _id: c._id, title: c.title, fields: Object.fromEntries(Object.keys(c.set).map((k) => [k, now?.[k] ?? null])) });
  }
  fs.mkdirSync(BACKUPS, { recursive: true });
  fs.writeFileSync(backup, JSON.stringify(saved, null, 1));
  console.log(`Backed up ${saved.length} records → ${path.relative(BACKEND, backup)}`);

  let written = 0;
  const changedSincePlan = [];
  for (const [i, c] of plan.changes.entries()) {
    if (!same(saved[i].fields, c.before)) { changedSincePlan.push(c.title); continue; }
    const res = await MODELS[c.collection].updateOne({ _id: c._id }, { $set: c.set });
    written += res.modifiedCount;
  }
  const differ = [];
  for (const c of plan.changes.filter((x) => !changedSincePlan.includes(x.title))) {
    const now = await MODELS[c.collection].findById(c._id).select(Object.keys(c.set).join(' ')).lean();
    if (!Object.entries(c.set).every(([k, v]) => same(now?.[k], v))) differ.push(c.title);
  }
  console.log(`Updated ${written} of ${plan.changes.length} records; skipped ${changedSincePlan.length} changed since the plan${changedSincePlan.length ? `: ${changedSincePlan.join(', ')}` : ''}`);
  console.log(`Read back: ${differ.length} differ from the plan${differ.length ? `: ${differ.join(', ')}` : ''}`);
  console.log('Next: node scripts/buildMosaic.js, then node scripts/exportMeta.js');
};

const restore = async (file) => {
  const saved = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  console.log(`${saved.length} records in the backup`);
  if (!APPLY) return console.log('Dry run: add --apply to put them back.');
  for (const s of saved) await MODELS[s.collection].updateOne({ _id: s._id }, { $set: s.fields });
  console.log(`Restored ${saved.length} records.`);
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

main().catch((err) => { console.error(err); process.exit(1); });
