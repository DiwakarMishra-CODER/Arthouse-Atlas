
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const MONGODB_URI = 'mongodb+srv://diwakarmishraemail_db_user:1wrt5zalVdwb2BJS@arthouse-atlas.uhbuitc.mongodb.net/arthouse_atlas?retryWrites=true&w=majority&appName=arthouse-atlas';

const filmTargets = [
  { title: "The Souvenir: Part II", year: 2021, tmdbId: 473021 },
  { title: "Memoria", year: 2021, tmdbId: 512195 },
  { title: "Flee", year: 2021, tmdbId: 554230 },
  { title: "Wheel of Fortune and Fantasy", year: 2021, tmdbId: 795811 },
  { title: "Great Freedom", year: 2021, tmdbId: 785538 },
  { title: "A Hero", year: 2021, tmdbId: 672208 },
  { title: "The Lost Daughter", year: 2021, tmdbId: 656663 },
  { title: "Past Lives", year: 2023, tmdbId: 666277 },
  { title: "I Saw the TV Glow", year: 2024, tmdbId: 930564 }
];

const tmdb = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  params: { api_key: TMDB_API_KEY }
});

const finalEnrich = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to Atlas');

        for (const film of filmTargets) {
            console.log(`\nProcessing: ${film.title} (ID: ${film.tmdbId})...`);
            
            // Fetch full details from TMDB
            let data, credits, videos;
            try {
                const details = await tmdb.get(`/movie/${film.tmdbId}`, {
                    params: { append_to_response: 'credits,videos' }
                });
                data = details.data;
                credits = data.credits;
                videos = data.videos.results;
            } catch (tmdbError) {
                console.error(`❌ TMDB Error for ${film.title}: ${tmdbError.message}`);
                continue;
            }

            // Extract Fields
            // Trailer
            const trailer = videos.find(
                v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
            );
            const trailerUrl = trailer ? `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1` : null;

            // Cinematographers
            const cinematographers = credits.crew
                .filter(p => p.job === 'Director of Photography')
                .map(p => p.name);

            // Composers
            const composers = credits.crew
                .filter(p => p.job === 'Original Music Composer')
                .map(p => p.name);
            
            // Production Companies
            const productionCompanies = data.production_companies.map(c => c.name);

            // Posters (Safe fallback)
            const posterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null;
            const backdropUrl = data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null;

            // Prepare Update Fields
            const updateFields = {
                trailerUrl,
                cinematographers,
                composers,
                productionCompanies,
                posterUrl,
                backdropUrl,
                tmdbId: film.tmdbId // Ensure ID is set
            };

            // Database Search & Update Logic
            // 1. Try to find by TMDB ID
            let movie = await Movie.findOne({ tmdbId: film.tmdbId });
            
            // 2. If not found, find by Title + Year
            if (!movie) {
                // Determine title regex for flexibility (case insensitive)
                // Escape special characters in title just in case
                const escapedTitle = film.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                movie = await Movie.findOne({ 
                    title: { $regex: new RegExp(`^${escapedTitle}$`, 'i') }, 
                    year: film.year 
                });
            }

            if (movie) {
                // Apply updates
                Object.assign(movie, updateFields);
                await movie.save();
                
                console.log(`✅ Updated ${movie.title}`);
                console.log(`   Trailer: ${trailerUrl ? 'Yes' : 'No'}`);
                console.log(`   DoP: ${cinematographers.join(', ')}`);
                console.log(`   Studios: ${productionCompanies.join(', ')}`);
            } else {
                console.log(`⚠️ Movie not found in DB: ${film.title}`);
            }
            
            // Rate limiting
            await new Promise(r => setTimeout(r, 200));
        }

        console.log('\nFinal enrichment complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

finalEnrich();
