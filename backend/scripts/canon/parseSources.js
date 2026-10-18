/**
 * Parse raw canon source files into one normalized shape per entry:
 *
 *   { source, rank, title, originalTitle, directors[], year, country, tmdbId, imdbId, detail }
 *
 * Output: backend/data/canon/<source>.json (committed — these are the evidence
 * tables the provenance model is built from). Raw HTML stays out of git.
 *
 * Usage:  node scripts/canon/parseSources.js [--raw <dir>] [--out <dir>]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SOURCES, AWARDS } from './sources.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const argValue = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const RAW_DIR = argValue('--raw') || path.join(__dirname, '..', '..', 'data', 'canon', 'raw');
const OUT_DIR = argValue('--out') || path.join(__dirname, '..', '..', 'data', 'canon');

// ============================================================================
// HTML helpers — the pages are regular enough that regex beats a DOM dependency
// ============================================================================
const decode = (s = '') => s
  .replace(/<!--.*?-->/g, '')
  .replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&ndash;|&#8211;/g, '–').replace(/&mdash;/g, '—')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
// Parsoid embeds template JSON in data-mw attributes (with quotes that break a
// naive tag regex), so strip those attributes before stripping tags
const text = (html = '') => decode(
  html.replace(/\sdata-mw='[^']*'/g, '').replace(/\sdata-mw="[^"]*"/g, '')
    .replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<[^>]*>/g, ' ')
).replace(/\s+/g, ' ').trim();
const rows = (tableHtml) => tableHtml.match(/<tr[\s\S]*?<\/tr>/g) || [];
const cells = (rowHtml) => (rowHtml.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/g) || []).map(text);
const tables = (html) => html.match(/<table[\s\S]*?<\/table>/g) || [];
const toYear = (s) => { const m = String(s || '').match(/\b(1[89]\d\d|20\d\d)\b/); return m ? parseInt(m[1], 10) : null; };

// "Welles, Orson" → "Orson Welles"; "Dardenne, Jean-Pierre & Luc" left alone
const flipName = (s) => {
  const m = s.match(/^([^,]+),\s*([^,&]+)$/);
  return m ? `${m[2].trim()} ${m[1].trim()}` : s.trim();
};

const splitDirectors = (s) => s.split(/\s*(?:;|&| and |\/)\s*/).map((d) => d.trim()).filter(Boolean);

// ============================================================================
// PARSERS
// ============================================================================

