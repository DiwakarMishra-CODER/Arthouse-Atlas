/**
 * Give every movement's key directors a face, and a page where the atlas has their films.
 *
 * Many key directors named on movements have no Director record, so the
 * movement pages show no portrait and can't link them. For each one this
 * finds the TMDB person — confirmed only when that person's directing credits
 * include a film we hold, so we never take the wrong John Ford — and then:
 *   · has films here  → create a Director record (name spelt as our films spell it) and link it
 *   · already a record under another spelling (same TMDB id) → just link it
 *   · no films here   → keep the portrait on the movement entry only; no empty page
 *
 *   node scripts/linkKeyDirectors.js            dry run: report only, writes nothing
 *   node scripts/linkKeyDirectors.js --apply    back up, then write
 *
 * The report and backups go to $OUT_DIR (default: ./scripts/output).
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Director from '../models/Director.js';
import Movement from '../models/Movement.js';
import Movie from '../models/Movie.js';
import { tmdbGet, createLimiter, normalizeName, namesMatch, TMDB_IMAGE } from './lib/tmdbResolve.js';

dotenv.config();

const APPLY = process.argv.includes('--apply');
const OUT_DIR = process.env.OUT_DIR || path.resolve('scripts/output');
const limit = createLimiter(4);

// names TMDB files under another form
const SEARCH_AS = { 'G. Aravindan': 'Govindan Aravindan' };

// TMDB person → { id, name, profileUrl, directed: Set<tmdbId> }
const person = async (id) => {
  const [p, credits] = await Promise.all([tmdbGet(`/person/${id}`), tmdbGet(`/person/${id}/movie_credits`)]);
  return {
    id,
    name: p.name,
    profileUrl: p.profile_path ? `${TMDB_IMAGE.backdrop}${p.profile_path}` : '',
    bio: p.biography || '',
    birthDate: p.birthday || '',
    deathDate: p.deathday || null,
    placeOfBirth: p.place_of_birth || '',
    directed: new Set((credits.crew || []).filter((c) => c.job === 'Director').map((c) => c.id))
  };
};

const resolve = async (name, catalogue) => {
  const query = SEARCH_AS[name] || name;
  const { results = [] } = await tmdbGet('/search/person', { query });
  const candidates = results.slice(0, 5);
  let best = null;
  for (const c of candidates) {
    const p = await person(c.id);
    const held = catalogue.filter((m) => p.directed.has(m.tmdbId));
    if (held.length && (!best || held.length > best.held.length)) best = { p, held };
  }
  if (best) return { status: 'confirmed', ...best };

  // nothing of theirs in the catalogue: accept the top result only if they're a director by trade and the name agrees
  const top = candidates.find((c) => c.known_for_department === 'Directing' && namesMatch(c.name, query));
  if (top) return { status: 'portrait-only', p: await person(top.id), held: [] };
  return { status: 'not-found', held: [] };
};

const main = async () => {
  await connectDB();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const [movements, directors, catalogue] = await Promise.all([
    Movement.find({}).lean(),
    Director.find({}).select('name tmdbId').lean(),
    Movie.find({ tmdbId: { $exists: true } }).select('title year tmdbId directors').lean()
  ]);
  const byTmdb = new Map(directors.map((d) => [d.tmdbId, d]));

  const missing = [...new Set(movements.flatMap((m) => (m.keyDirectors || []).filter((d) => !d.directorId).map((d) => d.name)))];
  console.log(`${missing.length} key directors without a record — resolving on TMDB…`);

  const rows = await Promise.all(missing.map((name) => limit(async () => {
    try {
      const r = await resolve(name, catalogue);
      if (r.status === 'not-found') return { name, status: 'not-found' };
      const existing = byTmdb.get(r.p.id);
      // spell the record the way our films credit them, so the films join on name
      const credited = r.held.flatMap((m) => m.directors || []).find((d) => namesMatch(d, r.p.name) || namesMatch(d, name));
      return {
        name,
        status: existing ? 'existing-record' : r.status,
        tmdbId: r.p.id,
        tmdbName: r.p.name,
        recordName: existing ? existing.name : credited || name,
        existingId: existing?._id || null,
        profileUrl: r.p.profileUrl,
        films: r.held.map((m) => `${m.title} (${m.year})`),
        person: r.p
      };
    } catch (err) {
      return { name, status: 'error', error: err.message };
    }
  })));

  const group = (s) => rows.filter((r) => r.status === s);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: Object.fromEntries(['confirmed', 'existing-record', 'portrait-only', 'not-found', 'error'].map((s) => [s, group(s).length])),
    // worth a look: TMDB spells them differently, or our films do
    spellingDiffers: rows.filter((r) => r.tmdbName && normalizeName(r.recordName) !== normalizeName(r.name))
      .map((r) => ({ movementSays: r.name, recordWillBe: r.recordName, tmdb: r.tmdbName })),
    rows: rows.map(({ person: _p, ...r }) => r)
  };
  const reportPath = path.join(OUT_DIR, 'linkKeyDirectors-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('Summary:', report.summary);
  console.log(`Spelling differs: ${report.spellingDiffers.length}`);
  console.log(`Report: ${reportPath}`);

  if (!APPLY) {
    console.log('Dry run — nothing written. Re-run with --apply after review.');
    return mongoose.disconnect();
  }

  // ---- apply ----
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(OUT_DIR, `backup-directors-${stamp}.json`), JSON.stringify(await Director.find({}).lean()));
  fs.writeFileSync(path.join(OUT_DIR, `backup-movements-${stamp}.json`), JSON.stringify(movements));
  console.log(`Backed up directors and movements to ${OUT_DIR}`);

  const idFor = new Map(); // movement's name → Director _id
  for (const r of group('existing-record')) idFor.set(r.name, r.existingId);
  for (const r of group('confirmed')) {
    const p = r.person;
    const doc = await Director.findOneAndUpdate(
      { tmdbId: p.id },
      { $setOnInsert: { name: r.recordName, tmdbId: p.id, bio: p.bio, birthDate: p.birthDate, deathDate: p.deathDate, placeOfBirth: p.placeOfBirth, profileUrl: p.profileUrl } },
      { upsert: true, new: true }
    );
    idFor.set(r.name, doc._id);
  }
  const portraitFor = new Map(group('portrait-only').map((r) => [r.name, r.profileUrl]));

  let linked = 0;
  for (const m of movements) {
    let changed = false;
    const keyDirectors = (m.keyDirectors || []).map((d) => {
      if (d.directorId) return d;
      if (idFor.has(d.name)) { changed = true; linked++; return { ...d, directorId: idFor.get(d.name) }; }
      if (portraitFor.get(d.name)) { changed = true; return { ...d, profileUrl: portraitFor.get(d.name) }; }
      return d;
    });
    if (changed) await Movement.updateOne({ _id: m._id }, { $set: { keyDirectors } });
  }
  console.log(`Created/linked ${idFor.size} directors across ${linked} movement entries; ${portraitFor.size} portrait-only.`);
  return mongoose.disconnect();
};

main().catch((err) => { console.error(err); process.exit(1); });
