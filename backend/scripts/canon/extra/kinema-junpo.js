/**
 * Kinema Junpo Best Ten — Japanese films (日本映画ベスト・テン), the critics' list
 * Japan's oldest film magazine has published every year since 1926.
 *
 * Source: the Japanese Wikipedia article "キネマ旬報ベスト・テン", which carries
 * every year's lists in one page. We take the critics' Japanese-film top ten per
 * year (not the readers' 読者選出 list, not the foreign-film list). 1924–25 had no
 * Japanese list; 1930 had two (現代映画 contemporary / 時代映画 period), both kept;
 * 1943–45 were not held. Tied films share the rank (several titles in one item).
 *
 * Titles are Japanese. For films with their own ja.wikipedia article we fetch that
 * article (cached) and, when it links an English-language article, use its title
 * (minus the "(1953 film)" disambiguator) as `title`; otherwise `title` is the
 * Japanese title too. Directors stay in Japanese — the resolver confirms
 * script-only directors on TMDB's original_title instead.
 *
 * Usage: node scripts/canon/extra/kinema-junpo.js [--raw <dir>] [--no-english]
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

export const SOURCE = {
  id: 'kinema-junpo',
  label: 'Kinema Junpo Best Ten (Japanese films)',
  short: 'Kinema Junpo',
  url: 'https://ja.wikipedia.org/wiki/キネマ旬報ベスト・テン',
  family: 'year-end',
  kind: 'ranked-yearly',
  size: 10,
  eligible: { from: 1926, to: 2025 }
};

const PAGE_URL = 'https://ja.wikipedia.org/wiki/' + encodeURIComponent('キネマ旬報ベスト・テン');

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
  const targets = [u.pathname + u.search, decodeURI(u.pathname) + u.search];
  let best = null;
  for (const r of await robotsRules(u.origin)) {
    const re = new RegExp('^' + r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    if (targets.some((t) => re.test(t)) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
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

// One film inside an <li>: "<a href=…>東京物語</a>（小津安二郎監督）"
const parseFilm = (html) => {
  const t = text(html);
  if (!t || /^[-−–—]$/.test(t)) return null;
  // trailing note: "（小津安二郎監督）", "（記録映画/亀井文夫監督/三木茂撮影）", "（オムニバス映画/監督：A、B）"
  const m = t.match(/^(.*?)\s*[（(]([^（）()]*)[)）]\s*$/);
  const jaTitle = (m ? m[1] : t).replace(/^『|』$/g, '').trim();
  const credit = m ? m[2].split('/').find((p) => /監督/.test(p)) : null;
  // co-directors are separated by 、 (・ is the word separator inside katakana names)
  const directors = credit
    ? credit.replace(/^\s*監督\s*[：:]\s*/, '').replace(/\s*監督\s*$/, '').split(/[、,，&＆]/).map((d) => d.trim()).filter(Boolean)
    : [];
  // the film's own article (red links and "#section" links into a novel's page don't count)
  const a = html.match(/<a[^>]*href="https:\/\/ja\.wikipedia\.org\/wiki\/([^"]+)"[^>]*>/);
  const article = a && !/[?#]/.test(a[1]) ? decode(a[1]) : null;
  return { jaTitle, directors, article };
};

const parseYearSections = (html) => {
  const parts = html.split(/<h4[^>]*id="第\d+回（(\d{4})年度）"/);
  const lists = [];
  for (let k = 1; k < parts.length; k += 2) {
    const listYear = +parts[k];
    const body = parts[k + 1];
    // blocks: a bold label followed by its <ol>
    const blocks = [...body.matchAll(/<b(?:\s[^>]*)?>([\s\S]*?)<\/b>[\s\S]*?(<ol[\s\S]*?<\/ol>)/g)].map((m) => ({ label: text(m[1]), ol: m[2] }));
    const jp = blocks.filter((b) => /日本/.test(b.label) && !/読者|外国/.test(b.label));
    if (!jp.length) continue;
    // the critics' list is the first 日本映画 block; 1930 has two (現代 / 時代)
    const picked = /現代|時代/.test(jp[0].label) ? jp.filter((b) => /現代|時代/.test(b.label)) : [jp[0]];
    for (const b of picked) {
      const variant = /現代/.test(b.label) ? 'contemporary films' : /時代/.test(b.label) ? 'period films' : null;
      lists.push({ listYear, variant, ol: b.ol });
    }
  }
  return lists;
};

const enTitleFrom = async (article, dir) => {
  const file = path.join(dir, 'films', `${article.replace(/[^\p{L}\p{N}_-]+/gu, '_')}.html`);
  try {
    const html = await cachedFetch(`https://ja.wikipedia.org/wiki/${encodeURIComponent(decodeURIComponent(article))}`, file);
    const m = html.match(/<a href="https:\/\/en\.wikipedia\.org\/wiki\/([^"]+)"[^>]*hreflang="en"/);
    if (!m) return null;
    return decode(decodeURIComponent(m[1])).replace(/_/g, ' ').replace(/\s*\([^)]*\)\s*$/, '').trim();
  } catch (err) {
    console.warn(`  kinema-junpo: ${article}: ${err.message}`);
    return null;
  }
};

export async function collect({ rawDir, english = true }) {
  const dir = path.join(rawDir, SOURCE.id);
  const html = await cachedFetch(PAGE_URL, path.join(dir, 'kinejun-best-ten.html'));
  const entries = [];
  for (const { listYear, variant, ol } of parseYearSections(html)) {
    const items = [...ol.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
    items.forEach((li, idx) => {
      const rank = idx + 1;
      for (const chunk of li.split(/<br\s*\/?>/)) {
        const f = parseFilm(chunk);
        if (!f) continue;
        entries.push({
          source: SOURCE.id,
          rank,
          title: f.jaTitle,
          originalTitle: f.jaTitle,
          directors: f.directors,
          year: listYear,
          country: 'Japan',
          tmdbId: null,
          imdbId: null,
          detail: `#${rank} of ${listYear}${variant ? ` (${variant})` : ''}`,
          listYear,
          yearTolerance: 1,
          _article: f.article
        });
      }
    });
  }
  for (const e of entries) {
    if (english && e._article) {
      const en = await enTitleFrom(e._article, dir);
      if (en) e.title = en;
    }
    delete e._article;
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
  const entries = await collect({ rawDir, english: !args.includes('--no-english') });
  const out = path.join(backend, 'data', 'canon', `${SOURCE.id}.json`);
  fs.writeFileSync(out, JSON.stringify(entries, null, 1));
  console.log(`✓ ${SOURCE.id}: ${entries.length} entries → ${path.relative(process.cwd(), out)}`);
}
