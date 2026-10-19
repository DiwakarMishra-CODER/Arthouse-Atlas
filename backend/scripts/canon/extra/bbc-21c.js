/**
 * BBC Culture — "The 21st Century's 100 Greatest Films" (August 2016, 177 critics).
 *
 * Source: the original BBC Culture article. English Wikipedia's article on the
 * poll only tabulates the top 10, so it can't stand in for the full list.
 * The article lists the films as paragraphs, counting down:
 *   "100. Toni Erdmann (Maren Ade, 2016)"
 * Three films tie at 100, so the list holds 102 entries.
 *
 * robots.txt (bbc.com): /culture/article/ is allowed for generic crawlers.
 *
 * parseBBCList / fetchCached are shared with bbc-foreign.js and bbc-women.js.
 *
 * Usage: import { collect } and call collect({ rawDir }), or run
 *        node scripts/canon/collectExtra.js --only bbc-21c
 */
import fs from 'fs';
import path from 'path';
import axios from 'axios';

export const SOURCE = {
  id: 'bbc-21c',
  label: "BBC Culture — The 21st Century's 100 Greatest Films (2016)",
  short: 'BBC 21st century',
  url: 'https://www.bbc.com/culture/article/20160819-the-21st-centurys-100-greatest-films',
  family: 'all-time-poll',
  kind: 'ranked',
  size: 100,
  eligible: { from: 2000, to: 2016 }
};

const POLL_YEAR = 2016;
const UA = 'ArthouseAtlas-canon-research/0.1 (personal non-commercial project; cinephile catalogue)';
const DELAY_MS = 1600;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastFetch = 0;
export const fetchCached = async (dir, file, url) => {
  const p = path.join(dir, file);
  if (fs.existsSync(p) && fs.statSync(p).size > 0) return fs.readFileSync(p, 'utf8');
  const wait = lastFetch + DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastFetch = Date.now();
  const res = await axios.get(url, { headers: { 'User-Agent': UA }, responseType: 'text', timeout: 60000, maxRedirects: 5 });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, res.data);
  return res.data;
};

const decode = (s = '') => s
  .replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/&nbsp;|&#160;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
const text = (html = '') => decode(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

// "Joel and Ethan Coen" → ["Joel Coen", "Ethan Coen"];
// "Béla Tarr, director; Ágnes Hranitzky, co-director" → ["Béla Tarr", "Ágnes Hranitzky"]
const parseDirectors = (s) => {
  const parts = s.replace(/,\s*(?:co-)?director\b/gi, '')
    .split(/\s*(?:;|,|\band\b|&)\s*/).map((x) => x.trim()).filter(Boolean);
  const last = parts[parts.length - 1]?.split(' ') || [];
  if (parts.length > 1 && last.length > 1) {
    const surname = last.slice(1).join(' ');
    return parts.map((p) => (p.includes(' ') ? p : `${p} ${surname}`));
  }
  return parts;
};

// "<rank>. <title> (<directors>, <year>)", one paragraph per film
const LINE = /^(\d+)\.\s+(.+?)\s+\(([^()]+),\s*(\d{4})\)$/;

export const parseBBCList = (html, source, pollYear) => {
  const out = [];
  for (const m of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
    const line = text(m[1]).replace(/[’‘]/g, "'");
    const f = line.match(LINE);
    if (!f) continue;
    const rank = parseInt(f[1], 10);
    out.push({
      source, rank, title: f[2].trim(), originalTitle: null, directors: parseDirectors(f[3]),
      year: parseInt(f[4], 10), country: null, tmdbId: null, imdbId: null,
      detail: `#${rank} of 100 (${pollYear})`
    });
  }
  return out.sort((a, b) => a.rank - b.rank);
};

export async function collect({ rawDir }) {
  const dir = path.join(rawDir, SOURCE.id);
  const html = await fetchCached(dir, 'bbc.html', SOURCE.url);
  const entries = parseBBCList(html, SOURCE.id, POLL_YEAR);
  if (entries.length < 100) throw new Error(`${SOURCE.id}: parsed only ${entries.length} entries — page layout changed?`);
  return entries;
}
