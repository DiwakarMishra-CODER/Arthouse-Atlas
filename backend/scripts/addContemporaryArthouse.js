import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';
import { generateTags } from '../services/taggingService.js';
import { calculateArthouseScore } from '../services/arthouseScoring.js';

dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const CONTEMPORARY_ARTHOUSE = [
  { title: "First Cow", year: 2019 },
  { title: "Petite Maman", year: 2021 },
  { title: "Vitalina Varela", year: 2019 }, // May already exist
  { title: "La Chimera", year: 2023 },
  { title: "The Zone of Interest", year: 2023 },
  { title: "Do Not Expect Too Much from the End of the World", year: 2023 },
  { title: "All We Imagine as Light", year: 2024 },
  { title: "EO", year: 2022 },
  { title: "No Bears", year: 2022 },
  { title: "Fallen Leaves", year: 2023 },
  { title: "Anatomy of a Fall", year: 2023 }
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

const addContemporaryArthouse = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');
  
  console.log('=== Adding Contemporary Arthouse (2019-2024) ===');
  console.log(`Films to process: ${CONTEMPORARY_ARTHOUSE.length}\n`);
  
  const alreadyExists = [];
  const added = [];
  const notFound = [];
  
  for (const film of CONTEMPORARY_ARTHOUSE) {
    console.log(`Processing: ${film.title} (${film.year})`);
    
    // Check if already exists
    const existing = await Movie.findOne({ 
      title: { $regex: new RegExp(`^${film.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      year: film.year 
    });
    
    if (existing) {
      console.log(`  ⚠️  Already exists`);
      alreadyExists.push(film);
      continue;
    }
    
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
      tier: 1, // Contemporary arthouse classics = Tier 1
      decade
    };
    
    movieDoc.arthouseScore = calculateArthouseScore(movieDoc);
    
    await Movie.create(movieDoc);
    
    console.log(`  ✅ Added [Score: ${movieDoc.arthouseScore}]`);
    added.push(movieDoc);
  }
  
  const finalCount = await Movie.countDocuments();
  const tier1 = await Movie.countDocuments({ tier: 1 });
  
  console.log(`\n=== Results ===`);
  console.log(`Already in database: ${alreadyExists.length}`);
  console.log(`Successfully added: ${added.length}`);
  console.log(`Not found on TMDB: ${notFound.length}`);
  console.log(`\n=== Final Database ===`);
  console.log(`Total films: ${finalCount}`);
  console.log(`Tier 1 (Curated Canon): ${tier1}\n`);
  
  if (notFound.length > 0) {
    console.log('Not found on TMDB:');
    notFound.forEach(f => console.log(`  - ${f.title} (${f.year})`));
  }
  
  await mongoose.connection.close();
};

addContemporaryArthouse();
