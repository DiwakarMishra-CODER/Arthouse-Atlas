/**
 * The old engines, replayed as baselines.
 *
 * Faithful ports of getRecommendations (controllers/userController.js before
 * the rebuild) and getSimilarMovies (controllers/movieController.js), run on
 * the exported catalogue instead of MongoDB. Where the originals were vague
 * (database sort ties) the order is fixed by tmdbId. Two changes, both in the
 * old engines' favour:
 *   - For You is scored on its ranked top 10. The live version shuffled its
 *     top 30 and showed 10, which can only do worse.
 *   - Similar considers every film sharing a feature, not an arbitrary 100.
 */

const TOP_POOL = 200;

export const legacyModel = (films) => {
  const byTmdb = new Map(films.map((f) => [f.tmdbId, f]));
  const byCanonScore = [...films].sort((a, b) => (b.legacy.baseCanonScore - a.legacy.baseCanonScore) || (a.tmdbId - b.tmdbId));
  return { byTmdb, byCanonScore };
};

// Seeds are treated as favourites (weight 3), the old engine's strongest signal
export const legacyForYou = (model, { seeds, exclude, limit = 10 }) => {
  const tagMap = new Map();
  const directorMap = new Map();
  const movementMap = new Map();
  const decadeMap = new Map();
  const add = (map, key, w) => map.set(key, (map.get(key) || 0) + w);
  for (const id of seeds) {
    const f = model.byTmdb.get(id);
    if (!f) continue;
    f.legacy.derivedTags.forEach((t) => add(tagMap, t, 3));
    f.directors.forEach((d) => add(directorMap, d, 3));
    f.movements.forEach((m) => add(movementMap, m, 3));
    if (f.decade) add(decadeMap, f.decade, 3);
  }

  const pool = [];
  for (const f of model.byCanonScore) {
    if (pool.length >= TOP_POOL) break;
    if (!exclude.has(f.tmdbId)) pool.push(f);
  }

  const scored = pool.map((c) => {
    let s = 0;
    c.legacy.derivedTags.forEach((t) => { if (tagMap.has(t)) s += tagMap.get(t) * 1.5; });
    c.directors.forEach((d) => { if (directorMap.has(d)) s += 20; });
    c.movements.forEach((m) => { if (movementMap.has(m)) s += movementMap.get(m) * 2; });
    if (c.decade && decadeMap.get(c.decade) > 0) s += 5;
    s += c.legacy.baseCanonScore * 0.1 + c.legacy.arthouseScore * 0.05;
    return { id: c.tmdbId, s };
  });
  scored.sort((a, b) => b.s - a.s); // stable: ties keep the pool's order
  return { ids: scored.slice(0, limit).map((x) => x.id), pool: new Set(pool.map((f) => f.tmdbId)) };
};

export const legacySimilar = (model, { seed, exclude, limit = 10 }) => {
  const t = model.byTmdb.get(seed);
  if (!t) return [];
  const shared = (a = [], b = []) => a.filter((x) => b.includes(x)).length;
  const scored = [];
  for (const c of model.byTmdb.values()) {
    if (c.tmdbId === seed || exclude.has(c.tmdbId)) continue;
    const d = shared(c.directors, t.directors);
    const m = shared(c.movements, t.movements);
    const g = shared(c.legacy.derivedTags, t.legacy.derivedTags);
    const n = shared(c.legacy.genres, t.legacy.genres);
    if (!d && !m && !g && !n) continue;
    scored.push({ id: c.tmdbId, s: d * 3 + m * 2 + g * 1.5 + n });
  }
  scored.sort((a, b) => (b.s - a.s) || (a.id - b.id));
  return scored.slice(0, limit).map((x) => x.id);
};
