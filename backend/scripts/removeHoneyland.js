import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Studio from '../models/Studio.js';

dotenv.config({ path: '../.env' });

const removeHoneyland = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const studioName = 'Dogwoof';
    const movieTitle = 'Honeyland';
    
    // Find the studio
    const studio = await Studio.findOne({ name: studioName });
    
    if (!studio) {
      console.log(`❌ Studio "${studioName}" not found.`);
      return;
    }
    
    console.log(`Checking "${studioName}"...`);
    console.log(`Current films: ${studio.featuredFilms.length}`);
    
    // Check if movie exists in featured films
    const initialCount = studio.featuredFilms.length;
    const newFilms = studio.featuredFilms.filter(film => film.title !== movieTitle);
    
    if (newFilms.length < initialCount) {
        studio.featuredFilms = newFilms;
        await studio.save();
        console.log(`✅ Removed "${movieTitle}" from ${studioName}.`);
        console.log(`New film count: ${studio.featuredFilms.length}`);
    } else {
        console.log(`⚠️ "${movieTitle}" was not found in ${studioName}'s list.`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

removeHoneyland();
