import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '../.env' });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const searchDenis = async () => {
    try {
        const query = 'Claire Denis';
        const searchUrl = `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}`;
        
        console.log(`Searching for: ${query}`);
        
        const response = await axios.get(searchUrl);
        const results = response.data.results;
        
        console.log(`\nFound ${results.length} results:`);
        results.forEach(p => {
            console.log(`- ID: ${p.id}, Name: ${p.name}, Known For: ${p.known_for_department}, Profile: ${p.profile_path}`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    }
};

searchDenis();
