/**
 * Every picture the site can show, for screen.py to check: films' lead frames, stills and posters,
 * directors' and movements' backdrops and portraits, the film posters movements and studios list,
 * and the frames picked by hand in the frontend. Pictures already in data/blockedFrames.json are
 * left out. Read-only.
 *
 *   node scripts/media/screen/pictures.js      writes scripts/reports/screen-pictures.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Movie from '../../../models/Movie.js';
import Director from '../../../models/Director.js';
import Movement from '../../../models/Movement.js';
import Studio from '../../../models/Studio.js';
import { blockedPictures } from '../lib/blocked.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(BACKEND, '.env') });

const OUT = path.join(BACKEND, 'scripts/reports/screen-pictures.json');
const FRONTEND = path.resolve(BACKEND, '../frontend/src');
const HAND_PICKED = ['components/about/note.js', 'components/about/maker.js', 'components/home/ArthouseBreath.jsx'];
const TMDB_FILE = /^(?:https:\/\/image\.tmdb\.org\/t\/p\/[a-z0-9]+)?\/([A-Za-z0-9]{20,40}\.(?:jpg|png))$/;

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const blocked = new Set(blockedPictures().map((p) => p.file));
  const pictures = {};
  // kind sets the size screen.py downloads: a frame (w780), a poster (w500) or a portrait (h632)
  const add = (url, where, kind) => {
    const file = typeof url === 'string' && url.match(TMDB_FILE)?.[1];
    if (!file || blocked.has(file)) return;
    const p = (pictures[file] ||= { kind, where: [] });
    if (kind === 'frame') p.kind = 'frame';
    p.where.push(where);
  };

  for (const m of await Movie.find({}).select('title year backdropUrl stills posterUrl').lean()) {
    const name = `${m.title} (${m.year})`;
    add(m.backdropUrl, `${name} · lead frame`, 'frame');
    for (const s of m.stills || []) add(s, `${name} · still`, 'frame');
    add(m.posterUrl, `${name} · poster`, 'poster');
  }
  for (const d of await Director.find({}).select('name backdropUrl profileUrl').lean()) {
    add(d.backdropUrl, `${d.name} · director page`, 'frame');
    add(d.profileUrl, `${d.name} · portrait`, 'portrait');
  }
  for (const mv of await Movement.find({}).select('title backdropUrl essentialFilms keyDirectors').lean()) {
    add(mv.backdropUrl, `${mv.title} · movement`, 'frame');
    for (const f of mv.essentialFilms || []) add(f.posterUrl, `${f.title} · poster on ${mv.title}`, 'poster');
    for (const k of mv.keyDirectors || []) add(k.profileUrl, `${k.name} · portrait on ${mv.title}`, 'portrait');
  }
  for (const s of await Studio.find({}).select('name featuredFilms').lean()) {
    for (const f of s.featuredFilms || []) add(f.posterUrl, `${f.title} · poster on ${s.name}`, 'poster');
  }
  for (const f of HAND_PICKED) {
    for (const [hit] of fs.readFileSync(path.join(FRONTEND, f), 'utf8').matchAll(/\/[A-Za-z0-9]{27}\.jpg/g)) add(hit, `frontend/src/${f}`, 'frame');
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(pictures));
  console.log(`${Object.keys(pictures).length} pictures (${blocked.size} blocked ones left out) → ${path.relative(BACKEND, OUT)}`);
};

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
