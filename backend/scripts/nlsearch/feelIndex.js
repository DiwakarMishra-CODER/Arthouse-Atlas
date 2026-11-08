/**
 * The feel index: every film as an embedding, so a search's feel words ("sad", "set in winter") can
 * rank the films that fit its filters.
 *
 *   node scripts/nlsearch/feelIndex.js        writes data/feel/index.json (needs data/feel/tags.json)
 *
 * A film is embedded from what viewers called it (its 15 most-used tags, its own director's name left
 * out) and its synopsis. Gemini's embedding model, 256 dimensions, unit length, stored as signed
 * bytes (cosine barely moves, and the file is a quarter the size).
 *
 * Gentle on the free tier, where every text in a batch counts toward the per-minute limits:
 * 50 to a call, a minute apart; on the provider's limit it waits a minute once, then stops, and the
 * next run picks up where it left off (a film already embedded with the same text is kept, so a
 * rebuild only asks for what changed). Viewers' words are not embedded one by one (6,000 of them
 * would take days of free quota): which of them matched is worked out without the API (services/feel.js).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import './lib/env.js'; // .env, then .env.eval's test-only keys on top
import mongoose from 'mongoose';
import Movie from '../../models/Movie.js';
import { normalizeName } from '../../services/nameUtils.js';
import { EMBED_MODEL, EMBED_DIMS, embedBatch, toBytes } from '../../services/feel.js';

const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TAGS = path.join(BACKEND, 'data/feel/tags.json');
const OUT = path.join(BACKEND, 'data/feel/index.json');
const PER_FILM = 15;
const GAP = 65000;
const BATCH = 50; // texts a call: 100 films' synopses came close to the free tier's per-minute limit
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

export const filmText = (film, tags) => {
  const own = new Set((film.directors || []).map(normalizeName));
  const words = (tags || []).map(([t]) => t).filter((t) => !own.has(normalizeName(t))).slice(0, PER_FILM);
  return [words.length ? `Viewers called it: ${words.join(', ')}.` : '', film.synopsis || film.editorial?.hook || ''].filter(Boolean).join(' ');
};

const main = async () => {
  const tagged = JSON.parse(fs.readFileSync(TAGS, 'utf8')).films;
  await mongoose.connect(process.env.MONGODB_URI);
  const films = await Movie.find({}).select('title directors synopsis editorial.hook').lean();
  await mongoose.disconnect();

  const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
  const keep = old?.model === EMBED_MODEL && old?.dims === EMBED_DIMS;
  const index = { model: EMBED_MODEL, dims: EMBED_DIMS, builtAt: new Date().toISOString(), films: {} };

  // what needs asking: films whose text changed, words not embedded yet
  const jobs = [];
  for (const f of films) {
    const id = String(f._id);
    const text = filmText(f, tagged[id]?.tags);
    if (!text) continue;
    const h = hash(text);
    if (keep && old.films[id]?.h === h) index.films[id] = old.films[id];
    else jobs.push({ kind: 'films', key: id, text, h });
  }
  console.log(`${films.length} films; ${jobs.length} to embed in ${Math.ceil(jobs.length / BATCH)} calls, a minute apart`);

  let waited = false;
  for (let i = 0; i < jobs.length; i += BATCH) {
    if (i) await wait(GAP);
    const batch = jobs.slice(i, i + BATCH);
    let vectors;
    try {
      vectors = await embedBatch(batch.map((j) => j.text), { task: 'RETRIEVAL_DOCUMENT' });
    } catch (e) {
      if (!e.limited) throw e;
      if (waited) { console.log(`\nthe provider's limit again: stopping. Run again later to embed the other ${jobs.length - i}.`); break; }
      console.log('\nthe provider\'s limit: waiting a minute, once');
      waited = true; i -= BATCH; await wait(GAP); continue;
    }
    waited = false;
    batch.forEach((j, k) => { index.films[j.key] = { h: j.h, v: toBytes(vectors[k]) }; });
    fs.writeFileSync(OUT, JSON.stringify(index)); // progress kept if a later call fails
    process.stdout.write(`${Math.min(i + BATCH, jobs.length)} `);
  }
  fs.writeFileSync(OUT, JSON.stringify(index));
  console.log(`\nwrote ${path.relative(BACKEND, OUT)}: ${Object.keys(index.films).length} of ${films.length} films, ${Math.round(fs.statSync(OUT).size / 1024)} KB`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
