/**
 * Puts the moods viewers said (scripts/reports/viewer-moods-plan.json, from fromTags.js) on the films,
 * and takes off the old moods the AI assigned in earlier sessions (editorial.tags).
 *
 *   node scripts/moods/applyViewerMoods.js                    dry run: says what would change
 *   node scripts/moods/applyViewerMoods.js --apply            backs up, writes the viewer moods, checks
 *   node scripts/moods/applyViewerMoods.js --clear-old        backs up, then takes off the old AI-assigned moods
 *                                                             (only once the site reading viewerMoods is live: the
 *                                                             old code reads editorial.tags)
 *   node scripts/moods/applyViewerMoods.js --restore <file>   puts a backup back
 *
 * The backup (data/backups/viewer-moods-<time>.json) holds, for every film, viewerMoods,
 * viewerMoodsAt and editorial.tags as they were.
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { BACKEND, BACKUPS, REPORTS, readJson } from './lib/data.js';
import Movie from '../../models/Movie.js';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const CLEAR_OLD = args.includes('--clear-old');
const restoreAt = args.indexOf('--restore');
const RESTORE = restoreAt >= 0 ? args[restoreAt + 1] : args.find((a) => a.startsWith('--restore='))?.split('=')[1];

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    if (RESTORE) {
      const backup = readJson(path.resolve(RESTORE));
      const ops = backup.films.map((f) => ({
        updateOne: { filter: { _id: f._id }, update: { $set: { viewerMoods: f.viewerMoods || [], viewerMoodsAt: f.viewerMoodsAt || null, 'editorial.tags': f.editorialTags || [] } } },
      }));
      const res = await Movie.bulkWrite(ops, { ordered: false });
      console.log(`restored ${res.modifiedCount} films from ${RESTORE}`);
      return;
    }

    const plan = readJson(path.join(REPORTS, 'viewer-moods-plan.json'));
    const moodsOf = new Map(plan.films.map((f) => [f._id, f.moods.map(({ mood, viewers, words }) => ({ mood, viewers, words: (words || []).slice(0, 3).map(([w]) => w) }))]));
    const films = await Movie.find({}).select('title viewerMoods viewerMoodsAt editorial.tags').lean();
    const oldTagged = films.filter((f) => f.editorial?.tags?.length).length;
    const unknown = [...moodsOf.keys()].filter((id) => !films.some((f) => String(f._id) === id));
    console.log(`plan: ${moodsOf.size} films with viewer moods (built ${plan.builtAt})`);
    console.log(`films in the database: ${films.length}; with the old AI-assigned moods: ${oldTagged}`);
    if (unknown.length) throw new Error(`${unknown.length} films in the plan aren't in the database: run fromTags.js again`);
    if (!APPLY && !CLEAR_OLD) { console.log('dry run: nothing changed. Add --apply to write the viewer moods, then --clear-old once the new code is live (each makes a backup first).'); return; }

    // the backup, before anything changes
    fs.mkdirSync(BACKUPS, { recursive: true });
    const file = path.join(BACKUPS, `viewer-moods-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(file, JSON.stringify({
      takenAt: new Date().toISOString(),
      films: films.map((f) => ({ _id: String(f._id), title: f.title, viewerMoods: f.viewerMoods || [], viewerMoodsAt: f.viewerMoodsAt || null, editorialTags: f.editorial?.tags || [] })),
    }, null, 1));
    console.log(`backup: ${path.relative(BACKEND, file)}`);

    const at = new Date();
    const set = (f) => (CLEAR_OLD ? { 'editorial.tags': [] } : { viewerMoods: moodsOf.get(String(f._id)) || [], viewerMoodsAt: at });
    const ops = films.map((f) => ({ updateOne: { filter: { _id: f._id }, update: { $set: set(f) } } }));
    const res = await Movie.bulkWrite(ops, { ordered: false });
    console.log(`written: ${res.modifiedCount} films`);

    // and checked, read back from the database
    const after = await Movie.find({}).select('viewerMoods editorial.tags').lean();
    const withMoods = after.filter((f) => f.viewerMoods?.length).length;
    const leftOld = after.filter((f) => f.editorial?.tags?.length).length;
    console.log(`check: ${withMoods} films with viewer moods (plan: ${moodsOf.size}); old AI moods left: ${leftOld}`);
    if (withMoods !== moodsOf.size || (CLEAR_OLD && leftOld)) throw new Error(`the database doesn't match the plan: restore with --restore ${path.relative(BACKEND, file)}`);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((err) => { console.error(err.message); process.exit(1); });
