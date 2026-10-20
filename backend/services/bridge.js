/**
 * The bridge: films that aren't in the atlas, and the atlas films their fans loved.
 *
 * Someone who has only seen Inception can still start here: data/recs/bridge.json holds
 * the 3,000 films MovieLens people loved most that the atlas doesn't have, each with the
 * atlas films its fans loved most (scripts/recs/buildBridge.js; how it was checked is in
 * data/recs/EVALUATION-bridge.md).
 *
 * Loaded once. If the file is missing the bridge is simply absent (null): search and
 * Explore carry on without it.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeName } from './nameUtils.js';
import { words, oneTypoApart } from './catalogue.js';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'recs', 'bridge.json');

/**
 * films: { [tmdbId]: { t: title, o?: original title, y: year, poster, fans, near: [[atlasTmdbId, weight], ...] } }
 * Returns the lookups Explore needs. Pure, for tests.
 */
export const makeBridge = (films) => {
  const list = Object.entries(films).map(([id, f]) => ({
    tmdbId: Number(id),
    ...f,
    _title: normalizeName(f.t),
    _other: f.o ? normalizeName(f.o) : '',
    _words: [...new Set([f.t, f.o].flatMap(words))],
  }));
  const byTmdb = new Map(list.map((f) => [f.tmdbId, f]));

  // how well a title answers a search: starts (4), contains (3), the original title (2), a typo per word (1.5)
  const scoreOf = (f, q) => {
    const n = normalizeName(q);
    if (!n) return 0;
    if (f._title.startsWith(n)) return 4;
    if (f._title.includes(n)) return 3;
    if (f._other && f._other.includes(n)) return 2;
    const typed = words(q).filter((w) => w.length >= 4);
    if (typed.length && typed.every((w) => f._words.some((t) => t.startsWith(w) || oneTypoApart(w, t)))) return 1.5;
    return 0;
  };

  return {
    size: list.length,
    get: (tmdbId) => byTmdb.get(Number(tmdbId)) || null,
    // the outside films a search names, best match first, then the most loved
    search: (q, limit = 4) => list
      .map((f) => [f, scoreOf(f, q)])
      .filter(([, s]) => s >= 1.5)
      .sort((a, b) => (b[1] - a[1]) || (b[0].fans - a[0].fans))
      .slice(0, limit)
      .map(([f]) => f),
    // the films most people know: the most loved, made since a given year
    popular: ({ since = 0, limit = 6 } = {}) => list
      .filter((f) => (f.y ?? 0) >= since)
      .sort((a, b) => b.fans - a.fans)
      .slice(0, limit),
    // tmdbId -> { score, reason } for the atlas films its fans loved
    nearOf: (tmdbId) => new Map((byTmdb.get(Number(tmdbId))?.near || []).map(([id, w]) => [id, { score: w, reason: 'v' }])),
  };
};

let cached;
export const getBridge = () => {
  if (cached !== undefined) return cached;
  try {
    const json = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    cached = makeBridge(json.films);
    console.log(`bridge: ${cached.size} outside films loaded`);
  } catch (err) {
    console.warn(`bridge: not loaded (${err.code === 'ENOENT' ? 'no data/recs/bridge.json yet' : err.message})`);
    cached = null;
  }
  return cached;
};

// the public face of an outside film
export const outsideCard = (f) => f && ({
  tmdbId: f.tmdbId,
  title: f.t,
  year: f.y ?? null,
  poster: f.poster ? `https://image.tmdb.org/t/p/w342${f.poster}` : null,
  fans: f.fans,
  leadsTo: f.near?.length || 0,
});
