/**
 * Catalogue Verifier (read-only)
 *
 * Re-resolves every film against TMDB and flags records whose stored data
 * does not match what TMDB says about the film we *meant* to store.
 *
 * Why this exists: an earlier seed script wrote `director`/`voteCount` into a
 * schema that only knows `directors[]`/`vote_count`, so Mongoose silently
 * dropped the data. It also searched TMDB by title with no year, so ambiguous
 * titles ("House", "The Last Laugh") matched remakes decades off.
 *
 * Checks per film:
 *   - DIRECTOR_MISSING      stored record has no director
 *   - DIRECTOR_MISMATCH     stored director != TMDB credited director for tmdbId
 *   - YEAR_DRIFT            |stored year - TMDB release year| > 1
 *   - ZERO_VOTES            stored vote_count is 0 (data was dropped)
 *   - COUNTRY_MISSING       stored record has no country
 *   - COUNTRY_SUSPECT       stored country differs from the resolved primary country
 *   - WRONG_FILM            tmdbId points at a different film than expected;
 *                           a better candidate was found via title+year+director
 *   - NEEDS_MANUAL          could not resolve automatically
 *
 * Usage:  node scripts/verifyCatalogue.js [--out <dir>] [--limit N]
 * Writes <out>/verify-report.json and <out>/verify-report.md. Never writes to the DB.
 * Feed the JSON to applyCatalogueFixes.js to act on it.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js';
import { namesMatch, createLimiter, fetchDetails, findCandidate } from './lib/tmdbResolve.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ============================================================================
// EXPECTATIONS — what each ambiguous or broken title is *supposed* to be.
// For every other film the stored director/year is treated as the expectation.
// `title` overrides the stored title when the record was pointing at the wrong
// work entirely (e.g. a making-of featurette instead of the film).
// ============================================================================
const EXPECTED = {
  // Wrong TMDB match (title-only search hit a remake or namesake)
  'The Phantom Carriage':              { director: 'Victor Sjöström',        year: 1921 },
  'The Last Laugh':                    { director: 'F.W. Murnau',            year: 1924 },
  'The Testament of Dr. Mabuse':       { director: 'Fritz Lang',             year: 1933 },
  'House':                             { director: 'Nobuhiko Obayashi',      year: 1977 },
  'Week-end':                          { director: 'Jean-Luc Godard',        year: 1967 },
  'Ten Dark Women':                    { director: 'Kon Ichikawa',           year: 1961 },
  "In the Edges: The 'Grizzly Man' Session": { title: 'Grizzly Man', director: 'Werner Herzog', year: 2005 },
  'Leviathan':                         { director: 'Andrey Zvyagintsev',     year: 2014 },
  'Burning':                           { director: 'Lee Chang-dong',         year: 2018 },
  'Colossal Youth':                    { director: 'Pedro Costa',            year: 2006 },

  // Director dropped by the schema bug — tmdbId is probably right, verify it
  'Häxan':                             { director: 'Benjamin Christensen',   year: 1922 },
  'Greed':                             { director: 'Erich von Stroheim',     year: 1924 },
  'A Page of Madness':                 { director: 'Teinosuke Kinugasa',     year: 1926 },
  'Freaks':                            { director: 'Tod Browning',           year: 1932 },
  'Paisan':                            { director: 'Roberto Rossellini',     year: 1946 },
  'Brief Encounter':                   { director: 'David Lean',             year: 1945 },
  'Children of the Beehive':           { director: 'Hiroshi Shimizu',        year: 1948 },
  'Vivre Sa Vie':                      { director: 'Jean-Luc Godard',        year: 1962 },
  'PlayTime':                          { director: 'Jacques Tati',           year: 1967 },
  'Kes':                               { director: 'Ken Loach',              year: 1969 },
  'The Conformist':                    { director: 'Bernardo Bertolucci',    year: 1970 },
  'A Touch of Zen':                    { director: 'King Hu',                year: 1971 },
  'Pink Flamingos':                    { director: 'John Waters',            year: 1972 },
  'Badlands':                          { director: 'Terrence Malick',        year: 1973 },
  'A Woman Under the Influence':       { director: 'John Cassavetes',        year: 1974 },
  'Who Killed Pixote?':                { director: 'José Joffily',           year: 1996 },
  'Koyaanisqatsi':                     { director: 'Godfrey Reggio',         year: 1982 },
  'Videodrome':                        { director: 'David Cronenberg',       year: 1983 },
  'Come and See':                      { director: 'Elem Klimov',            year: 1985 },
  "Angel's Egg":                       { director: 'Mamoru Oshii',           year: 1985 },
  'A Short Film About Killing':        { director: 'Krzysztof Kieślowski',   year: 1988 },
  'The Cook, the Thief, His Wife & Her Lover': { director: 'Peter Greenaway', year: 1989 },
  'Tetsuo: The Iron Man':              { director: 'Shinya Tsukamoto',       year: 1989 },
  'Man Bites Dog':                     { director: 'Rémy Belvaux',           year: 1992 },
  'La Haine':                          { director: 'Mathieu Kassovitz',      year: 1995 },
  'The Celebration':                   { director: 'Thomas Vinterberg',      year: 1998 },
  'Ghost Dog: The Way of the Samurai': { director: 'Jim Jarmusch',           year: 1999 },

  // Intent unclear — surface for a human decision
  "Smokey Joe's Cafe: The Songs of Leiber and Stoller": { manual: 'Filmed Broadway revue; not an arthouse film. Remove or replace?' },
  'Home':                              { manual: 'Stored as Yann Arthus-Bertrand aerial doc (2009). Intended Ursula Meier\'s Home (2008)? Confirm or remove.' },
  'Breathe':                           { manual: 'Stored as Andy Serkis (2017). Intended Mélanie Laurent\'s Breathe/Respire (2014)? Confirm or remove.' },
  "Don't Close Your Eyes":             { manual: 'Unknown 2025 title with 1 vote. Confirm intent or remove.' },
  'The Earth is Thirsty':              { manual: 'Yuli Raizman 1930; zero votes on TMDB. Keep as deep cut or remove?' }
};

// ============================================================================
// VERIFY ONE FILM
// ============================================================================

const verifyFilm = async (film) => {
  const expected = EXPECTED[film.title] || {};
  const expectedDirector = expected.director || film.directors?.[0] || null;
  const expectedYear = expected.year || film.year || null;
  const expectedTitle = expected.title || film.title;

  const flags = [];
  const row = {
    _id: film._id.toString(),
    title: film.title,
    year: film.year,
    tmdbId: film.tmdbId,
    stored: {
      directors: film.directors || [],
      country: film.country || null,
      vote_count: film.vote_count || 0
    },
    expected: { title: expectedTitle, director: expectedDirector, year: expectedYear },
    tmdbById: null,
    candidate: null,
    flags,
    action: 'OK',
    note: null
  };

  if (expected.manual) {
    flags.push('NEEDS_MANUAL');
    row.action = 'MANUAL';
    row.note = expected.manual;
    row.tmdbById = film.tmdbId ? await fetchDetails(film.tmdbId) : null;
    return row;
  }

  if (!film.directors || film.directors.length === 0) flags.push('DIRECTOR_MISSING');
  if (!(film.vote_count > 0)) flags.push('ZERO_VOTES');
  if (!film.country) flags.push('COUNTRY_MISSING');

  const byId = film.tmdbId ? await fetchDetails(film.tmdbId) : null;
  row.tmdbById = byId;

  let idIsRightFilm = false;
  if (byId) {
    const yearOk = !expectedYear || !byId.year || Math.abs(byId.year - expectedYear) <= 1;
    const dirOk = !expectedDirector || byId.directors.some((d) => namesMatch(d, expectedDirector));
    // A confirmed director credit outweighs a year drift (festival vs. release
    // year, or a typo in the stored year). Without a director to confirm, the
    // year has to hold.
    idIsRightFilm = expectedDirector && byId.directors.length ? dirOk : (yearOk && dirOk);
    // Same director, wrong decade, and nobody has voted on it: almost certainly
    // a stub record for a remake or re-release. Go look for the real one.
    if (idIsRightFilm && !yearOk && byId.vote_count === 0) idIsRightFilm = false;
    if (!yearOk) flags.push('YEAR_DRIFT');
    if (!dirOk && film.directors?.length) flags.push('DIRECTOR_MISMATCH');
    if (film.country && byId.country && film.country !== byId.country) flags.push('COUNTRY_SUSPECT');
  }

  if (idIsRightFilm) {
    // Right film; fix only if stored fields are stale/dropped
    const needsRefetch = flags.some((f) => ['DIRECTOR_MISSING', 'ZERO_VOTES', 'COUNTRY_MISSING', 'COUNTRY_SUSPECT', 'YEAR_DRIFT'].includes(f));
    row.action = needsRefetch ? 'REFETCH_SAME_ID' : 'OK';
    return row;
  }

  // tmdbId is wrong or missing — go find the film we meant
  const candidate = await findCandidate(expectedTitle, expectedYear, expectedDirector);
  row.candidate = candidate;
  if (candidate) {
    flags.push('WRONG_FILM');
    row.action = 'REMATCH';
  } else {
    flags.push('NEEDS_MANUAL');
    row.action = 'MANUAL';
    row.note = 'No TMDB candidate matched expected title + year + director.';
  }
  return row;
};

// ============================================================================
// REPORT
// ============================================================================

const fmtDirs = (arr) => (arr && arr.length ? arr.join(', ') : '—');

const toMarkdown = (rows) => {
  const flagged = rows.filter((r) => r.action !== 'OK');
  const counts = {};
  rows.forEach((r) => r.flags.forEach((f) => { counts[f] = (counts[f] || 0) + 1; }));
  const byAction = {};
  rows.forEach((r) => { byAction[r.action] = (byAction[r.action] || 0) + 1; });

  const lines = [];
  lines.push(`# Catalogue verification — ${new Date().toISOString().slice(0, 10)}`, '');
  lines.push(`Films checked: **${rows.length}** · Flagged: **${flagged.length}**`, '');
  lines.push('| Action | Count |', '|---|---|');
  Object.entries(byAction).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => lines.push(`| ${k} | ${v} |`));
  lines.push('', '| Flag | Count |', '|---|---|');
  Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => lines.push(`| ${k} | ${v} |`));

  const section = (title, action) => {
    const rs = flagged.filter((r) => r.action === action);
    if (!rs.length) return;
    lines.push('', `## ${title} (${rs.length})`, '');
    if (action === 'REMATCH') {
      lines.push('| Stored | Points at (tmdbId) | Proposed match (tmdbId) | Flags |', '|---|---|---|---|');
      rs.forEach((r) => {
        const b = r.tmdbById; const c = r.candidate;
        lines.push(`| ${r.title} (${r.year}) · ${fmtDirs(r.stored.directors)} | ${b ? `${b.title} (${b.year}) · ${fmtDirs(b.directors)} · #${b.tmdbId}` : '—'} | **${c.title} (${c.year}) · ${fmtDirs(c.directors)} · #${c.tmdbId}** · ${c.vote_count} votes | ${r.flags.join(', ')} |`);
      });
    } else if (action === 'REFETCH_SAME_ID') {
      lines.push('| Stored | TMDB says (same id) | Flags |', '|---|---|---|');
      rs.forEach((r) => {
        const b = r.tmdbById;
        lines.push(`| ${r.title} (${r.year}) · ${fmtDirs(r.stored.directors)} · ${r.stored.country || '—'} · ${r.stored.vote_count} votes | ${fmtDirs(b.directors)} · ${b.country || '—'} · ${b.vote_count} votes | ${r.flags.join(', ')} |`);
      });
    } else {
      lines.push('| Stored | Points at (tmdbId) | Note |', '|---|---|---|');
      rs.forEach((r) => {
        const b = r.tmdbById;
        lines.push(`| ${r.title} (${r.year}) · ${fmtDirs(r.stored.directors)} | ${b ? `${b.title} (${b.year}) · ${fmtDirs(b.directors)} · #${b.tmdbId}` : '—'} | ${r.note || ''} |`);
      });
    }
  };
  section('Wrong film — rematch to a different TMDB id', 'REMATCH');
  section('Right film, dropped data — refetch by same id', 'REFETCH_SAME_ID');
  section('Needs a human decision', 'MANUAL');
  return lines.join('\n');
};

// ============================================================================
// MAIN
// ============================================================================

const main = async () => {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const outDir = outIdx >= 0 ? args[outIdx + 1] : path.join(__dirname, 'reports');
  const limIdx = args.indexOf('--limit');
  const limit = limIdx >= 0 ? parseInt(args[limIdx + 1], 10) : 0;

  await mongoose.connect(process.env.MONGODB_URI);

  let films = await Movie.find({}).select('title year directors country vote_count tmdbId').lean();
  if (limit) films = films.slice(0, limit);
  console.log(`Verifying ${films.length} films against TMDB (read-only)…`);

  const limiter = createLimiter(4);
  let done = 0;
  const rows = await Promise.all(
    films.map((film) =>
      limiter(async () => {
        try {
          const row = await verifyFilm(film);
          done++;
          if (done % 50 === 0) console.log(`  ${done}/${films.length}`);
          return row;
        } catch (err) {
          done++;
          return {
            _id: film._id.toString(), title: film.title, year: film.year, tmdbId: film.tmdbId,
            stored: { directors: film.directors || [], country: film.country || null, vote_count: film.vote_count || 0 },
            expected: null, tmdbById: null, candidate: null,
            flags: ['ERROR'], action: 'MANUAL', note: `Error: ${err.message}`
          };
        }
      })
    )
  );

  rows.sort((a, b) => a.title.localeCompare(b.title));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'verify-report.json'), JSON.stringify(rows, null, 2));
  fs.writeFileSync(path.join(outDir, 'verify-report.md'), toMarkdown(rows));

  const flagged = rows.filter((r) => r.action !== 'OK');
  console.log(`\nDone. ${flagged.length} of ${rows.length} films flagged.`);
  console.log(`Report: ${path.join(outDir, 'verify-report.md')}`);
  await mongoose.connection.close();
};

main().catch(async (err) => {
  console.error(err);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
