
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

const searchTMDB = async (query) => {
    try {
        console.log(`Searching TMDB for: "${query}"...`);
        const search = await tmdb.get('/search/movie', {
            params: { query: query }
        });

        if (search.data.results.length > 0) {
            console.log(`Found ${search.data.results.length} results:`);
            search.data.results.forEach(m => {
                console.log(`- [${m.id}] ${m.title} (${m.release_date?.split('-')[0]}) | Orig: ${m.original_title}`);
            });
        } else {
            console.log("No results found.");
        }
    } catch (error) {
        console.error(error.message);
    }
};

const query = process.argv.slice(2).join(' ');
if (query) {
    searchTMDB(query);
} else {
    console.log("Usage: node searchTMDB.js <Movie Title>");
}
