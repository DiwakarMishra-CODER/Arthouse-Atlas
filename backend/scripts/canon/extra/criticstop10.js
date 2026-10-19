/**
 * CriticsTop10 (criticstop10.com) — annual aggregation of critics' year-end
 * top-ten lists, one "Best Movies of YYYY" page per year (1925–2025).
 *
 * Page layouts handled (a year uses the best one available):
 *   table  — TablePress ranking (R | TITLE/Film | L | #1 | AR | …), the full
 *            tally (40–100 films). 1925–1979 tables carry IMDb links, no #1.
 *            Directors come from the top-10 write-up blocks on the same page.
 *   blocks — "8. PORTRAIT OF A LADY ON FIRE / 226 LISTS | 24 TOP SPOTS /
 *            Céline Sciamma | 122 mins | …" write-ups (top 10 only).
 *   text   — older write-ups: "13. Blood Simple (14 lists; 1 top spot)".
 *            Only the legacy /best-of-YYYY/ pages (and the first 2006 page)
 *            use it; they are smaller, earlier tallies superseded by the
 *            /best-movies-of-YYYY/ pages, so they are a fallback only.
 *
 * Excluded: "-my-picks" (the site owner's personal list), "coming-soon"
 * stubs, "critics-lists-…" (lists critics, not films), TV pages.
 *
 * Usage: node scripts/canon/extra/criticstop10.js   (writes data/canon/criticstop10.json)
 */
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

export const SOURCE = {
  id: 'criticstop10',
  label: "CriticsTop10 — critics' year-end top-ten consensus",
  short: 'Critics’ year-end',
  url: 'https://criticstop10.com',
  family: 'year-end',
  kind: 'ranked-yearly'
};

const BASE = 'https://criticstop10.com';
const UA = 'ArthouseAtlas-canon-research/0.1 (personal non-commercial project; cinephile catalogue)';
const DELAY_MS = 1600;
const MAX_RANK = 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================================================
// FETCH (cached)
// ============================================================================
let lastFetch = 0;
const fetchCached = async (dir, file, url) => {
  const p = path.join(dir, file);
  if (fs.existsSync(p) && fs.statSync(p).size > 0) return fs.readFileSync(p, 'utf8');
  const wait = lastFetch + DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastFetch = Date.now();
  const res = await axios.get(url, {
    headers: { 'User-Agent': UA }, responseType: 'text', timeout: 60000, maxRedirects: 5,
    validateStatus: (s) => s < 500
  });
  if (res.status !== 200) { console.warn(`  ${res.status} ${url}`); return null; }
  fs.writeFileSync(p, res.data);
  return res.data;
};

const slugFile = (slug) => `${slug}.html`;

// Candidate aggregate pages per year, best first. /best-movies-of-YYYY(-2)/ are
// the current tallies; /best-of-YYYY/ the legacy ones.
const discoverPages = async (dir) => {
  const locs = [];
  for (const sm of ['page-sitemap.xml', 'post-sitemap.xml']) {
    const xml = await fetchCached(dir, sm, `${BASE}/${sm}`);
    if (xml) for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) locs.push(m[1].trim());
  }
  const byYear = new Map();
  for (const loc of locs) {
    const slug = loc.replace(BASE, '').replace(/^\/|\/$/g, '');
    if (/my-picks|coming-soon|critics-lists|tv-shows/.test(slug)) continue;
    const m = slug.match(/^best-(movies-)?of-(\d{4})(-\d+)?$/);
    if (!m) continue;
    const year = +m[2];
    // priority: best-movies-of-YYYY-N (later re-do) > best-movies-of-YYYY > best-of-YYYY
    const prio = m[1] ? (m[3] ? 0 : 1) : 2;
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push({ slug, url: loc, prio });
  }
  for (const list of byYear.values()) list.sort((a, b) => a.prio - b.prio);
  return [...byYear.entries()].sort((a, b) => a[0] - b[0]);
};

