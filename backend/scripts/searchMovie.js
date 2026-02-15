import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';

dotenv.config();

const searchMovie = async (searchTerm) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const movie = await Movie.findOne({ 
      title: { $regex: searchTerm, $options: 'i' } 
    });

    if (movie) {
      console.log('\n✅ FOUND:');
      console.log(`Title: ${movie.title}`);
      console.log(`Year: ${movie.year}`);
      console.log(`Director(s): ${movie.directors?.join(', ')}`);
      console.log(`Base Canon Score: ${movie.baseCanonScore || 'N/A'}`);
      console.log(`Tags: ${movie.derivedTags?.join(', ') || 'N/A'}`);
    } else {
      console.log(`\n❌ "${searchTerm}" NOT found in database`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

const searchTerm = process.argv[2] || 'Red Notice';
searchMovie(searchTerm);