// BFI results page: <article><a href="/film/..."><h1>Title</h1> ... rank <p> ... "YEAR  Country, Country" <p> ... "Directed by NAME"
const parseBFI = (html, source) => {
  const out = [];
  const articles = html.match(/<article[\s\S]*?<\/article>/g) || [];
  for (const a of articles) {
    const title = text((a.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '');
    if (!title) continue;
    const rankTxt = text((a.match(/Rank[^>]*>([\s\S]*?)<\/p>/) || [])[1] || '');
    const rank = parseInt(rankTxt.replace(/[^0-9]/g, ''), 10) || null;
    const ps = (a.match(/<p class="ResultsPage__P[^>]*>([\s\S]*?)<\/p>/g) || []).map(text);
    const yearLine = ps.find((p) => /^\d{4}/.test(p)) || '';
    const dirLine = ps.find((p) => /^Directed by/i.test(p)) || '';
    out.push({
      source, rank, title, originalTitle: null,
      directors: splitDirectors(dirLine.replace(/^Directed by\s*/i, '')),
      year: toYear(yearLine),
      country: yearLine.replace(/^\d{4}\s*/, '').trim() || null,
      tmdbId: null, imdbId: null,
      detail: rank ? `#${rank}` : null
    });
  }
  return out.filter((e) => e.rank).sort((a, b) => a.rank - b.rank);
};

// TSPDT table: Pos | prev | Title | "Surname, First" | Year | Country | Mins
const parseTSPDT = (html, source) => {
  const out = [];
  for (const r of rows(html)) {
    const c = cells(r);
    if (c.length < 6 || !/^\d+$/.test(c[0])) continue;
    out.push({
      source, rank: parseInt(c[0], 10), title: c[2], originalTitle: null,
      directors: splitDirectors(c[3]).map(flipName),
      year: toYear(c[4]), country: c[5] || null, tmdbId: null, imdbId: null,
      detail: `#${c[0]} (2025 edition)`
    });
  }
  return out;
};

// Cahiers: one table per decade; a `<th colspan="5">1951</th>` row opens each year,
// then rows: <th>rank.</th> | title | original title (or title cell has colspan=2) | director | country(rowspan)
const parseCahiers = (html, source) => {
  const out = [];
  let listYear = null;
  for (const r of rows(html)) {
    // Year header; from 2010 on it carries a footnote <sup> after the year
    const yearHead = r.match(/<th[^>]*colspan[^>]*>\s*((?:19|20)\d\d)\b/);
    if (yearHead) { listYear = parseInt(yearHead[1], 10); continue; }
    if (!listYear) continue;
    const rankTxt = text((r.match(/<th[^>]*>([\s\S]*?)<\/th>/) || [])[1] || '');
    if (!/^\d+\.?$/.test(rankTxt)) continue;
    const tds = r.match(/<td[^>]*>[\s\S]*?<\/td>/g) || [];
    if (tds.length < 2) continue;
    const titleSpansBoth = /colspan="2"/.test(tds[0]);
    const title = text(tds[0]);
    const originalTitle = titleSpansBoth ? null : (text(tds[1]) || null);
    const director = text(titleSpansBoth ? tds[1] : (tds[2] || ''));
    out.push({
      source, rank: parseInt(rankTxt, 10), title, originalTitle: originalTitle === title ? null : originalTitle,
      directors: splitDirectors(director), year: listYear, country: null, tmdbId: null, imdbId: null,
      // Cahiers ranks by release year in France, often a year after production
      detail: `#${parseInt(rankTxt, 10)} of ${listYear}`, yearTolerance: 2
    });
  }
  return out;
};

// Criterion (Wikipedia): table 0 single releases "Spine | Film | Year | Director | Country | Notes";
// tables 1–2 box sets "Spine | Set | Spine(film) | Film | Year | Director"; table 3 Eclipse series
const parseCriterion = (html, source) => {
  const out = [];
  const seen = new Set();
  const push = (spine, title, year, director, detail) => {
    if (!title || !/^\d{4}$/.test(String(year || ''))) return;
    const key = `${title.toLowerCase()}|${year}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ source, rank: null, title, originalTitle: null, directors: splitDirectors(director || ''), year: parseInt(year, 10), country: null, tmdbId: null, imdbId: null, detail });
  };
  const ts = tables(html);
  for (const [k, t] of ts.entries()) {
    const header = cells(rows(t)[0] || []).join('|').toLowerCase();
    for (const r of rows(t).slice(1)) {
      const c = cells(r);
      if (k === 0 || header.startsWith('spine|film')) {
        // Spine | Film | Year | Director | Country | Notes
        const spine = c[0]?.replace(/\D/g, '');
        if (!spine) continue;
        push(spine, c[1], c[2], c[3], `Spine #${spine}`);
      } else if (header.includes('included films')) {
        // Box sets: rows carry rowspans, so cell counts vary — find a 4-digit year and take the cell before it as title
        const yi = c.findIndex((x, i) => i > 0 && /^\d{4}$/.test(x));
        if (yi < 1) continue;
        const title = c[yi - 1];
        const director = c[yi + 1] || '';
        push(null, title, c[yi], director, header.includes('eclipse') ? 'Eclipse series' : 'Box set');
      }
    }
  }
  return out;
};

// Wikidata SPARQL JSON
const parseAwards = (json, source) => {
  const out = [];
  for (const b of json.results.bindings) {
    const qid = b.award.value.split('/').pop();
    const award = AWARDS[qid];
    if (!award) continue;
    out.push({
      source, rank: null,
      title: b.filmLabel.value, originalTitle: null,
      directors: (b.directors?.value || '').split('; ').filter(Boolean),
      year: b.year ? parseInt(b.year.value, 10) : null,
      country: null,
      tmdbId: b.tmdb ? parseInt(b.tmdb.value, 10) : null,
      imdbId: b.imdb?.value || null,
      detail: `${award.name} · ${award.festival}${b.year ? ' ' + b.year.value : ''}`,
      awardQid: qid, awardWeight: award.weight
    });
  }
  return out;
};

// ============================================================================
// MAIN
// ============================================================================
const main = () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const summary = [];
  for (const [id, src] of Object.entries(SOURCES)) {
    const rawPath = path.join(RAW_DIR, src.raw);
    if (!fs.existsSync(rawPath)) { console.warn(`– ${id}: raw file missing (${src.raw}), run fetchSources.js`); continue; }
    const raw = fs.readFileSync(rawPath, 'utf8');
    let entries;
    switch (id) {
      case 'ss2022-critics':
      case 'ss2022-directors': entries = parseBFI(raw, id); break;
      case 'tspdt-1000': entries = parseTSPDT(raw, id); break;
      case 'cahiers-top10': entries = parseCahiers(raw, id); break;
      case 'criterion': entries = parseCriterion(raw, id); break;
      case 'festival-awards': entries = parseAwards(JSON.parse(raw), id); break;
      default: continue;
    }
    fs.writeFileSync(path.join(OUT_DIR, `${id}.json`), JSON.stringify(entries, null, 1));
    const sample = entries.slice(0, 2).map((e) => `${e.title} (${e.year}) · ${e.directors.join(', ')}`).join(' | ');
    summary.push(`${id.padEnd(18)} ${String(entries.length).padStart(5)} entries   e.g. ${sample}`);
  }
  console.log(summary.join('\n'));
};

main();
