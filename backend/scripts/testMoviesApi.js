
import axios from 'axios';

const testApi = async () => {
    try {
        const response = await axios.get('http://localhost:5000/api/movies');
        console.log('Status:', response.status);
        console.log('Data keys:', Object.keys(response.data));
        if (response.data.movies) {
            console.log('Movies count:', response.data.movies.length);
            console.log('First movie:', response.data.movies[0]);
        } else {
            console.log('Movies key is missing!');
        }
    } catch (error) {
        console.error('API Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
};

testApi();
