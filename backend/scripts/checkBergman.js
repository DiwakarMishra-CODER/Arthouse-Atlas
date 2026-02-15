import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Director from '../models/Director.js';

dotenv.config({ path: '../.env' });

const checkBergman = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const director = await Director.findOne({ name: 'Ingmar Bergman' });
    
    if (director) {
        console.log('\n=== Ingmar Bergman Data ===');
        console.log(`Name: ${director.name}`);
        console.log(`TMDB ID: ${director.tmdbId}`);
        console.log(`Profile URL: ${director.profileUrl}`);
        console.log(`Bio Length: ${director.bio ? director.bio.length : 0}`);
        console.log(`Bio Preview: ${director.bio ? director.bio.substring(0, 50) : 'N/A'}...`);
    } else {
        console.log('Director not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

checkBergman();
