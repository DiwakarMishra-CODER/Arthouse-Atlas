/**
 * How well can the hand-tagged films predict moods? Validation and the threshold.
 *
 * Read-only on the database. Every hand-tagged film is held out in turn (nested
 * leave-one-out: the regression that scores it is trained without it). The
 * regression is trained on thinned evidence, as derive.js trains it, and the
 * held-out film is scored twice:
 *   matched  its graph evidence thinned like an untagged film's (lib/model.js keepRates); 5 repeats
 *   rich     all of its evidence: an untagged film as well connected as the canon
 * plus, for reference, a model trained and tested without thinning (plain).
 * The threshold is the lowest confidence whose precision is at least 0.82 (the 0.8
 * aim plus a margin) in both the matched and the rich scoring, since untagged films
 * span that range. Choosing it that way is itself cross-validated (chosen on four
 * fifths of the films, scored on the rest).
 *
 *   node scripts/moods/evaluate.js
 *
 * Writes data/moods/evaluation.json (read by derive.js) and scripts/reports/moods-evaluation.md.
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Movie from '../../models/Movie.js';
import { generateTags } from '../../services/taggingService.js';
import { MOODS, SETTINGS, SOURCES, FEATURE_NAMES, LEXICON, buildContext, keepRates, drawKeep, featurize, train, predict, rng } from './lib/model.js';
import { FILM_FIELDS, EVAL_FILE, MOODS_DIR, REPORTS, loadKeywords, loadNeighbours } from './lib/data.js';

const REPS = 5;
const TARGET = 0.8;
const MARGIN = 0.02;
const MIN_PER_REP = 20; // a threshold needs at least this many predictions to be judged
const GRID = Array.from({ length: 19 }, (_, k) => +(0.5 + k * 0.025).toFixed(3));
const SPOT = ['Tokyo Story', 'Mulholland Drive', 'Stalker', 'Persona', 'In the Mood for Love', 'Eraserhead', 'Jeanne Dielman, 23, quai du Commerce, 1080 Bruxelles', '8½', 'Bicycle Thieves', 'Taste of Cherry', 'Bringing Up Baby', 'Come and See'];

// Out-of-fold predictions for every hand-tagged film: with thinning, each held-out film is
// scored on thinned evidence (matched) and on all of it (rich) by the same model
const outOfFold = (ctx, { reps, rates, seed }) => {
  const rand = rng(seed);
  const matched = [];
  const rich = [];
  for (let rep = 0; rep < reps; rep++) {
    for (const h of ctx.tagged) {
      const trainSet = new Set(ctx.tagged.filter((j) => j !== h));
      const usable = (j) => trainSet.has(j);
      const w = train(ctx, trainSet, rates, rand, rates ? SETTINGS.draws : 1);
      const keep = rates ? drawKeep(ctx, rates, rand) : null;
      predict(w, featurize(ctx, h, usable, keep)).forEach((p, m) => matched.push({ h, m, rep, p, y: ctx.Y[h][m] }));
      if (rates) predict(w, featurize(ctx, h, usable, null)).forEach((p, m) => rich.push({ h, m, rep, p, y: ctx.Y[h][m] }));
    }
    console.log(`  ${rates ? 'thinned' : 'plain'} repeat ${rep + 1}/${reps}`);
  }
  return { matched, rich };
};

const score = (rows, t, reps) => {
  const pred = rows.filter((r) => r.p >= t);
  const tp = pred.filter((r) => r.y).length;
  const pos = rows.filter((r) => r.y).length;
  const films = new Set(pred.map((r) => `${r.h}:${r.rep}`)).size / reps;
  return { t, predictions: pred.length / reps, precision: pred.length ? tp / pred.length : null, recall: tp / pos, filmsWithAMood: films };
};

// lowest threshold meeting the aim in both scorings
const choose = (matched, rich, reps) => GRID.find((t) => [matched, rich].every((rows) => {
  const s = score(rows, t, reps);
  return s.predictions >= MIN_PER_REP && s.precision >= TARGET + MARGIN;
})) ?? null;

// Choosing the threshold, cross-validated: on 4/5 of the films, scored on the other 1/5
const crossValidateChoice = (matched, rich, reps, tagged) => {
  const fold = new Map(tagged.map((h, k) => [h, k % 5]));
  const tally = { matched: { tp: 0, np: 0, pos: 0 }, rich: { tp: 0, np: 0, pos: 0 } };
  const picked = [];
  for (let f = 0; f < 5; f++) {
    const inTrain = (r) => fold.get(r.h) !== f;
    const t = choose(matched.filter(inTrain), rich.filter(inTrain), reps) ?? 1;
    picked.push(t);
    for (const [name, rows] of [['matched', matched], ['rich', rich]]) {
      const test = rows.filter((r) => !inTrain(r));
      const pred = test.filter((r) => r.p >= t);
      tally[name].tp += pred.filter((r) => r.y).length; tally[name].np += pred.length; tally[name].pos += test.filter((r) => r.y).length;
    }
  }
  const out = (x) => ({ precision: x.tp / x.np, recall: x.tp / x.pos });
  return { thresholds: picked, matched: out(tally.matched), rich: out(tally.rich) };
};

const perMood = (rows, t, reps) => MOODS.map((mood, m) => {
  const q = rows.filter((r) => r.m === m);
  const pred = q.filter((r) => r.p >= t);
  const tp = pred.filter((r) => r.y).length;
  return { mood, predictions: +(pred.length / reps).toFixed(1), precision: pred.length ? +(tp / pred.length).toFixed(3) : null, recall: +(tp / q.filter((r) => r.y).length).toFixed(3) };
});

// What the old keyword tagger (taggingService) would say for the hand-tagged films
const oldTagger = (films, tagged) => {
  let tp = 0; let np = 0; let pos = 0;
  for (const i of tagged) {
    const f = films[i];
    const truth = new Set(f.editorial.tags);
    const said = generateTags({ synopsis: f.synopsis || '', keywords: f.keywords || [], genres: f.genres || [] }).filter((t) => MOODS.includes(t));
    tp += said.filter((t) => truth.has(t)).length; np += said.length; pos += truth.size;
  }
  return { precision: tp / np, recall: tp / pos, perFilm: np / tagged.length };
};

const pct = (x) => (x == null ? '–' : x.toFixed(2));

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const films = await Movie.find({}).select(FILM_FIELDS).lean();
  await mongoose.disconnect();
  films.sort((a, b) => a.tmdbId - b.tmdbId);

  console.log('Building the context (diffusion kernel, keyword and synopsis similarities)…');
  const ctx = buildContext(films, loadKeywords(), loadNeighbours());
  const rates = keepRates(ctx);
  console.log(`${ctx.tagged.length} hand-tagged films of ${films.length}; keep rates ${JSON.stringify(rates)}`);

  const { matched, rich } = outOfFold(ctx, { reps: REPS, rates, seed: 20261020 });
  const { matched: plain } = outOfFold(ctx, { reps: 1, rates: null, seed: 20261020 });

  const threshold = choose(matched, rich, REPS);
  if (threshold == null) throw new Error('no threshold reaches the precision aim');
  const cv = crossValidateChoice(matched, rich, REPS, ctx.tagged);
  const atT = { matched: score(matched, threshold, REPS), rich: score(rich, threshold, REPS), plain: score(plain, threshold, 1) };
  const curve = GRID.map((t) => ({ t, matched: score(matched, t, REPS), rich: score(rich, t, REPS), plain: score(plain, t, 1) }));
  const moods = { matched: perMood(matched, threshold, REPS), rich: perMood(rich, threshold, REPS), plain: perMood(plain, threshold, 1) };
  const ll = (rows) => -rows.reduce((s, r) => s + Math.log(r.y ? r.p : 1 - r.p), 0) / rows.length;
  const base = MOODS.map((_, m) => ctx.tagged.reduce((s, h) => s + ctx.Y[h][m], 0) / ctx.tagged.length);
  const baseLL = -base.reduce((s, b) => s + b * Math.log(b) + (1 - b) * Math.log(1 - b), 0) / MOODS.length;
  const old = oldTagger(films, ctx.tagged);

  // the regression as trained on everything (what derive.js uses), for the slopes
  const w = train(ctx, new Set(ctx.tagged), rates, rng(7), 5);
  const slopes = Object.fromEntries(FEATURE_NAMES.map((n, k) => [n, +w[k].toFixed(3)]));

  // lexicon: how often a keyword hit agrees with the curators
  const lexicon = MOODS.filter((m) => LEXICON[m]).map((mood) => {
    const m = MOODS.indexOf(mood);
    const hits = ctx.tagged.filter((h) => ctx.lexHit[h][m]);
    return { mood, taggedFilmsWithHit: hits.length, agree: hits.filter((h) => ctx.Y[h][m]).length, untaggedFilmsWithHit: films.filter((_, i) => !ctx.Y[i] && ctx.lexHit[i][m]).length };
  });

  const spot = SPOT.map((title) => {
    const h = films.findIndex((f) => f.title === title);
    if (h < 0 || !ctx.Y[h]) return null;
    const mean = MOODS.map((_, m) => matched.filter((r) => r.h === h && r.m === m).reduce((s, r) => s + r.p, 0) / REPS);
    const said = (ps) => MOODS.map((mood, m) => [mood, ps[m]]).filter(([, p]) => p >= threshold).sort((a, b) => b[1] - a[1]);
    const richMean = MOODS.map((_, m) => rich.filter((r) => r.h === h && r.m === m).reduce((s, r) => s + r.p, 0) / REPS);
    return {
      title,
      hand: films[h].editorial.tags,
      matched: said(mean).map(([mood, p]) => `${mood} ${p.toFixed(2)}`),
      rich: said(richMean).map(([mood, p]) => `${mood} ${p.toFixed(2)}`),
      top3matched: MOODS.map((mood, m) => [mood, mean[m]]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([mood, p]) => `${mood} ${p.toFixed(2)}`)
    };
  }).filter(Boolean);

  const result = {
    builtAt: new Date().toISOString(),
    method: 'pooled logistic regression over (film, mood) pairs on evidence from hand-tagged films; see scripts/moods/lib/model.js',
    settings: SETTINGS, sources: SOURCES, keepRates: rates, repeats: REPS,
    aim: { precision: TARGET, margin: MARGIN, minPredictionsPerRepeat: MIN_PER_REP },
    threshold, thresholdChoiceCrossValidated: cv,
    atThreshold: atT, perMood: moods,
    logLoss: { matched: ll(matched), rich: ll(rich), plain: ll(plain), baseRatesOnly: baseLL },
    oldKeywordTagger: old, slopes, lexicon, curve, spotChecks: spot,
    handTagged: ctx.tagged.length
  };
  fs.mkdirSync(MOODS_DIR, { recursive: true });
  fs.writeFileSync(EVAL_FILE, `${JSON.stringify(result, null, 1)}\n`);

  const md = [
    '# Moods from the hand-tagged films: validation',
    '',
    `Built ${result.builtAt}. ${ctx.tagged.length} films carry five hand-picked moods each; every one was held out in turn and predicted by a model trained without it.`,
    '',
    `**Threshold: ${threshold}**: the lowest confidence with precision ≥ ${(TARGET + MARGIN).toFixed(2)} on both thinned (matched) and full (rich) evidence. Choosing it that way, cross-validated over films (chosen on 4/5, scored on 1/5): precision **${pct(cv.matched.precision)}** matched / **${pct(cv.rich.precision)}** rich, recall ${pct(cv.matched.recall)} / ${pct(cv.rich.recall)} (fold thresholds ${cv.thresholds.join(', ')}).`,
    '',
    '| at the threshold | precision | recall | moods per film | films with ≥1 mood |',
    '|---|---|---|---|---|',
    `| matched (evidence thinned like an untagged film's) | ${pct(atT.matched.precision)} | ${pct(atT.matched.recall)} | ${(atT.matched.predictions / ctx.tagged.length).toFixed(2)} | ${(100 * atT.matched.filmsWithAMood / ctx.tagged.length).toFixed(0)}% |`,
    `| rich (same model, all the film's evidence) | ${pct(atT.rich.precision)} | ${pct(atT.rich.recall)} | ${(atT.rich.predictions / ctx.tagged.length).toFixed(2)} | ${(100 * atT.rich.filmsWithAMood / ctx.tagged.length).toFixed(0)}% |`,
    `| plain (trained and tested unthinned, for reference) | ${pct(atT.plain.precision)} | ${pct(atT.plain.recall)} | ${(atT.plain.predictions / ctx.tagged.length).toFixed(2)} | ${(100 * atT.plain.filmsWithAMood / ctx.tagged.length).toFixed(0)}% |`,
    `| old keyword tagger (taggingService) | ${pct(old.precision)} | ${pct(old.recall)} | ${old.perFilm.toFixed(2)} | – |`,
    '',
    `Log-loss per (film, mood): matched ${result.logLoss.matched.toFixed(3)}, rich ${result.logLoss.rich.toFixed(3)}, plain ${result.logLoss.plain.toFixed(3)}, base rates alone ${baseLL.toFixed(3)}.`,
    `Keep rates (matched regime): ${Object.entries(rates).map(([s, r]) => `${s} ${r.toFixed(2)}`).join(', ')}.`,
    `Slopes (trained on all ${ctx.tagged.length}): ${Object.entries(slopes).map(([n, v]) => `${n} ${v}`).join(', ')}.`,
    '',
    '## Per mood at the threshold',
    '',
    'Small counts make single-mood precision noisy: a mood predicted for 3 films per run is judged on ~3 films.',
    '',
    '| mood | matched P | matched R | films per run | rich P | rich R | films per run |',
    '|---|---|---|---|---|---|---|',
    ...MOODS.map((mood, m) => `| ${mood} | ${pct(moods.matched[m].precision)} | ${pct(moods.matched[m].recall)} | ${moods.matched[m].predictions} | ${pct(moods.rich[m].precision)} | ${pct(moods.rich[m].recall)} | ${moods.rich[m].predictions} |`),
    '',
    '## Precision against threshold',
    '',
    '| threshold | matched P | matched R | films with ≥1 mood | rich P | rich R | films with ≥1 mood |',
    '|---|---|---|---|---|---|---|',
    ...curve.map((c) => `| ${c.t} | ${pct(c.matched.precision)} | ${pct(c.matched.recall)} | ${(100 * c.matched.filmsWithAMood / ctx.tagged.length).toFixed(0)}% | ${pct(c.rich.precision)} | ${pct(c.rich.recall)} | ${(100 * c.rich.filmsWithAMood / ctx.tagged.length).toFixed(0)}% |`),
    '',
    '## Spot checks (held out; moods at or above the threshold)',
    '',
    ...spot.flatMap((s) => [`**${s.title}**: hand: ${s.hand.join(', ')}`, `- matched: ${s.matched.join(', ') || '(none)'}; top three ${s.top3matched.join(', ')}`, `- rich: ${s.rich.join(', ') || '(none)'}`, '']),
    '## Lexicon hits among hand-tagged films',
    '',
    lexicon.map((l) => `${l.mood} ${l.agree}/${l.taggedFilmsWithHit}`).join(' · '),
    ''
  ].join('\n');
  fs.mkdirSync(REPORTS, { recursive: true });
  fs.writeFileSync(path.join(REPORTS, 'moods-evaluation.md'), md);
  console.log(md);
};

main().catch((err) => { console.error(err); process.exit(1); });
