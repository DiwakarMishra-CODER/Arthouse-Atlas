// Where to watch every film, in every country. TMDB's watch providers (JustWatch's listings) for
// all of the atlas, rebuilt once a day in the background and kept in memory, so a film page or an
// Explore filter never waits on TMDB.
//
// What it does when things go wrong:
// - a film TMDB fails on (after retries) keeps yesterday's listing rather than losing it;
// - a build where more than a tenth of films fail, or that suddenly loses most of its listings,
//   is thrown away and the last good one stays;
// - the last good build is saved to MongoDB, so a restart (Render's disk is wiped) loads it at once;
// - a film not in the index yet (a new film, or no build so far) is looked up live, alone.
import Movie from '../models/Movie.js';
import WatchIndex from '../models/WatchIndex.js';

const TMDB = 'https://api.themoviedb.org/3';
export const DAY = 24 * 60 * 60 * 1000;
export const STALE_AFTER = 3 * DAY;
export const MAX_FAILED_SHARE = 0.1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// pure parts (tested)
// ---------------------------------------------------------------------------

// TMDB's address for a film's (or a series', or a season's) watch providers
export const watchPath = (film) => {
  if (film.tmdbTv) return film.tmdbSeason ? `/tv/${film.tmdbTv}/season/${film.tmdbSeason}/watch/providers` : `/tv/${film.tmdbTv}/watch/providers`;
  return film.tmdbId ? `/movie/${film.tmdbId}/watch/providers` : null;
};

// TMDB's listing page for a film in a country, with JustWatch's links to each service
export const watchPage = (film, cc) => (film.tmdbTv
  ? `https://www.themoviedb.org/tv/${film.tmdbTv}/watch?locale=${cc}`
  : `https://www.themoviedb.org/movie/${film.tmdbId}/watch?locale=${cc}`);

// TMDB's results ({ IN: { flatrate: [...], rent: [...] } }) as provider ids per kind: s(tream with a
// subscription), f(ree, with or without ads), r(ent), b(uy). Each provider met is added to `providers`.
export function compactEntry(results, providers) {
  const entry = {};
  for (const [cc, d] of Object.entries(results || {})) {
    const ids = (list) => (list || []).map((p) => {
      providers[p.provider_id] ??= [p.provider_name, p.logo_path, p.display_priority ?? 99];
      return p.provider_id;
    });
    const row = { s: ids(d.flatrate), f: [...new Set([...ids(d.free), ...ids(d.ads)])], r: ids(d.rent), b: ids(d.buy) };
    if (row.s.length || row.f.length || row.r.length || row.b.length) entry[cc] = row;
  }
  return entry;
}

const streams = (row) => !!row && (row.s.length > 0 || row.f.length > 0);
const listed = (films) => [...films.values()].filter((e) => Object.keys(e).length > 0).length;

