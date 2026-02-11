import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Movie from '../models/Movie.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OUTPUT_FILE = path.join(__dirname, 'movies-expanded.json');
const PROGRESS_FILE = path.join(__dirname, 'expansion-progress.json');
const RATE_LIMIT_DELAY = 350; // ms between requests
const MAX_RETRIES = 3;
const CONCURRENT_LIMIT = 3;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const loadProgress = async () => {
  try {
    const data = await fs.readFile(PROGRESS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { tier2: [], tier3: [], existingIds: new Set() };
  }
};

const saveProgress = async (progress) => {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify({
    ...progress,
    existingIds: Array.from(progress.existingIds)
  }, null, 2));
};

const getMovieDetails = async (tmdbId, retries = 0) => {
  try {
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      await sleep(1000);
      return getMovieDetails(tmdbId, retries + 1);
    }
    return null;
  }
};

const getMovieCredits = async (tmdbId, retries = 0) => {
  try {
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      await sleep(1000);
      return getMovieCredits(tmdbId, retries + 1);
    }
    return null;
  }
};

const getMovieKeywords = async (tmdbId, retries = 0) => {
  try {
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}/keywords?api_key=${TMDB_API_KEY}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      await sleep(1000);
      return getMovieKeywords(tmdbId, retries + 1);
    }
    return null;
  }
};

const discoverMovies = async (params, retries = 0) => {
  try {
    const url = `${TMDB_BASE_URL}/discover/movie`;
    const response = await axios.get(url, {
      params: { api_key: TMDB_API_KEY, ...params }
    });
    return response.data;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      await sleep(1000);
      return discoverMovies(params, retries + 1);
    }
    return null;
  }
};

const processMovie = async (tmdbId, tier, existingIds) => {
  if (existingIds.has(tmdbId)) {
    return null;
  }

  const [details, credits, keywords] = await Promise.all([
    getMovieDetails(tmdbId),
    getMovieCredits(tmdbId),
    getMovieKeywords(tmdbId)
  ]);

  if (!details) return null;

  const directors = credits?.crew
    ?.filter(person => person.job === 'Director')
    .map(person => person.name) || [];

  const keywordList = keywords?.keywords?.map(kw => kw.name) || [];
  const country = details.production_countries?.[0]?.name || '';
  const year = details.release_date ? parseInt(details.release_date.substring(0, 4)) : null;

  if (!year || year < 1920 || year > 2023) return null;

  return {
    title: details.title,
    year,
    synopsis: details.overview || '',
    directors,
    runtime: details.runtime || null,
    country,
    posterUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '',
    genres: details.genres?.map(g => g.name) || [],
    keywords: keywordList,
    tmdbId: details.id,
    vote_average: details.vote_average || 0,
    vote_count: details.vote_count || 0,
    popularity: details.popularity || 0,
    tier
  };
};

const fetchTier2 = async (tier1Directors, existingIds) => {
  console.log('\n=== TIER 2: Director-based Expansion ===');
  console.log(`Fetching films from ${tier1Directors.length} directors...\n`);

  const tier2Movies = [];
  const processedIds = new Set();

  for (const director of tier1Directors) {
    console.log(`Searching for: ${director}`);
    
    // Search for director
    const searchUrl = `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(director)}`;
    const searchResult = await axios.get(searchUrl);
    await sleep(RATE_LIMIT_DELAY);

    if (!searchResult.data.results || searchResult.data.results.length === 0) {
      console.log(`  ⚠ Director not found`);
      continue;
    }

    const directorId = searchResult.data.results[0].id;

    // Get director's filmography
    const creditsUrl = `${TMDB_BASE_URL}/person/${directorId}/movie_credits?api_key=${TMDB_API_KEY}`;
    const creditsResult = await axios.get(creditsUrl);
    await sleep(RATE_LIMIT_DELAY);

    const directedMovies = creditsResult.data.crew
      ?.filter(movie => movie.job === 'Director')
      .filter(movie => movie.vote_average >= 7.5 && movie.vote_count >= 1000)
      .filter(movie => !existingIds.has(movie.id) && !processedIds.has(movie.id))
      .slice(0, 10) || [];

    console.log(`  Found ${directedMovies.length} eligible films`);

    for (const movie of directedMovies) {
      const movieData = await processMovie(movie.id, 2, existingIds);
      if (movieData) {
        tier2Movies.push(movieData);
        processedIds.add(movie.id);
        existingIds.add(movie.id);
        console.log(`  ✅ ${movieData.title} (${movieData.year})`);
      }
      await sleep(RATE_LIMIT_DELAY);
    }
  }

  return tier2Movies;
};

