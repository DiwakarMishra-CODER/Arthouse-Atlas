/**
 * Sight and Sound — Greatest Films of All Time 2012, critics' poll (846 voters).
 *
 * Source: the BFI's current page for the 2012 poll. The BFI only ever put the
 * top 100 online (the old poll microsite, bfi.org.uk/films-tv-people/
 * sightandsoundpoll2012/critics, was also titled "Critics' top 100"); places
 * 101–250 appeared in the September 2012 print issue only. So this source holds
 * the top 100 (101 entries with ties), and SOURCE.size says 100, not 250.
 *
 * Page format (rendered from the CMS body HTML embedded as initialPageState):
 *   "17=. Seven Samurai"            rank line ("N.", "N=." or "=N.")
 *   "Kurosawa Akira, Japan 1954"    credit line: directors, country, year
 *
 * robots.txt: www.bfi.org.uk serves no robots.txt (404) → everything allowed.
 *
 * This module also exports the helpers the other Sight and Sound collectors
 * (ss2012-directors, ss-historic, ss-docs, ss-yearend) share.
 *
 * Usage: node scripts/canon/collectExtra.js --only ss2012-critics
 */
import fs from 'fs';
import path from 'path';
import axios from 'axios';

export const SOURCE = {
  id: 'ss2012-critics',
  label: "Sight and Sound — Greatest Films of All Time 2012 (critics' poll)",
  short: 'S&S 2012 critics',
  url: 'https://www.bfi.org.uk/sight-and-sound/polls/greatest-films-all-time-2012',
  family: 'all-time-poll',
  kind: 'ranked',
  size: 100,
  eligible: { from: 1895, to: 2011 }
};

// ============================================================================
// Shared helpers
// ============================================================================
export const UA = 'ArthouseAtlas-canon-research/0.1 (personal non-commercial project; cinephile catalogue)';
const DELAY_MS = 1600;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastFetch = 0;

const politeGet = async (url) => {
  const wait = lastFetch + DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastFetch = Date.now();
  return axios.get(url, {
    headers: { 'User-Agent': UA }, responseType: 'text', timeout: 90000, maxRedirects: 5,
    validateStatus: (s) => s < 500
  });
};

