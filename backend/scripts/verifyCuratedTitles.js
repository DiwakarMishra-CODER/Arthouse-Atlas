import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';

dotenv.config({ path: '../.env' });

const checkTitles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Check potentially problematic titles
    const titlesToCheck = [
      'L’Avventura', // Curly vs straight quote
      'L\'Avventura',
      'Beau Travail', 
      'Ivan The Terrible', 
      'Jeanne Dielman', // Shortened check
      'Yi Yi',
      'Sátántangó', // Accents?
      'Satantango',
      'Ivan',
      'The 400 Blows',
      'A Brighter Summer Day'
    ];
    
    for (const term of titlesToCheck) {
      const movies = await Movie.find({ title: { $regex: term, $options: 'i' } });
      console.log(`Found for "${term}":`);
      movies.forEach(m => console.log(`- ${m.title} (${m.year})`));
    }
    
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.connection.close();
  }
};

checkTitles();
