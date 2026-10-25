/**
 * An account's marks from a Letterboxd export (letterboxd.com → Settings → Import & export → Export
 * your data): its ratings, what it's watched, its watchlist and its favourites, for the films in the
 * atlas. Letterboxd becomes the account's record, so those four are replaced. Favourites are every film
 * rated five stars, and the profile's top four. "Not for me" marks, which Letterboxd doesn't have, are
 * kept, less any film it has now seen.
 *
 * Films are matched by title (or original or other title) and year, a year either way allowed, since
 * Letterboxd and TMDB disagree on a few (Casablanca 1942 or 1943). A half-star rating counts as one star,
 * the site's lowest. Each list is kept in the order the marks were made, oldest first, as the site keeps it.
 *
 *   node scripts/users/letterboxd.js <export .zip or folder> <email>            dry run: writes the plan, nothing else
 *   node scripts/users/letterboxd.js <export .zip or folder> <email> --apply    backs up the account's marks, applies the plan, re-reads to verify
 *   node scripts/users/letterboxd.js --restore <file> [--apply]                 puts an account's marks back from a backup
 *
 * Plan:    scripts/reports/letterboxd-plan.json
 * Backups: data/backups/backup-letterboxd-user-<time>.json (the marks only, never the password)
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Movie from '../../models/Movie.js';
import User from '../../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(BACKEND, '.env') });

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const RESTORE = args.includes('--restore') ? args[args.indexOf('--restore') + 1] : null;
const [SOURCE, EMAIL] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--restore');
const REPORTS = path.join(BACKEND, 'scripts/reports');
const BACKUPS = path.join(BACKEND, 'data/backups');
const PLAN = path.join(REPORTS, 'letterboxd-plan.json');
const MARKS = ['ratings', 'favorites', 'watched', 'watchlist', 'notFor'];
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

// a CSV with quoted fields (commas, quotes and line breaks inside them) → one object a row
export const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); if (row.some((c) => c !== '')) rows.push(row); }
  const [head = [], ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, k) => [h, r[k] ?? ''])));
};

// a title as both sides can agree on it: no accents, case, punctuation or leading article
export const normTitle = (t) => (t || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/^(the|a|an|la|le|les|il|el|der|die|das)\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();

// the atlas film a Letterboxd entry names: the same title in the same year, or a year either way
export const matcher = (films) => {
  const byTitle = new Map();
  for (const f of films) {
    for (const t of new Set([f.title, f.originalTitle, ...(f.altTitles || [])].filter(Boolean).map(normTitle))) {
      if (!byTitle.has(t)) byTitle.set(t, []);
      byTitle.get(t).push(f);
    }
  }
  const named = (name) => byTitle.get(normTitle(name)) || [];
  return {
    find: (name, year) => {
      const y = Number(year);
      const same = named(name);
      return same.find((f) => f.year === y) || same.find((f) => Math.abs((f.year || 0) - y) <= 1) || null;
    },
    named,
  };
};

// what the export says, in atlas films: { ratings, watched, watchlist, favorites, missing, nearMisses }
export const planFrom = ({ films, ratings = [], watched = [], watchlist = [], likes = [], profile = {} }) => {
  const { find, named } = matcher(films);
  const nearMisses = new Set();
  const take = (rows, extra = () => ({})) => {
    const out = new Map();
    for (const r of rows) {
      const f = find(r.Name, r.Year);
      if (f) { if (!out.has(String(f._id))) out.set(String(f._id), { id: String(f._id), title: f.title, year: f.year, date: r.Date || '', ...extra(r) }); }
      else if (named(r.Name).length) nearMisses.add(`${r.Name} (${r.Year}): the atlas has ${named(r.Name).map((x) => `${x.title} (${x.year})`).join(', ')}`);
    }
    return [...out.values()];
  };
  const plan = {
    ratings: take(ratings, (r) => ({ value: Math.min(5, Math.max(1, Number(r.Rating) || 1)) })),
    watched: take(watched),
  };
  // a film already rated or watched doesn't also wait on the watchlist
  const seen = new Set([...plan.ratings, ...plan.watched].map((x) => x.id));
  plan.watchlist = take(watchlist).filter((x) => !seen.has(x.id));
  // favourites: every five-star film, then the profile's top four (Letterboxd links, named by the other files)
  const byLink = new Map([...ratings, ...watched, ...watchlist, ...likes].map((r) => [r['Letterboxd URI'], r]));
  const top = (profile['Favorite Films'] || '').split(',').map((s) => s.trim()).filter(Boolean);
  const favorites = new Map(plan.ratings.filter((r) => r.value === 5).map((r) => [r.id, r]));
  const missing = [];
  for (const link of top) {
    const r = byLink.get(link);
    const f = r && find(r.Name, r.Year);
    if (f && !favorites.has(String(f._id))) favorites.set(String(f._id), { id: String(f._id), title: f.title, year: f.year, date: r.Date || '' });
    else if (!f) missing.push(r ? `${r.Name} (${r.Year})` : link);
  }
  plan.favorites = [...favorites.values()];
  return { ...plan, topFourNotHere: missing, nearMisses: [...nearMisses] };
};

// the account's new marks: each list oldest first; its "not for me" kept, less what it has now seen
export const marksFrom = (plan, current = {}) => {
  const byDate = (list) => [...list].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const seen = new Set([...plan.ratings, ...plan.watched].map((x) => x.id));
  return {
    ratings: byDate(plan.ratings).map((r) => ({ movie: r.id, value: r.value, ratedAt: r.date ? new Date(`${r.date}T12:00:00Z`) : new Date() })),
    favorites: byDate(plan.favorites).map((r) => r.id),
    watched: byDate(plan.watched).map((r) => r.id),
    watchlist: byDate(plan.watchlist).map((r) => r.id),
    notFor: (current.notFor || []).map(String).filter((id) => !seen.has(id)),
  };
};

// the export, from its .zip (unpacked to a temporary folder) or a folder it was unpacked to
const readExport = (source) => {
  let dir = source;
  let temp = null;
  if (source.endsWith('.zip')) {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), 'letterboxd-'));
    execFileSync('unzip', ['-q', '-o', source, '-d', temp]);
    dir = temp;
  }
  const read = (file) => (fs.existsSync(path.join(dir, file)) ? parseCsv(fs.readFileSync(path.join(dir, file), 'utf8')) : []);
  const data = { ratings: read('ratings.csv'), watched: read('watched.csv'), watchlist: read('watchlist.csv'), likes: read('likes/films.csv'), profile: read('profile.csv')[0] || {} };
  if (temp) fs.rmSync(temp, { recursive: true, force: true });
  if (!data.ratings.length && !data.watched.length) throw new Error(`No ratings.csv or watched.csv in ${source}: is it a Letterboxd export?`);
  return data;
};

const count = (m) => `${m.ratings.length} ratings, ${m.favorites.length} favourites, ${m.watched.length} watched, ${m.watchlist.length} on the watchlist, ${m.notFor.length} not for me`;

const dryRun = async () => {
  if (!SOURCE || !EMAIL) throw new Error('usage: node scripts/users/letterboxd.js <export .zip or folder> <email> [--apply]');
  const data = readExport(SOURCE);
  const films = await Movie.find({}).select('title originalTitle altTitles year').lean();
  const user = await User.findOne({ email: EMAIL.toLowerCase() }).select(['email', 'username', ...MARKS].join(' ')).lean();
  if (!user) throw new Error(`No account with the email ${EMAIL}`);
  const plan = planFrom({ films, ...data });
  const marks = marksFrom(plan, user);
  fs.mkdirSync(REPORTS, { recursive: true });
  fs.writeFileSync(PLAN, JSON.stringify({ generatedAt: new Date().toISOString(), userId: String(user._id), email: user.email, plan, marks }, null, 1));

  console.log(`Account: ${user.username}`);
  console.log(`  now:   ${count(user)}`);
  console.log(`  after: ${count(marks)}`);
  console.log(`In the atlas: ${plan.ratings.length} of ${data.ratings.length} ratings, ${plan.watched.length} of ${data.watched.length} watched, ${plan.watchlist.length} of ${data.watchlist.length} on the watchlist (less what's been seen)`);
  const stars = {};
  plan.ratings.forEach((r) => { stars[r.value] = (stars[r.value] || 0) + 1; });
  console.log('Marks:', Object.entries(stars).sort((a, b) => b[0] - a[0]).map(([v, n]) => `${v}★ ${n}`).join('  '));
  if (plan.topFourNotHere.length) console.log('Top four not in the atlas:', plan.topFourNotHere.join(', '));
  if (plan.nearMisses.length) console.log(`Same title, another film (left out, ${plan.nearMisses.length}):`, plan.nearMisses.slice(0, 8).join(' | '));
  console.log(`\nPlan: ${path.relative(BACKEND, PLAN)}. Add --apply to write it.`);
};

const apply = async () => {
  const { userId, marks } = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  const user = await User.findById(userId).select(['email', ...MARKS].join(' ')).lean();
  if (!user) throw new Error('The account in the plan is gone; run the dry run again.');
  fs.mkdirSync(BACKUPS, { recursive: true });
  const backup = path.join(BACKUPS, `backup-letterboxd-user-${stamp()}.json`);
  fs.writeFileSync(backup, JSON.stringify(user, null, 1));
  console.log(`Backed up the account's marks → ${path.relative(BACKEND, backup)}`);
  const res = await User.updateOne({ _id: userId }, { $set: marks });
  const after = await User.findById(userId).select(MARKS.join(' ')).lean();
  console.log(`Modified ${res.modifiedCount}. Verified: ${count(after)}`);
};

const restore = async (file) => {
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  const marks = Object.fromEntries(MARKS.map((k) => [k, saved[k] || []]));
  console.log(`The backup holds ${count(marks)}`);
  if (!APPLY) return console.log('Dry run: add --apply to restore them.');
  const res = await User.updateOne({ _id: saved._id }, { $set: marks });
  console.log(`Restored: modified ${res.modifiedCount}`);
};

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    if (RESTORE) await restore(RESTORE);
    else if (APPLY) {
      // (with an export named, the plan is made from it first, so it's never an old one)
      if (SOURCE) await dryRun();
      await apply();
    } else await dryRun();
  } finally {
    await mongoose.disconnect();
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((err) => { console.error(err.message || err); process.exit(1); });