// robots.txt: rules for "User-agent: *" only (we are a generic crawler); longest match wins,
// Allow wins ties; a missing robots.txt allows everything. Cached per host in the source's raw dir.
const robotsCache = new Map();
const patternToRegex = (p) => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
export const robotsAllowed = async (url, dir) => {
  const u = new URL(url);
  const host = u.host;
  if (!robotsCache.has(host)) {
    const file = path.join(dir, `robots-${host}.txt`);
    let body;
    if (fs.existsSync(file)) body = fs.readFileSync(file, 'utf8');
    else {
      const res = await politeGet(`${u.protocol}//${host}/robots.txt`);
      body = res.status === 200 && !/<html/i.test(String(res.data).slice(0, 500)) ? String(res.data) : '';
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, body);
    }
    const rules = [];
    let agents = [], inRules = false;
    for (const raw of body.split(/\r?\n/)) {
      const line = raw.replace(/#.*/, '').trim();
      const m = line.match(/^(user-agent|allow|disallow)\s*:\s*(.*)$/i);
      if (!m) continue;
      const key = m[1].toLowerCase();
      if (key === 'user-agent') {
        if (inRules) { agents = []; inRules = false; }
        agents.push(m[2].trim());
      } else {
        inRules = true;
        if (agents.includes('*') && m[2].trim()) rules.push({ allow: key === 'allow', path: m[2].trim() });
      }
    }
    robotsCache.set(host, rules);
  }
  const target = u.pathname + u.search;
  let best = null;
  for (const r of robotsCache.get(host)) {
    if (!patternToRegex(r.path).test(target)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return !best || best.allow;
};

// Download once into dir/file (skipped when present); refuses URLs robots.txt disallows.
export const fetchCached = async (dir, file, url) => {
  const p = path.join(dir, file);
  if (fs.existsSync(p) && fs.statSync(p).size > 0) return fs.readFileSync(p, 'utf8');
  if (!(await robotsAllowed(url, dir))) throw new Error(`robots.txt disallows ${url}`);
  const res = await politeGet(url);
  if (res.status !== 200) throw new Error(`HTTP ${res.status} for ${url}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, res.data);
  return res.data;
};

export const decode = (s = '') => s
  .replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&ndash;|&#8211;/g, '–').replace(/&mdash;/g, '—')
  .replace(/&lsquo;/g, '‘').replace(/&rsquo;/g, '’').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
  .replace(/&hellip;/g, '…').replace(/&frac12;/g, '½')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&amp;/g, '&');
export const text = (html = '') => decode(html.replace(/<[^>]*>/g, ' ')).replace(/[\s​]+/g, ' ').trim();

// Page → text lines, one per block element. New-site BFI pages embed the article's CMS
// HTML in `var initialPageState = {...}`; that copy is cleaner than the rendered markup.
export const pageLines = (html) => {
  let src = html;
  const m = html.match(/var initialPageState = (\{[\s\S]*?\});?\s*<\/script>/);
  if (m) {
    try {
      const body = JSON.parse(m[1]).componentState?.body?.html;
      if (body) src = body;
    } catch { /* fall back to the rendered page */ }
  }
  src = src.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  return decode(src.replace(/<(?:p|h\d|div|br|li|tr|td|th|drupal-paragraph)\b[^>]*>/gi, '\n').replace(/<[^>]*>/g, ''))
    .split('\n').map((s) => s.replace(/[\s​]+/g, ' ').trim()).filter(Boolean);
};

const COUNTRIES = new Set(`USA|US|U.S.|UK|U.K.|France|Germany|West Germany|East Germany|Federal Republic of Germany|Italy|Spain|Portugal|
Japan|China|Hong Kong|Taiwan|South Korea|Korea|North Korea|India|Iran|Israel|Palestine|Turkey|Greece|Russia|Soviet Union|USSR|Poland|
Hungary|Czechoslovakia|Czech Republic|Czechia|Slovakia|Romania|Bulgaria|Serbia|Yugoslavia|Croatia|Slovenia|Bosnia and Herzegovina|
Bosnia & Herzegovina|Georgia|Armenia|Ukraine|Belarus|Kazakhstan|Sweden|Norway|Denmark|Finland|Iceland|Netherlands|The Netherlands|
Belgium|Luxembourg|Switzerland|Austria|Ireland|Canada|Mexico|Brazil|Argentina|Chile|Colombia|Peru|Uruguay|Venezuela|Bolivia|
Paraguay|Cuba|Ecuador|Guatemala|Dominican Republic|Costa Rica|Panama|Australia|New Zealand|Senegal|Mali|Burkina Faso|Mauritania|
Nigeria|South Africa|Egypt|Morocco|Tunisia|Algeria|Lebanon|Syria|Jordan|Iraq|Saudi Arabia|Qatar|UAE|United Arab Emirates|Kenya|
Ethiopia|Chad|Cameroon|Ghana|Sudan|Rwanda|Thailand|Philippines|Indonesia|Malaysia|Singapore|Vietnam|Cambodia|Myanmar|Bhutan|Nepal|
Sri Lanka|Bangladesh|Pakistan|Afghanistan|Mongolia|Kyrgyzstan|Uzbekistan|Tajikistan|Azerbaijan|Lithuania|Latvia|Estonia|Moldova|
North Macedonia|Macedonia|Albania|Kosovo|Montenegro|Cyprus|Malta|Haiti|Jamaica|Puerto Rico|Trinidad and Tobago|Greenland|Monaco|
Liechtenstein|Macau|Tibet|Scotland|Wales|England|Northern Ireland|Ivory Coast|Côte d’Ivoire|Côte d'Ivoire|Congo|DR Congo|
Democratic Republic of the Congo|Angola|Mozambique|Zimbabwe|Zambia|Uganda|Tanzania|Madagascar|Guinea|Guinea-Bissau|Niger|Benin|
Togo|Gabon|Somalia|Libya|Yemen|Oman|Kuwait|Bahrain|United States|United Kingdom|Kurdistan|Sahrawi|Gambia|The Gambia|Sierra Leone|Liberia|Eritrea|Namibia|Botswana|Fiji|Samoa|Papua New Guinea|Nicaragua|Honduras|El Salvador|Belize|Bermuda|Bahamas|Barbados|Martinique|Guadeloupe|Réunion|French Polynesia|New Caledonia|Andorra|San Marino|Vatican|Faroe Islands|Turkmenistan|Laos|Brunei|Timor-Leste|East Timor|Maldives|Mauritius|Seychelles|Cape Verde|Comoros|Djibouti|Burundi|Malawi|Lesotho|Eswatini|Swaziland|Central African Republic|Equatorial Guinea|Sao Tome and Principe|Suriname|Guyana|French Guiana`.split('|').map((c) => c.trim().toLowerCase()));
const isCountry = (seg) => seg.split(/\s*\/\s*/).filter(Boolean).every((c) => COUNTRIES.has(c.trim().toLowerCase()));

// "Albert and David Maysles, Ellen Hovde and Muffie Meyer" → [Albert Maysles, David Maysles, Ellen Hovde, Muffie Meyer]
export const splitDirectors = (s) => {
  const out = [];
  const cleaned = s.replace(/\([^)]*\)/g, ' ').replace(/\s+then\s+/gi, ', ');
  for (const piece of cleaned.split(/\s*[,;/]\s*/)) {
    const names = piece.split(/\s*(?:&|\+|\band\b)\s*/i).map((n) => n.replace(/\s+/g, ' ').trim())
      .filter((n) => n && !/^(anonymous|others?|co-director|director)$/i.test(n));
    names.forEach((n, i) => {
      // a lone first name shares the next name's surname ("Jean-Pierre & Luc Dardenne")
      if (!/\s/.test(n) && names[i + 1] && /\s/.test(names[i + 1])) out.push(`${n} ${names[i + 1].split(' ').pop()}`);
      else out.push(n);
    });
  }
  return out;
};

// Credit line → { directors, country, year, year2, originalTitle } or null.
//   "Alfred Hitchcock, USA 1958" · "Ozu Yasujirô, 1953" · "Francis Ford Coppola, USA 1972/1974"
//   "(Khaneh siah ast) Forough Farrokhzad, Iran 1963" · year-end lines carry no year: "Albert Serra, France, Portugal, Spain"
export const parseCredit = (line, { requireYear = true } = {}) => {
  if (!line || line.length > 200 || /^[—–“"‘’]|^(we said|read|where to see|see all|watch)\b/i.test(line)) return null;
  let s = line.replace(/\s*\((?:soundtrack|music)[^)]*\)\s*$/i, '').trim();
  let originalTitle = null;
  const lead = s.match(/^\(([^)]+)\)\s*(.+)$/);
  if (lead) { originalTitle = lead[1].trim(); s = lead[2]; }
  let year = null, year2 = null;
  const ym = s.match(/,?\s*\b((?:18|19|20)\d\d)(?:\s*([-–/])\s*(\d{2,4}|ongoing))?\s*$/i);
  if (ym) {
    year = parseInt(ym[1], 10);
    if (ym[2] === '/' && /^\d{4}$/.test(ym[3])) year2 = parseInt(ym[3], 10);
    s = s.slice(0, ym.index);
  } else if (requireYear) return null;
  const segs = s.split(/\s*,\s*/).map((x) => x.trim()).filter(Boolean);
  // countries run from the first country-looking segment after the director(s) to the end
  // (the end can hold names the list below lacks)
  let ci = segs.findIndex((seg, i) => i > 0 && isCountry(seg));
  if (ci < 0 && segs.length && isCountry(segs[0]) && !year) ci = 0; // bare "US" line
  const country = ci < 0 ? [] : segs.splice(ci);
  if (!segs.length && !year) return null;
  const directors = splitDirectors(segs.join(', '));
  if (directors.some((d) => d.split(' ').length > 6)) return null; // prose, not a credit
  return { directors, country: country.join(', ').replace(/\s*\/\s*/g, '/').replace(/\/+$/, '') || null, year, year2, originalTitle };
};

// "Happening (L’Evenement)" → { title: 'Happening', originalTitle: 'L’Evenement' }
export const splitTitle = (t) => {
  const m = t.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (m && !/^\d{4}$/.test(m[2])) return { title: m[1].trim(), originalTitle: m[2].trim() };
  return { title: t.replace(/\s*\((?:18|19|20)\d\d\)$/, '').trim(), originalTitle: null };
};

// Walk text lines for ranked entries: a rank line ("12. Title", "12=. Title", "=12. Title",
// "1 The Master", "5= Title") or a bare rank line ("=6") followed by the title, then a credit line.
export const parseRankedLines = (lines, { requireYear = true, maxRank = 1000, keepLine } = {}) => {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (keepLine && !keepLine(i)) continue;
    let m = lines[i].match(/^(=?)(\d{1,3})(=?)\.?\s+(\S.*)$/);
    let titleLine, creditIdx;
    if (m && !/^\d+\s+(votes?|mentions?|critics|films|contributors)\b/i.test(lines[i])) { titleLine = m[4]; creditIdx = i + 1; }
    else if ((m = lines[i].match(/^(=?)(\d{1,3})(=?)\.?$/))) { titleLine = lines[i + 1]; creditIdx = i + 2; }
    else continue;
    const rank = parseInt(m[2], 10);
    if (!titleLine || rank < 1 || rank > maxRank) continue;
    const credit = parseCredit(lines[creditIdx], { requireYear });
    if (!credit) continue;
    out.push({ rank, tied: !!(m[1] || m[3]), ...splitTitle(titleLine.replace(/\s+/g, ' ').trim()), credit, line: i });
  }
  return out;
};

// "The Godfather and The Godfather Part II" credited "1972/1974" → two entries
export const expandPairs = (rows) => rows.flatMap((r) => {
  const parts = r.title.split(/\s+and\s+/);
  if (r.credit.year2 && parts.length === 2) {
    return [{ ...r, title: parts[0], credit: { ...r.credit, year2: null } },
      { ...r, title: parts[1], credit: { ...r.credit, year: r.credit.year2, year2: null } }];
  }
  return [r];
});

export const toEntry = (source, r, detail, extra = {}) => ({
  source, rank: r.rank, title: r.title,
  originalTitle: r.originalTitle || r.credit.originalTitle || null,
  directors: r.credit.directors, year: r.credit.year, country: r.credit.country,
  tmdbId: null, imdbId: null, detail, ...extra
});

// ============================================================================
// Collector
// ============================================================================
export async function collect({ rawDir }) {
  const dir = path.join(rawDir, SOURCE.id);
  const html = await fetchCached(dir, 'greatest-films-all-time-2012.html', SOURCE.url);
  const rows = parseRankedLines(pageLines(html), { requireYear: true, maxRank: 100 });
  const seen = new Set();
  return rows
    .filter((r) => { const k = `${r.rank}|${r.title}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .map((r) => toEntry(SOURCE.id, r, `#${r.rank} (2012 critics' poll)`));
}
