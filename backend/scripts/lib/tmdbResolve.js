/**
 * TMDB resolution helpers shared by verifyCatalogue.js and applyCatalogueFixes.js.
 *
 * Both scripts must agree on what "the right film" and "the film's country"
 * mean, so the logic lives here once.
 */

import axios from 'axios';
import { namesMatch } from '../../services/nameUtils.js';

export { normalizeName, namesMatch, surnamesMatch } from '../../services/nameUtils.js';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE = {
  poster: 'https://image.tmdb.org/t/p/w500',
  backdrop: 'https://image.tmdb.org/t/p/original',
  still: 'https://image.tmdb.org/t/p/w780'
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Small concurrency limiter so we stay well under TMDB's rate limit
export const createLimiter = (concurrency) => {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => { active--; next(); });
  };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
};

export const tmdbGet = async (url, params = {}, attempt = 0) => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB_API_KEY missing from backend/.env');
  try {
    const res = await axios.get(`${TMDB_BASE_URL}${url}`, { params: { api_key: apiKey, ...params } });
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    if (status === 404) return null;
    if ((status === 429 || status >= 500) && attempt < 4) {
      await sleep(1000 * (attempt + 1));
      return tmdbGet(url, params, attempt + 1);
    }
    throw err;
  }
};

// ============================================================================
// COUNTRY — which production country is "the" country of a film
// ============================================================================

// TMDB's origin_country is unreliable for co-productions (it calls Fanny and
// Alexander German), so the director's birthplace decides first, then the
// film's original language. For languages spoken in several producing
// countries the list is tried in order against production_countries.
const LANG_COUNTRIES = {
  sv: ['Sweden'], it: ['Italy'], ja: ['Japan'], ko: ['South Korea'], fa: ['Iran'],
  hu: ['Hungary'], pl: ['Poland'], ru: ['Soviet Union', 'Russia'], da: ['Denmark'],
  fi: ['Finland'], no: ['Norway'], cs: ['Czech Republic', 'Czechoslovakia'], sk: ['Slovakia'],
  ro: ['Romania'], el: ['Greece'], tr: ['Turkey'], th: ['Thailand'], he: ['Israel'],
  wo: ['Senegal'], bm: ['Mali'], am: ['Ethiopia'], hi: ['India'], bn: ['India', 'Bangladesh'],
  ml: ['India'], ta: ['India'], te: ['India'], mr: ['India'], kn: ['India'], ur: ['Pakistan', 'India'],
  de: ['Germany', 'Austria', 'Switzerland'], fr: ['France', 'Belgium', 'Switzerland', 'Canada'],
  pt: ['Portugal', 'Brazil'], es: ['Spain', 'Mexico', 'Argentina', 'Chile', 'Cuba', 'Colombia', 'Peru', 'Uruguay'],
  zh: ['China', 'Taiwan', 'Hong Kong'], cn: ['Hong Kong', 'China', 'Taiwan'],
  ar: ['Egypt', 'Algeria', 'Lebanon', 'Palestinian Territory', 'Morocco', 'Tunisia', 'Syria'],
  nl: ['Netherlands', 'Belgium'], tl: ['Philippines'], vi: ['Vietnam'], id: ['Indonesia'],
  uk: ['Ukraine', 'Soviet Union'], ka: ['Georgia', 'Soviet Union'], hy: ['Armenia', 'Soviet Union'],
  sr: ['Serbia', 'Yugoslavia'], hr: ['Croatia', 'Yugoslavia'], bs: ['Bosnia and Herzegovina'],
  ku: ['Turkey', 'Iran', 'Iraq'], is: ['Iceland'], et: ['Estonia'], lv: ['Latvia'], lt: ['Lithuania'],
  bg: ['Bulgaria'], mk: ['North Macedonia'], sq: ['Albania'], ca: ['Spain'], eu: ['Spain'], gl: ['Spain']
};

// Directors whose national cinema is not where they were born, and films whose
// TMDB producer list omits the obvious country.
const DIRECTOR_COUNTRY_OVERRIDES = {
  'Wong Kar-wai': 'Hong Kong', 'Michael Haneke': 'Austria', 'Yorgos Lanthimos': 'Greece',
  'Costa-Gavras': 'France', 'Stanley Kubrick': 'United Kingdom', 'Joachim Trier': 'Norway',
  'Eva Victor': 'United States of America'
};
const FILM_COUNTRY_OVERRIDES = {
  'Roma': 'Mexico',                                  // TMDB lists only UK/US producers
  'The Favourite': 'United Kingdom',                 // Greek director, British production
  'The Diving Bell and the Butterfly': 'France',     // American director, French-language French production
  'Code Unknown': 'France',                          // Austrian director, French production
  'All That Breathes': 'India'                       // Indian documentary, TMDB says language 'en'
};

