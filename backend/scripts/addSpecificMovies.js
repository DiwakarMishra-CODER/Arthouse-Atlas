
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import connectDB from '../config/database.js';
import Movie from '../models/Movie.js';

console.log('Script file loaded');
dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MOVIES_TO_ADD = [
    "Moonlight", "Aftersun", "The Lighthouse", "First Reformed",
    "Tokyo Story", "Persona", "Seven Samurai", "Stalker",
    "Parasite", "Portrait of a Lady on Fire", "Titane", "Drive My Car",
    "The Diving Bell and the Butterfly", "Ida", "Capernaum", "Call Me by Your Name",
    "Boyhood", "We Need to Talk About Kevin", "Certain Women", "Frances Ha",
    "Metropolis", "M", "Ugetsu", "Battleship Potemkin",
    "Amour", "Caché", "Certified Copy", "Three Colors: Blue",
    "Under the Skin", "The Favourite", "This Is England", "Room",
    "The Act of Killing", "Searching for Sugar Man", "Honeyland", "All That Breathes",
    "The White Ribbon", "The Worst Person in the World", "The Handmaiden", "The Grand Budapest Hotel"
];

const fetchMovieFromTMDB = async (title) => {
    try {
        // Search by title
        let searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;

        const searchRes = await axios.get(searchUrl);
        
        if (!searchRes.data.results || searchRes.data.results.length === 0) {
            console.log(`  ✗ TMDB: Not found "${title}"`);
            return null;
        }

        const tmdbMovie = searchRes.data.results[0];
        const tmdbId = tmdbMovie.id;

        // Fetch details (credits for director, keywords, videos)
        const detailsRes = await axios.get(
            `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,keywords,videos`
        );
        const details = detailsRes.data;

        // Extract Directors
        const directors = details.credits.crew
            .filter(person => person.job === 'Director')
            .map(person => person.name);

        // Extract Keywords/Tags
        const keywords = details.keywords?.keywords?.map(k => k.name) || [];
        const genres = details.genres?.map(g => g.name) || [];

        // Extract Trailer
        const trailer = details.videos?.results?.find(
            v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
        );
        const trailerUrl = trailer ? `https://www.youtube.com/embed/${trailer.key}` : null;

        // Arthouse Score (Random 85-99 for essentials)
        const arthouseScore = Math.floor(Math.random() * (99 - 85 + 1)) + 85;

        return {
            title: details.title,
            year: new Date(details.release_date).getFullYear(),
            synopsis: details.overview,
            directors: directors,
            runtime: details.runtime,
            country: details.production_countries?.[0]?.name || 'Unknown',
            posterUrl: details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : null,
            backdropUrl: details.backdrop_path ? `${IMAGE_BASE_URL}${details.backdrop_path}` : null,
            trailerUrl: trailerUrl,
            genres: genres,
            keywords: keywords,
            tmdbId: tmdbId,
            vote_average: details.vote_average,
            vote_count: details.vote_count,
            popularity: details.popularity,
            arthouseScore: arthouseScore,
            // Defaults
            tier: 1,
            showCount: 0,
            baseCanonScore: 90
        };

    } catch (error) {
        console.error(`  ✗ Error fetching "${title}":`, error.message);
        return null;
    }
};

const addSpecificMovies = async () => {
    try {
        await connectDB();
        console.log('\nStarting Specific Movies Sync...\n');
        console.log(`Targeting ${MOVIES_TO_ADD.length} movies.`);

        let createdCount = 0;
        let existingCount = 0;

        for (const title of MOVIES_TO_ADD) {
            // Check if exists in DB
            let movie = await Movie.findOne({ 
                title: { $regex: new RegExp(`^${title}$`, 'i') } 
            });

            if (movie) {
                console.log(`  ✓ Exists: ${title} (${movie.year})`);
                existingCount++;
            } else {
                console.log(`  ↗ Fetching: ${title}...`);
                const newMovieData = await fetchMovieFromTMDB(title);
                
                if (newMovieData) {
                    // Double check by TMDB ID
                    const existingByTmdb = await Movie.findOne({ tmdbId: newMovieData.tmdbId });
                    
                    if (existingByTmdb) {
                        console.log(`  ✓ Exists (by ID): ${newMovieData.title}`);
                        existingCount++;
                    } else {
                        await Movie.create(newMovieData);
                        createdCount++;
                        console.log(`  ✓ Created: ${newMovieData.title}`);
                    }
                }
                await delay(300); // Rate limit
            }
        }

        console.log('\nSync Complete!');
        console.log(`Created: ${createdCount}`);
        console.log(`Existing: ${existingCount}`);
        
        process.exit(0);

    } catch (error) {
        console.error('Sync Error:', error);
        process.exit(1);
    }
};

addSpecificMovies();
