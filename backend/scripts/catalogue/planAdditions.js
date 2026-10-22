/**
 * Which missing films to add to the atlas: a plan for the owner to review. Changes nothing.
 *
 * The rule: every film cited by two or more of the 20 sources that the canon would rank in its
 * top 500 if it were added (its score at least the 500th ranked film's). Each candidate is then
 * checked against TMDB, because a list entry can resolve to the wrong record:
 *   - a short or an extra (WALL·E resolved to "WALL·E's Treasures & Trinkets")
 *   - a different year or a different director than the list gives
 *   - a second record of a film the atlas already has
 * A flagged match is looked up again by title, year and director, and the right record proposed.
 *
 * Mainstream films are flagged (widely known on TMDB, or part of a franchise) and marked by hand
 * in MARKS below: keep, cut or the owner's call. The line the atlas already keeps: a director's
 * own film that critics canonised, even a hit (The Godfather, The Shining), but not studio spectacle.
 *
 * Usage:
 *   node scripts/canon/buildProvenance.js --out <dir>     (dry run: writes <dir>/provenance.json)
 *   node scripts/catalogue/planAdditions.js --from <dir>/provenance.json
 * Writes scripts/reports/catalogue-additions.md (the review) and catalogue-additions-plan.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { tmdbGet, createLimiter, normalizeName, namesMatch, surnamesMatch } from '../lib/tmdbResolve.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; };
const FROM = arg('--from');
if (!FROM) { console.error('Usage: node scripts/catalogue/planAdditions.js --from <provenance.json>'); process.exit(1); }
const REPORTS = path.join(__dirname, '..', 'reports');
const CACHE = path.join(REPORTS, 'catalogue-tmdb-plan.json'); // TMDB answers, kept between runs (gitignored)

const TOP = 500;
const FAMOUS = 6000; // TMDB votes: about as known as the atlas's best-known 40
const SHORT = 45; // minutes

// Checked by hand: the right film despite a flag (released years after it was made, a short, a
// director credited another way), the right record where the match was wrong or missing, and
// entries that aren't a new film
const VERIFIED = new Set([86282, 12573, 91, 88609]); // West of the Tracks, A Serious Man, Land Without Bread, Listen to Britain
const RIGHT_RECORD = { 'WALL·E\'s Treasures & Trinkets': 10681, 'Partie de campagne': 43878 };
const NOT_NEW = {
  'Out 1: Spectre': 'the atlas has Out 1, its full version',
  'Twin Peaks: The Return': 'a television season: added whole by catalogue/addSeries.js',
  'Histoire(s) du Cinèma': 'a video series in eight parts; its first part is listed separately'
};

// Hand marks for the flagged films, by TMDB id: [mark, why]. keep | cut | ask
const SPECTACLE = 'studio spectacle, not a director\'s own film';
const FRANCHISE = 'a franchise blockbuster';
const FAVOURITE = 'a popular favourite more than a critics\' film';
const PIXAR = 'Pixar: studio animation, made by a house more than a director';
const DISNEY = 'Disney\'s studio animation: important, but a house style';
const MARKS = {
  27205: ['cut', SPECTACLE], 155: ['cut', FRANCHISE], 550: ['cut', FAVOURITE], 278: ['cut', FAVOURITE],
  680: ['keep'], 13: ['cut', FAVOURITE], 603: ['cut', FRANCHISE], 120: ['cut', FRANCHISE],
  106646: ['keep'], 16869: ['keep'], 76341: ['keep'], 150540: ['ask', PIXAR], 807: ['cut', FAVOURITE],
  11: ['cut', FRANCHISE], 105: ['cut', FRANCHISE], 14160: ['ask', PIXAR], 862: ['ask', PIXAR], 10681: ['ask', PIXAR],
  329865: ['cut', FAVOURITE], 419430: ['keep'], 2062: ['ask', PIXAR], 1891: ['cut', FRANCHISE], 274: ['keep'],
  329: ['cut', FRANCHISE], 424: ['keep'], 857: ['cut', SPECTACLE], 348: ['ask', 'a studio horror classic: Ridley Scott\'s design, but a franchise\'s first film'],
  38: ['keep'], 1422: ['cut', FAVOURITE], 49047: ['cut', SPECTACLE], 500: ['keep'], 78: ['keep'], 466272: ['keep'],
  280: ['cut', FRANCHISE], 769: ['keep'], 240: ['keep'], 162: ['cut', FAVOURITE], 85: ['cut', FRANCHISE],
  37799: ['keep'], 399055: ['keep'], 194: ['keep'], 872585: ['ask', 'Nolan\'s own film, but a blockbuster; his Inception and The Dark Knight are cut'],
  601: ['cut', SPECTACLE], 76203: ['keep'], 1949: ['keep'], 578: ['cut', SPECTACLE], 510: ['keep'], 641: ['keep'],
  679: ['cut', FRANCHISE], 627: ['keep'], 389: ['keep'], 429: ['keep'], 137: ['cut', FAVOURITE], 314365: ['cut', FAVOURITE],
  1366: ['cut', FRANCHISE], 9552: ['keep'], 949: ['keep'], 545611: ['keep'], 1091: ['cut', FAVOURITE],
  408: ['ask', DISNEY], 380: ['cut', FAVOURITE], 242: ['cut', 'the lists cite it least of the three; the atlas has Part I, and Part II is added'],
  644: ['keep'], 524: ['keep'], 12162: ['keep'], 10895: ['ask', DISNEY], 630: ['ask', 'a studio musical for families, though a landmark of colour and fantasy'],
  289: ['keep'], 311: ['keep'], 496: ['cut', FAVOURITE], 60308: ['cut', FAVOURITE], 5548: ['cut', FAVOURITE],
  8810: ['cut', FRANCHISE], 146: ['keep'], 1051: ['keep'], 11031: ['keep'], 229: ['keep'], 990: ['keep'], 5998: ['keep'],
  51110: ['ask', 'one episode of Kieślowski\'s Dekalog, a television series of ten films; the atlas has none of it yet'],
  677: ['ask', 'Riefenstahl\'s Olympia: canonised for its form, made for the Nazi state; decide it with Triumph of the Will'],
  19136: ['keep'], 116393: ['ask', 'the first of eight parts of Godard\'s video series Histoire(s) du cinéma'],
  // mainstream, though not as widely voted on TMDB
  770: ['ask', 'a producer\'s epic (Selznick\'s) more than a director\'s film, and a landmark of the studio era'],
  11360: ['ask', DISNEY], 10907: ['cut', 'a studio adventure, not a director\'s own film'], 840: ['cut', SPECTACLE],
  1089: ['cut', FAVOURITE], 9576: ['cut', 'a mainstream studio comedy'], 639: ['cut', 'a mainstream studio comedy'],
  2493: ['cut', 'a mainstream studio comedy'], 9603: ['cut', 'a mainstream studio comedy'], 55721: ['cut', 'a mainstream studio comedy'],
  967: ['cut', 'Kubrick\'s studio job: he didn\'t control it and disowned it'],
  39266: ['ask', 'Riefenstahl\'s Triumph of the Will: canonised for its form, made as Nazi propaganda']
};
// The owner's calls (2026-10-22): every question answered no, Tarantino kept to Pulp Fiction, and
// Dekalog added whole (catalogue/addSeries.js) instead of one episode
for (const [id, [mark, why]] of Object.entries(MARKS)) if (mark === 'ask') MARKS[id] = ['cut', `${why} (the owner's call)`];
const TARANTINO = 'the owner\'s call: Pulp Fiction stands for Tarantino';
Object.assign(MARKS, { 16869: ['cut', TARANTINO], 466272: ['cut', TARANTINO], 500: ['cut', TARANTINO], 51110: ['cut', 'added as the whole series, Dekalog (catalogue/addSeries.js)'] });

const split = (names = []) => names.flatMap((n) => String(n).split(/\s*(?:,|&|\band\b)\s*/)).map((n) => n.trim()).filter(Boolean);
const sameDirector = (a = [], b = []) => a.some((x) => b.some((y) => namesMatch(x, y) || surnamesMatch(x, y)));
const yearOf = (d) => (d ? Number(String(d).slice(0, 4)) : null);

