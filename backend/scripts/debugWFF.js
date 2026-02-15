
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

const debugWFF = async () => {
    try {
        const movieId = 795811; // Wheel of Fortune and Fantasy
        console.log(`Fetching credits for ID: ${movieId}...`);

        const response = await tmdb.get(`/movie/${movieId}/credits`);
        const crew = response.data.crew;

        console.log("\n--- MUSIC CREW ---");
        const musicCrew = crew.filter(p => p.department === 'Sound' || p.job.includes('Music') || p.job.includes('Composer'));
        musicCrew.forEach(p => console.log(`${p.name} - ${p.job}`));

    } catch (error) {
        console.error(error.message);
    }
};

debugWFF();
