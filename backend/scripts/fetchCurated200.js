import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OUTPUT_FILE = path.join(__dirname, 'movies-curated-200.json');
const PROGRESS_FILE = path.join(__dirname, 'fetch-progress.json');
const RATE_LIMIT_DELAY = 300; // ms between requests
const MAX_RETRIES = 3;

// Check for --reset flag
const shouldReset = process.argv.includes('--reset');

const CURATED_FILMS = [
  { title: "Battleship Potemkin", year: 1925 },
  { title: "Sunrise: A Song of Two Humans", year: 1927 },
  { title: "Metropolis", year: 1927 },
  { title: "The Passion of Joan of Arc", year: 1928 },
  { title: "Pandora's Box", year: 1929 },
  { title: "City Lights", year: 1931 },
  { title: "M", year: 1931 },
  { title: "Modern Times", year: 1936 },
  { title: "The Rules of the Game", year: 1939 },
  { title: "The Great Dictator", year: 1940 },
  { title: "Bicycle Thieves", year: 1948 },
  { title: "The Third Man", year: 1949 },
  { title: "Rashomon", year: 1950 },
  { title: "Sunset Boulevard", year: 1950 },
  { title: "Ikiru", year: 1952 },
  { title: "Tokyo Story", year: 1953 },
  { title: "Pather Panchali", year: 1955 },
  { title: "The Night of the Hunter", year: 1955 },
  { title: "The Seventh Seal", year: 1957 },
  { title: "Vertigo", year: 1958 },
  { title: "The 400 Blows", year: 1959 },
  { title: "La Dolce Vita", year: 1960 },
  { title: "Breathless", year: 1960 },
  { title: "L'Avventura", year: 1960 },
  { title: "La Jetée", year: 1962 },
  { title: "Knife in the Water", year: 1962 },
  { title: "The Silence", year: 1963 },
  { title: "8½", year: 1963 },
  { title: "The Umbrellas of Cherbourg", year: 1964 },
  { title: "Viridiana", year: 1961 },
  { title: "Pierrot le Fou", year: 1965 },
  { title: "Persona", year: 1966 },
  { title: "Andrei Rublev", year: 1966 },
  { title: "Blow-Up", year: 1966 },
  { title: "Z", year: 1969 },
  { title: "2001: A Space Odyssey", year: 1968 },
  { title: "The Color of Pomegranates", year: 1969 },
  { title: "A Clockwork Orange", year: 1971 },
  { title: "Solaris", year: 1972 },
  { title: "The Godfather", year: 1972 },
  { title: "Aguirre, the Wrath of God", year: 1972 },
  { title: "The Discreet Charm of the Bourgeoisie", year: 1972 },
  { title: "The Conversation", year: 1974 },
  { title: "Jeanne Dielman, 23 quai du Commerce, 1080 Bruxelles", year: 1975 },
  { title: "The Mirror", year: 1975 },
  { title: "Taxi Driver", year: 1976 },
  { title: "The Last Picture Show", year: 1971 },
  { title: "Stalker", year: 1979 },
  { title: "Apocalypse Now", year: 1979 },
  { title: "The Deer Hunter", year: 1978 },
  { title: "The Spirit of the Beehive", year: 1973 },
  { title: "Fanny and Alexander", year: 1982 },
  { title: "Uzak", year: 2002 },
  { title: "Paris, Texas", year: 1984 },
  { title: "Blue Velvet", year: 1986 },
  { title: "Wings of Desire", year: 1987 },
  { title: "Do the Right Thing", year: 1989 },
  { title: "GoodFellas", year: 1990 },
  { title: "The Double Life of Véronique", year: 1991 },
  { title: "A Brighter Summer Day", year: 1991 },
  { title: "The Piano", year: 1993 },
  { title: "Three Colors: Blue", year: 1993 },
  { title: "Chungking Express", year: 1994 },
  { title: "Vive L'Amour", year: 1994 },
  { title: "Before Sunrise", year: 1995 },
  { title: "Taste of Cherry", year: 1997 },
  { title: "The Thin Red Line", year: 1998 },
  { title: "Rosetta", year: 1999 },
  { title: "Yi Yi", year: 2000 },
  { title: "In the Mood for Love", year: 2000 },
  { title: "Mulholland Drive", year: 2001 },
  { title: "Spirited Away", year: 2001 },
  { title: "The Pianist", year: 2002 },
  { title: "City of God", year: 2002 },
  { title: "Lost in Translation", year: 2003 },
  { title: "Oldboy", year: 2003 },
  { title: "Good Night, and Good Luck", year: 2005 },
  { title: "Pan's Labyrinth", year: 2006 },
  { title: "The Host", year: 2006 },
  { title: "There Will Be Blood", year: 2007 },
  { title: "4 Months, 3 Weeks and 2 Days", year: 2007 },
  { title: "The Diving Bell and the Butterfly", year: 2007 },
  { title: "No Country for Old Men", year: 2007 },
  { title: "The Lives of Others", year: 2006 },
  { title: "Waltz with Bashir", year: 2008 },
  { title: "A Prophet", year: 2009 },
  { title: "The Social Network", year: 2010 },
  { title: "A Separation", year: 2011 },
  { title: "The Tree of Life", year: 2011 },
  { title: "Holy Motors", year: 2012 },
  { title: "The Master", year: 2012 },
  { title: "The Great Beauty", year: 2013 },
  { title: "Under the Skin", year: 2013 },
  { title: "Ida", year: 2013 },
  { title: "Boyhood", year: 2014 },
  { title: "The Grand Budapest Hotel", year: 2014 },
  { title: "Slow West", year: 2015 },
  { title: "The Handmaiden", year: 2016 },
  { title: "Toni Erdmann", year: 2016 },
  { title: "Moonlight", year: 2016 },
  { title: "Manchester by the Sea", year: 2016 },
  { title: "The Assassin", year: 2015 },
  { title: "Shoplifters", year: 2018 },
  { title: "Roma", year: 2018 },
  { title: "Parasite", year: 2019 },
  { title: "Portrait of a Lady on Fire", year: 2019 },
  { title: "Uncle Boonmee Who Can Recall His Past Lives", year: 2010 },
  { title: "Drive My Car", year: 2021 },
  { title: "Tár", year: 2022 },
  { title: "Aftersun", year: 2022 },
  { title: "The Worst Person in the World", year: 2021 },
  { title: "Decision to Leave", year: 2022 },
  { title: "Hiroshima Mon Amour", year: 1959 },
  { title: "La Strada", year: 1954 },
  { title: "The Leopard", year: 1963 },
  { title: "Rocco and His Brothers", year: 1960 },
  { title: "Amarcord", year: 1973 },
  { title: "Last Year at Marienbad", year: 1961 },
  { title: "The Cranes Are Flying", year: 1957 },
  { title: "Man with a Movie Camera", year: 1929 },
  { title: "The Red Shoes", year: 1948 },
  { title: "Black Narcissus", year: 1947 },
  { title: "The Color of Paradise", year: 1999 },
  { title: "Close-Up", year: 1990 },
  { title: "Werckmeister Harmonies", year: 2000 },
  { title: "The Sacrifice", year: 1986 },
  { title: "The Return", year: 2003 },
  { title: "Leviathan", year: 2014 },
  { title: "The Tribe", year: 2014 },
  { title: "The White Balloon", year: 1995 },
  { title: "Certified Copy", year: 2010 },
  { title: "Memories of Murder", year: 2003 },
  { title: "The Grandmaster", year: 2013 },
  { title: "Hero", year: 2002 },
  { title: "Still Life", year: 2006 },
  { title: "Platform", year: 2000 },
  { title: "The World", year: 2004 },
  { title: "Goodbye, Dragon Inn", year: 2003 },
  { title: "My Neighbor Totoro", year: 1988 },
  { title: "Akira", year: 1988 },
  { title: "The Elephant Man", year: 1980 },
  { title: "The Battle of Algiers", year: 1966 },
  { title: "The Gospel According to St. Matthew", year: 1964 },
  { title: "The Last Temptation of Christ", year: 1988 },
  { title: "Umberto D.", year: 1952 },
  { title: "Memento", year: 2000 },
  { title: "Inherent Vice", year: 2014 },
  { title: "The Salesman", year: 2016 },
  { title: "Nobody Knows", year: 2004 },
  { title: "The Taste of Others", year: 2000 },
  { title: "The Act of Killing", year: 2012 },
  { title: "Belle de Jour", year: 1967 },
  { title: "The Last Detail", year: 1973 },
  { title: "The Apartment", year: 1960 },
  { title: "The General", year: 1926 },
  { title: "The Grand Illusion", year: 1937 },
  { title: "The Grapes of Wrath", year: 1940 },
  { title: "The Maltese Falcon", year: 1941 },
  { title: "Shadow of a Doubt", year: 1943 },
  { title: "Black Orpheus", year: 1959 },
  { title: "Brokeback Mountain", year: 2005 },
  { title: "The Proposition", year: 2005 },
  { title: "The Last Emperor", year: 1987 },
  { title: "Her", year: 2013 }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const loadProgress = async () => {
  try {
    const data = await fs.readFile(PROGRESS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
};

const saveProgress = async (progress) => {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2));
};

const searchMovie = async (title, year, retries = 0) => {
  try {
    // First attempt: search with year
    let url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
    let response = await axios.get(url);
    
    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0];
    }
    
    // Second attempt: search without year
    url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    response = await axios.get(url);
    
    if (response.data.results && response.data.results.length > 0) {
      // Find closest match by year
      const sorted = response.data.results.sort((a, b) => {
        const yearA = a.release_date ? parseInt(a.release_date.substring(0, 4)) : 9999;
        const yearB = b.release_date ? parseInt(b.release_date.substring(0, 4)) : 9999;
        return Math.abs(yearA - year) - Math.abs(yearB - year);
      });
      return sorted[0];
    }
    
    return null;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(`  Retry ${retries + 1}/${MAX_RETRIES} for: ${title}`);
      await sleep(1000);
      return searchMovie(title, year, retries + 1);
    }
    console.error(`  Error searching ${title}:`, error.message);
    return null;
  }
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
    console.error(`  Error fetching details for ${tmdbId}:`, error.message);
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
    console.error(`  Error fetching credits for ${tmdbId}:`, error.message);
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
    console.error(`  Error fetching keywords for ${tmdbId}:`, error.message);
    return null;
  }
};