const { films, gaps } = JSON.parse(fs.readFileSync(FROM, 'utf8'));
const ranked = films.filter((f) => f.rank).map((f) => f.score).sort((a, b) => b - a);
const bar = ranked[TOP - 1];
const candidates = gaps.filter((g) => g.count >= 2 && g.score >= bar);
const inAtlas = films.map((f) => ({ key: normalizeName(f.title), year: f.year, title: f.title, tmdbId: f.tmdbId }));
const atlasIds = new Set(films.map((f) => f.tmdbId).filter(Boolean));

const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const limit = createLimiter(6);
const details = async (id) => {
  if (!cache[id]) {
    const m = await tmdbGet(`/movie/${id}`, { append_to_response: 'credits' });
    cache[id] = m && {
      id: m.id, title: m.title, originalTitle: m.original_title, year: yearOf(m.release_date), runtime: m.runtime || null,
      votes: m.vote_count || 0, collection: m.belongs_to_collection?.name || null, genres: (m.genres || []).map((g) => g.name),
      countries: (m.production_countries || []).map((c) => c.name), language: m.original_language,
      directors: (m.credits?.crew || []).filter((c) => c.job === 'Director').map((c) => c.name)
    };
  }
  return cache[id];
};
// the right record for a list entry: same title and year (±1), and the list's director when it names one
const lookAgain = async (g, directors) => {
  const found = await tmdbGet('/search/movie', { query: g.title, ...(g.year ? { year: g.year } : {}) });
  for (const r of (found?.results || []).slice(0, 6)) {
    const m = await details(r.id);
    if (!m || (m.runtime && m.runtime < SHORT)) continue;
    if (g.year && m.year && Math.abs(m.year - g.year) > 1) continue;
    if (directors.length && !sameDirector(directors, m.directors)) continue;
    return m;
  }
  return null;
};

