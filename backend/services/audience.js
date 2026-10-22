import fs from 'fs';

/**
 * What MovieLens viewers made of a film: how many rated it and how many loved it (4 stars or more),
 * from data/recs/audience.json (scripts/recs/audience.js). Only films 30 or more people rated are
 * there, so a small number is never quoted. Read once; null when the file is missing.
 */

const AUDIENCE = new URL('../data/recs/audience.json', import.meta.url);

let audience;
const getAudience = () => {
  if (audience !== undefined) return audience;
  try {
    audience = JSON.parse(fs.readFileSync(AUDIENCE, 'utf8'));
  } catch (err) {
    console.warn(`Film pages: no MovieLens audience counts (${err.message})`);
    audience = null;
  }
  return audience;
};

export const audienceOf = (tmdbId) => {
  const a = getAudience();
  const row = a?.films?.[tmdbId];
  return row ? { rated: row[0], loved: row[1], people: a.people } : null;
};
