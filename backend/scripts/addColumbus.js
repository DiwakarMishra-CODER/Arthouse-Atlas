import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js';

// ESM dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const MONGODB_URI = process.env.MONGODB_URI;

const TARGET_MOVIE = {
    title: "Columbus",
    year: 2017,
    director: "Kogonada"
};

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
        return null;
    }
}

async function addColumbus() {
    try {
        await connectDB();

        // 1. Check if exists
        let movie = await Movie.findOne({ 
            title: { $regex: new RegExp(`^${TARGET_MOVIE.title}$`, 'i') },
            year: TARGET_MOVIE.year 
        });

        if (movie) {
            console.log(`ℹ️ "${TARGET_MOVIE.title}" already exists in DB. updating...`);
        } else {
            console.log(`✨ Creating "${TARGET_MOVIE.title}"...`);
            movie = new Movie({
                title: TARGET_MOVIE.title,
                year: TARGET_MOVIE.year,
                directors: [TARGET_MOVIE.director],
                synopsis: "Placeholder synopsis...", // Will be updated by TMDB
                genres: ["Drama"],
                derivedTags: ["Architecture", "Modernist", "Atmospheric"] // Initial tags
            });
            await movie.save();
        }

        // 2. Search TMDB
        console.log(`Searching TMDB for ${TARGET_MOVIE.title} (${TARGET_MOVIE.year})...`);
        const searchRes = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
            params: {
                api_key: TMDB_API_KEY,
                query: TARGET_MOVIE.title,
                year: TARGET_MOVIE.year
            }
        });

        if (!searchRes.data.results?.length) {
            console.error("❌ No TMDB results found!");
            process.exit(1);
        }

        const tmdbMovie = searchRes.data.results[0];
        const tmdbId = tmdbMovie.id;

        // 3. Fetch Full Details
        const detailsRes = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`);
        const details = detailsRes.data;

        // 4. Fetch Extras (Credits, Trailer)
        const trailerUrl = await getTrailer(tmdbId);
        const creditsRes = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`);
        const directors = creditsRes.data.crew
            .filter(c => c.job === 'Director')
            .map(c => c.name);
        
        const cinematographers = creditsRes.data.crew
            .filter(c => c.job === 'Director of Photography')
            .map(c => c.name);

        const productionCompanies = details.production_companies.map(c => c.name);

        // 5. Update DB
        const updates = {
            tmdbId: details.id,
            synopsis: details.overview,
            posterUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : movie.posterUrl,
            backdropUrl: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : movie.backdropUrl,
            trailerUrl: trailerUrl || movie.trailerUrl,
            genres: details.genres.map(g => g.name),
            runtime: details.runtime,
            country: details.production_countries?.[0]?.name,
            vote_average: details.vote_average,
            vote_count: details.vote_count,
            popularity: details.popularity,
            directors: directors.length > 0 ? directors : movie.directors,
            cinematographers: cinematographers,
            productionCompanies: productionCompanies,
            // Ensure derivedTags are kept if they exist, or add defaults? 
            // We set some init tags, let's keep them or merge. 
            // For now, let's simple set them if empty
             derivedTags: movie.derivedTags.length > 0 ? movie.derivedTags : ["Architecture", "Modernist", "Atmospheric", "Quiet"]
        };

        await Movie.updateOne({ _id: movie._id }, { $set: updates });
        console.log(`✅ Successfully added/updated "${TARGET_MOVIE.title}" with TMDB data!`);
        console.log(`Poster: ${updates.posterUrl}`);

        process.exit(0);

    } catch (error) {
        console.error('Fatal Error:', error);
        process.exit(1);
    }
}

addColumbus();