const plan = await Promise.all(candidates.map((g) => limit(async () => {
  const directors = split(g.directors);
  if (NOT_NEW[g.title]) return { title: g.title, listTitle: g.title, year: g.year, directors, tmdbId: null, listTmdbId: g.tmdbId || null, score: g.score, count: g.count, lists: [], problems: [NOT_NEW[g.title]], fixed: false, twin: null, flags: [], mark: null, votes: 0, runtime: null };
  const corrected = RIGHT_RECORD[g.title];
  const m = await details(corrected || g.tmdbId) || null;
  const problems = [];
  if (!m) problems.push('not on TMDB');
  else if (!corrected && !VERIFIED.has(m.id)) {
    if (m.runtime && m.runtime < SHORT) problems.push(`${m.runtime} minutes: a short or an extra`);
    if (g.year && m.year && Math.abs(m.year - g.year) > 1) problems.push(`TMDB says ${m.year}, the lists ${g.year}`);
    if (directors.length && m.directors.length && !sameDirector(directors, m.directors)) problems.push(`TMDB says ${m.directors.join(', ')}`);
  }
  let fixed = corrected ? m : null;
  if (problems.length) fixed = await lookAgain(g, directors);
  const film = fixed || (problems.length ? null : m);
  const twin = film && (atlasIds.has(film.id) ? inAtlas.find((a) => a.tmdbId === film.id)
    : inAtlas.find((a) => a.key === normalizeName(film.title) && Math.abs((a.year || 0) - (film.year || 0)) <= 1));
  const flags = [];
  if (film?.votes >= FAMOUS) flags.push(`${film.votes.toLocaleString('en')} TMDB votes`);
  if (film?.collection) flags.push(film.collection);
  return {
    title: film?.title || g.title, listTitle: g.title, year: film?.year || g.year, directors: film?.directors?.length ? film.directors : directors,
    tmdbId: film?.id || null, listTmdbId: g.tmdbId || null, score: g.score, count: g.count,
    lists: g.entries.map((e) => `${e.label}${e.detail ? ` ${e.detail}` : ''}`),
    problems, fixed: Boolean(fixed), twin: twin ? `${twin.title} (${twin.year})` : null,
    flags, mark: film && MARKS[film.id] ? MARKS[film.id] : null, votes: film?.votes || 0, runtime: film?.runtime || null
  };
})));
fs.writeFileSync(CACHE, JSON.stringify(cache));

// where each would stand: its place among the atlas's ranked films and the other candidates
plan.sort((a, b) => b.score - a.score);
plan.forEach((p) => { p.wouldRank = ranked.filter((s) => s > p.score).length + plan.filter((q) => q.score > p.score).length + 1; });

const drop = plan.filter((p) => !p.tmdbId || p.twin);
const cut = plan.filter((p) => !drop.includes(p) && p.mark?.[0] === 'cut');
const ask = plan.filter((p) => !drop.includes(p) && p.mark?.[0] === 'ask');
const unmarked = plan.filter((p) => !drop.includes(p) && p.flags.length && !p.mark);
const add = plan.filter((p) => !drop.includes(p) && p.mark?.[0] !== 'cut');
fs.writeFileSync(path.join(REPORTS, 'catalogue-additions-plan.json'), JSON.stringify({ bar, plan }, null, 1));

