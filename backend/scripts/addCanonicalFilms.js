import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';
import { generateTags } from '../services/taggingService.js';
import { calculateArthouseScore } from '../services/arthouseScoring.js';

dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const CANONICAL_FILMS = [
  { title: "L'Inferno", year: 1911 },
  { title: "The Cabinet of Dr. Caligari", year: 1920 },
  { title: "Un chien andalou", year: 1929 },
  { title: "L'Âge d'Or", year: 1930 },
  { title: "L'Atalante", year: 1934 },
  { title: "Rome, Open City", year: 1945 },
  { title: "The Mother and the Whore", year: 1973 },
  { title: "Nights of Cabiria", year: 1957 },
  { title: "F for Fake", year: 1973 },
  { title: "Ugetsu", year: 1953 },
  { title: "Woman in the Dunes", year: 1964 },
  { title: "Sans Soleil", year: 1983 },
  { title: "Tropical Malady", year: 2004 },
  { title: "Wings of Desire", year: 1987 },
  { title: "A Separation", year: 2011 },
  { title: "Cache", year: 2005 },
  { title: "Slow West", year: 2015 },
  { title: "Hands Over the City", year: 1963 }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const searchMovie = async (title, year) => {
  try {
    let url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
    let response = await axios.get(url);
    
    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0];
    }
    
    // Try without year
    url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    response = await axios.get(url);
    
    if (response.data.results && response.data.results.length > 0) {
      const sorted = response.data.results.sort((a, b) => {
        const yearA = a.release_date ? parseInt(a.release_date.substring(0, 4)) : 9999;
        const yearB = b.release_date ? parseInt(b.release_date.substring(0, 4)) : 9999;
        return Math.abs(yearA - year) - Math.abs(yearB - year);
      });
      return sorted[0];
    }
    
    return null;
  } catch (error) {
    console.error(`Error searching ${title}:`, error.message);
    return null;
  }
};

const getMovieDetails = async (tmdbId) => {
  try {
    const [details, credits, keywords] = await Promise.all([
      axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`),
      axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`),
      axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}/keywords?api_key=${TMDB_API_KEY}`)
    ]);
    
    return {
      details: details.data,
      credits: credits.data,
      keywords: keywords.data
    };
  } catch (error) {
    console.error(`Error fetching details for ${tmdbId}:`, error.message);
    return null;
  }
};

const addCanonicalFilms = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');
  
  console.log('=== Adding Canonical Arthouse Films ===\n');
  
  const alreadyExists = [];
  const added = [];
  const notFound = [];
  
  for (const film of CANONICAL_FILMS) {
    // Check if already exists
    const existing = await Movie.findOne({ 
      title: { $regex: new RegExp(`^${film.title}$`, 'i') },
      year: film.year 
    });
    
    if (existing) {
      console.log(`⚠️  Already exists: ${film.title} (${film.year})`);
      alreadyExists.push(film);
      continue;
    }
    
    console.log(`Fetching: ${film.title} (${film.year})...`);
    
    const searchResult = await searchMovie(film.title, film.year);
    await sleep(350);
    
    if (!searchResult) {
      console.log(`  ❌ Not found on TMDB`);
      notFound.push(film);
      continue;
    }
    
    const movieData = await getMovieDetails(searchResult.id);
    await sleep(350);
    
    if (!movieData) {
      notFound.push(film);
      continue;
    }
    
    const { details, credits, keywords: kw } = movieData;
    
    const directors = credits.crew
      ?.filter(person => person.job === 'Director')
      .map(person => person.name) || [];
    
    const keywordList = kw.keywords?.map(k => k.name) || [];
    const country = details.production_countries?.[0]?.name || '';
    const actualYear = details.release_date ? parseInt(details.release_date.substring(0, 4)) : film.year;
    
    const derivedTags = generateTags({
      synopsis: details.overview || '',
      keywords: keywordList,
      genres: details.genres?.map(g => g.name) || []
    });
    
    const decade = Math.floor(actualYear / 10) * 10;
    
    const movieDoc = {
      title: details.title || film.title,
      year: actualYear,
      synopsis: details.overview || '',
      directors,
      runtime: details.runtime || null,
      country,
      posterUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '',
      genres: details.genres?.map(g => g.name) || [],
      keywords: keywordList,
      derivedTags,
      tmdbId: details.id,
      vote_average: details.vote_average || 0,
      vote_count: details.vote_count || 0,
      popularity: details.popularity || 0,
      tier: 1, // Canonical arthouse = Tier 1
      decade
    };
    
    movieDoc.arthouseScore = calculateArthouseScore(movieDoc);
    
    await Movie.create(movieDoc);
    
    console.log(`  ✅ Added: ${movieDoc.title} (${actualYear}) [Score: ${movieDoc.arthouseScore}]`);
    added.push(movieDoc);
  }
  
  const finalCount = await Movie.countDocuments();
  
  console.log(`\n=== Results ===`);
  console.log(`Already in database: ${alreadyExists.length}`);
  console.log(`Successfully added: ${added.length}`);
  console.log(`Not found on TMDB: ${notFound.length}`);
  console.log(`Total films in database: ${finalCount}\n`);
  
  if (notFound.length > 0) {
    console.log('Not found:');
    notFound.forEach(f => console.log(`  - ${f.title} (${f.year})`));
  }
  
  await mongoose.connection.close();
};

addCanonicalFilms();
