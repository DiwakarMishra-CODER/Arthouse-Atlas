
import axios from 'axios';

const testFilters = async () => {
    try {
        const genresRes = await axios.get('http://localhost:5000/api/movies/genres/list');
        console.log('Genres:', genresRes.data);
        const hasNullGenre = genresRes.data.some(g => g === null || g === undefined);
        console.log('Has null genre:', hasNullGenre);

        const directorsRes = await axios.get('http://localhost:5000/api/movies/directors/list');
        console.log('Directors count:', directorsRes.data.length);
        const hasNullDirector = directorsRes.data.some(d => d === null || d === undefined);
        console.log('Has null director:', hasNullDirector);

    } catch (error) {
        console.error('API Error:', error.message);
    }
};

testFilters();
