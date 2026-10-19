/**
 * Replace backdrops that aren't clean stills, and drop such images from films' stills.
 *
 * TMDB tags every image with a language: a backdrop with a language carries
 * printed text (a title treatment, a festival laurel — the "JAPÓN" frame on
 * the Slow Cinema reel), and some films were given a poster as their
 * backdrop. For each film this checks what its current backdrop really is
 * and, when it's a poster or carries text, picks TMDB's best-voted textless
 * backdrop instead. Films with no textless backdrop on TMDB are left alone
 * and listed. The same test cleans each film's stills: any still that is a
 * poster or carries text is dropped (the reels show stills first).
 *
 *   node scripts/fixBackdrops.js            dry run: report only
 *   node scripts/fixBackdrops.js --apply    back up, then write
 *
 * Report and backup go to $OUT_DIR (default: ./scripts/output).
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Movie from '../models/Movie.js';
import { tmdbGet, createLimiter, TMDB_IMAGE } from './lib/tmdbResolve.js';

dotenv.config();

const APPLY = process.argv.includes('--apply');
const OUT_DIR = process.env.OUT_DIR || path.resolve('scripts/output');
const limit = createLimiter(4);
const pathOf = (url) => (url || '').match(/\/t\/p\/[^/]+(\/.+)$/)?.[1] || null;

const main = async () => {
  await connectDB();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const films = await Movie.find({ tmdbId: { $exists: true } }).select('title year tmdbId backdropUrl posterUrl stills').lean();

  const rows = await Promise.all(films.map((f) => limit(async () => {
    const current = pathOf(f.backdropUrl);
    const imgs = await tmdbGet(`/movie/${f.tmdbId}/images`); // no language filter: every image, so a text-bearing current backdrop is always found
    if (!imgs) return { film: f, status: 'no-images' };
    const backdrops = imgs.backdrops || [];
    const clean = backdrops.filter((b) => b.iso_639_1 === null).sort((a, b) => b.vote_average - a.vote_average || b.width - a.width);
    const asBackdrop = backdrops.find((b) => b.file_path === current);
    const asPoster = (imgs.posters || []).some((p) => p.file_path === current) || (current && current === pathOf(f.posterUrl));

    // stills TMDB marks as carrying text, or that are really posters
    const tagged = new Map(backdrops.map((b) => [b.file_path, b.iso_639_1]));
    const posterPaths = new Set((imgs.posters || []).map((p) => p.file_path));
    const dirtyStills = (f.stills || []).filter((u) => { const p = pathOf(u); return posterPaths.has(p) || !!tagged.get(p); });

    let problem = null;
    if (!current) problem = 'missing';
    else if (asPoster) problem = 'poster';
    else if (asBackdrop && asBackdrop.iso_639_1) problem = `text (${asBackdrop.iso_639_1})`;
    if (!problem) return { film: f, status: 'ok', dirtyStills };
    if (!clean.length) return { film: f, status: 'no-clean-backdrop', problem, dirtyStills };
    return { film: f, status: 'replace', problem, dirtyStills, next: `${TMDB_IMAGE.backdrop}${clean[0].file_path}` };
  })));

  const by = (s) => rows.filter((r) => r.status === s);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: Object.fromEntries(['ok', 'replace', 'no-clean-backdrop', 'no-images'].map((s) => [s, by(s).length])),
    replace: by('replace').map((r) => ({ title: r.film.title, year: r.film.year, problem: r.problem, from: r.film.backdropUrl, to: r.next })),
    noCleanBackdrop: by('no-clean-backdrop').map((r) => ({ title: r.film.title, year: r.film.year, problem: r.problem })),
    stillsDropped: rows.filter((r) => r.dirtyStills?.length).map((r) => ({ title: r.film.title, year: r.film.year, drop: r.dirtyStills }))
  };
  report.summary.filmsWithStillsDropped = report.stillsDropped.length;
  report.summary.stillsDropped = report.stillsDropped.reduce((n, r) => n + r.drop.length, 0);
  const reportPath = path.join(OUT_DIR, 'fixBackdrops-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('Summary:', report.summary);
  console.log(`Report: ${reportPath}`);

  if (!APPLY) {
    console.log('Dry run — nothing written. Re-run with --apply after review.');
    return mongoose.disconnect();
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const touched = rows.filter((r) => r.status === 'replace' || r.dirtyStills?.length);
  fs.writeFileSync(path.join(OUT_DIR, `backup-backdrops-${stamp}.json`), JSON.stringify(touched.map((r) => ({ _id: r.film._id, backdropUrl: r.film.backdropUrl, stills: r.film.stills }))));
  for (const r of touched) {
    const $set = {};
    if (r.status === 'replace') $set.backdropUrl = r.next;
    if (r.dirtyStills?.length) $set.stills = r.film.stills.filter((u) => !r.dirtyStills.includes(u));
    await Movie.updateOne({ _id: r.film._id }, { $set });
  }
  console.log(`Backed up ${touched.length} films; replaced ${by('replace').length} backdrops, cleaned stills on ${report.stillsDropped.length}.`);
  return mongoose.disconnect();
};

main().catch((err) => { console.error(err); process.exit(1); });
