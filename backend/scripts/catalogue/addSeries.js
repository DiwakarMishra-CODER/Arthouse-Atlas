/**
 * Add the works the lists count as films but TMDB keeps as television: Kieślowski's Dekalog (ten films
 * made for Polish television) and Lynch's Twin Peaks: The Return (an eighteen-hour film, he said).
 *
 * Each becomes one record built from TMDB's series, or the one season it is. It has no film id
 * (tmdbId), so it can't collide with a film's; tmdbTv and tmdbSeason say where it came from, and the
 * media scripts leave it alone. Its pictures are its episodes' own frames, so the 2017 Twin Peaks
 * never shows the 1990 one. The lists reach it by title (altTitles), as they reach any film they
 * name another way, so a rebuild of the canon credits it.
 *
 * Dry run by default (prints the records). --apply adds them, skipping any already there;
 * --restore deletes them again.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Movie from '../../models/Movie.js';
import { tmdbGet, TMDB_IMAGE } from '../lib/tmdbResolve.js';
import { creditsOf } from '../media/credits.js';
import { recomputeDerived } from '../lib/derived.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
const APPLY = process.argv.includes('--apply');
const RESTORE = process.argv.includes('--restore');

const SERIES = [
  { tv: 42699, title: 'Dekalog', year: 1989, directors: ['Krzysztof Kieślowski'], country: 'Poland', altTitles: ['The Decalogue', 'Decalogue'] },
  {
    tv: 1920, season: 3, title: 'Twin Peaks: The Return', year: 2017, directors: ['David Lynch'], country: 'United States of America', altTitles: ['Twin Peaks: The Return [TV]', 'Twin Peaks (2017)'],
    // TMDB's season says only "Twenty-five years later, the story continues..."
    synopsis: 'Twenty-five years later, the story continues: David Lynch and Mark Frost return to Twin Peaks in eighteen parts, every one of them directed by Lynch.'
  }
];
const STILLS = 6;
// television's genre names, as the films' are named
const GENRES = { 'Sci-Fi & Fantasy': ['Science Fiction', 'Fantasy'], 'Action & Adventure': ['Action', 'Adventure'], 'War & Politics': ['War'] };
const NOT_GENRES = new Set(['Kids', 'News', 'Reality', 'Soap', 'Talk']);

// the series as a film: TMDB's show, season and episodes folded into the fields a film record has
const recordOf = async (s) => {
  const show = await tmdbGet(`/tv/${s.tv}`, { append_to_response: 'aggregate_credits,keywords,videos' });
  const seasonNo = s.season ?? 1;
  const season = await tmdbGet(`/tv/${s.tv}/season/${seasonNo}`, { append_to_response: 'aggregate_credits,videos' });
  const episodes = season?.episodes || [];
  const credits = s.season ? season.aggregate_credits : show.aggregate_credits;
  // aggregate credits list a person once with all their roles and jobs; credits.js reads a film's
  const asFilm = {
    credits: {
      cast: (credits?.cast || []).map((c) => ({ name: c.name, character: c.roles?.[0]?.character || '', order: c.order })),
      crew: (credits?.crew || []).flatMap((c) => (c.jobs || []).map((j) => ({ name: c.name, job: j.job })))
    },
    spoken_languages: show.spoken_languages, original_language: show.original_language, tagline: show.tagline
  };
  const crewByJob = (job) => [...new Set(asFilm.credits.crew.filter((c) => c.job === job).map((c) => c.name))].slice(0, 3);
  // one frame from each episode in turn, spread across the whole work
  const frames = [];
  for (const e of episodes.filter((x) => x.still_path)) frames.push(e.still_path);
  const step = Math.max(1, Math.floor(frames.length / STILLS));
  const stills = frames.filter((_, i) => i % step === 0).slice(0, STILLS);
  const videos = [...(season?.videos?.results || []), ...(show.videos?.results || [])].filter((v) => v.site === 'YouTube' && v.type === 'Trailer');
  const trailer = videos.find((v) => v.official) || videos[0];
  const runtime = episodes.reduce((sum, e) => sum + (e.runtime || 0), 0) || null;

  const doc = {
    title: s.title,
    // a season's original title is the show's own ("Twin Peaks"), not this work's
    originalTitle: !s.season && show.original_name && show.original_name !== s.title ? show.original_name : null,
    altTitles: s.altTitles,
    year: s.year,
    decade: Math.floor(s.year / 10) * 10,
    synopsis: s.synopsis || (s.season ? season.overview : '') || show.overview || '',
    directors: s.directors,
    runtime,
    country: s.country,
    countries: (show.production_countries || []).map((c) => c.name),
    posterUrl: (s.season && season.poster_path) || show.poster_path ? `${TMDB_IMAGE.poster}${(s.season && season.poster_path) || show.poster_path}` : undefined,
    backdropUrl: stills[0] ? `${TMDB_IMAGE.backdrop}${stills[0]}` : show.backdrop_path ? `${TMDB_IMAGE.backdrop}${show.backdrop_path}` : null,
    stills: stills.map((p) => `${TMDB_IMAGE.still}${p}`),
    genres: (show.genres || []).flatMap((g) => GENRES[g.name] || (NOT_GENRES.has(g.name) ? [] : [g.name])),
    keywords: (show.keywords?.results || []).map((k) => k.name),
    vote_average: show.vote_average || 0,
    vote_count: show.vote_count || 0,
    popularity: show.popularity || 0,
    trailerUrl: trailer ? `https://www.youtube.com/embed/${trailer.key}` : null,
    cinematographers: crewByJob('Director of Photography'),
    composers: [...new Set([...crewByJob('Original Music Composer'), ...crewByJob('Music')])].slice(0, 3),
    productionCompanies: (show.production_companies || []).map((c) => c.name),
    ...creditsOf(asFilm),
    tmdbTv: s.tv,
    ...(s.season ? { tmdbSeason: s.season } : {}),
    tier: 1, movements: [], curatedMovements: [], curatorNote: null, showCount: 0, lastShownAt: null
  };
  return { ...doc, ...recomputeDerived(doc) };
};

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    if (RESTORE) {
      for (const s of SERIES) {
        const r = await Movie.deleteOne({ tmdbTv: s.tv, title: s.title });
        console.log(`${s.title}: ${r.deletedCount ? 'removed' : 'not there'}`);
      }
      return;
    }
    for (const s of SERIES) {
      const there = await Movie.findOne({ tmdbTv: s.tv, title: s.title }).select('_id').lean();
      if (there) { console.log(`= ${s.title}: already in the atlas`); continue; }
      const doc = await recordOf(s);
      console.log(`${APPLY ? '+' : '[dry run] +'} ${doc.title} (${doc.year}) · ${doc.directors.join(', ')} · ${doc.country} · ${doc.runtime} min · ${doc.stills.length} frames · trailer ${doc.trailerUrl ? 'yes' : 'none'}`);
      console.log(`    cast: ${doc.cast.map((c) => c.name).join(', ')} · written by ${doc.writers.map((w) => w.name).join(', ')} · ${doc.genres.join(', ')} · ${doc.languages.join(', ')}`);
      console.log(`    ${doc.synopsis.slice(0, 160)}…`);
      if (APPLY) await Movie.create(doc);
    }
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((err) => { console.error(err); process.exit(1); });