// How a TMDB place_of_birth string names a country vs. how production_countries does
const BIRTHPLACE_ALIASES = {
  'United States of America': ['usa', 'united states', 'u.s.a.', 'u.s.'],
  'United Kingdom': ['uk', 'england', 'scotland', 'wales', 'northern ireland', 'great britain'],
  'Germany': ['west germany', 'east germany', 'german empire', 'prussia', 'weimar'],
  'Soviet Union': ['ussr', 'soviet union', 'russian sfsr', 'russian empire', 'ukrainian ssr', 'georgian ssr', 'armenian ssr'],
  'Russia': ['russian sfsr', 'russian empire', 'ussr'],
  'Hong Kong': ['british hong kong'],
  'Czech Republic': ['czechoslovakia', 'czechia', 'bohemia'],
  'Iran': ['persia'],
  'India': ['british india', 'british raj'],
  'South Korea': ['korea', 'republic of korea'],
  'Taiwan': ['republic of china'],
  'China': ["people's republic of china", 'manchuria', 'shanghai'],
  'Ireland': ['irish free state'],
  'Poland': ['congress poland'],
  'Hungary': ['austria-hungary'],
  'Austria': ['austria-hungary'],
  // TMDB sometimes stores birthplaces in the contributor's language
  'Sweden': ['sverige', 'svezia', 'schweden'],
  'Italy': ['italia', 'italie'],
  'Spain': ['españa', 'spagna', 'espagne'],
  'France': ['francia', 'frankreich'],
  'Germany': ['deutschland', 'germania', 'allemagne']
};

const birthplaceMatches = (birthplace, countryName) => {
  const b = (birthplace || '').toLowerCase();
  if (!b) return false;
  if (b.includes(countryName.toLowerCase())) return true;
  return (BIRTHPLACE_ALIASES[countryName] || []).some((alias) =>
    new RegExp(`(^|[\\s,])${alias.replace(/\./g, '\\.')}($|[\\s,])`).test(b));
};

// Primary country of a co-production, in order of trust:
//   1. explicit override            4. film's original language
//   2. sole production country      5. TMDB origin_country, if it is a producer
//   3. director's birthplace        6. first listed producer
export const pickCountry = (d, directorBirthplaces = []) => {
  const prod = (d.production_countries || []).map((c) => ({ iso: c.iso_3166_1, name: c.name }));
  if (FILM_COUNTRY_OVERRIDES[d.title]) return FILM_COUNTRY_OVERRIDES[d.title];
  if (prod.length === 0) return null;
  if (prod.length === 1) return prod[0].name;

  const directorNames = (d.credits?.crew || []).filter((c) => c.job === 'Director').map((c) => c.name);
  for (const name of directorNames) {
    const o = Object.keys(DIRECTOR_COUNTRY_OVERRIDES).find((k) => namesMatch(k, name));
    if (o && prod.some((p) => p.name === DIRECTOR_COUNTRY_OVERRIDES[o])) return DIRECTOR_COUNTRY_OVERRIDES[o];
  }
  for (const birthplace of directorBirthplaces) {
    const hit = prod.find((p) => birthplaceMatches(birthplace, p.name));
    if (hit) return hit.name;
  }
  const byLang = LANG_COUNTRIES[d.original_language] || [];
  const langHit = byLang.find((name) => prod.some((p) => p.name === name));
  if (langHit) return langHit;
  const originHit = (d.origin_country || []).map((iso) => prod.find((p) => p.iso === iso)).find(Boolean);
  return (originHit || prod[0]).name;
};

// place_of_birth per TMDB person id, cached for the run (~300 directors)
const birthplaceCache = new Map();
export const fetchBirthplace = async (personId) => {
  if (birthplaceCache.has(personId)) return birthplaceCache.get(personId);
  const p = await tmdbGet(`/person/${personId}`);
  const place = p?.place_of_birth || null;
  birthplaceCache.set(personId, place);
  return place;
};

// ============================================================================
// DETAILS
// ============================================================================

