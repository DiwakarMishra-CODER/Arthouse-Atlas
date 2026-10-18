/**
 * Enrich every film with originalTitle, altTitles[] and countries[] from TMDB.
 *
 * altTitles make canon-list matching and site search robust to release-title
 * variants ("Weekend"/"Week-end", "Satantango"/"Sátántangó"). countries[] is
 * the full co-production list the atlas map needs; the primary `country` is
 * left as the verifier/fixer resolved it.
 *
 * Usage:  node scripts/enrichTitlesCountries.js [--dry-run] [--only-missing]
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js';
import { tmdbGet, createLimiter } from './lib/tmdbResolve.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY_MISSING = args.includes('--only-missing');

// Keep Latin-script release titles from the big English-language and European
// markets plus the film's home market; skip marketing variants like "(re-release)".
const KEEP_REGIONS = new Set(['US', 'GB', 'FR', 'IT', 'DE', 'ES', 'JP', 'KR', 'IN', 'BR', 'MX', 'AR', 'SE', 'DK', 'PL', 'HU', 'RU', 'TW', 'HK', 'CN', 'IR', 'TR', 'PT', 'NL', 'BE', 'AU', 'CA']);

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const q = ONLY_MISSING ? { $or: [{ altTitles: { $exists: false } }, { altTitles: { $size: 0 } }] } : {};
  const films = await Movie.find(q).select('title year tmdbId originalTitle altTitles countries country').lean();
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Enriching ${films.length} films…`);

  const limiter = createLimiter(4);
  let done = 0, updated = 0, failed = 0;
  await Promise.all(films.map((film) => limiter(async () => {
    try {
      const d = await tmdbGet(`/movie/${film.tmdbId}`, { append_to_response: 'alternative_titles' });
      if (!d) { failed++; return; }
      const alts = new Set();
      for (const t of d.alternative_titles?.titles || []) {
        if (!KEEP_REGIONS.has(t.iso_3166_1)) continue;
        if (/\(|\)|re-?release|director's cut|restored/i.test(t.title)) continue;
        if (t.title && t.title !== film.title && t.title !== d.original_title) alts.add(t.title.trim());
      }
      if (d.original_title && d.original_title !== film.title) alts.add(d.original_title);
      if (d.title && d.title !== film.title) alts.add(d.title);
      const set = {
        originalTitle: d.original_title || film.title,
        altTitles: [...alts].slice(0, 12),
        countries: (d.production_countries || []).map((c) => c.name)
      };
      if (!DRY_RUN) await Movie.updateOne({ _id: film._id }, { $set: set });
      updated++;
      if (done < 3) console.log(`  ${film.title} → original "${set.originalTitle}" · alts [${set.altTitles.slice(0, 4).join(' / ')}] · ${set.countries.join('/')}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${film.title}: ${err.message}`);
    } finally {
      done++;
      if (done % 100 === 0) console.log(`  ${done}/${films.length}`);
    }
  })));

  console.log(`Done. updated ${updated}, failed ${failed}${DRY_RUN ? ' (nothing written)' : ''}`);
  await mongoose.connection.close();
};

main().catch(async (err) => { console.error(err); await mongoose.connection.close().catch(() => {}); process.exit(1); });
