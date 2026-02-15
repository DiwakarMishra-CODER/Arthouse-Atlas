
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;

const tmdb = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  params: { api_key: TMDB_API_KEY }
});

const debugAHero = async () => {
    try {
        console.log("Searching for 'A Hero' (2021)...");
        const search = await tmdb.get('/search/movie', {
            params: { query: 'A Hero', primary_release_year: 2021 }
        });

        if (search.data.results.length > 0) {
            const movie = search.data.results[0];
            console.log(`Found: ${movie.title} (ID: ${movie.id})`);

            const details = await tmdb.get(`/movie/${movie.id}`, {
                params: { append_to_response: 'credits,videos' }
            });

            const credits = details.data.credits;
            const videos = details.data.videos.results;

            console.log("\n--- CREW ---");
            credits.crew.forEach(p => {
                if (['Director of Photography', 'Original Music Composer'].includes(p.job)) {
                    console.log(`${p.name} - ${p.job}`);
                }
            });

            console.log("\n--- VIDEOS ---");
            videos.forEach(v => {
                console.log(`${v.name} (${v.type}) - ${v.site}`);
            });

        } else {
            console.log("No results found.");
        }
    } catch (error) {
        console.error(error);
    }
};

debugAHero();
