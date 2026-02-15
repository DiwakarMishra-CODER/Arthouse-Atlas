import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js';
import newMovies from '../data/newBatch.js';

// ESM dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const seedMovies = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) throw new Error('MongoDB URI not found in .env');

        await mongoose.connect(uri);
        console.log('MongoDB Connected');

        let createdCount = 0;
        let skippedCount = 0;

        for (const movieData of newMovies) {
            const existingMovie = await Movie.findOne({ title: movieData.title });
            
            if (existingMovie) {
                console.log(`Skipped (Exists): ${movieData.title}`);
                skippedCount++;
            } else {
                // Map fields to match Schema if necessary
                // Schema expects 'synopsis', data provided 'description'
                // Schema expects 'directors' array, data provided string
                
                const newMovie = {
                    title: movieData.title,
                    year: movieData.year,
                    synopsis: movieData.description,
                    directors: [movieData.director], // Convert to array
                    runtime: parseInt(movieData.duration), // Simple parse, might need regex if "1h 44m"
                    posterUrl: movieData.posterUrl,
                    genres: movieData.genre,
                    trailerUrl: movieData.trailerUrl,
                    productionCompanies: [movieData.studio], // Schema uses productionCompanies
                    // Defaults
                    arthouseScore: 85, // Default high score for curated list
                    tier: 1
                };

                // Better runtime parsing
                if (typeof movieData.duration === 'string') {
                    const parts = movieData.duration.match(/(\d+)h\s*(\d+)m/);
                    if (parts) {
                        newMovie.runtime = (parseInt(parts[1]) * 60) + parseInt(parts[2]);
                    } else {
                         // Fallback if just minutes or other format
                         const mins = movieData.duration.match(/(\d+)/);
                         if (mins) newMovie.runtime = parseInt(mins[0]);
                    }
                }

                await Movie.create(newMovie);
                console.log(`Created: ${movieData.title}`);
                createdCount++;
            }
        }

        console.log(`\nSeeding Complete!`);
        console.log(`Created: ${createdCount}`);
        console.log(`Skipped: ${skippedCount}`);

    } catch (error) {
        console.error('Seeding Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

seedMovies();
