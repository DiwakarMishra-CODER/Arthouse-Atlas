/**
 * The New York Times — "The 100 Best Movies of the 21st Century" (June 2025,
 * voted by 500+ directors, actors and other film people).
 *
 * The NYT page is paywalled, so this reads public Wikipedia tabulations:
 *   - English Wikipedia ("NYT's 100 Best Movies of the 21st Century (June 2025)")
 *     tabulates ranks 1–50 with English titles — used as-is for those.
 *   - Italian Wikipedia ("I 100 migliori film del XXI secolo") tabulates all 100
 *     with ranks, directors and years, but under Italian release titles. For
 *     ranks 51–100 the English title is taken from each film article's English
 *     interlanguage link (one cached fetch per film).
 * Years: English Wikipedia's for ranks 1–50 (they follow the NYT, which uses
 * US-release years, e.g. City of God 2003); Italian Wikipedia's for 51–100,
 * which sometimes uses Italian/US release years (Memories of Murder 2005).
 *
 * robots.txt (en./it.wikipedia.org): /wiki/ is allowed for generic crawlers.
 *
 * Usage: import { collect } and call collect({ rawDir }), or run
 *        node scripts/canon/collectExtra.js --only nyt-21c
 */
import fs from 'fs';
import path from 'path';
import axios from 'axios';

export const SOURCE = {
  id: 'nyt-21c',
  label: 'The New York Times — The 100 Best Movies of the 21st Century (2025)',
  short: 'NYT 21st century',
  url: 'https://www.nytimes.com/interactive/2025/movies/best-movies-21st-century.html',
  family: 'peer-poll',
  kind: 'ranked',
  size: 100,
  eligible: { from: 2000, to: 2025 }
};

const POLL_YEAR = 2025;
const EN_URL = 'https://en.wikipedia.org/wiki/NYT%27s_100_Best_Movies_of_the_21st_Century_(June_2025)';
const IT_URL = 'https://it.wikipedia.org/wiki/I_100_migliori_film_del_XXI_secolo';
const UA = 'ArthouseAtlas-canon-research/0.1 (personal non-commercial project; cinephile catalogue)';
const DELAY_MS = 1600;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, res.data);
  return res.data;
};

const decode = (s = '') => s
  .replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/&nbsp;|&#160;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
const text = (html = '') => decode(
  html.replace(/\sdata-mw='[^']*'/g, '').replace(/\sdata-mw="[^"]*"/g, '')
    .replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<[^>]*>/g, ' ')
).replace(/\s+/g, ' ').trim();
const rows = (t) => t.match(/<tr[\s\S]*?<\/tr>/g) || [];
const cellsHtml = (r) => (r.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/g) || []);
const bigTable = (html) => (html.match(/<table[\s\S]*?<\/table>/g) || [])
  .sort((a, b) => rows(b).length - rows(a).length)[0] || '';

// "Joel Coen and Ethan Coen", "Benny Safdie e Josh Safdie" → arrays
const splitDirectors = (s) => s.split(/\s*(?:,|;|&|\band\b|\bed?\b)\s*/).map((d) => d.trim()).filter(Boolean);
// "Parasite (2019 film)" → "Parasite"
const stripDisambig = (t) => t.replace(/\s*\([^)]*\bfilm\)$/i, '').trim();
const surname = (name = '') => name.trim().split(/\s+/).pop().toLowerCase();
const fileFor = (slug) => `${slug.replace(/[^\p{L}\p{N}()._,'-]/gu, '_')}.html`;

// English Wikipedia: | <i>Title</i> (Year) [flag] | Director |, rank = row order
const parseEnglish = (html) => rows(bigTable(html)).slice(1).map((r, i) => {
  const [c0, c1] = cellsHtml(r);
  const title = text((c0.match(/<i[^>]*>([\s\S]*?)<\/i>/) || [])[1] || '');
  const year = parseInt((text(c0).match(/\((\d{4})\)/) || [])[1], 10) || null;
  return { rank: i + 1, title, year, directors: splitDirectors(text(c1 || '')) };
});

// Italian Wikipedia: | No | <a href=…/wiki/Slug>Titolo</a> | Regista | Anno |
const parseItalian = (html) => rows(bigTable(html)).slice(1).map((r) => {
  const c = cellsHtml(r);
  if (c.length < 4) return null;
  const slug = (c[1].match(/href="https:\/\/it\.wikipedia\.org\/wiki\/([^"#]+)"/) || [])[1];
  return {
    rank: parseInt(text(c[0]), 10), // one row reads "34'"
    title: text(c[1]), slug: slug ? decodeURIComponent(slug) : null,
    directors: splitDirectors(text(c[2])), year: parseInt(text(c[3]), 10) || null
  };
}).filter((e) => e && e.rank);

// English title of an Italian Wikipedia film article, via its interlanguage link
const englishTitleOf = async (dir, slug) => {
  const url = `https://it.wikipedia.org/wiki/${encodeURIComponent(slug)}`;
  const html = await fetchCached(path.join(dir, 'films'), fileFor(slug), url);
  // only trust film articles (it.wiki "Anchorman" is the job, not the movie)
  if (!html || !/Categoria:Film_del_\d{4}/.test(html)) return null;
  const m = html && html.match(/<a [^>]*href="https:\/\/en\.wikipedia\.org\/wiki\/[^"]*"[^>]*>/g)
    ?.find((a) => /hreflang="en"/.test(a));
  const t = m && (m.match(/data-title="([^"]*)"/) || [])[1];
  return t ? stripDisambig(decode(t)) : null;
};

export async function collect({ rawDir }) {
  const dir = path.join(rawDir, SOURCE.id);
  const en = parseEnglish(await fetchCached(dir, 'wikipedia-en.html', EN_URL));
  const it = parseItalian(await fetchCached(dir, 'wikipedia-it.html', IT_URL));
  if (it.length !== 100) throw new Error(`${SOURCE.id}: Italian table has ${it.length} rows, expected 100`);

  const out = [];
  for (const row of it.sort((a, b) => a.rank - b.rank)) {
    const e = en.find((x) => x.rank === row.rank);
    let title; let directors; let year = row.year;
    if (e) {
      // cross-check the two tabulations on director surname + year
      if (surname(e.directors[0]) !== surname(row.directors[0]) && !row.directors.some((d) => surname(d) === surname(e.directors[0]))) {
        console.warn(`  ${SOURCE.id} #${row.rank}: en "${e.title}" (${e.directors}) vs it "${row.title}" (${row.directors})`);
      }
      if (e.year !== row.year) console.warn(`  ${SOURCE.id} #${row.rank}: year en ${e.year} vs it ${row.year}`);
      title = e.title; directors = e.directors; year = e.year || row.year;
    } else {
      const enTitle = row.slug ? await englishTitleOf(dir, row.slug) : null;
      if (!enTitle) console.warn(`  ${SOURCE.id} #${row.rank}: no English link for "${row.title}"`);
      title = enTitle || row.title;
      directors = row.directors;
    }
    out.push({
      source: SOURCE.id, rank: row.rank, title, originalTitle: null, directors,
      year, country: null, tmdbId: null, imdbId: null,
      detail: `#${row.rank} of 100 (${POLL_YEAR})`
    });
  }
  return out;
}
