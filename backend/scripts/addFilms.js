/**
 * Add films to the catalogue from a curated list, verified against TMDB.
 *
 * Every candidate is resolved by TMDB id, or by title + year with the director
 * credit confirmed — the check the original seed scripts lacked, which is how
 * "Leviathan" became a 1989 creature feature. Fields, tags and every score are
 * computed the same way applyCatalogueFixes.js refreshes existing films.
 *
 * Input file (JSON array), any mix of:
 *   { "tmdbId": 8075 }
 *   { "title": "Contempt", "year": 1963, "director": "Jean-Luc Godard" }
 *   { "title": "...", "year": ..., "director": "...", "tier": 1, "movements": ["French New Wave"], "curatorNote": "..." }
 *
 * Usage:
 *   node scripts/addFilms.js --list <file.json> [--dry-run] [--tier 1] [--out <dir>]
 *   node scripts/addFilms.js --from-gaps <canon-gaps.json> --min-sources 2 [--dry-run]
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js';
import { generateTags } from '../services/taggingService.js';
import { assignMoods } from '../services/moodService.js';
import { calculateArthouseScore } from '../services/arthouseScoring.js';
import {
  calculateBaseCanonScore, calculateCriticalConsensus, calculateFormalInnovation,
  calculateCulturalInfluence, calculateDepthScore
} from '../services/baseCanonScoring.js';
import { fetchMovieFields, findCandidate, namesMatch, surnamesMatch, sleep } from './lib/tmdbResolve.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const args = process.argv.slice(2);
const argValue = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const DRY_RUN = args.includes('--dry-run');
const LIST_PATH = argValue('--list');
const GAPS_PATH = argValue('--from-gaps');
const MIN_SOURCES = parseInt(argValue('--min-sources') || '2', 10);
const DEFAULT_TIER = parseInt(argValue('--tier') || '1', 10);
const OUT_DIR = argValue('--out') || path.join(__dirname, 'reports');

const log = [];
const say = (line) => { console.log(line); log.push(line); };

const recomputeDerived = (doc) => {
  const derivedTags = generateTags({ synopsis: doc.synopsis, keywords: doc.keywords, genres: doc.genres });
  const merged = { ...doc, derivedTags };
  merged.moods = assignMoods(merged);
  merged.criticalConsensus = calculateCriticalConsensus(merged);
  merged.formalInnovation = calculateFormalInnovation(merged);
  merged.culturalInfluence = calculateCulturalInfluence(merged);
  merged.depthScore = calculateDepthScore(merged);
  merged.arthouseScore = calculateArthouseScore(merged);
  merged.baseCanonScore = calculateBaseCanonScore(merged);
  const { derivedTags: t, moods, criticalConsensus, formalInnovation, culturalInfluence, depthScore, arthouseScore, baseCanonScore } = merged;
  return { derivedTags: t, moods, criticalConsensus, formalInnovation, culturalInfluence, depthScore, arthouseScore, baseCanonScore };
};

const loadCandidates = () => {
  if (LIST_PATH) return JSON.parse(fs.readFileSync(LIST_PATH, 'utf8'));
  if (GAPS_PATH) {
    const gaps = JSON.parse(fs.readFileSync(GAPS_PATH, 'utf8'));
    const list = Array.isArray(gaps) ? gaps : gaps.gaps;
    return list
      .filter((g) => g.count >= MIN_SOURCES)
      .map((g) => ({ tmdbId: g.tmdbId, title: g.title, year: g.year, director: g.directors?.[0], provenanceHint: g.entries }));
  }
  throw new Error('Provide --list <file.json> or --from-gaps <canon-gaps.json>');
};

const resolveCandidate = async (c) => {
  if (c.tmdbId) return { tmdbId: c.tmdbId, via: 'id' };
  const found = await findCandidate(c.title, c.year, c.director);
  if (found) return { tmdbId: found.tmdbId, via: 'search' };
  return { tmdbId: null };
};

const main = async () => {
  const candidates = loadCandidates();
  await mongoose.connect(process.env.MONGODB_URI);
  const startCount = await Movie.countDocuments();
  say(`${DRY_RUN ? '[DRY RUN] ' : ''}Catalogue: ${startCount} films · ${candidates.length} candidates\n`);

  const results = [];
  for (const c of candidates) {
    const label = c.title ? `${c.title} (${c.year || '?'})` : `#${c.tmdbId}`;
    try {
      const { tmdbId, via } = await resolveCandidate(c);
      if (!tmdbId) { say(`  ✗ ${label}: could not resolve on TMDB`); results.push({ label, status: 'UNRESOLVED' }); continue; }

      const exists = await Movie.findOne({ tmdbId }).select('title year movements').lean();
      if (exists) {
        // Already here — but the list may still be telling us which movement it belongs to
        const newMovements = (c.movements || []).filter((m) => !(exists.movements || []).includes(m));
        if (c.movements?.length && !DRY_RUN) await Movie.updateOne({ _id: exists._id }, { $addToSet: { movements: { $each: c.movements }, curatedMovements: { $each: c.movements } } });
        say(`  = ${label}: already in catalogue as "${exists.title}" (${exists.year})${newMovements.length ? ` · +movement ${newMovements.join(', ')}` : ''}`);
        results.push({ label, status: newMovements.length ? 'EXISTS_TAGGED' : 'EXISTS' });
        continue;
      }

      const fetched = await fetchMovieFields(tmdbId);
      if (!fetched) { say(`  ✗ ${label}: TMDB #${tmdbId} not found`); results.push({ label, status: 'NOT_FOUND' }); continue; }
      const f = fetched.fields;

      // Resolved by search already checked the director; by id, check it now
      if (c.director && f.directors.length && !f.directors.some((d) => namesMatch(d, c.director) || surnamesMatch(d, c.director))) {
        say(`  ✗ ${label}: TMDB #${tmdbId} is directed by ${f.directors.join(', ')}, expected ${c.director} — skipped`);
        results.push({ label, status: 'DIRECTOR_MISMATCH', tmdbDirectors: f.directors });
        continue;
      }
      if (!f.directors.length) { say(`  ✗ ${label}: TMDB #${tmdbId} has no director credit — skipped`); results.push({ label, status: 'NO_DIRECTOR' }); continue; }

      const doc = {
        ...f,
        tier: c.tier ?? DEFAULT_TIER,
        movements: c.movements || [],
        curatedMovements: c.movements || [],
        curatorNote: c.curatorNote || null,
        showCount: 0,
        lastShownAt: null
      };
      Object.assign(doc, recomputeDerived(doc));

      say(`  + ${doc.title} (${doc.year}) · ${doc.directors.join(', ')} · ${doc.country || '—'} · ${doc.vote_count} votes · AS ${doc.arthouseScore} · CS ${doc.baseCanonScore}${via === 'search' ? ' · resolved by search' : ''}`);
      if (!DRY_RUN) await Movie.create(doc);
      results.push({ label: doc.title, status: 'ADDED', tmdbId });
    } catch (err) {
      say(`  ✗ ${label}: ${err.message}`);
      results.push({ label, status: 'ERROR', error: err.message });
    }
    await sleep(150);
  }

  const endCount = await Movie.countDocuments();
  const tally = Object.entries(results.reduce((o, r) => ({ ...o, [r.status]: (o[r.status] || 0) + 1 }), {})).map(([k, v]) => `${k} ${v}`).join(', ');
  say(`\nDone${DRY_RUN ? ' (nothing written)' : ''}. Films: ${startCount} → ${endCount}. ${tally}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  fs.writeFileSync(path.join(OUT_DIR, `add-${DRY_RUN ? 'dryrun' : 'live'}-${stamp}.json`), JSON.stringify({ dryRun: DRY_RUN, startCount, endCount, results, log }, null, 2));
  await mongoose.connection.close();
};

main().catch(async (err) => { console.error(err); await mongoose.connection.close().catch(() => {}); process.exit(1); });
