
import mongoose from 'mongoose';

const countMovies = async () => {
    try {
        const client = await mongoose.connect('mongodb://127.0.0.1:27017/artofcinema');
        const count = await client.connection.db.collection('movies').countDocuments();
        console.log('Total movies in artofcinema.movies:', count);
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

countMovies();
