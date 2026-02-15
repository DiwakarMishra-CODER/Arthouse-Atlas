
import mongoose from 'mongoose';
import Movie from '../models/Movie.js';

const listTitles = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/artofcinema');
        const movies = await Movie.find({}, 'title');
        movies.forEach(m => console.log(m.title));
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

listTitles();
