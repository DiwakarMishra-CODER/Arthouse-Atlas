/**
 * Build Provenance
 *
 * Joins the parsed canon sources (data/canon/*.json, resolved to TMDB ids by
 * resolveCanonTmdb.js) onto the catalogue and produces:
 *
 *   provenance-report.md  — per-film evidence; films with NO evidence (trim
 *                           candidates); evidence distribution; per-source hit rates
 *   canon-gaps.md         — canon films NOT in the catalogue, ranked by evidence
 *                           (the acquisition list for curation)
 *   provenance.json       — machine-readable version of both
 *
 * With --apply it writes provenance[], provenanceScore and provenanceCount to
 * each film. Without it, nothing is written.
 *
 * Scoring: each source has a base weight (sources.js). Ranked lists scale it by
 * position so #3 on Sight & Sound counts more than #240; Cahiers scales within
 * its year; festival prizes scale by prize tier; Criterion is flat membership.
 *
 * Usage:  node scripts/canon/buildProvenance.js [--apply] [--out <dir>]
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import Movie from '../../models/Movie.js';
import { normalizeName, namesMatch, surnamesMatch } from '../../services/nameUtils.js';
import { loadSources } from './registry.js';
import { strengthOf, scoreFilm } from './scoring.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const args = process.argv.slice(2);
const argValue = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const APPLY = args.includes('--apply');
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'canon');
const OUT_DIR = argValue('--out') || path.join(__dirname, '..', 'reports');

// ============================================================================
// MATCHING
// ============================================================================
const normTitle = (s = '') => normalizeName(s).replace(/^(the|a|an|le|la|les|il|lo|el|los|las|der|die|das|den|det|de|het)/, '');
const keyOf = (e) => `${normalizeName(e.title)}|${e.year || ''}|${normalizeName(e.directors?.[0] || '')}`;

const buildCatalogueIndex = (films) => {
  const byTmdb = new Map();
  const byTitle = new Map(); // normTitle -> [film]
  for (const f of films) {
    if (f.tmdbId) byTmdb.set(f.tmdbId, f);
    for (const t of [f.title, f.originalTitle, ...(f.altTitles || [])].filter(Boolean)) {
      const k = normTitle(t);
      if (!k) continue;
      if (!byTitle.has(k)) byTitle.set(k, []);
      if (!byTitle.get(k).includes(f)) byTitle.get(k).push(f);
    }
  }
  return { byTmdb, byTitle };
};

const matchEntry = (e, idx, cache) => {
  const tmdbId = e.tmdbId || cache[keyOf(e)]?.tmdbId || null;
  if (tmdbId && idx.byTmdb.has(tmdbId)) return { film: idx.byTmdb.get(tmdbId), tmdbId, via: 'tmdb' };
  // Fallback: title variant + year window + director surname. ±2 because lists
  // disagree on production vs. release year; with the director confirmed, the
  // same title two years apart is never a different film.
  const tol = Math.max(2, e.yearTolerance || 1);
  for (const t of [e.title, e.originalTitle].filter(Boolean)) {
    for (const f of idx.byTitle.get(normTitle(t)) || []) {
      const yearOk = !e.year || !f.year || Math.abs(f.year - e.year) <= tol;
      const dir = e.directors?.[0];
      const dirOk = !dir || !f.directors?.length || f.directors.some((d) => namesMatch(d, dir) || surnamesMatch(d, dir));
      if (yearOk && dirOk) return { film: f, tmdbId, via: 'title' };
    }
  }
  return { film: null, tmdbId, via: null };
};

// ============================================================================
// MAIN
// ============================================================================
// films whose standing we know, shown before/after in the report so the scoring can be judged by eye
const WATCH = ['Portrait of a Lady on Fire', 'Parasite', 'Breathless', 'Tokyo Story', 'Vertigo', 'In the Mood for Love',
  'Aftersun', 'Close-Up', 'Jeanne Dielman, 23 quai du Commerce, 1080 Bruxelles', 'Drive My Car', 'Mulholland Drive',
  'The Zone of Interest', 'Past Lives', 'Yi Yi', 'Pather Panchali', 'Burning', 'Petite Maman', 'Moonlight'];

const main = async () => {
  const SOURCES = await loadSources();
  const cache = fs.existsSync(path.join(DATA_DIR, 'tmdb-resolution.json'))
    ? JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'tmdb-resolution.json'), 'utf8')) : {};
  const entries = [];
  for (const id of Object.keys(SOURCES)) {
    const p = path.join(DATA_DIR, `${id}.json`);
    if (fs.existsSync(p)) entries.push(...JSON.parse(fs.readFileSync(p, 'utf8')));
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const films = await Movie.find({}).select('title originalTitle altTitles year directors tmdbId tier arthouseScore baseCanonScore vote_count movements country countries provenanceScore').lean();
  const idx = buildCatalogueIndex(films);

  // Per-film evidence
  const evidence = new Map(); // film._id -> [{source,label,detail,rank,weight}]
  const perSource = {};       // source -> { total, matched }
  const gaps = new Map();     // tmdbId or title-key -> { title, year, directors, tmdbId, entries[] }

  for (const e of entries) {
    const src = SOURCES[e.source];
    perSource[e.source] = perSource[e.source] || { total: 0, matched: 0 };
    perSource[e.source].total++;
    const { film, tmdbId } = matchEntry(e, idx, cache);
    const item = { source: e.source, label: src.short, family: src.family, detail: e.detail, rank: e.rank, weight: strengthOf(e, src), ...(e.url ? { url: e.url } : {}), ...(e.pollYear ? { pollYear: e.pollYear } : {}) };
    if (film) {
      perSource[e.source].matched++;
      const id = film._id.toString();
      if (!evidence.has(id)) evidence.set(id, []);
      // One entry per source per film (Criterion can list a film twice via box sets)
      if (!evidence.get(id).some((x) => x.source === e.source && x.detail === e.detail)) evidence.get(id).push(item);
    } else {
      const gk = tmdbId ? `t${tmdbId}` : `k${keyOf(e)}`;
      if (!gaps.has(gk)) gaps.set(gk, { title: cache[keyOf(e)]?.tmdbTitle || e.title, year: e.year, directors: e.directors, tmdbId, entries: [] });
      const g = gaps.get(gk);
      if (!g.entries.some((x) => x.source === e.source)) g.entries.push(item);
    }
  }

  // Score films: strongest citation first on each film
  const scored = films.map((f) => {
    const ev = (evidence.get(f._id.toString()) || []).sort((a, b) => b.weight - a.weight);
    const sources = new Set(ev.map((x) => x.source));
    const { raw, available, score, standing } = scoreFilm({ year: f.year, country: [f.country, ...(f.countries || [])].join(' ') }, ev.map((x) => ({ source: x.source, strength: x.weight, pollYear: x.pollYear })), SOURCES);
    return { film: f, ev, count: sources.size, raw, available, score, standing };
  });
  // the atlas's own order: rank 1 is the film with the strongest standing
  [...scored].sort((a, b) => b.score - a.score).forEach((s, i) => { s.rank = s.count ? i + 1 : null; });
  // and within its decade, which is fairer to films that haven't had time to be canonised
  const byDecade = {};
  scored.filter((s) => s.count && s.film.year).forEach((s) => { (byDecade[Math.floor(s.film.year / 10) * 10] ||= []).push(s); });
  Object.values(byDecade).forEach((xs) => xs.sort((a, b) => b.standing - a.standing).forEach((s, i, all) => { s.decadeRank = i + 1; s.decadeOf = all.length; }));
  const prevRank = new Map([...films].sort((a, b) => (b.provenanceScore || 0) - (a.provenanceScore || 0)).map((f, i) => [f._id.toString(), i + 1]));

  // Gap list
  const gapList = [...gaps.values()].map((g) => ({
    ...g,
    count: g.entries.length,
    score: scoreFilm({ year: g.year }, g.entries.map((x) => ({ source: x.source, strength: x.weight })), SOURCES).score
  })).sort((a, b) => b.score - a.score || b.count - a.count);

  // ---------------------------------------------------------------------------
  // REPORTS
  // ---------------------------------------------------------------------------
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const dist = {};
  scored.forEach((s) => { dist[s.count] = (dist[s.count] || 0) + 1; });
  const zero = scored.filter((s) => s.count === 0).sort((a, b) => (a.film.arthouseScore || 0) - (b.film.arthouseScore || 0));
  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, 40);
  const fmtEv = (ev) => ev.map((x) => `${x.label} ${x.detail || ''}`.trim()).join(' · ');

  const L = [];
  L.push(`# Provenance report — ${new Date().toISOString().slice(0, 10)}`, '');
  L.push(`Catalogue: **${films.length}** films · canon entries: **${entries.length}** across ${Object.keys(perSource).length} sources`, '');
  L.push('## Evidence per film', '', '| Sources citing the film | Films |', '|---|---|');
  Object.keys(dist).sort((a, b) => b - a).forEach((k) => L.push(`| ${k} | ${dist[k]} |`));
  L.push('', '## Per-source hit rate (how much of each list we already hold)', '', '| Source | Entries | In catalogue | Rate |', '|---|---|---|---|');
  Object.entries(perSource).forEach(([k, v]) => L.push(`| ${SOURCES[k].label} | ${v.total} | ${v.matched} | ${((100 * v.matched) / v.total).toFixed(0)}% |`));
  L.push('', `## Films with NO canon evidence (${zero.length}) — keep only with a curator's note`, '', '| Film | Director | Country | arthouse | canon | tier | votes | movements |', '|---|---|---|---|---|---|---|---|');
  zero.forEach(({ film: f }) => L.push(`| ${f.title} (${f.year}) | ${(f.directors || []).join(', ')} | ${f.country || '—'} | ${f.arthouseScore} | ${f.baseCanonScore} | ${f.tier} | ${f.vote_count} | ${(f.movements || []).join(', ') || '—'} |`));
  L.push('', '## Before / after — films we know', '', '| Film | Old rank | New rank | In its decade | Score | Strongest citation | Sources |', '|---|---|---|---|---|---|---|');
  WATCH.forEach((t) => {
    const s = scored.find((x) => x.film.title === t);
    if (!s) return L.push(`| ${t} | — | not in catalogue | | | | |`);
    L.push(`| ${t} (${s.film.year}) | ${prevRank.get(s.film._id.toString())} | ${s.rank ?? '—'} | ${s.decadeRank ? `${s.decadeRank} of ${s.decadeOf}` : '—'} | ${s.score} | ${s.ev[0] ? `${s.ev[0].label} ${s.ev[0].detail || ''}` : '—'} | ${s.count} |`);
  });
  L.push('', '## Strongest evidence (top 40)', '', '| Film | Score | Sources | Evidence |', '|---|---|---|---|');
  top.forEach(({ film: f, ev, count, score }) => L.push(`| ${f.title} (${f.year}) | ${score} | ${count} | ${fmtEv(ev)} |`));
  fs.writeFileSync(path.join(OUT_DIR, 'provenance-report.md'), L.join('\n'));

  const G = [];
  const resolvedGaps = gapList.filter((g) => g.tmdbId);
  const unresolvedGaps = gapList.filter((g) => !g.tmdbId);
  G.push(`# Canon gaps — films with evidence that are NOT in the catalogue — ${new Date().toISOString().slice(0, 10)}`, '');
  G.push(`${gapList.length} films · ${resolvedGaps.length} resolved to TMDB ids (seedable) · ${unresolvedGaps.length} unresolved`, '');
  const gapDist = {};
  gapList.forEach((g) => { gapDist[g.count] = (gapDist[g.count] || 0) + 1; });
  G.push('| Sources | Films |', '|---|---|');
  Object.keys(gapDist).sort((a, b) => b - a).forEach((k) => G.push(`| ${k} | ${gapDist[k]} |`));
  G.push('', '## Ranked by evidence (≥2 sources first)', '', '| # | Film | Director | Score | Sources | Evidence | TMDB |', '|---|---|---|---|---|---|---|');
  gapList.slice(0, 400).forEach((g, i) => G.push(`| ${i + 1} | ${g.title} (${g.year || '?'}) | ${(g.directors || []).join(', ')} | ${g.score} | ${g.count} | ${fmtEv(g.entries)} | ${g.tmdbId ? '#' + g.tmdbId : '—'} |`));
  fs.writeFileSync(path.join(OUT_DIR, 'canon-gaps.md'), G.join('\n'));

  fs.writeFileSync(path.join(OUT_DIR, 'provenance.json'), JSON.stringify({
    films: scored.map((s) => ({ _id: s.film._id, title: s.film.title, year: s.film.year, tmdbId: s.film.tmdbId, count: s.count, raw: s.raw, available: s.available, score: s.score, rank: s.rank, provenance: s.ev })),
    gaps: gapList,
    perSource
  }, null, 1));

  // ---------------------------------------------------------------------------
  // APPLY
  // ---------------------------------------------------------------------------
  if (APPLY) {
    let n = 0;
    for (const s of scored) {
      await Movie.updateOne({ _id: s.film._id }, { $set: { provenance: s.ev, provenanceScore: s.score, provenanceCount: s.count, canonRank: s.rank, canonDecadeRank: s.decadeRank ?? null } });
      n++;
    }
    console.log(`Applied provenance to ${n} films.`);
  }

  console.log(`${films.length} films · ${entries.length} canon entries`);
  console.log('evidence distribution (sources → films):', dist);
  console.log(`films with no evidence: ${zero.length}`);
  console.log(`canon gaps: ${gapList.length} (${resolvedGaps.length} seedable) · with ≥2 sources: ${gapList.filter((g) => g.count >= 2).length}`);
  console.log(`reports → ${path.relative(process.cwd(), OUT_DIR)}/provenance-report.md, canon-gaps.md${APPLY ? '' : '  (nothing written to DB)'}`);
  await mongoose.connection.close();
};

main().catch(async (err) => { console.error(err); await mongoose.connection.close().catch(() => {}); process.exit(1); });