// ============================================================================
// TEXT HELPERS
// ============================================================================
const decode = (s = '') => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/&[lr]squo;|&#8217;|&#8216;/g, '’').replace(/&[lr]dquo;/g, '"')
  .replace(/&hellip;/g, '…').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—');

const stripTags = (s = '') => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const tidyTitle = (s) => s.replace(/’/g, "'").replace(/\s+/g, ' ').trim();

const entryContent = (html) => {
  const m = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>/);
  if (!m) return '';
  let t = html.slice(m.index);
  const end = t.search(/class="sharedaddy|<footer|id="comments"/);
  if (end > 0) t = t.slice(0, end);
  return t;
};

const contentLines = (content) => decode(
  content
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/<table[\s\S]*?<\/table>/g, '\n')
    .replace(/<br\s*\/?>|<\/(p|h\d|li|div|figcaption|tr)>/g, '\n')
    .replace(/<[^>]+>/g, '')
).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);

const SMALL = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'of', 'on', 'in', 'at', 'to', 'by',
  'from', 'with', 'as', 'vs', 'vs.', 'de', 'du', 'des', 'et']);
const ROMAN = /^(?=[MDCLXVI]+$)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
// "US"/"LA" deliberately absent: in titles they are usually "Us" (Peele) and "La".
const KEEP_UPPER = new Set(['USA', 'UK', 'TV', 'FBI', 'CIA', 'NYC', 'DJ', 'JFK', 'RRR', 'BPM', 'M*A*S*H', 'TÁR', 'WALL-E', 'E.T.', 'THX', 'A.I.', 'LBJ', 'UFO', 'RV', 'K-19', 'JLG/JLG', 'W.', 'HRS.', 'CODA']);
const KEEP_PAREN = new Set(['Youth (Spring)', 'Youth (Hard Times)', 'Youth (Homecoming)']);
const NOT_ROMAN = new Set(['MIX', 'DIX', 'LIV', 'DC', 'CC', 'MD', 'MC', 'DVD', 'MIDI']);

