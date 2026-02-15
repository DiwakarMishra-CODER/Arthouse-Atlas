
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
  { title: "A Hero", year: 2021, tmdbId: 672208 }, // Fixed ID
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
            
            // Fetch full details
            const details = await tmdb.get(`/movie/${film.tmdbId}`, {
                params: { append_to_response: 'credits,videos' }
            });

            const data = details.data;
            const credits = data.credits;
            const videos = data.videos.results;

            // Extract Fields
            
            // Trailer
            const trailer = videos.find(
                v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
            );
            const trailerUrl = trailer ? `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1` : null;

            // Cinematographers (Director of Photography)
            const cinematographers = credits.crew
                .filter(p => p.job === 'Director of Photography')
                .map(p => p.name);

            // Composers (Original Music Composer)
            const composers = credits.crew
                .filter(p => p.job === 'Original Music Composer')
                .map(p => p.name);
            
            // Production Companies (Studios)
            const productionCompanies = data.production_companies.map(c => c.name);

            // Posters (Re-fetch to be safe)
            const posterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null;
            const backdropUrl = data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null;

            // Construct Update Object
            const updateData = {
                trailerUrl,
                cinematographers,
                composers,
                productionCompanies,
                tmdbId: film.tmdbId,
                posterUrl,     // Ensure fallback if missing
                backdropUrl    // Ensure fallback if missing
            };

            // Update Database
            const result = await Movie.findOneAndUpdate(
                { title: film.title, year: film.year },
                updateData,
                { new: true }
            );

            if (result) {
                console.log(`✅ Updated ${film.title}`);
                console.log(`   Trailer: ${trailerUrl ? 'Yes' : 'No'}`);
                console.log(`   DoP: ${cinematographers.join(', ')}`);
                console.log(`   Score: ${composers.join(', ')}`);
                console.log(`   Studios: ${productionCompanies.join(', ')}`);
            } else {
                console.log(`⚠️ Movie not found in DB: ${film.title} (Check title spelling)`);
            }
            
            // Rate limiting
            await new Promise(r => setTimeout(r, 250));
        }

        console.log('\nFinal enrichment complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

finalEnrich();