const line = (p) => `| ${p.title} (${p.year}) | ${p.directors.join(', ')} | ${p.wouldRank} | ${p.count} | ${p.lists.slice(0, 3).join(' · ')}${p.lists.length > 3 ? ' …' : ''} |`;
const head = '| Film | Directed by | Would rank | Lists | Cited by |\n|---|---|---|---|---|';
const decade = (p) => Math.floor(p.year / 10) * 10;
const R = [
  `# Films to add — ${new Date().toISOString().slice(0, 10)}`, '',
  `**The rule:** cited by 2 or more of the 20 sources, and the canon would rank it in its top ${TOP} if it were added (score ${bar} or more). That's ${plan.length} films.`, '',
  `**After review:** ${add.length} to add${ask.length ? ` (including ${ask.length} for you to decide)` : ''}, ${cut.length} cut, ${drop.length} dropped as not a new film. The atlas would hold ${films.length + add.length - ask.length}${ask.length ? `–${films.length + add.length}` : ''} films.`, '',
  `Two more works the lists count as films, which TMDB keeps as television, were added whole by catalogue/addSeries.js: Kieślowski's Dekalog (in place of its fourth episode, listed here) and Lynch's Twin Peaks: The Return. With them the atlas holds ${films.length + add.length + 2} films.`, '',
  `"Would rank" is its place in the canon if every film here were added. Ranks shift a little for everyone once they are.`, '',
];
if (unmarked.length) R.push(`## Flagged, not yet marked (${unmarked.length})`, '', '| Film | Directed by | Would rank | Lists | Cited by | Flagged for |\n|---|---|---|---|---|---|', ...unmarked.map((p) => `${line(p)} ${p.flags.join('; ')} |`), '');
if (ask.length) R.push(`## Your call (${ask.length})`, '', '| Film | Directed by | Would rank | Lists | Why it\'s a question |', '|---|---|---|---|---|', ...ask.map((p) => `| ${p.title} (${p.year}) | ${p.directors.join(', ')} | ${p.wouldRank} | ${p.count} | ${p.mark[1]} |`), '');
if (cut.length) R.push(`## Cut: studio spectacle, not a director's own film (${cut.length})`, '', '| Film | Directed by | Would rank | Why |', '|---|---|---|---|', ...cut.map((p) => `| ${p.title} (${p.year}) | ${p.directors.join(', ')} | ${p.wouldRank} | ${p.mark[1]} |`), '');
const fixedOnes = plan.filter((p) => p.fixed);
if (fixedOnes.length) R.push(`## Wrong TMDB match, corrected (${fixedOnes.length})`, '', '| Listed as | Was matched to | Now |', '|---|---|---|', ...fixedOnes.map((p) => `| ${p.listTitle} | ${p.listTmdbId ? `#${p.listTmdbId}` : 'nothing'}${p.problems.length ? `: ${p.problems.join('; ')}` : ''} | ${p.title} (${p.year}), #${p.tmdbId} |`), '');
if (drop.length) R.push(`## Dropped (${drop.length})`, '', '| Listed as | Why |', '|---|---|', ...drop.map((p) => `| ${p.listTitle} (${p.year}) | ${p.twin ? `already in the atlas as ${p.twin}` : p.problems.join('; ') || 'no TMDB record'} |`), '');
R.push(`## To add, by decade (${add.length})`, '');
for (const d of [...new Set(add.map(decade))].sort()) {
  const xs = add.filter((p) => decade(p) === d);
  R.push(`### ${d}s (${xs.length})`, '', head, ...xs.map(line), '');
}
fs.writeFileSync(path.join(REPORTS, 'catalogue-additions.md'), R.join('\n'));

console.log(`bar: score ${bar} (the ${TOP}th ranked film) · candidates ${plan.length}`);
console.log(`wrong matches corrected ${fixedOnes.length} · dropped ${drop.length} · flagged mainstream ${plan.filter((p) => p.flags.length).length} (unmarked ${unmarked.length}) · cut ${cut.length} · ask ${ask.length} · add ${add.length}`);
console.log(`report → ${path.relative(process.cwd(), path.join(REPORTS, 'catalogue-additions.md'))}`);
