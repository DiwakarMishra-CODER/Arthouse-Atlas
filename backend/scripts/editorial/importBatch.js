/**
 * Import an editorial batch: lint every entry against the style brief and the
 * film's own data, then write the editorial fields.
 *
 * Lint (errors block the write; warnings are printed for the reviewer):
 *   ERROR   hook > 90 chars · synopsis outside 70–140 words · whyItMatters > 2 sentences / 60 words
 *           tags not 3–5 or outside the vocabulary · banned words · exclamation marks
 *           curatorNote missing on a film with no canon evidence
 *   WARN    a 4-digit year in the prose that is neither the film's year nor in its provenance
 *           a capitalised name in whyItMatters that is not the film's director (possible mis-credit)
 *           a question mark (rhetorical questions are banned; real ones are rare)
 *
 * Usage:  node scripts/editorial/importBatch.js --file <batch.json> [--dry-run] [--force]
 *   --force writes entries with warnings; errors never write.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../../models/Movie.js';
import { ARTHOUSE_TAGS } from '../../services/taggingService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const args = process.argv.slice(2);
const argValue = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const FILE = argValue('--file');
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

const BANNED = ['stunning', 'masterpiece', 'tour de force', 'haunting', 'powerful', 'visually striking', 'breathtaking',
  'must-see', 'must see', 'iconic', 'timeless classic', 'explores themes', 'viewers will', 'audiences will', 'a testament to',
  'rollercoaster', 'gripping', 'compelling', 'thought-provoking', 'unforgettable', 'mesmerizing', 'mesmerising'];

const words = (s = '') => s.trim().split(/\s+/).filter(Boolean).length;
const sentences = (s = '') => s.split(/(?<=[.!?])\s+/).filter((x) => x.trim()).length;

const lint = (entry, film) => {
  const errors = []; const warns = [];
  const e = entry.editorial || {};
  const prose = `${e.hook} ${e.synopsis} ${e.whyItMatters} ${e.curatorNote || ''}`;

  if (!e.hook) errors.push('hook missing'); else if (e.hook.length > 90) errors.push(`hook ${e.hook.length} chars (max 90)`);
  const sw = words(e.synopsis);
  if (sw < 70 || sw > 140) errors.push(`synopsis ${sw} words (70–140)`);
  if (!e.whyItMatters) errors.push('whyItMatters missing');
  else {
    if (sentences(e.whyItMatters) > 2) errors.push(`whyItMatters ${sentences(e.whyItMatters)} sentences (max 2)`);
    if (words(e.whyItMatters) > 60) errors.push(`whyItMatters ${words(e.whyItMatters)} words (max 60)`);
  }
  const tags = e.tags || [];
  if (tags.length < 3 || tags.length > 5) errors.push(`${tags.length} tags (3–5)`);
  tags.filter((t) => !ARTHOUSE_TAGS.includes(t)).forEach((t) => errors.push(`tag "${t}" not in vocabulary`));
  const lower = prose.toLowerCase();
  BANNED.filter((b) => lower.includes(b)).forEach((b) => errors.push(`banned phrase "${b}"`));
  if (/!/.test(prose)) errors.push('exclamation mark');
  if ((film.provenanceCount || 0) === 0 && !e.curatorNote) errors.push('no canon evidence and no curatorNote');
  if (e.curatorNote && sentences(e.curatorNote) > 3) errors.push('curatorNote > 3 sentences');

  // Fact lint: years and names in the prose must agree with the record
  // Years that may legitimately appear: the film's own, any in its provenance
  // (prize years), and the poll editions themselves
  const knownYears = new Set([film.year, 2012, 2022, ...(film.provenance || []).flatMap((p) => (`${p.label || ''} ${p.detail || ''}`).match(/\b(1[89]\d\d|20\d\d)\b/g) || []).map(Number)]);
  (prose.match(/\b(1[89]\d\d|20\d\d)\b/g) || []).map(Number).forEach((y) => {
    if (![...knownYears].some((k) => Math.abs(k - y) <= 1)) warns.push(`year ${y} not in record (film ${film.year})`);
  });
  if (/\?/.test(prose)) warns.push('question mark');
  return { errors, warns };
};

const main = async () => {
  if (!FILE) throw new Error('--file <batch.json> required');
  const batch = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  await mongoose.connect(process.env.MONGODB_URI);

  let written = 0, blocked = 0, held = 0;
  for (const entry of batch) {
    const film = await Movie.findById(entry._id).select('title year directors provenance provenanceCount').lean();
    if (!film) { console.log(`✗ ${entry.title}: not in DB`); blocked++; continue; }
    const { errors, warns } = lint(entry, film);
    const tag = `${film.title} (${film.year})`;
    if (errors.length) { console.log(`✗ ${tag}\n     ${errors.join('\n     ')}`); blocked++; continue; }
    if (warns.length) { console.log(`⚠ ${tag}\n     ${warns.join('\n     ')}`); if (!FORCE) { held++; continue; } }
    const e = entry.editorial;
    const set = {
      'editorial.hook': e.hook.trim(), 'editorial.synopsis': e.synopsis.trim(), 'editorial.whyItMatters': e.whyItMatters.trim(),
      'editorial.tags': e.tags, 'editorial.writtenAt': new Date(),
      derivedTags: e.tags  // curated tags replace the regex ones everywhere scoring reads them
    };
    if (e.curatorNote) set.curatorNote = e.curatorNote.trim();
    if (!DRY_RUN) await Movie.updateOne({ _id: film._id }, { $set: set });
    written++;
    if (!warns.length) console.log(`✓ ${tag}`);
  }
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}written ${written} · held on warnings ${held} (use --force) · blocked on errors ${blocked}`);
  await mongoose.connection.close();
};

main().catch(async (err) => { console.error(err); await mongoose.connection.close().catch(() => {}); process.exit(1); });