const fetchTier3 = async (existingIds, target = 500) => {
  console.log('\n=== TIER 3: Discovery Expansion ===');
  console.log(`Target: ${target} films\n`);

  const tier3Movies = [];
  const genres = [18, 10749, 36, 10402]; // Drama, Romance, History, Music
  let page = 1;
  const maxPages = 50;

  while (tier3Movies.length < target && page <= maxPages) {
    console.log(`Fetching page ${page}...`);

    const results = await discoverMovies({
      'vote_average.gte': 7.0,
      'vote_count.gte': 500,
      with_genres: genres.join('|'),
      'primary_release_date.gte': '1920-01-01',
      'primary_release_date.lte': '2023-12-31',
      sort_by: 'vote_average.desc',
      page
    });

    if (!results || !results.results || results.results.length === 0) {
      break;
    }

    const batch = [];
    for (const movie of results.results.slice(0, 5)) {
      if (existingIds.has(movie.id)) continue;
      if (tier3Movies.length >= target) break;

      batch.push(processMovie(movie.id, 3, existingIds).then(data => {
        if (data) {
          tier3Movies.push(data);
          existingIds.add(movie.id);
          console.log(`  ✅ ${data.title} (${data.year}) - ${data.vote_average.toFixed(1)}/10`);
        }
        return data;
      }));

      if (batch.length >= CONCURRENT_LIMIT) {
        await Promise.all(batch);
        batch.length = 0;
        await sleep(RATE_LIMIT_DELAY);
      }
    }

    await Promise.all(batch);
    page++;
    await sleep(RATE_LIMIT_DELAY * 2);
  }

  return tier3Movies;
};

const main = async () => {
  console.log('\n=== Arthouse Atlas: Database Expansion ===\n');

  // Connect to MongoDB to get existing movies
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const existingMovies = await Movie.find({}, 'tmdbId directors');
  const existingIds = new Set(existingMovies.map(m => m.tmdbId).filter(Boolean));
  const tier1Directors = [...new Set(existingMovies.flatMap(m => m.directors))];

  console.log(`Existing films: ${existingMovies.length}`);
  console.log(`Unique directors: ${tier1Directors.length}`);
  console.log(`Starting expansion...\n`);

  await mongoose.connection.close();

  let progress = await loadProgress();
  progress.existingIds = existingIds;

  // Tier 2 - Director-based
  if (progress.tier2.length === 0) {
    const tier2 = await fetchTier2(tier1Directors, existingIds);
    progress.tier2 = tier2;
    await saveProgress(progress);
    console.log(`\nTier 2 complete: ${tier2.length} films`);
  } else {
    console.log(`\nTier 2 already fetched: ${progress.tier2.length} films`);
  }

  // Tier 3 - Discovery
  const tier3Target = 500;
  if (progress.tier3.length < tier3Target) {
    const tier3 = await fetchTier3(existingIds, tier3Target - progress.tier3.length);
    progress.tier3 = progress.tier3.concat(tier3);
    await saveProgress(progress);
    console.log(`\nTier 3 complete: ${progress.tier3.length} films`);
  } else {
    console.log(`\nTier 3 already fetched: ${progress.tier3.length} films`);
  }

  // Save final output
  const allMovies = [...progress.tier2, ...progress.tier3];
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(allMovies, null, 2));

  console.log(`\n=== Expansion Complete ===`);
  console.log(`Tier 2: ${progress.tier2.length} films`);
  console.log(`Tier 3: ${progress.tier3.length} films`);
  console.log(`Total new films: ${allMovies.length}`);
  console.log(`Output: ${OUTPUT_FILE}\n`);
};

main();
