/**
 * Director pages for the directors the atlas holds several films by. A director's page only exists
 * where there's a Director record, so a name with none (John Cassavetes, eight films) led nowhere.
 *
 * Every director credited on three or more of the atlas's films (--min-films to change it, --names
 * "A;B" to add particular people), who has no record yet, is looked up on TMDB and taken only when
 * their directing credits include one of our films (scripts/lib/tmdbPeople.js). The record is
 * spelt the way our films credit them, so the films and the page join on the name.
 *
 *   node scripts/catalogue/addDirectors.js                  dry run: the list, nothing written
 *   node scripts/catalogue/addDirectors.js --apply          back up the directors, then add the records
 *   node scripts/catalogue/addDirectors.js --restore <file> remove the records an earlier --apply added
 * Backups and the list of what was added go to data/backups/.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Director from '../../models/Director.js';
import Movie from '../../models/Movie.js';
import { createLimiter, normalizeName, namesMatch } from '../lib/tmdbResolve.js';
import { resolvePerson } from '../lib/tmdbPeople.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(BACKEND, '.env') });
const BACKUPS = path.join(BACKEND, 'data/backups');

const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; };
const APPLY = process.argv.includes('--apply');
const RESTORE = arg('--restore');
const MIN_FILMS = Number(arg('--min-films') || 3);
const NAMES = (arg('--names') || '').split(';').map((s) => s.trim()).filter(Boolean);
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const limit = createLimiter(4);

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    if (RESTORE) {
      const { added } = JSON.parse(fs.readFileSync(RESTORE, 'utf8'));
      const r = await Director.deleteMany({ _id: { $in: added.map((a) => a._id) } });
      console.log(`removed ${r.deletedCount} of ${added.length} records`);
      return;
    }

    const [films, records] = await Promise.all([
      Movie.find({}).select('title year tmdbId directors').lean(),
      Director.find({}).select('name tmdbId').lean(),
    ]);
    const known = new Set(records.map((d) => normalizeName(d.name)));
    const byTmdb = new Map(records.filter((d) => d.tmdbId).map((d) => [d.tmdbId, d]));
    const count = {};
    films.forEach((f) => (f.directors || []).forEach((d) => { count[d] = (count[d] || 0) + 1; }));
    const wanted = Object.keys(count)
      .filter((d) => !known.has(normalizeName(d)) && (count[d] >= MIN_FILMS || NAMES.some((n) => namesMatch(n, d))))
      .sort((a, b) => count[b] - count[a] || a.localeCompare(b));
    const catalogue = films.filter((f) => f.tmdbId);
    console.log(`${wanted.length} directors with ${MIN_FILMS}+ films${NAMES.length ? ' (or named)' : ''} and no page: looking them up on TMDB…`);

    const rows = await Promise.all(wanted.map((name) => limit(async () => {
      try {
        const r = await resolvePerson(name, catalogue);
        if (r.status !== 'confirmed') return { name, films: count[name], status: 'not confirmed' };
        const existing = byTmdb.get(r.p.id);
        if (existing) return { name, films: count[name], status: `already a page, as ${existing.name}` };
        return { name, films: count[name], status: 'add', person: r.p, ours: r.held.length };
      } catch (err) {
        return { name, films: count[name], status: `error: ${err.message}` };
      }
    })));

    const add = rows.filter((r) => r.status === 'add');
    for (const r of rows) {
      const p = r.person;
      console.log(`  ${r.status === 'add' ? '+' : '·'} ${r.name} (${r.films} films)${p ? ` · TMDB "${p.name}" · ${p.profileUrl ? 'portrait' : 'no portrait'} · ${p.bio ? `bio ${p.bio.length} chars` : 'no bio'} · born ${p.birthDate || '?'}` : ` · ${r.status}`}`);
    }
    console.log(`\n${add.length} to add, ${rows.length - add.length} left as they are`);
    if (!APPLY) { console.log('Dry run: nothing written. Re-run with --apply.'); return; }

    fs.mkdirSync(BACKUPS, { recursive: true });
    const backup = path.join(BACKUPS, `backup-directors-${stamp()}.json`);
    fs.writeFileSync(backup, JSON.stringify(await Director.find({}).lean()));
    const added = [];
    for (const r of add) {
      const p = r.person;
      // spelt the way our films credit them, so the films join on the name
      const doc = await Director.findOneAndUpdate(
        { tmdbId: p.id },
        { $setOnInsert: { name: r.name, tmdbId: p.id, bio: p.bio, birthDate: p.birthDate, deathDate: p.deathDate, placeOfBirth: p.placeOfBirth, profileUrl: p.profileUrl } },
        { upsert: true, new: true }
      );
      added.push({ _id: String(doc._id), name: doc.name });
    }
    const log = path.join(BACKUPS, `added-directors-${stamp()}.json`);
    fs.writeFileSync(log, JSON.stringify({ added }, null, 1));
    console.log(`added ${added.length} · backup ${path.relative(BACKEND, backup)} · undo with --restore ${path.relative(BACKEND, log)}`);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((err) => { console.error(err); process.exit(1); });