// ALL-CAPS → Title Case. Only applied to all-caps strings; mixed case is kept.
export const titleCase = (raw) => {
  const s = tidyTitle(raw);
  if (/[a-zà-ÿ]/.test(s)) return s;
  const words = s.split(' ');
  return words.map((w, i) => {
    const prev = words[i - 1] || '';
    const first = i === 0 || /[:\-–—!?.]$/.test(prev);
    const bare = w.replace(/^[("'“‘]+|[)"'”’,:;!?.]+$/g, '');
    if (KEEP_UPPER.has(bare) || (bare.length > 1 && ROMAN.test(bare) && !NOT_ROMAN.has(bare))) return w;
    const lower = w.toLowerCase();
    if (!first && SMALL.has(bare.toLowerCase())) return lower;
    // capitalise after leading punctuation and after hyphens / apostrophe-prefixes (O'Brien, McQueen left as Mcqueen)
    return lower.replace(/(^|[-("“‘/.])([\p{L}\d])/gu, (_, p, c) => p + c.toUpperCase())
      .replace(/(['’])([\p{L}])(?=[\p{L}]{2,})/gu, (m0, q, c, off, str) => (off === 1 && /^[oO]$/.test(str[0]) ? q + c.toUpperCase() : m0));
  }).join(' ');
};

const splitDirectors = (s) => s
  .split(/\s*&\s*|\s*,\s*|\s+and\s+/)
  .map((d) => d.replace(/^directed by\s+/i, '').trim())
  .filter((d) => d && !/^\d+\s*min/i.test(d));

const norm = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

// ============================================================================
// PARSERS
// ============================================================================
// TablePress table → [{rank,title,lists,topSpots,imdbId}]
const parseTable = (content) => {
  const tables = [...content.matchAll(/<table[^>]*tablepress[^>]*>([\s\S]*?)<\/table>/g)];
  for (const [, t] of tables) {
    const headRow = t.match(/<thead>([\s\S]*?)<\/thead>/);
    if (!headRow) continue;
    const heads = [...headRow[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((m) => stripTags(m[1]).toUpperCase());
    const iR = heads.findIndex((h) => h === 'R' || h === 'RANK');
    const iT = heads.findIndex((h) => h === 'TITLE' || h === 'FILM' || h === 'MOVIE');
    const iL = heads.indexOf('L');
    const i1 = heads.indexOf('#1');
    if (iR < 0 || iT < 0) continue;
    const body = t.slice(t.indexOf('</thead>'));
    const rows = [];
    for (const [, tr] of body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
      const rank = parseInt(stripTags(cells[iR] || ''), 10);
      let title = tidyTitle(stripTags(cells[iT] || ''));
      if (!rank || !title) continue;
      // early tables disambiguate remakes: "Camille (1927)", "Les Miserables (1925)"
      const yr = title.match(/\s*\((\d{4})\)$/);
      if (yr) title = title.slice(0, yr.index);
      // other qualifiers: "The Gold Rush (reissue)", director surnames "Carmen (Saura)",
      // "Dreams (Haugerud)". "Youth (Spring)" is the real title, so it stays.
      title = title.replace(/\s*\((reissue|re-release|restoration)\)$/i, '');
      const q = title.match(/^(.+?)\s*\(([A-ZÀ-Ý][\p{L}'’-]+)\)$/u);
      if (q && !KEEP_PAREN.has(title)) title = q[1];
      if (/\s/.test(title) && !/[a-z]/.test(title)) title = titleCase(title); // stray all-caps row
      const imdb = (cells[iT] || '').match(/imdb\.com\/title\/(tt\d+)/);
      const num = (i) => { const v = parseInt(stripTags(cells[i] || '').replace(/,/g, ''), 10); return Number.isFinite(v) ? v : null; };
      rows.push({ rank, title, filmYear: yr ? +yr[1] : null, lists: iL >= 0 ? num(iL) : null, topSpots: i1 >= 0 ? num(i1) : null, imdbId: imdb ? imdb[1] : null });
    }
    if (rows.length) return rows;
  }
  return [];
};

// "8. PORTRAIT OF A LADY ON FIRE" / "226 LISTS | 24 TOP SPOTS" / "Céline Sciamma | 122 mins | …"
const STATS = /^([\d,]+)\s+LISTS?\b(?:\s*[|•·,;-]\s*([\d,]+)\s+TOP\s+SPOTS?)?/i;
const parseBlocks = (lines) => {
  const out = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const h = lines[i].match(/^(\d{1,3})\s*[.)]\s+(.+)$/);
    if (!h) continue;
    const st = lines[i + 1].match(STATS);
    if (!st) continue;
    let directors = [];
    const meta = lines[i + 2] || '';
    if (/\|/.test(meta) && /\d+\s*min/i.test(meta)) directors = splitDirectors(meta.split('|')[0]);
    else if (/\|/.test(meta) && !/^“|^"/.test(meta)) directors = splitDirectors(meta.split('|')[0]);
    out.push({
      rank: +h[1], title: titleCase(h[2]), rawTitle: h[2],
      lists: +st[1].replace(/,/g, ''), topSpots: st[2] ? +st[2].replace(/,/g, '') : 0, directors
    });
  }
  return out;
};

// "13. Blood Simple (14 lists; 1 top spot)"
const parseText = (lines) => {
  const out = [];
  for (const l of lines) {
    const m = l.match(/^(\d{1,3})\s*\.\s+(.+?)\s*\(([\d,]+)\s+lists?(?:\s*[;,]\s*([\d,]+)\s+top\s+spots?)?\s*\)\s*$/i);
    if (m) out.push({ rank: +m[1], title: titleCase(m[2]), lists: +m[3].replace(/,/g, ''), topSpots: m[4] ? +m[4].replace(/,/g, '') : 0, directors: [] });
  }
  return out;
};

const parsePage = (html) => {
  const content = entryContent(html);
  if (!content) return { layout: null, rows: [] };
  const lines = contentLines(content);
  const table = parseTable(content);
  const blocks = parseBlocks(lines);
  if (table.length) {
    // enrich table rows with directors / full titles from the write-up blocks
    const used = new Set();
    for (const r of table) {
      const nt = norm(r.title);
      // by title first; else the write-up with the same rank when that rank is untied
      // (titles differ: "MASH" vs "M*A*S*H", "Animal House" vs "National Lampoon's …")
      const b = blocks.find((x, k) => !used.has(k) && norm(x.title) === nt)
        || blocks.find((x, k) => !used.has(k) && x.rank === r.rank && table.filter((y) => y.rank === r.rank).length === 1);
      if (!b) { r.directors = []; continue; }
      used.add(blocks.indexOf(b));
      r.directors = b.directors;
      // table titles are sometimes truncated ("Love is a Many"); prefer the longer write-up title
      if (norm(b.title).length > nt.length && norm(b.title).includes(nt)) r.title = b.title;
      if (r.topSpots == null && b.topSpots != null) r.topSpots = b.topSpots;
      if (r.lists == null) r.lists = b.lists;
    }
    return { layout: 'table', rows: table };
  }
  if (blocks.length) return { layout: 'blocks', rows: blocks };
  const text = parseText(lines);
  if (text.length) return { layout: 'text', rows: text };
  return { layout: null, rows: [] };
};

// ============================================================================
// COLLECT
// ============================================================================
export async function collect({ rawDir }) {
  const dir = path.join(rawDir, 'criticstop10');
  fs.mkdirSync(dir, { recursive: true });
  const years = await discoverPages(dir);
  const entries = [];
  const report = [];

  for (const [year, pages] of years) {
    let chosen = null;
    for (const pg of pages) {
      const html = await fetchCached(dir, slugFile(pg.slug), pg.url);
      if (!html) continue;
      const parsed = parsePage(html);
      if (!parsed.rows.length) continue;
      // a legacy text page only wins if nothing better exists for the year
      if (!chosen || (chosen.parsed.layout !== 'table' && parsed.layout === 'table')
        || (chosen.parsed.layout === 'text' && parsed.layout === 'blocks')) chosen = { pg, parsed };
      if (parsed.layout === 'table') break;
    }
    if (!chosen) { report.push({ year, layout: null, n: 0 }); continue; }

    const seen = new Set();
    const rows = chosen.parsed.rows
      .filter((r) => r.rank >= 1 && r.rank <= MAX_RANK)
      .sort((a, b) => a.rank - b.rank)
      .filter((r) => { const k = r.imdbId || norm(r.title); if (seen.has(k)) return false; seen.add(k); return true; });

    for (const r of rows) {
      entries.push({
        source: SOURCE.id,
        rank: r.rank,
        title: r.title,
        originalTitle: null,
        directors: r.directors || [],
        // the film's own year when the page states it (early remakes), else the list year
        year: r.filmYear || year,
        country: null,
        tmdbId: null,
        imdbId: r.imdbId || null,
        detail: `#${r.rank} of ${year}${r.lists != null ? ` · ${r.lists} critics' lists` : ''}`,
        lists: r.lists ?? null,
        topSpots: r.topSpots ?? null,
        listYear: year,
        yearTolerance: 1
      });
    }
    report.push({ year, layout: chosen.parsed.layout, slug: chosen.pg.slug, n: rows.length });
  }
  collect.report = report;
  return entries;
}

// ============================================================================
// CLI
// ============================================================================
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data/canon');
  const entries = await collect({ rawDir: path.join(DATA_DIR, 'raw') });
  fs.writeFileSync(path.join(DATA_DIR, 'criticstop10.json'), JSON.stringify(entries, null, 1));
  const byLayout = {};
  for (const r of collect.report) byLayout[r.layout || 'none'] = (byLayout[r.layout || 'none'] || 0) + r.n;
  const missing = collect.report.filter((r) => !r.n).map((r) => r.year);
  console.log(`criticstop10: ${entries.length} entries, ${collect.report.filter((r) => r.n).length} years`);
  console.log('per layout:', byLayout, missing.length ? `| no ranking: ${missing.join(', ')}` : '');
  for (const r of collect.report) console.log(`  ${r.year} ${r.layout || '-'} ${r.n} ${r.slug || ''}`);
}
