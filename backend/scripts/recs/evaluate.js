/**
 * Evaluate the recommender on people it has never seen
 *
 * Three lenses (lib/protocol.js), from strict to generous, on the same people:
 *   Next film       rewind to just before the last film they loved: is it in the
 *                   top 10? Two settings, like the site: For You (up to 5 loved
 *                   films) and Double Bill (1 film).
 *   Any later love  rewind to when they had loved 80% of their films: is any film
 *                   they loved after that in the top 10? (input: their last 5 loves)
 *   Held-out loves  the published protocol (Liang et al. 2018; Steck 2019): a fixed
 *                   random 20% of their loves held out, the other 80% as input.
 * The counts behind every method come from the training group only, and every
 * method ranks every candidate film (never a sample of 100).
 *
 * Default run: choose the engine on the VALIDATION group (next film, For You).
 * A grid of settings for item-kNN and for EASE, then a rule fixed before any
 * test number existed: among the settings within one paired standard error of
 * the best NDCG@10, the one that shows the most of the catalogue, then the
 * smaller λ. Saves the choice to data/recs/evaluation.json.
 * --final: score the TEST group once, with the saved choice, against every
 * baseline, in all three lenses, and write evaluation.json + EVALUATION.md. It
 * never tunes. It records the evaluation code's fingerprint and commit, so
 * anyone can check the test was fixed before its numbers existed.
 *
 * Usage:  node scripts/recs/evaluate.js [--final]
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { WORK_DIR, RECS_DIR, ML_DIR, readJson, writeJson } from './lib/paths.js';
import { priorsOf, cfMatrix, contentBits, contentScore, buildIndex, K, CONTENT_WEIGHTS } from './lib/neighbours.js';
import { easeWeights } from './lib/ease.js';
import { rankCandidates, compareRanked } from '../../services/recommender.js';
import { makeCase, makeLaterCase, makeHeldOutCase, MIN_LOVES, LATER_CUT, HELD_OUT } from './lib/protocol.js';
import { AT, hitAndGain, randomExpectation, hitRateAt, precisionAt, recallAt, ndcgAt, randomMany, meanMargin, pairedDiff } from './lib/metrics.js';
import { LIKE, TEST_GROUP, VALIDATION_GROUP, splitOf } from './lib/counting.js';
import { legacyModel, legacyForYou, legacySimilar } from './lib/legacy.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const FINAL = args.includes('--final');
const EVAL_FILE = path.join(RECS_DIR, 'evaluation.json');
const PROTOCOL_VERSION = 2;

const GRIDS = {
  knn: { lambda: [0, 10, 25, 50], beta: [0, 0.02, 0.05, 0.1], gamma: [0, 0.02, 0.05] },
  ease: { lambda: [100, 300, 1000, 3000], beta: [0, 0.02, 0.05, 0.1], gamma: [0, 0.02, 0.05] },
};
const V1 = { model: 'knn', lambda: 25, beta: 0.1, gamma: 0 }; // the first engine exactly as shipped (no rule for films without viewers)
const RULE = 'Among settings within one paired standard error of the best validation NDCG@10 (next film, For You), the one with the highest catalogue coverage@10, then the smaller λ, β and γ.';

// The lenses: how a test person becomes a case, how deep to rank, and what to measure
const one = (key) => (ranked, c) => hitAndGain(ranked, c.hidden)[key];
const LENSES = {
  forYou: {
    label: 'Next film · For You (up to 5 loved films)',
    make: (u) => makeCase(u.userId, u.rows, { maxSeeds: 5 }),
    depth: AT,
    metrics: { 'HR@10': one('hit'), 'NDCG@10': one('gain') },
    random: (C) => { const r = randomExpectation(C); return { 'HR@10': r.hit, 'NDCG@10': r.gain }; },
    primary: 'NDCG@10',
    coverage: true,
  },
  doubleBill: {
    label: 'Next film · Double Bill (1 film)',
    make: (u) => makeCase(u.userId, u.rows, { maxSeeds: 1 }),
    depth: AT,
    metrics: { 'HR@10': one('hit'), 'NDCG@10': one('gain') },
    random: (C) => { const r = randomExpectation(C); return { 'HR@10': r.hit, 'NDCG@10': r.gain }; },
    primary: 'NDCG@10',
    coverage: true,
  },
  later: {
    label: 'Any later love (time-ordered; their last 5 loves in)',
    make: (u) => makeLaterCase(u.userId, u.rows, { maxSeeds: 5 }),
    depth: AT,
    metrics: {
      'HR@10': (r, c) => hitRateAt(r, c.targets, 10),
      'Precision@10': (r, c) => precisionAt(r, c.targets, 10),
      'Recall@10': (r, c) => recallAt(r, c.targets, 10),
    },
    random: (C, T) => { const r = randomMany(C, T, 10); return { 'HR@10': r.hitRate, 'Precision@10': r.precision, 'Recall@10': r.recall }; },
    primary: 'HR@10',
  },
  heldOut: {
    label: 'Held-out loves (published protocol: random 80% in, 20% held out)',
    make: (u) => makeHeldOutCase(u.userId, u.rows),
    depth: 100,
    metrics: {
      'Recall@20': (r, c) => recallAt(r, c.targets, 20),
      'Recall@50': (r, c) => recallAt(r, c.targets, 50),
      'NDCG@100': (r, c) => ndcgAt(r, c.targets, 100),
      'HR@10': (r, c) => hitRateAt(r, c.targets, 10),
    },
    random: (C, T) => ({
      'Recall@20': randomMany(C, T, 20).recall,
      'Recall@50': randomMany(C, T, 50).recall,
      'NDCG@100': randomMany(C, T, 100).ndcg,
      'HR@10': randomMany(C, T, 10).hitRate,
    }),
    primary: 'Recall@20',
  },
};

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

const load = () => {
  const { films } = readJson(path.join(WORK_DIR, 'catalogue.json'));
  const counts = readJson(path.join(WORK_DIR, 'counts-train.json'));
  if (counts.films.length !== films.length || counts.films.some((id, i) => id !== films[i].tmdbId)) {
    throw new Error('catalogue.json and counts-train.json disagree; re-run recs:export and recs:prepare');
  }
  const evalUsers = readJson(path.join(WORK_DIR, 'eval-users.json'));
  // never score a group under the wrong split (an old eval-users.json would silently re-score group 0)
  for (const file of [counts, evalUsers]) {
    if (file.testGroup !== TEST_GROUP || file.validationGroup !== VALIDATION_GROUP) {
      throw new Error(`work files were made with test group ${file.testGroup}, not ${TEST_GROUP}: re-run recs:prepare`);
    }
  }
  const bad = evalUsers.users.find((u) => splitOf(u.userId) !== u.split);
  if (bad) throw new Error(`user ${bad.userId} is labelled ${bad.split} but belongs to ${splitOf(bad.userId)}: re-run recs:prepare`);
  const matched = new Set(counts.matched);
  const unmatched = films.map((f) => f.tmdbId).filter((id) => !matched.has(id));
  return {
    films, counts, users: evalUsers.users, matched, unmatched,
    idx: new Map(films.map((f, i) => [f.tmdbId, i])),
    priors: priorsOf(films), bits: contentBits(films),
  };
};

// Candidates are films MovieLens has (anything else could never be a target) that the person hadn't
// rated by then (or, held-out loves, that weren't in their input)
const casesFor = (ctx, split, lens) => ctx.users
  .filter((u) => u.split === split)
  .map((u) => {
    const c = LENSES[lens].make(u);
    if (!c) return null;
    c.exclude = new Set([...c.history, ...ctx.unmatched]);
    c.candidates = ctx.films.length - c.exclude.size;
    if (c.targets) c.targets = new Set(c.targets);
    return c;
  })
  .filter(Boolean);

// Run one ranking method over a lens's cases: per-case values for every metric, and how much of the
// catalogue it showed (top 10)
const score = (cases, lens, rank) => {
  const L = LENSES[lens];
  const values = Object.fromEntries(Object.keys(L.metrics).map((m) => [m, []]));
  const shown = new Set();
  for (const c of cases) {
    const ranked = rank(c, L.depth);
    ranked.slice(0, AT).forEach((id) => shown.add(id));
    for (const [m, f] of Object.entries(L.metrics)) values[m].push(f(ranked, c));
  }
  return { values, shown: shown.size };
};

const engine = (index, gamma) => (c, depth) => rankCandidates(index, {
  seeds: c.seeds.map((tmdbId) => ({ tmdbId, weight: 1 })), exclude: c.exclude, gamma, limit: depth,
}).map((r) => r.tmdbId);

// the same engine without pruning to 50 weights per film: every weight counts (a reference, not shipped)
const denseEngine = (ctx, viewers, beta, gamma) => (c, depth) => {
  const N = ctx.films.length;
  const seeds = c.seeds.map((t) => ctx.idx.get(t));
  const scored = [];
  for (let j = 0; j < N; j++) {
    const tmdbId = ctx.films[j].tmdbId;
    if (c.exclude.has(tmdbId)) continue;
    let v = 0;
    for (const i of seeds) v += viewers[i * N + j] + beta * contentScore(ctx.bits[i * N + j]);
    scored.push({ tmdbId, prior: ctx.priors[j], score: v / seeds.length + gamma * ctx.priors[j] });
  }
  return scored.sort(compareRanked).slice(0, depth).map((x) => x.tmdbId);
};

const viewersFor = (ctx, model, lambda) => (model === 'ease' ? easeWeights(ctx.counts, lambda).B : cfMatrix(ctx.counts, lambda));
const pick = ({ model, lambda, beta, gamma }) => ({ model, lambda, beta, gamma });

// ---------------------------------------------------------------------------
// choose, on validation
// ---------------------------------------------------------------------------
const tune = (ctx) => {
  const cases = casesFor(ctx, 'val', 'forYou');
  console.log(`validation people: ${cases.length}`);
  const results = [];
  for (const model of ['knn', 'ease']) {
    for (const lambda of GRIDS[model].lambda) {
      const viewers = viewersFor(ctx, model, lambda);
      for (const beta of GRIDS[model].beta) {
        const index = buildIndex(ctx.films, ctx.priors, viewers, ctx.bits, { beta, cold: true });
        for (const gamma of GRIDS[model].gamma) {
          const r = score(cases, 'forYou', engine(index, gamma));
          results.push({ model, lambda, beta, gamma, gains: r.values['NDCG@10'], ndcg: mean(r.values['NDCG@10']), hitRate: mean(r.values['HR@10']), coverage: r.shown / ctx.matched.size });
        }
      }
      console.log(`  ${model} λ=${lambda} done`);
    }
  }
  // the rule fixed in advance
  const choose = (pool) => {
    const best = pool.reduce((a, b) => (b.ndcg > a.ndcg ? b : a));
    const near = pool.filter((r) => { const d = pairedDiff(best.gains, r.gains); return d.mean <= d.margin / 1.96; });
    return near.sort((a, b) => (b.coverage - a.coverage) || (a.lambda - b.lambda) || (a.beta - b.beta) || (a.gamma - b.gamma))[0];
  };
  const chosen = choose(results);
  const knn = choose(results.filter((r) => r.model === 'knn'));
  const show = (r) => `${r.model} λ=${r.lambda} β=${r.beta} γ=${r.gamma} · NDCG@10 ${r.ndcg.toFixed(4)}, HR@10 ${(100 * r.hitRate).toFixed(1)}%, coverage ${(100 * r.coverage).toFixed(0)}%`;
  console.log(`chosen: ${show(chosen)}`);
  console.log(`best item-kNN (baseline row): ${show(knn)}`);
  for (const m of ['knn', 'ease']) {
    const top = results.filter((r) => r.model === m).reduce((a, b) => (b.ndcg > a.ndcg ? b : a));
    const edge = ['lambda', 'beta', 'gamma'].filter((p) => top[p] === GRIDS[m][p].at(-1) && GRIDS[m][p][0] !== top[p]);
    if (edge.length) console.warn(`⚠ ${m}: the best setting sits at the edge of the grid for ${edge.join(', ')}`);
  }

  writeJson(EVAL_FILE, {
    protocolVersion: PROTOCOL_VERSION,
    testGroup: TEST_GROUP,
    validationGroup: VALIDATION_GROUP,
    tunedAt: new Date().toISOString(),
    protocol: { like: LIKE, minLoves: MIN_LOVES, laterCut: LATER_CUT, heldOut: HELD_OUT, k: K, contentWeights: CONTENT_WEIGHTS, validationPeople: cases.length },
    rule: RULE,
    grids: GRIDS,
    chosen: pick(chosen),
    knn: pick(knn),
    validation: { chosen: { ndcg: chosen.ndcg, hitRate: chosen.hitRate, coverage: chosen.coverage }, knn: { ndcg: knn.ndcg, hitRate: knn.hitRate, coverage: knn.coverage } },
    results: results.map(({ gains, ...r }) => r).sort((a, b) => b.ndcg - a.ndcg),
  }, 1);
  console.log(`saved → ${path.relative(process.cwd(), EVAL_FILE)}. Next: npm run recs:final`);
};

// ---------------------------------------------------------------------------
// score the test group, once
// ---------------------------------------------------------------------------
// the code that defines the test, fingerprinted, and whether it is committed as it stands
const provenanceOf = () => {
  const files = [path.join(HERE, 'evaluate.js'), ...fs.readdirSync(path.join(HERE, 'lib')).sort().map((f) => path.join(HERE, 'lib', f)), path.join(HERE, '..', '..', 'services', 'recommender.js')];
  const hash = crypto.createHash('sha256');
  for (const f of files) hash.update(fs.readFileSync(f));
  const git = (...a) => { try { return execFileSync('git', a, { cwd: HERE, encoding: 'utf8' }).trim(); } catch { return null; } };
  const dirty = git('status', '--porcelain', '--', ...files);
  return { codeSha256: hash.digest('hex'), commit: git('rev-parse', 'HEAD'), codeCommitted: dirty === '', files: files.map((f) => path.relative(path.join(HERE, '..', '..'), f)) };
};

const final = (ctx) => {
  if (!fs.existsSync(EVAL_FILE)) throw new Error('no saved choice: run npm run recs:evaluate first');
  const saved = readJson(EVAL_FILE);
  if (saved.protocolVersion !== PROTOCOL_VERSION || saved.testGroup !== TEST_GROUP) throw new Error('the saved choice was made under a different protocol: re-run npm run recs:evaluate');
  const provenance = provenanceOf();
  if (!provenance.codeCommitted) console.warn('⚠ the evaluation code has uncommitted changes: the report will say so');
  const N = ctx.films.length;
  const { chosen, knn } = saved;

  const build = (s, cold) => {
    const viewers = viewersFor(ctx, s.model, s.lambda);
    return { viewers, index: buildIndex(ctx.films, ctx.priors, viewers, ctx.bits, { beta: s.beta, cold }) };
  };
  const shipped = build(chosen, true);
  const methods = {
    popularity: null,
    canon: null,
    old: null,
    content: engine(buildIndex(ctx.films, ctx.priors, new Float32Array(N * N), ctx.bits, { beta: 1 }), 0),
    v1: engine(build(V1, false).index, V1.gamma),
    knn: engine(build(knn, true).index, knn.gamma),
    ...(chosen.model === 'ease' ? { full: denseEngine(ctx, shipped.viewers, chosen.beta, chosen.gamma) } : {}),
    shipped: engine(shipped.index, chosen.gamma),
  };
  const byPopularity = ctx.films
    .map((f, i) => ({ tmdbId: f.tmdbId, score: ctx.counts.n[i], prior: ctx.priors[i] }))
    .sort(compareRanked).map((x) => x.tmdbId);
  const topOf = (order) => (c, depth) => {
    const out = [];
    for (const id of order) { if (out.length >= depth) break; if (!c.exclude.has(id)) out.push(id); }
    return out;
  };
  methods.popularity = topOf(byPopularity);
  methods.canon = (c, depth) => rankCandidates(shipped.index, { exclude: c.exclude, gamma: 1, limit: depth }).map((r) => r.tmdbId);
  const old = legacyModel(ctx.films);

  const lenses = {};
  let people = null;
  for (const [key, L] of Object.entries(LENSES)) {
    const cases = casesFor(ctx, 'test', key);
    // the old engine: For You looked only at its 200-film pool; how often could a target even be there?
    let inPool = 0;
    methods.old = key === 'doubleBill'
      ? (c, depth) => legacySimilar(old, { seed: c.seeds[0], exclude: c.exclude, limit: depth })
      : (c, depth) => {
        const r = legacyForYou(old, { seeds: c.seeds, exclude: c.exclude, limit: depth });
        const targets = c.targets ? [...c.targets] : [c.hidden];
        inPool += targets.filter((t) => r.pool.has(t)).length / targets.length;
        return r.ids;
      };
    const raw = {};
    raw.random = {
      values: Object.fromEntries(Object.keys(L.metrics).map((m) => [m, cases.map((c) => L.random(c.candidates, c.targets?.size)[m])])),
      shown: null,
    };
    for (const [m, rank] of Object.entries(methods)) raw[m] = score(cases, key, rank);
    const summary = Object.fromEntries(Object.entries(raw).map(([m, r]) => [m, {
      ...Object.fromEntries(Object.entries(r.values).map(([metric, v]) => [metric, meanMargin(v)])),
      coverage: L.coverage && r.shown !== null ? r.shown / ctx.matched.size : null,
    }]));
    const minus = Object.fromEntries(Object.keys(raw).filter((m) => m !== 'shipped').map((m) => [m, pairedDiff(raw.shipped.values[L.primary], raw[m].values[L.primary])]));
    lenses[key] = {
      label: L.label,
      people: cases.length,
      primary: L.primary,
      metrics: Object.keys(L.metrics),
      methods: summary,
      shippedMinus: minus,
      ...(key !== 'doubleBill' ? { oldEnginePoolShare: inPool / cases.length } : {}),
    };
    people ??= cases.length;
    console.log(`${L.label}: ${cases.length} people · shipped ${L.primary} ${summary.shipped[L.primary].mean.toFixed(4)} vs old ${summary.old[L.primary].mean.toFixed(4)}`);
  }

  const md5 = fs.readFileSync(path.join(ML_DIR, 'ml-32m.zip.md5'), 'utf8').match(/[a-f0-9]{32}/i)?.[0];
  const result = {
    ...saved,
    finalAt: new Date().toISOString(),
    provenance,
    source: { dataset: 'MovieLens ml-32m (ratings Jan 1995 – Oct 2023)', md5 },
    catalogue: { films: N, matched: ctx.matched.size, noTrainingLoves: ctx.counts.n.filter((n, i) => n === 0 && ctx.matched.has(ctx.films[i].tmdbId)).length },
    node: process.version,
    people,
    lenses,
  };
  writeJson(EVAL_FILE, result, 1);
  fs.writeFileSync(path.join(RECS_DIR, 'EVALUATION.md'), render(result));
  console.log(`→ ${path.relative(process.cwd(), EVAL_FILE)}, EVALUATION.md`);
};

// ---------------------------------------------------------------------------
// EVALUATION.md
// ---------------------------------------------------------------------------
const engineName = (s) => (s.model === 'ease' ? 'EASE' : 'Item-kNN');
const labels = (r) => ({
  random: 'Random picks (expected value)',
  popularity: 'Most loved on MovieLens',
  canon: 'Canon order',
  old: 'Old engine (hand-set weights)',
  content: 'Content only (director, movement, country, decade)',
  v1: 'Item-kNN, first engine as shipped',
  knn: 'Item-kNN, re-tuned',
  full: `${engineName(r.chosen)}, every weight (reference, not shipped)`,
  shipped: `**${engineName(r.chosen)}, as shipped**`,
});
const isRate = (metric) => !metric.startsWith('NDCG');
const fmt = (metric, x) => (isRate(metric) ? `${(100 * x.mean).toFixed(1)}% ± ${(100 * x.margin).toFixed(1)}` : `${x.mean.toFixed(3)} ± ${x.margin.toFixed(3)}`);
const fmtDiff = (metric, x) => (isRate(metric)
  ? `${x.mean >= 0 ? '+' : ''}${(100 * x.mean).toFixed(1)} pts ± ${(100 * x.margin).toFixed(1)}`
  : `${x.mean >= 0 ? '+' : ''}${x.mean.toFixed(3)} ± ${x.margin.toFixed(3)}`);
const times = (a, b) => (b > 0 ? `${(a / b).toFixed(1)}×` : '—');

const render = (r) => {
  const name = engineName(r.chosen);
  const lab = labels(r);
  const l = r.lenses;
  const pct = (x) => `${(100 * x).toFixed(1)}%`;
  const L = [];
  L.push('# How well the recommender works', '');
  L.push(`Generated by \`scripts/recs/evaluate.js --final\` on ${r.finalAt.slice(0, 10)} · ${r.source.dataset} · ${r.catalogue.matched} of ${r.catalogue.films} catalogue films found in MovieLens · ${r.people.toLocaleString()} test people (group ${r.testGroup}, never used to choose anything) · Node ${r.node}`, '');

  L.push('## In one line each', '');
  const fy = l.forYou.methods;
  L.push(`- **Next film:** given the last 5 films a person loved, ${name} put the very next one in its top 10 for **${pct(fy.shipped['HR@10'].mean)}** of people (old engine ${pct(fy.old['HR@10'].mean)}, ${times(fy.shipped['HR@10'].mean, fy.old['HR@10'].mean)}; first engine ${pct(fy.v1['HR@10'].mean)}; the most popular films ${pct(fy.popularity['HR@10'].mean)}).`);
  const la = l.later.methods;
  L.push(`- **Any later love:** for **${pct(la.shipped['HR@10'].mean)}** of people, at least one film they went on to love was in the top 10, from just their last 5 loves (old engine ${pct(la.old['HR@10'].mean)}; most popular ${pct(la.popularity['HR@10'].mean)}).`);
  const ho = l.heldOut.methods;
  L.push(`- **Held-out loves (published protocol):** Recall@20 **${pct(ho.shipped['Recall@20'].mean)}** (most popular ${pct(ho.popularity['Recall@20'].mean)}; random ${pct(ho.random['Recall@20'].mean)}).`);
  L.push('', 'Multiples (×) are point estimates; the ± margins below are the measured uncertainty.', '');

  L.push('## How it was tested', '');
  L.push('- People are split by id: 80% build the counts, 10% choose the settings (validation), 10% are kept for this report (test). Nobody is scored on films they helped count.');
  L.push(`- Three lenses on the same ${r.people.toLocaleString()} people (everyone who loved at least ${r.protocol.minLoves} of our films). They are views of one test, not independent confirmations.`);
  L.push('  - **Next film** (strict): rewind each person to just before the last film they loved; ratings after that moment never happened. A hit is that film in the top 10. Two settings, as on the site: For You (their last 5 loves) and Double Bill (1 film).');
  L.push(`  - **Any later love** (time-ordered): rewind to when they had loved ${100 * r.protocol.laterCut}% of their films; every film they loved afterwards is a target. Input: their last 5 loves before that moment.`);
  L.push(`  - **Held-out loves** (Liang et al. 2018; Steck 2019): a fixed random ${100 * r.protocol.heldOut}% of their loves is held out; the other ${100 - 100 * r.protocol.heldOut}% is the input. Recall@k is Liang et al.'s: hits over the smaller of k and the number held out.`);
  L.push('- Every method ranks every candidate film. We never rank against a sample of 100 random films: sampled metrics inflate scores and can even reorder methods (Krichene & Rendle 2020).');
  L.push(`- The engine was chosen on validation, by a rule fixed beforehand: ${r.rule} Chosen: ${name}, λ = ${r.chosen.lambda}, β = ${r.chosen.beta} (content), γ = ${r.chosen.gamma} (canon nudge); each film keeps its ${r.protocol.k} strongest positive weights.`);
  const p = r.provenance;
  L.push(p.codeCommitted
    ? `- The evaluation code was committed before this run (commit \`${p.commit?.slice(0, 7)}\`, SHA-256 of the code \`${p.codeSha256.slice(0, 16)}…\`), so the test was fixed before its numbers existed.`
    : `- The evaluation code had uncommitted changes at this run (SHA-256 \`${p.codeSha256.slice(0, 16)}…\`).`);
  L.push(`- ± is a 95% interval for sampling noise across people. "${name} minus" rows compare on the same people. The primary comparison is ${name} minus re-tuned item-kNN on next-film NDCG@10 (For You); everything else is secondary.`, '');

  for (const s of Object.values(l)) {
    const cols = s.metrics;
    const withCoverage = s.methods.shipped.coverage !== null;
    L.push(`## ${s.label} — ${s.people.toLocaleString()} people`, '');
    L.push(`| Method | ${cols.join(' | ')}${withCoverage ? ' | Catalogue shown' : ''} |`, `|---|${cols.map(() => '---').join('|')}|${withCoverage ? '---|' : ''}`);
    for (const [m, label] of Object.entries(lab)) {
      const x = s.methods[m];
      if (!x) continue;
      const cov = withCoverage ? ` | ${x.coverage === null ? '—' : `${(100 * x.coverage).toFixed(0)}%`}` : '';
      L.push(`| ${label} | ${cols.map((c) => fmt(c, x[c])).join(' | ')}${cov} |`);
    }
    L.push('', `| ${name} as shipped, minus … | ${s.primary} |`, '|---|---|');
    for (const [m, d] of Object.entries(s.shippedMinus)) L.push(`| ${lab[m].replace(/\*\*/g, '')} | ${fmtDiff(s.primary, d)} |`);
    L.push('');
    if (s.oldEnginePoolShare !== undefined) {
      L.push(`The old For You engine only ever considered the 200 films with the highest old canon score; ${(100 * s.oldEnginePoolShare).toFixed(0)}% of the films to find were inside that pool.${s.label.startsWith('Held-out') ? ' It never showed more than its top 30 (it shuffled them), so its @50 and @100 numbers rank further than it ever did.' : ''}`, '');
    }
  }

  L.push('## Limits', '');
  L.push('- MovieLens people are not this site\'s visitors; the numbers say how well the engine predicts film lovers in general.');
  L.push('- Other people\'s ratings made after a test person\'s moment still feed the counts. That favours the methods built on counts (item-kNN, EASE) over content, canon order and the old engine, which use no ratings; it is standard for this kind of test.');
  L.push('- MovieLens timestamps record when a rating was entered, not when the film was watched: "next film" often means "next film rated in a sign-up session".');
  L.push(`- Held-out loves is the generous lens: the split ignores time, so the input can include films loved after the held-out ones; and with ${r.catalogue.matched} films rather than ~20,000, even random picks score Recall@20 ≈ ${pct(ho.random['Recall@20'].mean)}. Its numbers are not comparable to published results on MovieLens-20M. It is also the lens closest to the site, which uses every film you've touched.`);
  L.push(`- ${r.catalogue.films - r.catalogue.matched} catalogue films aren't in MovieLens (mostly 2023 and later) and ${r.catalogue.noTrainingLoves} more had no loves in the training group. They get neighbours from content alone, and other films point to them through a weaker content link — a product choice that can't be tested here. When a short list runs out, the rest of a top 100 is filled in canon order.`);
  L.push('- On the site, a favourite or a 4–5 star rating counts fully and a watched or watchlisted film counts half. Those weights are a product choice; MovieLens has no equivalent to test them on.');
  L.push('- The shipped model is refitted on everyone (train + validation + test) with the same settings, so it has slightly more data than the one tested here.', '');

  L.push('## History', '');
  L.push('- **v1**: item-to-item collaborative filtering (cosine with shrinkage, a content blend), scored once on test group 0: next-film HR@10 35.3% for For You (old engine 12.6%). Its report is kept as `EVALUATION-v1.md`. Group 0 now trains; v2 is scored on group 2, which no version had seen.', '');
  L.push('<!-- spot-check -->', '<!-- /spot-check -->', '');
  L.push('## References', '');
  L.push('- F. Maxwell Harper and Joseph A. Konstan. 2015. The MovieLens Datasets: History and Context. ACM TiiS 5, 4: 19:1–19:19. https://doi.org/10.1145/2827872');
  L.push('- Harald Steck. 2019. Embarrassingly Shallow Autoencoders for Sparse Data. The Web Conference (WWW) 2019.');
  L.push('- Dawen Liang, Rahul G. Krishnan, Matthew D. Hoffman and Tony Jebara. 2018. Variational Autoencoders for Collaborative Filtering. The Web Conference (WWW) 2018.');
  L.push('- Walid Krichene and Steffen Rendle. 2020. On Sampled Metrics for Item Recommendation. KDD 2020.');
  return L.join('\n');
};

const main = () => {
  const ctx = load();
  if (FINAL) final(ctx);
  else tune(ctx);
};

try { main(); } catch (err) { console.error(err.message || err); process.exit(1); }