const crewByJob = (d, job) => (d.credits?.crew || []).filter((c) => c.job === job).map((c) => c.name);

// Shape a TMDB details response (with credits appended) into the fields we compare
export const summarize = async (d) => {
  if (!d) return null;
  const directorCrew = (d.credits?.crew || []).filter((c) => c.job === 'Director');
  const prod = d.production_countries || [];
  // Only pay for person lookups when there is an ambiguity to resolve
  const birthplaces = prod.length > 1
    ? (await Promise.all(directorCrew.map((c) => fetchBirthplace(c.id)))).filter(Boolean)
    : [];
  return {
    tmdbId: d.id,
    title: d.title,
    year: d.release_date ? parseInt(d.release_date.slice(0, 4), 10) : null,
    directors: directorCrew.map((c) => c.name),
    directorBirthplaces: birthplaces,
    country: pickCountry(d, birthplaces),
    countries: prod.map((c) => c.name),
    original_language: d.original_language,
    vote_count: d.vote_count || 0,
    vote_average: d.vote_average || 0,
    popularity: d.popularity || 0
  };
};

export const fetchDetails = async (tmdbId) =>
  summarize(await tmdbGet(`/movie/${tmdbId}`, { append_to_response: 'credits' }));

// Everything the Movie document stores, fetched in one call and mapped to schema fields
export const fetchMovieFields = async (tmdbId) => {
  const d = await tmdbGet(`/movie/${tmdbId}`, { append_to_response: 'credits,keywords,videos,images', include_image_language: 'en,null' });
  if (!d) return null;
  const summary = await summarize(d);

  const trailers = (d.videos?.results || []).filter((v) => v.site === 'YouTube' && v.type === 'Trailer');
  const trailer = trailers.find((t) => t.official) || trailers.sort((a, b) => new Date(b.published_at) - new Date(a.published_at))[0];

  const backdrops = d.images?.backdrops || [];
  const rated = backdrops.filter((img) => img.vote_average > 0).sort((a, b) => b.vote_average - a.vote_average).slice(0, 4);
  const stills = (rated.length ? rated : backdrops.slice(0, 4)).map((img) => `${TMDB_IMAGE.still}${img.file_path}`);

  return {
    summary,
    fields: {
      tmdbId: d.id,
      title: d.title,
      year: summary.year,
      decade: summary.year ? Math.floor(summary.year / 10) * 10 : undefined,
      synopsis: d.overview || '',
      directors: summary.directors,
      runtime: d.runtime || null,
      country: summary.country,
      countries: summary.countries,
      posterUrl: d.poster_path ? `${TMDB_IMAGE.poster}${d.poster_path}` : undefined,
      backdropUrl: d.backdrop_path ? `${TMDB_IMAGE.backdrop}${d.backdrop_path}` : null,
      genres: (d.genres || []).map((g) => g.name),
      keywords: (d.keywords?.keywords || []).map((k) => k.name),
      vote_average: d.vote_average || 0,
      vote_count: d.vote_count || 0,
      popularity: d.popularity || 0,
      trailerUrl: trailer ? `https://www.youtube.com/embed/${trailer.key}` : null,
      stills,
      cinematographers: crewByJob(d, 'Director of Photography'),
      composers: crewByJob(d, 'Original Music Composer'),
      productionCompanies: (d.production_companies || []).map((c) => c.name)
    }
  };
};

// Find the film we meant: search title+year, then confirm the director credit
export const findCandidate = async (title, year, director) => {
  const years = year ? [year, year - 1, year + 1] : [undefined];
  const seen = new Set();
  const pool = [];
  for (const y of years) {
    const res = await tmdbGet('/search/movie', { query: title, ...(y ? { primary_release_year: y } : {}) });
    for (const r of res?.results || []) {
      if (!seen.has(r.id)) { seen.add(r.id); pool.push(r); }
    }
    if (pool.length >= 6) break;
  }
  // No year hits at all — fall back to a bare title search
  if (pool.length === 0) {
    const res = await tmdbGet('/search/movie', { query: title });
    for (const r of (res?.results || []).slice(0, 8)) pool.push(r);
  }
  for (const r of pool.slice(0, 8)) {
    const details = await fetchDetails(r.id);
    if (!details) continue;
    const yearOk = !year || !details.year || Math.abs(details.year - year) <= 1;
    const dirOk = !director || details.directors.some((d) => namesMatch(d, director));
    if (yearOk && dirOk) return details;
  }
  return null;
};
