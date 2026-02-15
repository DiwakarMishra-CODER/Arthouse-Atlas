import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '../.env' });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const verifyTMDB = async () => {
    try {
        const tmdbId = 2589;
        const detailsUrl = `${TMDB_BASE_URL}/person/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
        
        console.log(`Fetching: ${detailsUrl.replace(TMDB_API_KEY, 'HIDDEN')}`);
        
        const response = await axios.get(detailsUrl);
        const data = response.data;
        
        console.log('\n=== TMDB Response ===');
        console.log(`ID: ${data.id}`);
        console.log(`Name: ${data.name}`);
        console.log(`Bio starts with: ${data.biography ? data.biography.substring(0, 50) : 'None'}...`);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
};

verifyTMDB();
