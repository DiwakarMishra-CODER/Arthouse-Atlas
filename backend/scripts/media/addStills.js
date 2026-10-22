/**
 * More stills from TMDB, so every film has several frames.
 *
 * For each film, TMDB's textless backdrops (no language, so no title text) are
 * the candidates: roughly 16:9, at least 1280 px wide, best voted first. A
 * candidate is skipped when the film already has that file, when it's the same
 * picture under another file name (re-uploaded, re-graded or re-cropped), or
 * when it looks like artwork rather than a frame (lib/frameMatch.js). New stills are appended after the film's own, in the
 * same w780 form, until the film has six distinct frames, its backdrop counted
 * once. A film with no stills is first given its backdrop as stills[0] (as
 * every other film has), so the picture each page leads with doesn't change.
 *
 *   node scripts/media/addStills.js                    dry run: writes the plan and report, nothing else
 *   node scripts/media/addStills.js --apply            backs up every film's stills, applies the plan, re-reads to verify
 *   node scripts/media/addStills.js --restore <file>   (with --apply) puts stills back from a backup
 *
 * Plan and report: scripts/reports/stills-plan.json, stills-report.md (stills-apply.md after --apply)
 * Backups:         data/backups/backup-stills-<time>.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Movie from '../../models/Movie.js';
import { tmdbGet, createLimiter, TMDB_IMAGE } from '../lib/tmdbResolve.js';
import { analyse, fingerprintBuffer, compare, FLAT_ARTWORK } from './lib/frameMatch.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(BACKEND, '.env') });

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const RESTORE = args.includes('--restore') ? args[args.indexOf('--restore') + 1] : null;
const REPORTS = path.join(BACKEND, 'scripts/reports');
const BACKUPS = path.join(BACKEND, 'data/backups');
const PLAN = path.join(REPORTS, 'stills-plan.json');
const PUBLIC = path.resolve(BACKEND, '../frontend/public'); // where self-hosted /stills/ live

const FRAMES = 6;          // distinct frames a film should end with, backdrop included
const MIN_WIDTH = 1280;
const RATIO_SLACK = 0.06;  // |aspect − 16/9|

const api = createLimiter(4);   // TMDB API calls in flight
const cdn = createLimiter(4);   // thumbnail downloads in flight
const films6 = createLimiter(6); // films being worked on at once (bounds memory)

const fileOf = (url) => (url ? url.split('/').pop() : null);
const asStill = (url) => url.replace(/\/t\/p\/[^/]+\//, '/t/p/w780/');
const distinct = (stills, backdropUrl) => new Set([...(stills || []), backdropUrl].map(fileOf).filter(Boolean));
const bucket = (n) => (n >= 4 ? '4–6' : String(n));
const BUCKETS = ['0', '1', '2', '3', '4–6'];
const tally = (counts) => Object.fromEntries(BUCKETS.map((b) => [b, counts.filter((n) => bucket(n) === b).length]));
const sameArray = (a, b) => (a || []).length === (b || []).length && (a || []).every((x, i) => x === b[i]);
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

// A film's existing frame, fingerprinted (TMDB thumbnail, or the self-hosted file)
const fingerprintUrl = async (url) => {
  if (url.startsWith('/stills/')) return fingerprintBuffer(fs.readFileSync(path.join(PUBLIC, url)), fileOf(url));
  return (await cdn(() => analyse(fileOf(url)))).fp;
};

const planFilm = async (f) => {
  const have = distinct(f.stills, f.backdropUrl);
  const need = FRAMES - have.size;
  const base = { _id: String(f._id), title: f.title, year: f.year, tmdbId: f.tmdbId, before: f.stills || [], beforeDistinct: have.size };
  if (need <= 0) return { ...base, status: 'already-full', add: [] };

  const res = await api(() => tmdbGet(`/movie/${f.tmdbId}/images`, { include_image_language: 'null' }));
  const candidates = (res?.backdrops || [])
    .filter((b) => b.iso_639_1 == null && Math.abs(b.aspect_ratio - 16 / 9) <= RATIO_SLACK && b.width >= MIN_WIDTH && !have.has(fileOf(b.file_path)))
    .sort((a, b) => b.vote_average - a.vote_average || b.vote_count - a.vote_count || b.width - a.width);
  if (!candidates.length) return { ...base, status: 'tmdb-has-no-more', add: [] };

  const kept = [];
  const unreadable = [];
  const seen = new Set();
  for (const url of [...(f.stills || []), f.backdropUrl].filter(Boolean)) {
    if (seen.has(fileOf(url))) continue;
    seen.add(fileOf(url));
    try { kept.push(await fingerprintUrl(url)); } catch { unreadable.push(url); } // compared by file name only
  }

  const add = [];
  const skipped = [];
  for (const c of candidates) {
    if (add.length >= need) break;
    const file = fileOf(c.file_path);
    let fp;
    let flat;
    try { ({ fp, flat } = await cdn(() => analyse(file))); } catch { skipped.push({ file, why: 'unreadable' }); continue; }
    if (flat >= FLAT_ARTWORK) { skipped.push({ file, why: 'artwork', flat: +flat.toFixed(3) }); continue; }
    const hit = kept.map((k) => ({ k, ...compare(fp, k) })).find((x) => x.same);
    if (hit) { skipped.push({ file, why: 'same picture', as: hit.k.file, bits: hit.bits, zoom: +hit.zoom.toFixed(3) }); continue; }
    kept.push(fp);
    add.push({ url: `${TMDB_IMAGE.still}${c.file_path}`, vote: c.vote_average, votes: c.vote_count, width: c.width });
  }
  // a film with no stills leads with its backdrop as stills[0], like the rest
  const seed = add.length > 0 && !(f.stills || []).length && f.backdropUrl ? asStill(f.backdropUrl) : null;
  return { ...base, status: add.length ? 'gains' : 'only-duplicates-left', seed, add, skipped, unreadable, candidates: candidates.length };
};

const afterOf = (p) => [...(p.seed ? [p.seed] : p.before), ...p.add.map((a) => a.url)];

const dryRun = async () => {
  // films only: a series (Dekalog) has no TMDB film id, and its credits and pictures came with it
  const films = await Movie.find({ tmdbId: { $type: 'number' } }).select('title year tmdbId stills backdropUrl').lean();
  let done = 0;
  const plan = await Promise.all(films.map((f) => films6(async () => {
    const p = await planFilm(f);
    if (++done % 100 === 0) console.log(`  ${done}/${films.length}`);
    return { ...p, backdropUrl: f.backdropUrl };
  })));
  plan.sort((a, b) => a.title.localeCompare(b.title));

  const afterDistinct = (p) => distinct(afterOf(p), p.backdropUrl).size;
  const gains = plan.filter((p) => p.add.length);
  const summary = {
    films: plan.length,
    filmsGaining: gains.length,
    framesAdded: gains.reduce((n, p) => n + p.add.length, 0),
    seededWithBackdrop: gains.filter((p) => p.seed).length,
    duplicatesSkipped: plan.reduce((n, p) => n + (p.skipped || []).filter((s) => s.why === 'same picture').length, 0),
    artworkSkipped: plan.reduce((n, p) => n + (p.skipped || []).filter((s) => s.why === 'artwork').length, 0),
    stillShort: plan.filter((p) => afterDistinct(p) < FRAMES).length,
    before: tally(plan.map((p) => p.beforeDistinct)),
    after: tally(plan.map(afterDistinct)),
    status: plan.reduce((o, p) => ({ ...o, [p.status]: (o[p.status] || 0) + 1 }), {})
  };
  fs.mkdirSync(REPORTS, { recursive: true });
  fs.writeFileSync(PLAN, JSON.stringify({ generatedAt: new Date().toISOString(), frames: FRAMES, summary, films: plan.filter((p) => p.add.length || p.status !== 'already-full') }, null, 1));

  // ten films spread across where they started
  const pick = [];
  for (const b of ['0', '1', '1', '1', '2', '2', '3', '3', '4–6', '4–6']) {
    const next = gains.find((p) => bucket(p.beforeDistinct) === b && !pick.includes(p) && (p.skipped || []).length);
    const any = next || gains.find((p) => bucket(p.beforeDistinct) === b && !pick.includes(p));
    if (any) pick.push(any);
  }
  const short = plan.filter((p) => afterDistinct(p) < FRAMES);
  const md = [
    '# Stills from TMDB: dry run',
    '',
    `Generated ${new Date().toISOString()}. Six distinct frames per film is the aim (backdrop counted once); candidates are TMDB's textless backdrops, best voted first, with repeats of a frame the film already has skipped.`,
    '',
    `- Films gaining frames: **${summary.filmsGaining}** of ${summary.films}, **${summary.framesAdded}** frames added`,
    `- Films that had no stills and get their backdrop as stills[0] first (so their lead image is unchanged): ${summary.seededWithBackdrop}`,
    `- Candidates skipped as the same picture under another file name: ${summary.duplicatesSkipped}`,
    `- Candidates skipped as artwork (a quarter of the picture a flat fill: cut-outs, vignettes, collages): ${summary.artworkSkipped}`,
    `- Films still short of six (TMDB has no more textless frames): ${summary.stillShort}`,
    '',
    '| distinct frames | before | after |',
    '|---|---|---|',
    ...BUCKETS.map((b) => `| ${b} | ${summary.before[b]} | ${summary.after[b]} |`),
    '',
    '## Ten films and what they gain',
    '',
    ...pick.flatMap((p) => [
      `**${p.title}** (${p.year}): ${p.beforeDistinct} → ${afterDistinct(p)} frames${p.seed ? ' (backdrop seeded as stills[0])' : ''}`,
      ...p.add.map((a) => `- + ${a.url} (vote ${a.vote.toFixed(1)} × ${a.votes}, ${a.width}px)`),
      ...(p.skipped || []).filter((s) => s.why === 'same picture').map((s) => `- skipped ${s.file}: same picture as ${s.as} (hash ${s.bits} bits apart, zoom match ${s.zoom})`),
      ...(p.skipped || []).filter((s) => s.why === 'artwork').map((s) => `- skipped ${s.file}: artwork (flat share ${s.flat})`),
      ''
    ]),
    '## Still short of six',
    '',
    short.map((p) => `${p.title} (${p.year}): ${afterDistinct(p)}`).join(' · ') || 'none',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(REPORTS, 'stills-report.md'), md);
  console.log('Summary:', JSON.stringify(summary, null, 1));
  console.log(`Plan:   ${path.relative(BACKEND, PLAN)}\nReport: scripts/reports/stills-report.md`);
  console.log('Dry run: nothing written to the database. Review, then re-run with --apply.');
};

const apply = async () => {
  if (!fs.existsSync(PLAN)) throw new Error('no plan: run the dry run first');
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  const films = await Movie.find({}).select('title tmdbId stills backdropUrl').lean();
  const byId = new Map(films.map((f) => [String(f._id), f]));

  // back up every film's stills (and backdrop, for reference) before touching any
  fs.mkdirSync(BACKUPS, { recursive: true });
  const backup = path.join(BACKUPS, `backup-stills-${stamp()}.json`);
  fs.writeFileSync(backup, JSON.stringify(films.map((f) => ({ _id: String(f._id), tmdbId: f.tmdbId, title: f.title, stills: f.stills || [], backdropUrl: f.backdropUrl ?? null }))));
  console.log(`Backed up stills of ${films.length} films → ${path.relative(BACKEND, backup)}`);

  const ops = [];
  const changedSincePlan = [];
  for (const p of plan.films.filter((x) => x.add.length)) {
    const f = byId.get(p._id);
    if (!f || !sameArray(f.stills, p.before) || f.backdropUrl !== p.backdropUrl) { changedSincePlan.push(p.title); continue; }
    const filter = p.before.length ? { _id: f._id, stills: p.before } : { _id: f._id, $or: [{ stills: { $exists: false } }, { stills: { $size: 0 } }] };
    ops.push({ updateOne: { filter, update: { $set: { stills: afterOf(p) } } } });
  }
  const res = ops.length ? await Movie.bulkWrite(ops, { ordered: false }) : { matchedCount: 0, modifiedCount: 0 };
  console.log(`Matched ${res.matchedCount}, modified ${res.modifiedCount}; skipped ${changedSincePlan.length} changed since the plan`);

  // verify by reading back
  const now = await Movie.find({}).select('title stills backdropUrl').lean();
  const nowById = new Map(now.map((f) => [String(f._id), f]));
  const mismatched = plan.films.filter((p) => p.add.length && !changedSincePlan.includes(p.title) && !sameArray(nowById.get(p._id)?.stills, afterOf(p)));
  const dist = tally(now.map((f) => distinct(f.stills, f.backdropUrl).size));
  const withStills = now.filter((f) => (f.stills || []).length).length;
  const md = [
    '# Stills from TMDB: applied',
    '',
    `Applied ${new Date().toISOString()} from the plan of ${plan.generatedAt}.`,
    `Backup: \`backend/${path.relative(BACKEND, backup)}\` (every film's stills and backdropUrl before the change).`,
    '',
    `- Updated ${res.modifiedCount} films (${ops.length} planned); ${changedSincePlan.length} skipped because they changed after the plan${changedSincePlan.length ? `: ${changedSincePlan.join(', ')}` : ''}`,
    `- Read back: ${mismatched.length} films differ from the plan${mismatched.length ? `: ${mismatched.map((p) => p.title).join(', ')}` : ''}`,
    `- Films with stills now: ${withStills} of ${now.length}`,
    '',
    '| distinct frames | now |',
    '|---|---|',
    ...BUCKETS.map((b) => `| ${b} | ${dist[b]} |`),
    ''
  ].join('\n');
  fs.writeFileSync(path.join(REPORTS, 'stills-apply.md'), md);
  console.log(md);
};

const restore = async (file) => {
  const saved = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  const films = await Movie.find({}).select('stills').lean();
  const byId = new Map(films.map((f) => [String(f._id), f]));
  const ops = saved.filter((s) => byId.has(s._id) && !sameArray(byId.get(s._id).stills, s.stills))
    .map((s) => ({ updateOne: { filter: { _id: new mongoose.Types.ObjectId(s._id) }, update: { $set: { stills: s.stills } } } }));
  console.log(`${ops.length} films differ from the backup`);
  if (!APPLY) return console.log('Dry run: add --apply to restore them.');
  const res = ops.length ? await Movie.bulkWrite(ops, { ordered: false }) : { modifiedCount: 0 };
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
