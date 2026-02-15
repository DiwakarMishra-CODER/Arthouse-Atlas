
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import Movie from '../models/Movie.js';
import { generateTags } from '../services/taggingService.js';

dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const essentialClassics = [
  "The Cabinet of Dr. Caligari",
  "The Phantom Carriage",
  "Häxan",
  "Greed",
  "The Last Laugh",
  "Battleship Potemkin",
  "A Page of Madness",
  "Metropolis",
  "Napoleon",
  "Sunrise: A Song of Two Humans",
  "The Passion of Joan of Arc",
  "Un Chien Andalou",
  "Man with a Movie Camera",
  "M",
  "Freaks",
  "The Testament of Dr. Mabuse",
  "L'Atalante",
  "The Rules of the Game",
  "Citizen Kane",
  "Meshes of the Afternoon",
  "Ivan the Terrible",
  "Beauty and the Beast",
  "Paisan",
  "Brief Encounter",
  "Bicycle Thieves",
  "Children of the Beehive",
  "The Red Shoes",
  "The Third Man",
  "Los Olvidados",
  "Rashomon",
  "Tokyo Story",
  "Ugetsu",
  "The Night of the Hunter",
  "Ordet",
  "Pather Panchali",
  "Seven Samurai",
  "A Man Escaped",
  "The Cranes Are Flying",
  "Touch of Evil",
  "Vertigo",
  "The 400 Blows",
  "Psycho",
  "L'Avventura",
  "La Jetée",
  "Vivre Sa Vie",
  "8½",
  "The Umbrellas of Cherbourg",
  "Woman in the Dunes",
  "Persona",
  "The Battle of Algiers",
  "Andrei Rublev",
  "Playtime",
  "2001: A Space Odyssey",
  "Kes",
  "The Color of Pomegranates",
  "Army of Shadows",
  "The Conformist",
  "A Touch of Zen",
  "Pink Flamingos",
  "The Spirit of the Beehive",
  "The Mother and the Whore",
  "Badlands",
  "The Conversation",
  "A Woman Under the Influence",
  "Jeanne Dielman, 23 quai du Commerce, 1080 Bruxelles",
  "Salò, or the 120 Days of Sodom",
  "Nashville",
  "Barry Lyndon",
  "Taxi Driver",
  "Eraserhead",
  "House", // Using "House" to better search TMDB for "Hausu" context
  "Stalker",
  "Pixote",
  "Koyaanisqatsi",
  "Videodrome",
  "Ran",
  "Come and See",
  "Angel's Egg",
  "A Short Film About Killing",
  "A City of Sadness",
  "The Cook, the Thief, His Wife & Her Lover",
  "Tetsuo: The Iron Man",
  "Do the Right Thing",
  "Close-Up",
  "A Brighter Summer Day",
  "Man Bites Dog",
  "Sátántangó",
  "La Haine",
  "Cure",
  "Festen",
  "Beau Travail",
  "Ghost Dog: The Way of the Samurai"
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const searchMovie = async (query) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        query: query,
        include_adult: false
      }
    });
    return response.data.results[0];
  } catch (error) {
    console.error(`Error searching for ${query}:`, error.message);
    return null;
  }
};

const getMovieDetails = async (tmdbId) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
      params: {
        api_key: TMDB_API_KEY,
        append_to_response: 'credits,keywords,images,videos'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error get details for ID ${tmdbId}:`, error.message);
    return null;
  }
};

const seedEsssentialClassics = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const title of essentialClassics) {
            // Check if movie already exists by title
            const existingMovie = await Movie.findOne({ title: { $regex: new RegExp(`^${title}$`, 'i') } });
            if (existingMovie) {
                console.log(`Skipping existing movie: ${title}`);
                continue;
            }

            console.log(`Searching for: ${title}...`);
            const searchResult = await searchMovie(title);

            if (!searchResult) {
                console.warn(`Could not find movie: ${title}`);
                continue;
            }

            // Fetch full details
            const details = await getMovieDetails(searchResult.id);
             if (!details) {
                console.warn(`Could not fetch details for: ${title}`);
                continue;
            }

            // Check if movie already exists by tmdbId (safer than title)
            const existingByTmdbId = await Movie.findOne({ tmdbId: details.id });
            if (existingByTmdbId) {
                console.log(`Skipping existing movie (matched by TMDB ID): ${details.title}`);
                continue;
            }

             // Map to our schema
            const director = details.credits.crew.find(c => c.job === 'Director');
            const keywords = details.keywords.keywords.map(k => k.name);
            const cast = details.credits.cast.slice(0, 5).map(c => c.name);
            const trailer = details.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');

            const derivedTags = generateTags({
                synopsis: details.overview,
                keywords: keywords,
                genres: details.genres.map(g => g.name)
            });

             const newMovie = {
                tmdbId: details.id,
                title: details.title,
                originalTitle: details.original_title,
                year: new Date(details.release_date).getFullYear(),
                duration: details.runtime,
                director: director ? director.name : 'Unknown',
                synopsis: details.overview,
                posterUrl: `https://image.tmdb.org/t/p/w500${details.poster_path}`,
                backdropUrl: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : null,
                genres: details.genres.map(g => g.name),
                keywords: keywords,
                cast: cast,
                trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
                voteAverage: details.vote_average,
                voteCount: details.vote_count,
                 popularity: details.popularity,
                derivedTags: derivedTags,
                decade: Math.floor(new Date(details.release_date).getFullYear() / 10) * 10,
                baseCanonScore: 85, // Default high score for classics list
                movements: [] // Can be populated later
            };

            await Movie.create(newMovie);
            console.log(`Added: ${details.title} (${newMovie.year})`);

            // Be nice to TMDB API
            await sleep(250);
        }

        console.log('\nSeeding completed!');
        await mongoose.connection.close();

    } catch (error) {
        console.error('Seeding error:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

seedEsssentialClassics();
