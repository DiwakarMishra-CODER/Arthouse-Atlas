/**
 * Jonathan Rosenbaum — "1000 Favorites (A Personal Canon)", the appendix to
 * Essential Cinema (2004), as republished in three parts on his own site
 * (jonathanrosenbaum.net, January 2024). Unranked; grouped by year.
 * Titles preceded by "*" are his hundred favourites (except *Corpus Callosum,
 * per his own note) — kept as `top100` in the detail text.
 *
 * Usage: node scripts/canon/extra/rosenbaum-1000.js [--raw <dir>]
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

export const SOURCE = {
  id: 'rosenbaum-1000',
  label: "Jonathan Rosenbaum's 1000 Essential Films",
  short: 'Rosenbaum 1000',
  url: 'https://jonathanrosenbaum.net/2024/01/1000-favorites-a-personal-canon/',
  family: 'all-time-poll',
  kind: 'membership',
  size: 1000,
  eligible: { from: 1895, to: 2003 }
};

const PAGES = [
  'https://jonathanrosenbaum.net/2024/01/1000-favorites-a-personal-canon/',
  'https://jonathanrosenbaum.net/2024/01/1000-favorites-a-personal-canon-part-two/',
  'https://jonathanrosenbaum.net/2024/01/45251/' // part three (WordPress gave it a numeric slug)
];

// ---- polite fetching (robots-aware, cached) --------------------------------
const UA = 'ArthouseAtlas-canon-research/0.1 (personal non-commercial project; cinephile catalogue)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastHit = 0;
const robotsCache = new Map();

const politeGet = async (url, opts = {}) => {
  const wait = lastHit + 1600 - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit = Date.now();
  return axios.get(url, { headers: { 'User-Agent': UA }, responseType: 'text', timeout: 60000, maxRedirects: 5, ...opts });
};

const robotsRules = async (origin) => {
  if (robotsCache.has(origin)) return robotsCache.get(origin);
  let rules = [];
  try {
    const res = await politeGet(`${origin}/robots.txt`, { validateStatus: () => true });
    if (res.status >= 200 && res.status < 300) {
      let applies = false; let inAgents = false;
      for (const raw of String(res.data).split(/\r?\n/)) {
        const line = raw.replace(/#.*/, '').trim();
        const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
        if (!m) continue;
        const key = m[1].toLowerCase(); const val = m[2].trim();
        if (key === 'user-agent') { if (!inAgents) applies = false; inAgents = true; if (val === '*') applies = true; continue; }
        inAgents = false;
        if (applies && (key === 'allow' || key === 'disallow') && val) rules.push({ allow: key === 'allow', path: val });
      }
    } else if (res.status === 401 || res.status === 403) {
      rules = [{ allow: false, path: '/' }];
    }
  } catch { /* unreachable robots.txt → treat as no rules */ }
  robotsCache.set(origin, rules);
  return rules;
};

