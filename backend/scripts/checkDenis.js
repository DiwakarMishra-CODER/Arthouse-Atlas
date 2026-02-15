import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Director from '../models/Director.js';

dotenv.config({ path: '../.env' });

const checkDenis = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const director = await Director.findOne({ name: 'Claire Denis' });
    
    if (director) {
        console.log('\n=== Claire Denis Data ===');
        console.log(`Name: ${director.name}`);
        console.log(`TMDB ID: ${director.tmdbId}`);
        console.log(`Profile URL: ${director.profileUrl}`);
        console.log(`Bio Length: ${director.bio ? director.bio.length : 0}`);
    } else {
        console.log('Claire Denis not found in DB');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

checkDenis();
