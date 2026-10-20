/**
 * Together: for every link the model ships, how many people loved both films.
 *
 * For You says why a film was picked in plain numbers ("Nearly half of the 1,046 people who
 * loved Tokyo Story loved Ikiru too"). Those numbers come from the same pair counts the model
 * was learned from (data/recs/work/counts-all.json, built by prepare.js); this keeps only the
 * pairs the site can show (each film's neighbours in neighbours.json) where at least MIN people
 * loved both, so small numbers are never quoted.
 *
 * It also keeps how many people there are in all, so the page can say how much likelier than most
 * a film's fans are to love another ("three times as likely as most people").
 *
 * Writes data/recs/together.json: { people, n: { tmdbId: loves }, both: { tmdbId: { neighbourTmdbId: count } } }
 * Usage: node scripts/recs/together.js   (after recs:prepare and recs:build)
 */

import path from 'path';
import { WORK_DIR, RECS_DIR, readJson, writeJson } from './lib/paths.js';

const MIN = 30;
const ML_32M_PEOPLE = 200948; // everyone in ml-32m (its README), for counts made before prepare.js recorded it

const counts = readJson(path.join(WORK_DIR, 'counts-all.json'));
const model = readJson(path.join(RECS_DIR, 'neighbours.json'));
const N = counts.films.length;
const indexOf = new Map(counts.films.map((tmdbId, i) => [tmdbId, i]));

// pair counts, either way round
const co = new Map();
for (const [i, j, c] of counts.pairs) {
  co.set(i * N + j, c);
  co.set(j * N + i, c);
}

const n = {};
const both = {};
let kept = 0;
for (const [id, film] of Object.entries(model.films)) {
  const i = indexOf.get(Number(id));
  if (i === undefined || !counts.n[i]) continue;
  n[id] = counts.n[i];
  for (const [nb] of film.nb) {
    const j = indexOf.get(nb);
    const c = j === undefined ? 0 : co.get(i * N + j) || 0;
    if (c < MIN) continue;
    (both[id] ||= {})[nb] = c;
    kept++;
  }
}

writeJson(path.join(RECS_DIR, 'together.json'), {
  source: 'MovieLens ml-32m (Harper & Konstan 2015, non-commercial licence): people who gave both films 4 stars or more',
  minimum: MIN,
  builtAt: new Date().toISOString(),
  people: counts.people ?? ML_32M_PEOPLE,
  n,
  both,
});
console.log(`together.json: ${Object.keys(n).length} films, ${kept} links with ${MIN}+ people who loved both`);
