import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

const updateSingle = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB Connected');

        const title = "Au Revoir les Enfants";
        const dbMovie = await Movie.findOne({ title: { $regex: new RegExp(`^${title}$`, 'i') } });

        if (!dbMovie) {
            console.log('Movie not found in DB');
            return;
        }

        console.log(`Searching TMDB for: ${title}`);
        const searchRes = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
            params: {
                api_key: TMDB_API_KEY,
                query: title,
                year: 1987 // Explicit year for precision
            }
        });

        if (!searchRes.data.results.length) {
            console.log('No results found');
            return;
        }

        const tmdbMovie = searchRes.data.results[0];
        console.log(`Found: ${tmdbMovie.title} (${tmdbMovie.release_date})`);

        // Get details
        const detailsRes = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbMovie.id}?api_key=${TMDB_API_KEY}`);
        const details = detailsRes.data;

        // Get trailer
        let trailerUrl = null;
        try {
            const vidRes = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbMovie.id}/videos?api_key=${TMDB_API_KEY}`);
            const trailer = vidRes.data.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
            if (trailer) trailerUrl = `https://www.youtube.com/embed/${trailer.key}`;
        } catch (e) {}

        const updates = {
            tmdbId: details.id,
            posterUrl: `https://image.tmdb.org/t/p/w500${details.poster_path}`,
            backdropUrl: `https://image.tmdb.org/t/p/original${details.backdrop_path}`,
            synopsis: details.overview,
            trailerUrl: trailerUrl || dbMovie.trailerUrl,
            runtime: details.runtime,
            genres: details.genres.map(g => g.name)
        };

        await Movie.updateOne({ _id: dbMovie._id }, { $set: updates });
        console.log('✅ Successfully updated Au Revoir les Enfants');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

updateSingle();
