/**
 * Derived moods for the films nobody has tagged by hand.
 *
 * Trains the regression on all hand-tagged films (on thinned evidence, as
 * evaluate.js validated it), scores every film without hand tags on all its
 * evidence, and keeps the moods at or above the threshold that evaluate.js chose
 * (data/moods/evaluation.json). Writes two new fields, only on films without hand tags:
 *   moodsDerived    [{ mood, confidence }], strongest first; [] when no mood reaches the threshold
 *   moodsDerivedAt  when they were derived
 * editorial.tags is never touched (the apply step checks it is unchanged).
 *
 *   node scripts/moods/derive.js                       dry run: plan and report, writes nothing
 *   node scripts/moods/derive.js --apply               backs up both fields, applies the plan, re-reads to verify
 *   node scripts/moods/derive.js --restore <file>      (with --apply) puts both fields back from a backup
 *
 * Plan and report: scripts/reports/moods-derived-plan.json, moods-derived.md (moods-derived-apply.md after --apply)
 * Backups:         data/backups/backup-moodsDerived-<time>.json
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Movie from '../../models/Movie.js';
import { MOODS, FEATURE_NAMES, buildContext, keepRates, featurize, train, predict, rng } from './lib/model.js';
import { BACKEND, FILM_FIELDS, EVAL_FILE, REPORTS, BACKUPS, readJson, loadKeywords, loadNeighbours, stamp } from './lib/data.js';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const RESTORE = args.includes('--restore') ? args[args.indexOf('--restore') + 1] : null;
const PLAN = path.join(REPORTS, 'moods-derived-plan.json');
const DRAWS = 5; // thinned copies of each hand-tagged film in the final training set
const SEED = 20261020;

const tagsKey = (f) => JSON.stringify(f.editorial?.tags || []);

const dryRun = async () => {
  if (!fs.existsSync(EVAL_FILE)) throw new Error('no evaluation: run node scripts/moods/evaluate.js first');
  const evaluation = readJson(EVAL_FILE);
  const threshold = evaluation.threshold;

  const films = (await Movie.find({}).select(FILM_FIELDS).lean()).sort((a, b) => a.tmdbId - b.tmdbId);
  const ctx = buildContext(films, loadKeywords(), loadNeighbours());
  const rates = keepRates(ctx);
  const w = train(ctx, new Set(ctx.tagged), rates, rng(SEED), DRAWS);

  const rows = films.map((f, i) => {
    if (ctx.Y[i]) return null;
    const p = predict(w, featurize(ctx, i, () => true, null));
    const ranked = MOODS.map((mood, m) => ({ mood, p: p[m] })).sort((a, b) => b.p - a.p);
    return {
      _id: String(f._id), title: f.title, year: f.year, canonRank: f.canonRank ?? null,
      moodsDerived: ranked.filter((r) => r.p >= threshold).map((r) => ({ mood: r.mood, confidence: +r.p.toFixed(2) })),
      top3: ranked.slice(0, 3).map((r) => ({ mood: r.mood, confidence: +r.p.toFixed(2) }))
    };
  }).filter(Boolean);

  const withMood = rows.filter((r) => r.moodsDerived.length);
  const counts = Object.fromEntries(['0', '1', '2', '3', '4+'].map((k) => [k, rows.filter((r) => (k === '4+' ? r.moodsDerived.length >= 4 : r.moodsDerived.length === +k)).length]));
  const byMood = MOODS.map((mood) => ({
    mood,
    derived: withMood.filter((r) => r.moodsDerived.some((d) => d.mood === mood)).length,
    hand: ctx.tagged.filter((h) => films[h].editorial.tags.includes(mood)).length
  }));
  const plan = { generatedAt: new Date().toISOString(), threshold, evaluationBuiltAt: evaluation.builtAt, keepRates: rates, slopes: Object.fromEntries(FEATURE_NAMES.map((n, k) => [n, +w[k].toFixed(3)])), films: rows.map(({ top3: _t, ...r }) => r) };
  fs.mkdirSync(REPORTS, { recursive: true });
  fs.writeFileSync(PLAN, JSON.stringify(plan, null, 1));

  const famous = rows.filter((r) => r.canonRank).sort((a, b) => a.canonRank - b.canonRank).slice(0, 30);
  const fmt = (list) => list.map((d) => `${d.mood} ${d.confidence.toFixed(2)}`).join(', ');
  const md = [
    '# Derived moods: dry run',
    '',
    `Generated ${plan.generatedAt}. Threshold ${threshold} (from the validation of ${evaluation.builtAt}: precision ${evaluation.thresholdChoiceCrossValidated.matched.precision.toFixed(2)} on evidence thinned like an untagged film's, ${evaluation.thresholdChoiceCrossValidated.rich.precision.toFixed(2)} on full evidence, cross-validated).`,
    '',
    `- Films without hand tags: ${rows.length}; with at least one derived mood: **${withMood.length}** (${(100 * withMood.length / rows.length).toFixed(0)}%)`,
    `- Moods per film: ${Object.entries(counts).map(([k, n]) => `${k}: ${n}`).join(' · ')}`,
    '',
    '| mood | hand-tagged films | derived | together |',
    '|---|---|---|---|',
    ...byMood.map((b) => `| ${b.mood} | ${b.hand} | ${b.derived} | ${b.hand + b.derived} |`),
    '',
    '## The thirty strongest films in the canon without hand tags',
    '',
    'Derived moods, then (in brackets) the three highest confidences whether or not they reach the threshold.',
    '',
    ...famous.map((r) => `- **${r.title}** (${r.year}, #${r.canonRank}): ${fmt(r.moodsDerived) || '—'} [${fmt(r.top3)}]`),
    ''
  ].join('\n');
  fs.writeFileSync(path.join(REPORTS, 'moods-derived.md'), md);
  console.log(md);
  console.log(`Plan: ${path.relative(BACKEND, PLAN)}\nDry run: nothing written to the database. Review, then re-run with --apply.`);
};

const apply = async () => {
  if (!fs.existsSync(PLAN)) throw new Error('no plan: run the dry run first');
  const plan = readJson(PLAN);
  const evaluation = readJson(EVAL_FILE);
  if (evaluation.threshold !== plan.threshold) throw new Error('the threshold changed since the plan was made: re-run the dry run');
  const col = Movie.collection; // the fields are new to the schema, so write past Mongoose's strict casting
  const before = await col.find({}, { projection: { title: 1, 'editorial.tags': 1, moodsDerived: 1, moodsDerivedAt: 1 } }).toArray();
  const byId = new Map(before.map((f) => [String(f._id), f]));
  const handTagged = (f) => (f.editorial?.tags || []).some((t) => MOODS.includes(t));

  // films the plan writes, plus any hand-tagged film carrying a stale derived field
  const stale = before.filter((f) => handTagged(f) && f.moodsDerived !== undefined);
  const touched = [...plan.films.map((r) => byId.get(r._id)).filter(Boolean), ...stale];
  const backup = path.join(BACKUPS, `backup-moodsDerived-${stamp()}.json`);
  fs.mkdirSync(BACKUPS, { recursive: true });
  fs.writeFileSync(backup, JSON.stringify(touched.map((f) => ({ _id: String(f._id), title: f.title, moodsDerived: f.moodsDerived ?? null, moodsDerivedAt: f.moodsDerivedAt ?? null }))));
  console.log(`Backed up moodsDerived/moodsDerivedAt of ${touched.length} films (absent → null) → ${path.relative(BACKEND, backup)}`);

  const now = new Date();
  const skipped = [];
  const ops = [];
  for (const r of plan.films) {
    const f = byId.get(r._id);
    if (!f || handTagged(f)) { skipped.push(r.title); continue; } // hand-tagged since the plan: leave it
    ops.push({ updateOne: { filter: { _id: f._id }, update: { $set: { moodsDerived: r.moodsDerived, moodsDerivedAt: now } } } });
  }
  for (const f of stale) ops.push({ updateOne: { filter: { _id: f._id }, update: { $unset: { moodsDerived: '', moodsDerivedAt: '' } } } });
  const res = ops.length ? await col.bulkWrite(ops, { ordered: false }) : { matchedCount: 0, modifiedCount: 0 };
  console.log(`Matched ${res.matchedCount}, modified ${res.modifiedCount}; skipped ${skipped.length}${skipped.length ? `: ${skipped.join(', ')}` : ''}`);

  // verify by reading back
  const after = await col.find({}, { projection: { title: 1, 'editorial.tags': 1, moodsDerived: 1, moodsDerivedAt: 1 } }).toArray();
  const wrong = plan.films.filter((r) => !skipped.includes(r.title)).filter((r) => {
    const f = after.find((x) => String(x._id) === r._id);
    return !f || JSON.stringify(f.moodsDerived) !== JSON.stringify(r.moodsDerived) || !(f.moodsDerivedAt instanceof Date);
  });
  const tagsChanged = after.filter((f) => tagsKey(f) !== tagsKey(byId.get(String(f._id)) || {}));
  const derivedOnTagged = after.filter((f) => handTagged(f) && f.moodsDerived !== undefined);
  const withMood = after.filter((f) => !handTagged(f) && (f.moodsDerived || []).length).length;
  const md = [
    '# Derived moods: applied',
    '',
    `Applied ${now.toISOString()} from the plan of ${plan.generatedAt} (threshold ${plan.threshold}).`,
    `Backup: \`backend/${path.relative(BACKEND, backup)}\` (the two fields as they were on every film touched; null where absent).`,
    '',
    `- Written: ${res.modifiedCount} of ${ops.length} planned updates; skipped ${skipped.length}`,
    `- Read back: ${wrong.length} films differ from the plan${wrong.length ? `: ${wrong.map((r) => r.title).join(', ')}` : ''}`,
    `- editorial.tags changed on ${tagsChanged.length} films; derived moods on hand-tagged films: ${derivedOnTagged.length}`,
    `- Films without hand tags that now have at least one derived mood: ${withMood}`,
    ''
  ].join('\n');
  fs.writeFileSync(path.join(REPORTS, 'moods-derived-apply.md'), md);
  console.log(md);
};

const restore = async (file) => {
  const saved = readJson(path.resolve(file));
  const ops = saved.map((s) => {
    const _id = new mongoose.Types.ObjectId(s._id);
    if (s.moodsDerived === null && s.moodsDerivedAt === null) return { updateOne: { filter: { _id }, update: { $unset: { moodsDerived: '', moodsDerivedAt: '' } } } };
    return { updateOne: { filter: { _id }, update: { $set: { moodsDerived: s.moodsDerived, moodsDerivedAt: s.moodsDerivedAt ? new Date(s.moodsDerivedAt) : null } } } };
  });
  console.log(`${ops.length} films in the backup`);
  if (!APPLY) return console.log('Dry run: add --apply to restore them.');
  const res = ops.length ? await Movie.collection.bulkWrite(ops, { ordered: false }) : { modifiedCount: 0 };
  console.log(`Restored ${res.modifiedCount} films.`);
};

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    if (RESTORE) await restore(RESTORE);
    else if (APPLY) await apply();
    else await dryRun();
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((err) => { console.error(err); process.exit(1); });
