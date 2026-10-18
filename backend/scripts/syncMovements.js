/**
 * Sync Movements
 *
 * 1. Upserts every movement from data/movementsData.js + data/movementsExpansion.js
 *    into the Movement collection (text fields refreshed; existing colour/backdrop kept).
 * 2. Links each movement's essentialFilms to catalogue records (title + year ±1),
 *    writing movieId/posterUrl back onto the movement.
 * 3. Tags films: a film belongs to a movement when it is one of its essential
 *    films, OR its director is a key director of the movement AND its year
 *    falls inside the movement's era (±2 years at the edges). Replaces the
 *    old state where only the 3 essential films per movement were tagged.
 *
 * Usage:  node scripts/syncMovements.js [--dry-run]
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js';
import Movement from '../models/Movement.js';
import Director from '../models/Director.js';
import { movementsData } from '../data/movementsData.js';
import { movementsExpansion } from '../data/movementsExpansion.js';
import { namesMatch, normalizeName } from '../services/nameUtils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const DRY_RUN = process.argv.includes('--dry-run');

// "1958–1964" → [1958, 1964]; "1980s–present" → [1980, thisYear]; "1920s-Present" likewise
const parseEra = (era = '') => {
  const now = new Date().getFullYear();
  // Keep the decade suffix: "2000s" as an end token means through 2009
  const toks = [...era.matchAll(/(\d{4})(s?)/g)].map((m) => ({ year: parseInt(m[1], 10), decade: m[2] === 's' }));
  const start = toks[0]?.year ?? 1890;
  let end;
  if (/present/i.test(era)) end = now;
  else if (toks[1]) end = toks[1].decade ? toks[1].year + 9 : toks[1].year;
  else end = toks[0]?.decade ? start + 9 : start;
  return [start, end];
};

// Movements where director × era tagging is wrong: modes of filmmaking that
// span a century (a director's documentary doesn't make their fiction one), and
// Dogme 95, which is a certified membership — Dogville and Melancholia are von
// Trier films but not Dogme films. Only essentials apply for these.
const ESSENTIALS_ONLY = new Set(['Documentary / Cinema Vérité', 'Avant-garde / Experimental Cinema', 'Dogme 95']);

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const all = [...movementsData, ...movementsExpansion];
  const films = await Movie.find({}).select('title originalTitle altTitles year directors movements curatedMovements posterUrl').lean();
  const directorDocs = await Director.find({}).select('name').lean();

  const normT = (s = '') => normalizeName(s);
  const findFilm = (title, year) => films.find((f) =>
    [f.title, f.originalTitle, ...(f.altTitles || [])].some((t) => t && normT(t) === normT(title)) &&
    (!year || !f.year || Math.abs(f.year - year) <= 1));

  const tags = new Map(); // film._id -> Set(movement titles)
  const addTag = (f, m) => { const k = f._id.toString(); if (!tags.has(k)) tags.set(k, new Set()); tags.get(k).add(m); };
  const summary = [];

  for (const [i, m] of all.entries()) {
    const [start, end] = parseEra(m.era);
    // Essential films → link + tag
    const essentials = m.essentialFilms.map((ef) => {
      const title = ef.title || ef; const year = ef.year ? parseInt(ef.year, 10) : null;
      const f = findFilm(title, year);
      if (f) addTag(f, m.title);
      return { title, year: year ? String(year) : undefined, movieId: f?._id || null, posterUrl: f?.posterUrl || null };
    });
    const linked = essentials.filter((e) => e.movieId).length;

    // Key directors × era → tag
    let byDirector = 0;
    if (!ESSENTIALS_ONLY.has(m.title)) {
      for (const f of films) {
        if (!f.year || f.year < start - 2 || f.year > end + 2) continue;
        // Full-name match only: key directors are full names, and a surname
        // match tags Satyajit Ray's films as Nicholas Ray's
        const hit = (f.directors || []).some((d) => m.keyDirectors.some((kd) => namesMatch(d, kd.name || kd)));
        if (hit) { addTag(f, m.title); byDirector++; }
      }
    }

    const keyDirectors = m.keyDirectors.map((kd) => {
      const name = kd.name || kd;
      const doc = directorDocs.find((d) => namesMatch(d.name, name));
      return { name, directorId: doc?._id || null };
    });

    const set = {
      title: m.title, era: m.era, vibe: m.vibe, philosophy: m.philosophy,
      visualSignatures: m.visualSignatures, keyDirectors, essentialFilms: essentials,
      description: m.description, tagline: m.tagline, tag: m.tag, icon: m.icon,
      cardColor: m.cardColor, sortOrder: i
    };
    if (!DRY_RUN) await Movement.updateOne({ title: m.title }, { $set: set, $setOnInsert: { colorCode: m.cardColor || '#d4af37' } }, { upsert: true });
    const total = [...tags.entries()].filter(([, s]) => s.has(m.title)).length;
    summary.push(`${m.title.padEnd(38)} ${m.era.padEnd(16)} essentials ${String(linked).padStart(2)}/${String(essentials.length).padEnd(3)} by-director ${String(byDirector).padStart(3)}  → ${String(total).padStart(3)} films`);
  }

  // Write tags. movements = rules ∪ curatedMovements (hand-assigned, durable).
  // Without --replace, whatever is already in movements is kept too; with it,
  // the rules and the curated list are the only sources of truth.
  const REPLACE = process.argv.includes('--replace');
  let changed = 0;
  for (const f of films) {
    const computed = tags.get(f._id.toString()) || new Set();
    const base = REPLACE ? [] : (f.movements || []);
    const next = [...new Set([...base, ...(f.curatedMovements || []), ...computed])].sort();
    const prev = [...(f.movements || [])].sort();
    if (JSON.stringify(next) !== JSON.stringify(prev)) {
      changed++;
      if (!DRY_RUN) await Movie.updateOne({ _id: f._id }, { $set: { movements: next } });
    }
  }

  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}${all.length} movements · ${films.length} films\n`);
  console.log(summary.join('\n'));
  const tagged = [...tags.keys()].length;
  console.log(`\nFilms with ≥1 movement: ${tagged}/${films.length} · films whose tags changed: ${changed}${DRY_RUN ? ' (nothing written)' : ''}`);
  await mongoose.connection.close();
};

main().catch(async (err) => { console.error(err); await mongoose.connection.close().catch(() => {}); process.exit(1); });
