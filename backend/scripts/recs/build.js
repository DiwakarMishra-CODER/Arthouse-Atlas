/**
 * Build the shipped model: data/recs/neighbours.json
 *
 * The engine and settings chosen by evaluate.js (EASE; lib/ease.js), applied to
 * counts from EVERYONE in MovieLens: more data than the evaluated model, same
 * method and settings. Each film keeps its 50 strongest positive weights (what
 * loving it says about each of those films) with the main reason, plus its
 * canon prior; films without viewer data get content neighbours. One film per
 * line, so a rebuild shows up in git as a readable diff.
 *
 * Also writes a spot check (five well-known films, old vs new Double Bill) to
 * scripts/reports/recs-spotcheck.md and into EVALUATION.md.
 *
 * Usage:  node scripts/recs/build.js
 */

import fs from 'fs';
import path from 'path';
import { WORK_DIR, RECS_DIR, REPORTS_DIR, readJson } from './lib/paths.js';
import { priorsOf, cfMatrix, contentBits, buildIndex, K } from './lib/neighbours.js';
import { easeWeights } from './lib/ease.js';
import { rankCandidates, REASONS } from '../../services/recommender.js';
import { legacyModel, legacySimilar } from './lib/legacy.js';

const SPOT_CHECK = ['Parasite', 'Tokyo Story', 'Persona', 'In the Mood for Love', 'Stalker'];

const main = () => {
  const { films } = readJson(path.join(WORK_DIR, 'catalogue.json'));
  const counts = readJson(path.join(WORK_DIR, 'counts-all.json'));
  if (counts.films.length !== films.length || counts.films.some((id, i) => id !== films[i].tmdbId)) {
    throw new Error('catalogue.json and counts-all.json disagree; re-run recs:export and recs:prepare');
  }
  const evalFile = path.join(RECS_DIR, 'evaluation.json');
  if (!fs.existsSync(evalFile)) throw new Error('no chosen settings: run recs:evaluate (and recs:final) first');
  const evaluation = readJson(evalFile);
  if (!evaluation.lenses) console.warn('⚠ the test run (recs:final) hasn\'t been done for these settings');
  const { model, lambda, beta, gamma } = evaluation.chosen;

  const viewers = model === 'ease' ? easeWeights(counts, lambda).B : cfMatrix(counts, lambda);
  const index = buildIndex(films, priorsOf(films), viewers, contentBits(films), { beta, cold: true });

  const header = {
    version: 2,
    builtAt: new Date().toISOString(),
    source: 'MovieLens ml-32m (Harper & Konstan 2015, non-commercial licence) + the Arthouse Atlas catalogue',
    model: model === 'ease' ? 'EASE (Steck 2019), weights scaled so a typical strongest link is 1' : 'item-to-item cosine',
    params: { model, lambda, beta, gamma, k: K },
    legend: REASONS,
  };
  const lines = [...index.films].map(([id, f]) => `${JSON.stringify(String(id))}:${JSON.stringify(f)}`);
  const json = `${JSON.stringify(header).slice(0, -1)},"films":{\n${lines.join(',\n')}\n}}\n`;
  JSON.parse(json); // never ship a file the server can't read
  const out = path.join(RECS_DIR, 'neighbours.json');
  fs.writeFileSync(out, json);
  console.log(`${index.films.size} films → ${path.relative(process.cwd(), out)} (${(json.length / 1024).toFixed(0)} KB)`);

  const empty = [...index.films].filter(([, f]) => !f.nb.length).map(([id]) => films.find((f) => f.tmdbId === id).title);
  if (empty.length) console.warn(`⚠ ${empty.length} films have no neighbours: ${empty.join(', ')}`);

  // Spot check: what Double Bill shows for a few films, before and after
  const title = new Map(films.map((f) => [f.tmdbId, f.title]));
  const old = legacyModel(films);
  const S = ['## Spot check: Double Bill for five films', '', '| Film | Old engine | New engine (reason) |', '|---|---|---|'];
  for (const name of SPOT_CHECK) {
    const film = films.find((f) => f.title === name);
    if (!film) { S.push(`| ${name} | not in catalogue | |`); continue; }
    const exclude = new Set([film.tmdbId]);
    const before = legacySimilar(old, { seed: film.tmdbId, exclude, limit: 6 }).map((id) => title.get(id));
    const after = rankCandidates(index, { seeds: [{ tmdbId: film.tmdbId, weight: 1 }], exclude, gamma, limit: 6 })
      .map((r) => `${title.get(r.tmdbId)} (${r.because ? REASONS[r.because.reason] : 'canon'})`);
    S.push(`| ${name} (${film.year}) | ${before.join(', ')} | ${after.join(', ')} |`);
  }
  const spot = S.join('\n');
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORTS_DIR, 'recs-spotcheck.md'), `${spot}\n`);
  const mdPath = path.join(RECS_DIR, 'EVALUATION.md');
  if (fs.existsSync(mdPath)) {
    const md = fs.readFileSync(mdPath, 'utf8').replace(/<!-- spot-check -->[\s\S]*<!-- \/spot-check -->/, `<!-- spot-check -->\n${spot}\n<!-- /spot-check -->`);
    fs.writeFileSync(mdPath, md);
  }
  console.log(`\n${spot}`);
};

try { main(); } catch (err) { console.error(err.message || err); process.exit(1); }