const allowedByRobots = async (url) => {
  const u = new URL(url);
  const target = u.pathname + u.search;
  let best = null;
  for (const r of await robotsRules(u.origin)) {
    const re = new RegExp('^' + r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    if (re.test(target) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  }
  return !best || best.allow;
};

const cachedFetch = async (url, file) => {
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  if (!(await allowedByRobots(url))) throw new Error(`robots.txt disallows ${url}`);
  const res = await politeGet(url);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, res.data);
  return res.data;
};

// ---- parsing ----------------------------------------------------------------
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#039;|&apos;/g, "'");

// Trailing commentary references, e.g. "(MAP, EC, JRN)" — see his abbreviation key
// (G = his BFI Greed book; JNR/CRN are typos on the page).
const ABBR = /\s*\(+\s*(?:[A-Z]{1,6}\s*[,.]?\s*)+\)\s*$/;
// lowercase, 3+ words — keeps directors like "(de Oliveira)", "(van Sant)"
const NOTE = /\s*\([a-z][^(),\s]*(?:\s+[^(),\s]+){2,}\)\s*$/; // "(filmed in 1950 with Charlie Parker; …)"
const isAbbr = (p) => /^[A-Z]{1,6}$/.test(p.trim());
// "(original cut, Demme)", "(230-minute version, Yang)" — version notes, not alternate titles
const VERSION_NOTE = /\b(cut|version|fragment)\b/i;
// co-directors written "Name, Name" (where the first part would otherwise read as an alt title)
const NAME_PAIRS = new Set(['Kevin Brownlow']);

const parseLine = (line, year, yearEnd) => {
  let s = line.trim();
  const top100 = s.startsWith('*');
  s = s.replace(/^\*\s*/, '');
  while (ABBR.test(s) || NOTE.test(s)) s = s.replace(ABBR, '').replace(NOTE, '').trim();
  s = s.replace(/\(\d{4}\)\s*(?=\()/, ''); // "Bigger Than Life (1956)(Ray)"
  const opens = (s.match(/\(/g) || []).length; const closes = (s.match(/\)/g) || []).length;
  if (opens > closes) s += ')'.repeat(opens - closes); // "(Longinotto/Mir-Hosseini (CR, …)"
  // last balanced parenthetical = director group (may carry abbreviations: "(Stroheim, GCHC, JRN)")
  let open = -1;
  if (s.endsWith(')')) {
    let depth = 0;
    for (let i = s.length - 1; i >= 0; i--) {
      if (s[i] === ')') depth++;
      else if (s[i] === '(') { depth--; if (depth === 0) { open = i; break; } }
    }
  }
  if (open === 0) return null;
  const title = (open > 0 ? s.slice(0, open) : s).trim().replace(/,\s*$/, '');
  let group = open > 0 ? s.slice(open + 1, -1).split(',').filter((p) => !isAbbr(p)).join(',').trim() : '';
  let alt = null;
  const comma = group.lastIndexOf(',');
  let directors = [];
  if (comma > 0) {
    alt = group.slice(0, comma).trim(); group = group.slice(comma + 1).trim();
    if (NAME_PAIRS.has(alt)) { directors.push(alt); alt = null; }
    else if (VERSION_NOTE.test(alt)) alt = null;
  }
  const sib = group.match(/^(\S+) (?:and|&) (\S+) (\S+)$/); // "Luc & Jean-Pierre Dardenne"
  directors.push(...(sib ? [`${sib[1]} ${sib[3]}`, `${sib[2]} ${sib[3]}`]
    : group.split(/\s*\/\s*|\s+&\s+|\s+and\s+/).map((d) => d.trim()).filter(Boolean)));
  if (!title) return null;
  const entry = {
    source: SOURCE.id,
    rank: null,
    title: alt || title,
    originalTitle: alt ? title : null,
    directors,
    year,
    country: null,
    tmdbId: null,
    imdbId: null,
    detail: top100
      ? "One of Rosenbaum's 100 favourites in his 1000 Essential Films (Essential Cinema, 2004)"
      : "Rosenbaum's 1000 Essential Films (Essential Cinema, 2004)"
  };
  if (yearEnd && yearEnd > year) entry.yearTolerance = yearEnd - year + 1;
  return entry;
};

const parsePage = (html) => {
  const start = html.indexOf('entry-content');
  const end = html.indexOf('entry-utility', start);
  const body = html.slice(start, end > 0 ? end : undefined);
  const paras = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => decode(m[1].replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '')));
  const out = [];
  let year = null; let yearEnd = null;
  for (const p of paras) {
    for (const piece of p.split(/\n|[  ]{3,}/)) {
      const line = piece.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
      if (!line) continue;
      const y = line.match(/^(\d{4})(?:\s*[-–]\s*(\d{2,4}))?$/);
      if (y) {
        year = +y[1];
        yearEnd = y[2] ? +(y[2].length === 2 ? y[1].slice(0, 2) + y[2] : y[2]) : null;
        continue;
      }
      if (!year || /^\(to be continued\)$/i.test(line)) continue;
      const e = parseLine(line, year, yearEnd);
      if (e) out.push(e);
      else console.warn(`  ? unparsed (${year}): ${line}`);
    }
  }
  return out;
};

export async function collect({ rawDir }) {
  const dir = path.join(rawDir, SOURCE.id);
  const entries = [];
  for (const [i, url] of PAGES.entries()) {
    const html = await cachedFetch(url, path.join(dir, `part-${i + 1}.html`));
    entries.push(...parsePage(html));
  }
  return entries;
}

// ---- CLI ----------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const backend = path.join(path.dirname(__filename), '..', '..', '..');
  const args = process.argv.slice(2);
  const rawIdx = args.indexOf('--raw');
  const rawDir = rawIdx >= 0 ? args[rawIdx + 1] : path.join(backend, 'data', 'canon', 'raw');
  const entries = await collect({ rawDir });
  const out = path.join(backend, 'data', 'canon', `${SOURCE.id}.json`);
  fs.writeFileSync(out, JSON.stringify(entries, null, 1));
  console.log(`✓ ${SOURCE.id}: ${entries.length} entries → ${path.relative(process.cwd(), out)}`);
}
