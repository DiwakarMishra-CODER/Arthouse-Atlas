import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';

dotenv.config();

const viewAllMovies = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const movies = await Movie.find({})
      .select('title year')
      .sort({ title: 1 });

    console.log(`\n📚 Total Movies: ${movies.length}\n`);
    console.log('═'.repeat(60));

    movies.forEach((movie, index) => {
      console.log(`${movie.title} (${movie.year})`);
    });

    console.log('═'.repeat(60));
    console.log(`\n✅ Displayed ${movies.length} movies`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

viewAllMovies();
