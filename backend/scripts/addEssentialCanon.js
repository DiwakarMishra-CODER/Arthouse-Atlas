import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';
import { generateTags } from '../services/taggingService.js';
import { calculateArthouseScore } from '../services/arthouseScoring.js';

dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const ESSENTIAL_CANON = [
  // 1. Foundational / Pre-1960
  { title: "Vampyr", year: 1932 },
  { title: "Earth", year: 1930 },
  { title: "Tabu", year: 1931 },
  { title: "Diary of a Country Priest", year: 1951 },
  { title: "Pickpocket", year: 1959 },
  { title: "Sansho the Bailiff", year: 1954 },
  { title: "Ordet", year: 1955 },
  
  // 2. Bresson / Dreyer
  { title: "Au Hasard Balthazar", year: 1966 },
  { title: "Mouchette", year: 1967 },
  { title: "Gertrud", year: 1964 },
  
  // 3. Antonioni
  { title: "Red Desert", year: 1964 },
  { title: "L'Eclisse", year: 1962 },
  { title: "The Passenger", year: 1975 },
  
  // 4. Radical 60s-70s
  { title: "Je t'aime, je t'aime", year: 1968 },
  { title: "Weekend", year: 1967 },
  { title: "La Chinoise", year: 1967 },
  { title: "India Song", year: 1975 },
  { title: "Performance", year: 1970 },
  
  // 5. Slow Cinema
  { title: "Satantango", year: 1994 },
  { title: "The Turin Horse", year: 2011 },
  { title: "Gerry", year: 2002 },
  { title: "Elephant", year: 2003 },
  { title: "Horse Money", year: 2014 },
  { title: "Vitalina Varela", year: 2019 },
  
  // 6. Iranian
  { title: "Where Is the Friend's House?", year: 1987 },
  { title: "The Wind Will Carry Us", year: 1999 },
  { title: "Ten", year: 2002 },
  { title: "The House Is Black", year: 1963 },
  
  // 7. Taiwan / East Asian
  { title: "Taipei Story", year: 1985 },
  { title: "The Terrorizers", year: 1986 },
  { title: "Flowers of Shanghai", year: 1998 },
  { title: "Millennium Mambo", year: 2001 },
  { title: "Rebels of the Neon God", year: 1992 },
  
  // 8. Latin American
  { title: "Memories of Underdevelopment", year: 1968 },
  { title: "The Hour of the Furnaces", year: 1968 },
  { title: "La Ciénaga", year: 2001 },
  { title: "Zama", year: 2017 },
  { title: "Japón", year: 2002 },
  
  // 9. European Modern
  { title: "L'Enfant", year: 2005 },
  { title: "The Son", year: 2002 },
  { title: "The Piano Teacher", year: 2001 },
  { title: "Code Unknown", year: 2000 },
  { title: "White Material", year: 2009 },
  { title: "Beau Travail", year: 1999 },
  
  // 10. Recent True Arthouse
  { title: "Pacifiction", year: 2022 },
  { title: "An Elephant Sitting Still", year: 2018 },
  { title: "First Reformed", year: 2017 },
  { title: "Saint Omer", year: 2022 },
  { title: "La Flor", year: 2018 },
  { title: "A Hidden Life", year: 2019 }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const searchMovie = async (title, year) => {
  try {
    let url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
    let response = await axios.get(url);
    
    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0];
    }
    
    // Try without year for obscure films
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

const addEssentialCanon = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');
  
  console.log('=== Adding Essential Arthouse Canon ===');
  console.log(`Total films to process: ${ESSENTIAL_CANON.length}\n`);
  
  const alreadyExists = [];
  const added = [];
  const notFound = [];
  
  let count = 0;
  
  for (const film of ESSENTIAL_CANON) {
    count++;
    console.log(`[${count}/${ESSENTIAL_CANON.length}] ${film.title} (${film.year})`);
    
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
      tier: 1, // Essential canon = Tier 1
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

addEssentialCanon();
