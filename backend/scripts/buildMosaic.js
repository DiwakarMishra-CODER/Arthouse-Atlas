/**
 * Build the home page's wall: every film in the atlas as one image.
 *
 * Downloads each film's still (cached under data/mosaic-cache/, so a re-run
 * only fetches new films), cuts it to a 16:9 tile, and packs all the tiles into
 * a single sprite sheet, so the wall loads as one request instead of 855.
 * Alongside it, mosaic.json maps each tile back to its film and carries the
 * tile's dominant colour.
 *
 * Output (frontend/public/mosaic/): mosaic-1x.webp, a small sheet the wall shows at once;
 * mosaic-2x.webp, the sharp sheet swapped in when it arrives; and mosaic.json.
 * Re-run whenever the catalogue changes:  node scripts/buildMosaic.js
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import sharp from 'sharp';
import connectDB from '../config/database.js';
import Movie from '../models/Movie.js';
import Director from '../models/Director.js';
import Movement from '../models/Movement.js';
import { createLimiter } from './lib/tmdbResolve.js';

dotenv.config();

// double the size the wall shows a tile at, so it's sharp on retina screens
const TILE_W = 192;
const TILE_H = 108;
const COLS = 30;
const CACHE = path.resolve('data/mosaic-cache');
const OUT = path.resolve('../frontend/public/mosaic');
const limit = createLimiter(6);

// a stable shuffle, so the wall looks the same from one build to the next
const shuffle = (xs) => {
  let seed = 42;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

const tileFor = async (film) => {
  const src = film.stills?.[0] || film.backdropUrl;
  if (!src) return null;
  const file = path.join(CACHE, `${film._id}.jpg`);
  if (!fs.existsSync(file)) {
    const res = await fetch(src.replace(/\/t\/p\/(original|w\d+)\//, '/t/p/w300/'));
    if (!res.ok) return null;
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  // centred, like every other place a still is cropped, so a tile and its full still always line up
  const img = sharp(file).resize(TILE_W, TILE_H, { fit: 'cover', position: 'centre' }).sharpen({ sigma: 0.5 });
  const [buf, stats] = await Promise.all([img.clone().jpeg({ quality: 90 }).toBuffer(), img.clone().stats()]);
  const { r, g, b } = stats.dominant;
  return { buf, colour: `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}` };
};

const main = async () => {
  await connectDB();
  fs.mkdirSync(CACHE, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });

  const films = shuffle(await Movie.find({}).select('title year stills backdropUrl canonRank').lean());
  const made = (await Promise.all(films.map((f) => limit(async () => {
    try { return { f, tile: await tileFor(f) }; } catch { return { f, tile: null }; }
  })))).filter((x) => x.tile);

  const rows = Math.ceil(made.length / COLS);
  // the last row is filled out by repeating the first films, so the wall has no gap
  const slots = Array.from({ length: rows * COLS }, (_, i) => made[i % made.length]);
  const composite = slots.map((x, i) => ({ input: x.tile.buf, left: (i % COLS) * TILE_W, top: Math.floor(i / COLS) * TILE_H }));

  const sheet = await sharp({ create: { width: COLS * TILE_W, height: rows * TILE_H, channels: 3, background: '#000' } })
    .composite(composite)
    .png()
    .toBuffer();
  // the sharp sheet, and a half-size one that arrives first
  await sharp(sheet).webp({ quality: 60, effort: 6 }).toFile(path.join(OUT, 'mosaic-2x.webp'));
  await sharp(sheet).resize(COLS * TILE_W / 2).webp({ quality: 62, effort: 6 }).toFile(path.join(OUT, 'mosaic-1x.webp'));

  // the hero's numbers, true as of this build
  const years = films.map((f) => f.year).filter(Boolean);
  const counts = {
    films: films.length,
    directors: await Director.countDocuments(),
    movements: await Movement.countDocuments(),
    from: Math.min(...years),
    to: Math.max(...years)
  };
  const index = {
    tileW: TILE_W, tileH: TILE_H, cols: COLS, rows, films: made.length, counts,
    // s: the still itself, for drawing a tile sharp when the lens or the dive enlarges it
    tiles: slots.map((x) => ({ id: x.f._id, t: x.f.title, y: x.f.year, c: x.tile.colour, r: x.f.canonRank ?? null, s: (x.f.stills?.[0] || x.f.backdropUrl || '').replace(/^https:\/\/image\.tmdb\.org\/t\/p\/[^/]+/, '') }))
  };
  fs.writeFileSync(path.join(OUT, 'mosaic.json'), JSON.stringify(index));

  const size = (p) => `${(fs.statSync(path.join(OUT, p)).size / 1024).toFixed(0)} KB`;
  console.log(`${made.length} of ${films.length} films · ${COLS}×${rows} tiles · 1x ${size('mosaic-1x.webp')} · 2x ${size('mosaic-2x.webp')} · mosaic.json ${size('mosaic.json')}`);
  return mongoose.disconnect();
};

main().catch((err) => { console.error(err); process.exit(1); });
