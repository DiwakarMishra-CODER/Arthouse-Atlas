/**
 * Roger Ebert — "Great Movies" essays (1996–2013), unranked membership.
 *
 * rogerebert.com answers every request — robots.txt included, with or without a
 * browser User-Agent — with 403, so we don't fetch from it. The English
 * Wikipedia article ("The Great Movies") lists only the books; the complete list
 * lives on the Belarusian Wikipedia's featured list "Выдатныя фільмы (Роджэр
 * Эберт)", one row per essay with year, director and the rogerebert.com essay
 * link (whose link text is the English title Ebert used). We take titles and
 * essay URLs from those links; director names come from the row's English
 * interwiki hints, or — for directors with a Belarusian article — from that
 * article's English-language link (one cached fetch per director).
 *
 * Usage: node scripts/canon/extra/ebert-great.js [--raw <dir>]
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

export const SOURCE = {
  id: 'ebert-great',
  label: "Roger Ebert's Great Movies",
  short: 'Ebert Great Movies',
  url: 'https://www.rogerebert.com/great-movies',
  family: 'critic',
  kind: 'membership',
  size: null,
  eligible: { from: 1895, to: 2013 }
};

const LIST_URL = 'https://be.wikipedia.org/wiki/' + encodeURIComponent('Выдатныя_фільмы_(Роджэр_Эберт)');
const DETAIL = "Roger Ebert's Great Movies";

// Essays that cover several films (or a cut) — expanded by hand, keyed by essay slug.
// "The Films of Buster Keaton" and "The Up Documentaries" are body-of-work essays
// with no single film, so they're left out.
const EXPANSIONS = {
  'great-movie-ivan-the-terrible-parts-i-and-ii': [
    { title: 'Ivan the Terrible, Part I', year: 1944, directors: ['Sergei Eisenstein'] },
    { title: 'Ivan the Terrible, Part II', year: 1958, directors: ['Sergei Eisenstein'] }
  ],
  'great-movie-the-apu-trilogy-1959': [
    { title: 'Pather Panchali', year: 1955, directors: ['Satyajit Ray'] },
    { title: 'Aparajito', year: 1956, directors: ['Satyajit Ray'] },
    { title: 'The World of Apu', originalTitle: 'Apur Sansar', year: 1959, directors: ['Satyajit Ray'] }
  ],
  'great-movie-blade-runner-the-final-cut-1982': [
    { title: 'Blade Runner', year: 1982, directors: ['Ridley Scott'] }
  ],
  'great-movie-three-colors-trilogy-blue-white-red': [
    { title: 'Three Colors: Blue', year: 1993, directors: ['Krzysztof Kieślowski'] },
    { title: 'Three Colors: White', year: 1994, directors: ['Krzysztof Kieślowski'] },
    { title: 'Three Colors: Red', year: 1994, directors: ['Krzysztof Kieślowski'] }
  ],
  'great-movie-chuck-jones-three-cartoons': [
    { title: 'Duck Amuck', year: 1953, directors: ['Chuck Jones'] },
    { title: 'One Froggy Evening', year: 1955, directors: ['Chuck Jones'] },
    { title: "What's Opera, Doc?", year: 1957, directors: ['Chuck Jones'] }
  ],
  'great-movie-the-films-of-buster-keaton': [],
  'great-movie-the-up-documentaries-1985': []
};

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
  const target = decodeURI(u.pathname) + u.search;
  let best = null;
  for (const r of await robotsRules(u.origin)) {
    const re = new RegExp('^' + r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    if ((re.test(target) || re.test(u.pathname + u.search)) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
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
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#039;|&apos;/g, "'");
const text = (h) => decode(h.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
// "Michael Powell (director)" → "Michael Powell"
const cleanEnTitle = (t) => decode(decodeURIComponent(t)).replace(/_/g, ' ').replace(/\s*\([^)]*\)\s*$/, '').trim();

// director cell → [{ en } | { be }] in order
const directorRefs = (cell) => {
  const refs = [];
  const re = /<span data-interwiki-lang="en" data-interwiki-article="([^"]+)"[\s\S]*?<\/sup><\/span>|<a rel="mw:WikiLink" href="https:\/\/be\.wikipedia\.org\/wiki\/([^"?#]+)"[^>]*>([\s\S]*?)<\/a>/g;
  for (const m of cell.matchAll(re)) refs.push(m[1] ? { en: cleanEnTitle(m[1]) } : { be: m[2], label: text(m[3]) });
  return refs;
};

const enNameFromBe = async (beTitle, dir) => {
  const file = path.join(dir, 'directors', `${beTitle.replace(/[^\p{L}\p{N}_-]+/gu, '_')}.html`);
  const html = await cachedFetch(`https://be.wikipedia.org/wiki/${encodeURIComponent(decodeURIComponent(beTitle))}`, file);
  const m = html.match(/<a href="https:\/\/en\.wikipedia\.org\/wiki\/([^"]+)"[^>]*hreflang="en"/);
  return m ? cleanEnTitle(m[1]) : null;
};

export async function collect({ rawDir }) {
  const dir = path.join(rawDir, SOURCE.id);
  const html = await cachedFetch(LIST_URL, path.join(dir, 'be-wikipedia-great-movies.html'));
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]));
  const entries = [];
  const unresolved = [];
  for (const cells of rows) {
    if (cells.length !== 4) continue;
    const link = cells[3].match(/href="(https?:\/\/www\.rogerebert\.com[^"]*)"[^>]*>([\s\S]*?)<\/a>/);
    if (!link) continue;
    const url = link[1];
    const slug = url.split('/').filter(Boolean).pop();
    if (EXPANSIONS[slug]) {
      for (const x of EXPANSIONS[slug]) {
        entries.push({ source: SOURCE.id, rank: null, title: x.title, originalTitle: x.originalTitle || null, directors: x.directors,
          year: x.year, country: null, tmdbId: null, imdbId: null, detail: DETAIL, url });
      }
      continue;
    }
    const title = text(link[2]).replace(/^«\s*|\s*»$/g, '');
    const year = parseInt(text(cells[0]), 10) || null;
    const directors = [];
    for (const ref of directorRefs(cells[2])) {
      if (ref.en) directors.push(ref.en);
      else {
        const en = await enNameFromBe(ref.be, dir);
        if (en) directors.push(en);
        else unresolved.push(ref.label);
      }
    }
    entries.push({ source: SOURCE.id, rank: null, title, originalTitle: null, directors, year, country: null,
      tmdbId: null, imdbId: null, detail: DETAIL, url });
  }
  if (unresolved.length) console.warn(`  ebert-great: ${unresolved.length} director(s) without an English link: ${[...new Set(unresolved)].join(', ')}`);
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
