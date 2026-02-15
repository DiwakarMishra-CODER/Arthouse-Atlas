import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';

dotenv.config({ path: '../.env' });

const MOVIES_TO_REMOVE = [
  { title: 'Salò, or the 120 Days of Sodom' }, // Official title
  { title: 'Salo, or the 120 Days of Sodom' }, // Alternative
  { title: 'Salo' } // Short title
];

const removeSpecificMovies = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    console.log('=== Removing Specific Movies ===\n');
    
    let totalRemoved = 0;
    const notFound = [];
    
    for (const film of MOVIES_TO_REMOVE) {
      const query = { title: film.title };
      if (film.year !== undefined) {
        query.year = film.year;
      }
      // console.log(`Querying: ${JSON.stringify(query)}`); 

      const result = await Movie.deleteOne(query);
      
      if (result.deletedCount > 0) {
        console.log(`✅ Removed: ${film.title}`);
        totalRemoved++;
      } else {
        // Log not found clearly
        console.log(`⚠️  Not found: ${film.title}`);
        notFound.push(film);
      }
    }
    
    const finalCount = await Movie.countDocuments();
    
    console.log(`\n=== Results ===`);
    console.log(`Removed: ${totalRemoved} films`);
    console.log(`Not found: ${notFound.length} films`);
    console.log(`Total films remaining: ${finalCount}\n`);
    
  } catch (error) {
    console.error('Error removing movies:', error);
  } finally {
    await mongoose.connection.close();
  }
};

removeSpecificMovies();
