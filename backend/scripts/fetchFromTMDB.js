import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory (parent of scripts)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Axios instance (more reliable)
const tmdb = axios.create({
  baseURL: TMDB_BASE_URL,
  timeout: 10000,
  headers: {
    "User-Agent": "ArthouseAtlas/1.0"
  }
});

if (!TMDB_API_KEY) {
  console.error("❌ TMDB_API_KEY not found in environment variables");
  process.exit(1);
}

// Delay helper for rate limiting
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch movie data from TMDB
 */
const fetchMovieFromTMDB = async (title, year = null) => {
  try {
    // 1️⃣ Search movie
    const searchResponse = await tmdb.get("/search/movie", {
      params: {
        api_key: TMDB_API_KEY,
        query: title,
        primary_release_year: year
      }
    });

    if (!searchResponse.data.results.length) {
      console.warn(`⚠️ No results found for: ${title}`);
      return null;
    }

    const movieBasic = searchResponse.data.results[0];
    const movieId = movieBasic.id;

    // 2️⃣ Fetch details
    const detailsResponse = await tmdb.get(`/movie/${movieId}`, {
      params: { api_key: TMDB_API_KEY }
    });

    // 3️⃣ Fetch credits
    const creditsResponse = await tmdb.get(`/movie/${movieId}/credits`, {
      params: { api_key: TMDB_API_KEY }
    });

    const directors = creditsResponse.data.crew
      .filter(person => person.job === "Director")
      .map(d => d.name);

    // Extract cinematographers (Director of Photography)
    const cinematographers = creditsResponse.data.crew
      .filter(person => person.job === "Director of Photography")
      .map(c => c.name);

    // Extract composers (Original Music Composer)
    const composers = creditsResponse.data.crew
      .filter(person => person.job === "Original Music Composer")
      .map(c => c.name);

    // 4️⃣ Fetch keywords
    const keywordsResponse = await tmdb.get(`/movie/${movieId}/keywords`, {
      params: { api_key: TMDB_API_KEY }
    });

    const keywords =
      keywordsResponse.data.keywords?.map(k => k.name) ||
      keywordsResponse.data.keywords?.keywords?.map(k => k.name) ||
      [];

    const movie = detailsResponse.data;

    return {
      title: movie.title,
      year: movie.release_date
        ? new Date(movie.release_date).getFullYear()
        : null,
      synopsis: movie.overview,
      directors,
      runtime: movie.runtime,
      country: movie.production_countries?.[0]?.name || "Unknown",
      posterUrl: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      genres: movie.genres.map(g => g.name),
      keywords,
      tmdbId: movie.id,
      // Arthouse-critical metadata
      cinematographers,
      composers,
      productionCompanies: movie.production_companies?.map(c => c.name) || [],
      backdropUrl: movie.backdrop_path
        ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
        : null
    };
  } catch (error) {
    if (error.response) {
      console.error(
        `❌ Error fetching ${title}:`,
        error.response.status,
        error.response.data
      );
    } else {
      console.error(`❌ Error fetching ${title}:`, error.message);
    }
    return null;
  }
};

/**
 * Fetch movie metadata by TMDB ID (for enriching existing library)
 * Returns only the arthouse-critical metadata fields
 */
export const fetchMovieDetailsById = async (tmdbId) => {
  try {
    // 1️⃣ Fetch details
    const detailsResponse = await tmdb.get(`/movie/${tmdbId}`, {
      params: { api_key: TMDB_API_KEY }
    });

    // 2️⃣ Fetch credits
    const creditsResponse = await tmdb.get(`/movie/${tmdbId}/credits`, {
      params: { api_key: TMDB_API_KEY }
    });

    // Extract cinematographers (Director of Photography)
    const cinematographers = creditsResponse.data.crew
      .filter(person => person.job === "Director of Photography")
      .map(c => c.name);

    // Extract composers (Original Music Composer)
    const composers = creditsResponse.data.crew
      .filter(person => person.job === "Original Music Composer")
      .map(c => c.name);

    const movie = detailsResponse.data;

    return {
      cinematographers,
      composers,
      productionCompanies: movie.production_companies?.map(c => c.name) || [],
      backdropUrl: movie.backdrop_path
        ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
        : null
    };
  } catch (error) {
    if (error.response) {
      console.error(
        `❌ Error fetching tmdbId ${tmdbId}:`,
        error.response.status,
        error.response.data
      );
    } else {
      console.error(`❌ Error fetching tmdbId ${tmdbId}:`, error.message);
    }
    return null;
  }
};

/**
 * Fetch multiple movies
 */
const fetchMovies = async movieList => {
  const results = [];

  for (const movie of movieList) {
    console.log(`Fetching: ${movie.title} (${movie.year || "N/A"})...`);
    const data = await fetchMovieFromTMDB(movie.title, movie.year);

    if (data) {
      results.push(data);
      console.log(`✅ Successfully fetched: ${data.title}`);
    }

    // Rate limit
    await delay(300);
  }

  return results;
};

/**
 * Main
 */
const main = async () => {
  const arthouseMovies = [
    { title: "Portrait of a Lady on Fire", year: 2019 },
    { title: "Stalker", year: 1979 },
    { title: "Paris, Texas", year: 1984 },
    { title: "In the Mood for Love", year: 2000 },
    { title: "The Tree of Life", year: 2011 },
    { title: "Persona", year: 1966 },
    { title: "Chungking Express", year: 1994 },
    { title: "Yi Yi", year: 2000 },
    { title: "La Jetée", year: 1962 },
    { title: "Solaris", year: 1972 },
    { title: "Wings of Desire", year: 1987 },
    { title: "Hiroshima Mon Amour", year: 1959 },
    { title: "Breathless", year: 1960 },
    { title: "Tokyo Story", year: 1953 },
    { title: "The Mirror", year: 1975 },
    { title: "Jeanne Dielman", year: 1975 },
    { title: "Mulholland Drive", year: 2001 },
    { title: "Come and See", year: 1985 },
    { title: "Pierrot le Fou", year: 1965 },
    { title: "Taste of Cherry", year: 1997 },
    { title: "The Spirit of the Beehive", year: 1973 },
    { title: "Cleo from 5 to 7", year: 1962 },
    { title: "Before Sunrise", year: 1995 },
    { title: "Blue Velvet", year: 1986 },
    { title: "Tropical Malady", year: 2004 },
    { title: "Cemetery of Splendour", year: 2015 }
  ];

  console.log(`Starting TMDB fetch for ${arthouseMovies.length} movies...\n`);

  const moviesData = await fetchMovies(arthouseMovies);

  const outputPath = path.join(__dirname, "movies-tmdb.json");
  await fs.writeFile(outputPath, JSON.stringify(moviesData, null, 2));

  console.log(
    `\n🎉 Saved ${moviesData.length} movies to ${outputPath}`
  );
};

// Run script
if (process.argv[1] === __filename) {
  main();
}

export { fetchMovieFromTMDB, fetchMovies };
