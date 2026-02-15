
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

const missingFilms = [
  { title: "The Souvenir: Part II", year: 2021 },
  { title: "Memoria", year: 2021 },
  { title: "Flee", year: 2021 },
  { title: "Wheel of Fortune and Fantasy", year: 2021 },
  { title: "Great Freedom", year: 2021 },
  { title: "A Hero", year: 2021 },
  { title: "The Lost Daughter", year: 2021 },
  { title: "Past Lives", year: 2023 },
  { title: "I Saw the TV Glow", year: 2024 }
];

const tmdb = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  params: { api_key: TMDB_API_KEY }
});

const fixPosters = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to Atlas');

        for (const film of missingFilms) {
            console.log(`Searching TMDB for: ${film.title}...`);
            const search = await tmdb.get('/search/movie', {
                params: { query: film.title, primary_release_year: film.year }
            });

            if (search.data.results.length > 0) {
                const movie = search.data.results[0];
                const updateData = {
                    posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
                    backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null,
                    tmdbId: movie.id
                };

                const result = await Movie.findOneAndUpdate(
                    { title: film.title, year: film.year },
                    updateData,
                    { new: true }
                );

                if (result) {
                    console.log(`✅ Updated ${film.title}: ${updateData.posterUrl}`);
                } else {
                    console.log(`⚠️ Movie not found in DB: ${film.title}`);
                }
            } else {
                console.log(`❌ No results found on TMDB for: ${film.title}`);
            }
            
            // Rate limiting
            await new Promise(r => setTimeout(r, 200));
        }

        console.log('\nPoster fix complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

fixPosters();