const main = async () => {
  console.log(`\n=== Arthouse Atlas: Curated Films Ingestion ===\n`);
  
  // Load existing progress
  let progress = await loadProgress();
  const cachedCount = Object.keys(progress).length;
  
  console.log(`Curated films: ${CURATED_FILMS.length} | Cached progress: ${cachedCount}`);
  
  // Handle --reset flag
  if (shouldReset) {
    console.log(`\n⚠️  --reset flag detected: Clearing progress cache...\n`);
    progress = {};
    try {
      await fs.unlink(PROGRESS_FILE);
    } catch (err) {
      // File might not exist, ignore
    }
  } else if (cachedCount > 0 && cachedCount < CURATED_FILMS.length) {
    console.log(`\n⚠️  WARNING: Progress cache is outdated relative to curated list`);
    console.log(`   Cached: ${cachedCount} | Curated: ${CURATED_FILMS.length}`);
    console.log(`   Run with --reset flag to clear cache and re-fetch all films\n`);
  }
  
  console.log(`Starting TMDB fetch...\n`);
  
  const movies = [];
  const skipped = [];
  
  for (let i = 0; i < CURATED_FILMS.length; i++) {
    const film = CURATED_FILMS[i];
    const key = `${film.title}_${film.year}`;
    
    // Skip if already processed
    if (progress[key]) {
      console.log(`[${i + 1}/${CURATED_FILMS.length}] Skipping (cached): ${film.title} (${film.year})`);
      movies.push(progress[key]);
      continue;
    }
    
    console.log(`[${i + 1}/${CURATED_FILMS.length}] Fetching: ${film.title} (${film.year})...`);
    
    // Search for movie
    const searchResult = await searchMovie(film.title, film.year);
    await sleep(RATE_LIMIT_DELAY);
    
    if (!searchResult) {
      console.log(`  ⚠ NOT FOUND: ${film.title} (${film.year})`);
      skipped.push(film);
      continue;
    }
    
    // Get detailed info
    const [details, credits, keywords] = await Promise.all([
      getMovieDetails(searchResult.id),
      getMovieCredits(searchResult.id),
      getMovieKeywords(searchResult.id)
    ]);
    
    await sleep(RATE_LIMIT_DELAY);
    
    if (!details) {
      console.log(`  ⚠ Failed to fetch details for: ${film.title}`);
      skipped.push(film);
      continue;
    }
    
    // Extract directors
    const directors = credits?.crew
      ?.filter(person => person.job === 'Director')
      .map(person => person.name) || [];
    
    // Extract keywords
    const keywordList = keywords?.keywords?.map(kw => kw.name) || [];
    
    // Get production country
    const country = details.production_countries?.[0]?.name || '';
    
    // Build movie object
    const movieData = {
      title: details.title || film.title,
      year: film.year,
      synopsis: details.overview || '',
      directors,
      runtime: details.runtime || null,
      country,
      posterUrl: details.poster_path 
        ? `https://image.tmdb.org/t/p/w500${details.poster_path}` 
        : '',
      genres: details.genres?.map(g => g.name) || [],
      keywords: keywordList,
      tmdbId: details.id,
      vote_average: details.vote_average || 0,
      vote_count: details.vote_count || 0,
      popularity: details.popularity || 0
    };
    
    movies.push(movieData);
    progress[key] = movieData;
    await saveProgress(progress);
    
    console.log(`  ✅ ${movieData.title}`);
  }
  
  // Save final output
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(movies, null, 2));
  
  console.log(`\n=== Fetch Complete ===`);
  console.log(`✓ Successfully fetched: ${movies.length} movies`);
  console.log(`⚠ Skipped: ${skipped.length} movies`);
  
  if (skipped.length > 0) {
    console.log('\nSkipped films:');
    skipped.forEach(film => console.log(`  - ${film.title} (${film.year})`));
  }
  
  console.log(`\nOutput saved to: ${OUTPUT_FILE}\n`);
};

main();
