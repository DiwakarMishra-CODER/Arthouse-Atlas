import axios from 'axios';

const checkConnectivity = async () => {
    console.log('Testing connectivity...');
    try {
        await axios.get('https://www.google.com', { timeout: 5000 });
        console.log('SUCCESS: Connected to Google');
    } catch (e) {
        console.error('FAILED: Google', e.message);
    }

    try {
        await axios.get('https://api.themoviedb.org/3/configuration?api_key=41e305c3a75c84e5381cc5d8986b36ad', { timeout: 5000 });
        console.log('SUCCESS: Connected to TMDB');
    } catch (e) {
        console.error('FAILED: TMDB', e.message);
    }
};

checkConnectivity();
