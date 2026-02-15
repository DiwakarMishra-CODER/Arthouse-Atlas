import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js';

// ESM dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from parent directory (backend root)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

const MOVIES_TO_UPDATE = [
    "Au Revoir les Enfants",
    "All About Lily Chou-Chou",
    "An Elephant Sitting Still",
    "Opening Night",
    "Aparajito",
    "Apur Sansar",
    "Lady Bird",
    "Whiplash",
    "Burning",
    "Paterson"
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

async function getTrailer(tmdbId) {
    try {
        const response = await axios.get(
            `${TMDB_BASE_URL}/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}`
        );
        
        const videos = response.data.results;
        const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube') ||
                       videos.find(v => v.type === 'Teaser' && v.site === 'YouTube');
                       
        return trailer ? `https://www.youtube.com/embed/${trailer.key}` : null;
    } catch (error) {
        return null; // Silent fail for trailer
    }
}

async function getCredits(tmdbId) {
    try {
        const response = await axios.get(
            `${TMDB_BASE_URL}/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`
        );
        return response.data;
    } catch (error) {
        return null;
    }
}

async function updateMovies() {
    try {
        await connectDB();
        
        let updatedCount = 0;
        let errorCount = 0;

        for (const title of MOVIES_TO_UPDATE) {
            console.log(`\nProcessing: ${title}`);

            // 1. Find the existing movie in DB to preserve ID/other fields
            const dbMovie = await Movie.findOne({ title: { $regex: new RegExp(`^${title}$`, 'i') } });
            
            if (!dbMovie) {
                console.log(`❌ Movie not found in DB (skipping): ${title}`);
                continue; // Only update existing
            }

            // 2. Search TMDB
            console.log(`Searching TMDB...`);
            let searchRes;
            try {
                searchRes = await axios.get(
                    `${TMDB_BASE_URL}/search/movie`, {
                        params: {
                            api_key: TMDB_API_KEY,
                            query: title,
                            year: dbMovie.year
                        }
                    }
                );
            } catch (e) {
                console.error(`❌ TMDB Search Error for ${title}:`, e.message);
                if (e.response) console.error(e.response.data);
                errorCount++;
                continue;
            }

            if (!searchRes.data.results?.length) {
                console.log(`❌ No TMDB results found for: ${title}`);
                errorCount++;
                continue;
            }

            const tmdbMovie = searchRes.data.results[0];
            const tmdbId = tmdbMovie.id;

            // 3. Fetch Full Details
            const detailsRes = await axios.get(
                `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`
            );
            const details = detailsRes.data;

            // 4. Fetch Extras
            const credits = await getCredits(tmdbId);
            const directors = credits?.crew
                .filter(c => c.job === 'Director')
                .map(c => c.name) || [];
            
            const trailerUrl = await getTrailer(tmdbId);

            // 5. Construct Update Object
            const updates = {
                tmdbId: details.id,
                synopsis: details.overview,
                posterUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : dbMovie.posterUrl,
                backdropUrl: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : dbMovie.backdropUrl,
                trailerUrl: trailerUrl || dbMovie.trailerUrl,
                genres: details.genres.map(g => g.name),
                runtime: details.runtime || dbMovie.runtime,
                country: details.production_countries?.[0]?.name,
                vote_average: details.vote_average,
                vote_count: details.vote_count,
                popularity: details.popularity,
                // Ensure directors are updated if TMDB has them
                directors: directors.length > 0 ? directors : dbMovie.directors
            };

            // 6. Update DB
            await Movie.updateOne({ _id: dbMovie._id }, { $set: updates });
            console.log(`✅ Updated: ${title}`);
            updatedCount++;

            // Rate limit
            await sleep(300);
        }

        console.log(`\n--- Update Complete ---`);
        console.log(`Updated: ${updatedCount}`);
        console.log(`Errors: ${errorCount}`);

        process.exit(0);

    } catch (error) {
        console.error('Script Fatal Error:', error);
        process.exit(1);
    }
}

updateMovies();
