/**
 * Finding a director on TMDB, shared by linkKeyDirectors.js and catalogue/addDirectors.js: a person
 * is only taken when their directing credits include a film the catalogue holds, so we never take
 * the wrong John Ford.
 */

import { tmdbGet, namesMatch, TMDB_IMAGE } from './tmdbResolve.js';

// TMDB person → { id, name, profileUrl, bio, birthDate, deathDate, placeOfBirth, directed: Set<tmdbId> }
export const personOf = async (id) => {
  const [p, credits] = await Promise.all([tmdbGet(`/person/${id}`), tmdbGet(`/person/${id}/movie_credits`)]);
  return {
    id,
    name: p.name,
    profileUrl: p.profile_path ? `${TMDB_IMAGE.backdrop}${p.profile_path}` : '',
    bio: p.biography || '',
    birthDate: p.birthday || '',
    deathDate: p.deathday || null,
    placeOfBirth: p.place_of_birth || '',
    directed: new Set((credits.crew || []).filter((c) => c.job === 'Director').map((c) => c.id))
  };
};

// a name → the TMDB person who directed the most of our films ('confirmed'); failing that, a director
// by trade whose name agrees ('portrait-only'); else 'not-found'
export const resolvePerson = async (name, catalogue, searchAs = {}) => {
  const query = searchAs[name] || name;
  const { results = [] } = await tmdbGet('/search/person', { query });
  const candidates = results.slice(0, 5);
  let best = null;
  for (const c of candidates) {
    const p = await personOf(c.id);
    const held = catalogue.filter((m) => p.directed.has(m.tmdbId));
    if (held.length && (!best || held.length > best.held.length)) best = { p, held };
  }
  if (best) return { status: 'confirmed', ...best };

  const top = candidates.find((c) => c.known_for_department === 'Directing' && namesMatch(c.name, query));
  if (top) return { status: 'portrait-only', p: await personOf(top.id), held: [] };
  return { status: 'not-found', held: [] };
};
