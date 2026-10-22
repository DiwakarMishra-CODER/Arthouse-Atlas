/**
 * What a shared link shows: each film's, director's, movement's and studio's title, one line about
 * it and its picture, for the link previews WhatsApp, LinkedIn, Slack, X and the rest draw. They
 * don't run the page's JavaScript, so the frontend's middleware.js puts these into the page's HTML
 * from the files written here. Read-only: nothing in the database changes.
 *
 * Writes frontend/public/meta/{films,directors,movements,studios}.json, each { key: [title, line, picture, facts] }
 * (the key is the one in the page's address; the picture is a TMDB path, a /stills/ path, or null;
 * facts, where there are any, feed the page's structured data: a film's own title, year, directors
 * and country, or a movement's slug, its one canonical address).
 * And frontend/public/sitemap.xml: every page a search engine should know, at its canonical address.
 * Run it again after the catalogue changes:  node scripts/exportMeta.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Movie from '../models/Movie.js';
import { directorIndex } from '../services/directorIndex.js';
import { studioIndex } from '../services/studios.js';
import { getMovements } from '../controllers/movementController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(__dirname, '..');
const PUBLIC = path.resolve(BACKEND, '../frontend/public');
const OUT = path.join(PUBLIC, 'meta');
const SITE_URL = process.env.SITE_URL || 'https://arthouse-atlas.vercel.app';
// the rooms a search engine should know (sign-in and the profile stay out, as robots.txt says)
const ROOMS = ['/', '/explore', '/directors', '/movements', '/studios', '/recommendations', '/about'];
dotenv.config({ path: path.join(BACKEND, '.env') });

// a TMDB picture as its path ("/abc.jpg"), so the middleware can ask for the size previews want
const pathOf = (url) => (url ? url.replace(/^https:\/\/image\.tmdb\.org\/t\/p\/[a-z0-9]+(?=\/)/, '') : null);
const firstSentence = (text) => (text || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s/)[0] || '';
const clip = (text, n = 200) => (text.length > n ? `${text.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : text);
const listed = (names) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]);
const filmsWord = (n) => `${n} ${n === 1 ? 'film' : 'films'}`;
// a full stop, unless the sentence already ends on one (a title like "Where Is the Friend's House?")
const stop = (text) => (/[.!?…]$/.test(text) ? text : `${text}.`);

// the movements, exactly as the site's own /api/movements answers (their pictures are worked out there)
const movementsAsServed = () => new Promise((resolve, reject) => {
  const res = { json: resolve, status: () => ({ json: (body) => reject(new Error(body?.message || 'movements failed')) }) };
  getMovements({}, res);
});

const films = async () => {
  const all = await Movie.find({}).select('title year directors country editorial.hook tagline synopsis backdropUrl stills').lean();
  return Object.fromEntries(all.map((f) => {
    const by = f.directors?.length ? `A film by ${listed(f.directors)}` : null;
    const line = f.editorial?.hook || f.tagline || firstSentence(f.synopsis);
    const description = clip([line, [by, f.country, f.year].filter(Boolean).join(', ')].filter(Boolean).join(' · '));
    const facts = { n: f.title, ...(f.year ? { y: f.year } : {}), ...(f.directors?.length ? { d: f.directors } : {}), ...(f.country ? { c: f.country } : {}) };
    return [String(f._id), [`${f.title}${f.year ? ` (${f.year})` : ''}`, description, pathOf(f.backdropUrl || f.stills?.[0]), facts]];
  }));
};

const directors = async () => {
  const { directors: all } = await directorIndex();
  return Object.fromEntries(all.map((d) => {
    const ranked = [...(d.f || [])].sort((a, b) => (a.r ?? Infinity) - (b.r ?? Infinity));
    const among = ranked.slice(0, 3).map((f) => f.t);
    const description = d.f?.length ? stop(`${filmsWord(d.f.length)} in the atlas${among.length ? `, among them ${listed(among)}` : ''}`) : 'In the atlas.';
    return [String(d.id), [d.n, clip(description), ranked.find((f) => f.s)?.s || null]];
  }));
};

const movements = async () => {
  const all = await movementsAsServed();
  const out = {};
  for (const m of all) {
    const description = clip([m.tagline, m.era, m.filmCount ? `${filmsWord(m.filmCount)} in the atlas` : null].filter(Boolean).join(' · '));
    const entry = [m.title, description, pathOf(m.heroBackdrop), m.tag ? { s: m.tag } : {}];
    // addressed by slug, and by id as the site also allows
    if (m.tag) out[m.tag] = entry;
    out[String(m._id)] = entry;
  }
  return out;
};

const studios = async () => {
  const all = await studioIndex();
  return Object.fromEntries(all.map((s) => {
    const years = s.years?.length === 2 ? `, ${s.years[0]} to ${s.years[1]}` : '';
    const description = `${filmsWord(s.count)} in the atlas${years}.${s.country ? ` ${s.country}.` : ''}`;
    return [s.slug, [s.name, clip(description), s.run?.find((f) => f.s)?.s || null]];
  }));
};

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    fs.mkdirSync(OUT, { recursive: true });
    const written = {};
    for (const [name, make] of Object.entries({ films, directors, movements, studios })) {
      const data = await make();
      written[name] = data;
      fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(data));
      console.log(`${name}.json: ${Object.keys(data).length} entries`);
    }
    // a movement is listed once, at its slug (the files also answer to its id)
    const pages = [
      ...ROOMS,
      ...Object.keys(written.films).map((k) => `/movie/${k}`),
      ...Object.keys(written.directors).map((k) => `/directors/${k}`),
      ...Object.keys(written.movements).filter((k) => !/^[a-f0-9]{24}$/.test(k)).map((k) => `/movements/${encodeURIComponent(k)}`),
      ...Object.keys(written.studios).map((k) => `/studios/${encodeURIComponent(k)}`),
    ];
    const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...pages.map((p) => `  <url><loc>${SITE_URL}${p === '/' ? '/' : p}</loc></url>`), '</urlset>', ''].join('\n');
    fs.writeFileSync(path.join(PUBLIC, 'sitemap.xml'), xml);
    console.log(`sitemap.xml: ${pages.length} pages`);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((err) => { console.error(err); process.exit(1); });
