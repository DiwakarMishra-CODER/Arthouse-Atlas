import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import connectDB from '../config/database.js';
import Movement from '../models/Movement.js';
import Movie from '../models/Movie.js';

console.log('Script file loaded');
dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchMovieFromTMDB = async (title, year) => {
    try {
        // Search by title
        let searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
        if (year) searchUrl += `&year=${year}`;

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

const syncMovementMovies = async () => {
    try {
        await connectDB();
        console.log('\nStarting Movement Essential Films Sync...\n');

        const movements = await Movement.find({});
        console.log(`Found ${movements.length} movements.`);

        let totalLinked = 0;
        let createdCount = 0;

        for (const movement of movements) {
            console.log(`\nProcessing: ${movement.title}`);
            const updatedEssentials = [];

            for (const film of movement.essentialFilms) {
                const titleStr = film.title || film; // Handle if it's currently a string or object
                const yearHint = film.year ? parseInt(film.year) : null;
                
                // 1. Check if exists in DB
                let movie = await Movie.findOne({ 
                    title: { $regex: new RegExp(`^${titleStr}$`, 'i') } 
                });

                if (movie) {
                    // console.log(`  ✓ Exists: ${titleStr}`);
                    
                    // UPDATE: If trailer is missing, try to fetch and update it
                    if (!movie.trailerUrl) {
                        // console.log(`    Checking for trailer...`);
                        const movieData = await fetchMovieFromTMDB(titleStr, yearHint);
                        if (movieData && movieData.trailerUrl) {
                            movie.trailerUrl = movieData.trailerUrl;
                            await movie.save();
                            console.log(`    + Updated trailer for: ${movie.title}`);
                        }
                    }

                } else {
                    console.log(`  ↗ Fetching missing: ${titleStr}...`);
                    const newMovieData = await fetchMovieFromTMDB(titleStr, yearHint);
                    
                    if (newMovieData) {
                        // Check if movie exists by tmdbId to avoid duplicates
                        const existingByTmdb = await Movie.findOne({ tmdbId: newMovieData.tmdbId });
                        
                        if (existingByTmdb) {
                            console.log(`  ✓ Found existing by TMDB ID: ${newMovieData.title}`);
                            movie = existingByTmdb;
                            
                             // UPDATE: If trailer is missing, try to fetch and update it
                            if (!movie.trailerUrl && newMovieData.trailerUrl) {
                                movie.trailerUrl = newMovieData.trailerUrl;
                                await movie.save();
                                console.log(`    + Updated trailer for: ${movie.title}`);
                            }

                        } else {
                            movie = await Movie.create(newMovieData);
                            createdCount++;
                            console.log(`  ✓ Created: ${newMovieData.title}`);
                        }
                    } else {
                        // Failed to find/create
                        console.log(`  - Keeping as text: ${titleStr}`);
                    }
                    await delay(300); // Rate limit
                }

                // 2. Construct Link Object
                if (movie) {
                    updatedEssentials.push({
                        title: movie.title,
                        year: movie.year.toString(),
                        movieId: movie._id,
                        posterUrl: movie.posterUrl
                    });
                    totalLinked++;
                } else {
                    // Keep existing data if string or object
                    updatedEssentials.push(typeof film === 'string' ? { title: film } : film);
                }
            }

            // Update Movement
            movement.essentialFilms = updatedEssentials;
            await movement.save();
            console.log(`  > Saved ${movement.title}`);
        }

        console.log('\nSync Complete!');
        console.log(`Total Linked Films: ${totalLinked}`);
        console.log(`New Movies Created: ${createdCount}`);
        
        process.exit(0);

    } catch (error) {
        console.error('Sync Error:', error);
        process.exit(1);
    }
};

syncMovementMovies();
