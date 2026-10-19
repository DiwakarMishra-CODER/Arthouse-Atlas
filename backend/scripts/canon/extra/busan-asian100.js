/**
 * Busan International Film Festival — "Asian Cinema 100" (2015), the 20th-edition
 * poll of 73 critics, programmers and filmmakers (113 films incl. ties).
 *
 * The festival's own 2015 page (biff.kr Template/Builder page_num=5865, linked
 * from contemporary press as "the full list") is gone from the live site — biff.kr
 * now shows later editions — so we read the Internet Archive's capture of it
 * (31 Oct 2015). Ranked; tied films share the rank (rowspan in the table).
 * "The Apu Trilogy" is a single #4 entry on the list; we emit its three films,
 * each at #4, so they can resolve to TMDB individually.
 *
 * Usage: node scripts/canon/extra/busan-asian100.js [--raw <dir>]
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import axios from 'axios';
import { fileURLToPath } from 'url';

export const SOURCE = {
  id: 'busan-asian100',
  label: "Busan IFF's Asian Cinema 100 (2015)",
  short: 'Busan Asian 100',
  url: 'http://www.biff.kr/Template/Builder/00000001/page.asp?page_num=5865',
  family: 'regional-poll',
  kind: 'ranked',
  size: 100,
  eligible: { from: 1895, to: 2014 }
};

// id_ = the archived bytes as captured, without the Wayback toolbar
const ARCHIVE_URL = 'https://web.archive.org/web/20151031145338id_/http://www.biff.kr:80/Template/Builder/00000001/page.asp?page_num=5865';

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

// Wayback id_ captures can come back as the original gzip bytes; decode either way
const cachedFetch = async (url, file) => {
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  if (!(await allowedByRobots(url))) throw new Error(`robots.txt disallows ${url}`);
  const res = await politeGet(url, { responseType: 'arraybuffer', decompress: true });
  let buf = Buffer.from(res.data);
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf);
  const text = buf.toString('utf8');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return text;
};

// ---- parsing ----------------------------------------------------------------
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#039;|&apos;/g, "'");
const text = (h) => decode(h.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t ]+/g, ' ').trim();

// "Living (Ikiru)" → English title + the original the page gives in brackets
const splitTitle = (t) => {
  const m = t.match(/^(.*\S)\s*\(([^()]+)\)$/);
  return m ? { title: m[1], originalTitle: m[2] } : { title: t, originalTitle: null };
};

const parse = (html) => {
  const start = html.indexOf('Top 10 Screening List');
  const body = html.slice(start);
  const rows = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
  const out = [];
  let rank = null;
  for (const row of rows) {
    const cells = [...row.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/gi)].map((m) => text(m[2]));
    if (cells.length < 4) continue; // header rows use <th>
    if (cells.length >= 5) rank = parseInt(cells.shift(), 10);
    if (!Number.isFinite(rank)) continue;
    // title, then director/year in either order (the second table's header swaps them), then country
    const [titleCell, a, b, country] = cells;
    const yearCell = /^\d{4}/.test(a) ? a : b;
    const director = yearCell === a ? b : a;
    const titles = titleCell.split('\n').map((s) => s.trim()).filter(Boolean);
    const years = yearCell.split(/\s*\n\s*|\s+/).map((y) => parseInt(y, 10)).filter(Number.isFinite);
    const directors = director.split(/\s*[,&]\s*|\s+and\s+/).map((d) => d.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const detail = `#${rank} of Busan's Asian Cinema 100 (2015)`;
    if (titles.length > 1 && years.length === titles.length - 1) {
      // "The Apu Trilogy" + one "Original; English" line per film
      titles.slice(1).forEach((line, k) => {
        const [orig, eng] = line.split(/\s*;\s*/);
        out.push({ source: SOURCE.id, rank, title: eng || orig, originalTitle: eng ? orig : null, directors, year: years[k],
          country: country || null, tmdbId: null, imdbId: null, detail: `${detail} — ${titles[0]}` });
      });
      continue;
    }
    const { title, originalTitle } = splitTitle(titles.join(' '));
    out.push({ source: SOURCE.id, rank, title, originalTitle, directors, year: years[0] || null,
      country: country || null, tmdbId: null, imdbId: null, detail });
  }
  return out;
};

export async function collect({ rawDir }) {
  const html = await cachedFetch(ARCHIVE_URL, path.join(rawDir, SOURCE.id, 'biff-2015-asian-cinema-100.html'));
  return parse(html);
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
