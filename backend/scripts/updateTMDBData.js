import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';
import Movie from '../models/Movie.js';

// Load env vars
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

const TARGET_TITLES = [
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

const fetchTMDBData = async () => {
    try {
        if (!TMDB_API_KEY) throw new Error('TMDB_API_KEY not found in .env');

        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('MongoDB Connected');

        for (const title of TARGET_TITLES) {
            console.log(`\nProcessing: ${title}`);
            const movie = await Movie.findOne({ title });

            if (!movie) {
                console.log(`Skipped: Movie not found in DB`);
                continue;
            }

            // 1. Search for movie
            console.log(`Searching TMDB for: ${title} (${movie.year})`);
            let searchRes;
            try {
                searchRes = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
                    params: {
                        api_key: TMDB_API_KEY,
                        query: title,
                        year: movie.year
                    }
                });
            } catch (e) {
                console.error(`Search failed for ${title}:`, e.message);
                if (e.response) console.error('Data:', e.response.data);
                continue;
            }

            if (searchRes.data.results.length === 0) {
                console.log(`No TMDB match found for: ${title}`);
                continue;
            }

            const tmdbMovie = searchRes.data.results[0];
            const tmdbId = tmdbMovie.id;

            // 2. Get Details (Videos, Images)
            const detailsRes = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
                params: {
                    api_key: TMDB_API_KEY,
                    append_to_response: 'videos,images'
                }
            });

            const data = detailsRes.data;

            // 3. Extract Best Assets
            const updates = {};

            if (data.poster_path) {
                updates.posterUrl = `${IMAGE_BASE_URL}${data.poster_path}`;
            }

            if (data.backdrop_path) {
                updates.backdropUrl = `${IMAGE_BASE_URL}${data.backdrop_path}`;
            }

            // Find best trailer
            const videos = data.videos?.results || [];
            const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') || 
                            videos.find(v => v.site === 'YouTube');
            
            if (trailer) {
                updates.trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
            }
            
            // Synopsis if available and longer than current (optional check, here just overwrite)
            if (data.overview) {
                updates.synopsis = data.overview;
            }
            
            updates.tmdbId = tmdbId;

            // 4. Update DB
            await Movie.updateOne({ _id: movie._id }, { $set: updates });
            console.log(`Updated ${title}:`, Object.keys(updates));
            
            // Respect rate limits
            await sleep(250);
        }

    } catch (error) {
        console.error('Script Error:', error);
        if (error.response) {
            console.error('TMDB API Error:', error.response.status, error.response.data);
        }
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

fetchTMDBData();