// One build over every film. `fetchResults(film)` returns TMDB's results or throws. Returns the new
// index, or index: null when the build isn't fit to replace `previous`.
export async function buildIndex(films, fetchResults, previous = null, { concurrency = 4 } = {}) {
  const providers = { ...(previous?.providers || {}) };
  const out = new Map();
  const queue = films.filter((f) => watchPath(f));
  let next = 0;
  let failed = 0;
  const worker = async () => {
    while (next < queue.length) {
      const film = queue[next++];
      try {
        out.set(film._id, compactEntry(await fetchResults(film), providers));
      } catch {
        failed++;
        const old = previous?.films.get(film._id);
        if (old) out.set(film._id, old);
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  const tried = queue.length;
  if (tried && failed / tried > MAX_FAILED_SHARE) return { index: null, failed, tried, why: 'too many films failed' };
  if (previous && listed(out) < listed(previous.films) * 0.5) return { index: null, failed, tried, why: 'lost most of its listings' };
  return { index: { builtAt: new Date(), providers, films: out }, failed, tried };
}

// a channel or ad tier of a service already listed is the same place to watch: "MUBI Amazon Channel"
// and "Netflix Standard with Ads" fold into MUBI and Netflix when those are there too
const VARIANT = / (standard with ads|basic with ads|with ads|amazon channel|apple tv channel|roku premium channel)$/i;
const KINDS = [['s', 'stream'], ['f', 'free'], ['r', 'rent'], ['b', 'buy']];
// countries to suggest when it isn't showing where you are, in this order, then any
const ELSEWHERE = ['US', 'GB', 'CA', 'AU', 'IN', 'DE', 'FR', 'JP'];

// what one country's listing says, as the film page shows it
export function offersIn(entry, providers, cc) {
  const row = entry?.[cc];
  const byId = new Map();
  if (row) {
    for (const [key, kind] of KINDS) {
      for (const id of row[key]) {
        const [name, logo, priority] = providers[id] || [`Service ${id}`, null, 99];
        const o = byId.get(id) || { id: Number(id), name, logo, priority, kinds: new Set() };
        o.kinds.add(kind);
        byId.set(id, o);
      }
    }
  }
  // names compared without case, spaces or marks: "Sonyliv Amazon Channel" is Sony Liv's
  const key = (name) => name.toLowerCase().replace(/[^a-z0-9+]/g, '');
  const byName = new Map([...byId.values()].map((o) => [key(o.name), o]));
  for (const [id, o] of byId) {
    const base = byName.get(key(o.name.replace(VARIANT, '')));
    if (base && base !== o) { o.kinds.forEach((k) => base.kinds.add(k)); byId.delete(id); }
  }
  const order = KINDS.map(([, k]) => k);
  return [...byId.values()]
    .map((o) => ({ ...o, kinds: order.filter((k) => o.kinds.has(k)) }))
    .sort((a, b) => Number(b.kinds[0] === 'stream' || b.kinds[0] === 'free') - Number(a.kinds[0] === 'stream' || a.kinds[0] === 'free')
      || a.priority - b.priority || a.name.localeCompare(b.name));
}

// the film's listing for one country, plus how widely it's showing and, if not here, where
export function watchView(film, entry, providers, cc, checkedAt, now = Date.now()) {
  const showing = Object.keys(entry || {}).filter((c) => streams(entry[c]));
  let elsewhere = null;
  if (!streams(entry?.[cc])) {
    const order = [...ELSEWHERE, ...showing.sort()].filter((c) => c !== cc && showing.includes(c));
    const free = order.find((c) => entry[c].f.length);
    const at = free || order[0];
    if (at) {
      const [o] = offersIn(entry, providers, at).filter((x) => x.kinds.includes(free ? 'free' : 'stream'));
      if (o) elsewhere = { region: at, name: o.name, free: !!free };
    }
  }
  return {
    region: cc,
    offers: offersIn(entry, providers, cc).map((o) => ({ id: o.id, name: o.name, logo: o.logo, kinds: o.kinds })),
    countries: showing.length,
    showingIn: [...showing].sort(),
    elsewhere,
    page: watchPage(film, cc),
    checkedAt: checkedAt ? new Date(checkedAt).toISOString() : null,
    stale: !!checkedAt && now - new Date(checkedAt).getTime() > STALE_AFTER,
  };
}

// ---------------------------------------------------------------------------
// TMDB, with retries
// ---------------------------------------------------------------------------
export const tmdbWatch = (apiKey, fetchImpl = fetch) => async (film) => {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetchImpl(`${TMDB}${watchPath(film)}?api_key=${apiKey}`, { signal: AbortSignal.timeout(10_000) });
    } catch (err) {
      if (attempt < 3) { await sleep(1000 * 2 ** attempt); continue; }
      throw err;
    }
    if (res.status === 404) return {};
    if (res.ok) return (await res.json()).results || {};
    if ((res.status === 429 || res.status >= 500) && attempt < 3) { await sleep(1000 * 2 ** attempt); continue; }
    throw new Error(`TMDB answered ${res.status}`);
  }
};

// ---------------------------------------------------------------------------
// the live index
// ---------------------------------------------------------------------------
let current = null; // { builtAt, providers, films: Map<filmId, entry> }
let building = false;
export const watchIndex = () => current;

async function loadSnapshot() {
  const docs = await WatchIndex.find({}).lean();
  const meta = docs.find((d) => d._id === '_meta');
  if (!meta?.builtAt) return null;
  return { builtAt: meta.builtAt, providers: meta.providers || {}, films: new Map(docs.filter((d) => d._id !== '_meta').map((d) => [d._id, d.r || {}])) };
}

async function saveSnapshot(index) {
  const ops = [...index.films].map(([_id, r]) => ({ replaceOne: { filter: { _id }, replacement: { _id, r }, upsert: true } }));
  ops.push({ replaceOne: { filter: { _id: '_meta' }, replacement: { _id: '_meta', providers: index.providers, builtAt: index.builtAt }, upsert: true } });
  await WatchIndex.bulkWrite(ops, { ordered: false });
  await WatchIndex.deleteMany({ _id: { $nin: ['_meta', ...index.films.keys()] } });
}

export async function refreshWatchIndex() {
  const apiKey = process.env.TMDB_API_KEY;
  if (building || !apiKey) return;
  building = true;
  const started = Date.now();
  try {
    const films = (await Movie.find({}).select('tmdbId tmdbTv tmdbSeason').lean()).map((f) => ({ ...f, _id: String(f._id) }));
    const { index, failed, tried, why } = await buildIndex(films, tmdbWatch(apiKey), current);
    if (!index) { console.warn(`watch index: kept the last build (${why}: ${failed} of ${tried} failed)`); return; }
    current = index;
    if (process.env.WATCH_INDEX_SAVE !== '0') await saveSnapshot(index);
    console.log(`watch index: ${listed(index.films)} of ${tried} films listed, ${failed} failed, in ${Math.round((Date.now() - started) / 1000)}s`);
  } catch (err) {
    console.error('watch index: build failed, kept the last one:', err.message);
  } finally {
    building = false;
  }
}

// at start: the saved build at once, then a fresh one when it's a day old (soon, if it's older)
export function startWatchIndex() {
  if (!process.env.TMDB_API_KEY) { console.warn('watch index: no TMDB_API_KEY, film pages look listings up live'); return; }
  loadSnapshot()
    .then((saved) => { if (saved && !current) current = saved; })
    .catch((err) => console.error('watch index: could not load the saved build:', err.message))
    .finally(() => {
      const age = current ? Date.now() - new Date(current.builtAt).getTime() : Infinity;
      setTimeout(() => {
        refreshWatchIndex();
        setInterval(refreshWatchIndex, DAY);
      }, Math.max(20_000, DAY - age));
    });
}

// a film's listing: from the index, or (when it isn't there) from TMDB live
export async function listingFor(film, cc) {
  const entry = current?.films.get(String(film._id));
  if (entry) return watchView(film, entry, current.providers, cc, current.builtAt);
  const providers = {};
  const live = compactEntry(await tmdbWatch(process.env.TMDB_API_KEY)(film), providers);
  return watchView(film, live, providers, cc, new Date());
}

// ---------------------------------------------------------------------------
// services as families, for Explore's "streaming on" and For You's tags
// ---------------------------------------------------------------------------

// a service with its channels and ad tiers ("MUBI Amazon Channel" and "MUBI" are one family),
// named and pictured by its plain member; worked out once per build
const familyCache = new WeakMap();
const nameKey = (name) => name.toLowerCase().replace(/[^a-z0-9+]/g, '');
export function familiesOf(providers) {
  let fam = familyCache.get(providers);
  if (fam) return fam;
  const head = new Map(); // base name -> the family's face
  for (const [id, [name, logo, priority = 99]] of Object.entries(providers)) {
    const base = nameKey(name.replace(VARIANT, ''));
    const plain = nameKey(name) === base;
    const f = head.get(base);
    if (!f || (plain && !f.plain) || (plain === f.plain && priority < f.priority)) head.set(base, { id: Number(id), name, logo, priority, plain });
  }
  fam = new Map(Object.entries(providers).map(([id, [name]]) => [Number(id), head.get(nameKey(name.replace(VARIANT, '')))]));
  familyCache.set(providers, fam);
  return fam;
}

// the families a film streams on in a country (subscription or free), and the free ones; null when unlisted
export function streamingFamilies(entry, cc, providers) {
  const row = entry?.[cc];
  if (!row) return null;
  const fam = familiesOf(providers);
  const of = (ids) => [...new Set(ids.map((id) => fam.get(Number(id))).filter(Boolean))].sort((a, b) => a.priority - b.priority);
  return { all: of([...row.s, ...row.f]), free: of(row.f) };
}
export const streamingIn = (filmId, cc) => (current ? streamingFamilies(current.films.get(String(filmId)), cc, current.providers) : null);

// Explore's filter: { region, mode: 'all' | 'free' | 'ids', ids: Set of family ids }
export const matchesScreens = (filmId, { region, mode, ids }, lookup = streamingIn) => {
  const on = lookup(filmId, region);
  if (!on) return false;
  if (mode === 'free') return on.free.length > 0;
  if (mode === 'all') return on.all.length > 0;
  return on.all.some((f) => ids.has(f.id));
};

// Explore's counts: how many films stream in the country at all, free, and on each service
export function screensFacet(cards, region, lookup = streamingIn) {
  const counts = new Map();
  let all = 0;
  let free = 0;
  for (const c of cards) {
    const on = lookup(c._id, region);
    if (!on?.all.length) continue;
    all++;
    if (on.free.length) free++;
    on.all.forEach((f) => counts.set(f, (counts.get(f) || 0) + 1));
  }
  const services = [...counts].map(([f, n]) => ({ id: f.id, name: f.name, logo: f.logo, n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  return { region, ready: !!current || lookup !== streamingIn, all, free, services };
}

// every country with a listing for any film, for the country picker
export const listedRegions = () => {
  if (!current) return [];
  const all = new Set();
  for (const entry of current.films.values()) Object.keys(entry).forEach((c) => all.add(c));
  return [...all].sort();
};
