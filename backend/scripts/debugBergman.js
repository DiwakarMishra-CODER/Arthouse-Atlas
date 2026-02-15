import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Director from '../models/Director.js';

dotenv.config({ path: '../.env' });

const debugDirector = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Check Ingmar Bergman
    const bergmans = await Director.find({ name: /Ingmar Bergman/i });
    console.log(`\nFound ${bergmans.length} entries for Ingmar Bergman:`);
    bergmans.forEach(d => {
        console.log(`- ID: ${d._id}`);
        console.log(`  TMDB ID: ${d.tmdbId}`);
        console.log(`  Bio start: ${d.bio ? d.bio.substring(0, 50) : 'None'}...`);
    });

    // 2. Check for Terry George
    const terry = await Director.find({ name: /Terry George/i });
    console.log(`\nFound ${terry.length} entries for Terry George:`);
    terry.forEach(d => {
        console.log(`- ID: ${d._id}, TMDB ID: ${d.tmdbId}`);
    });

    // 3. Search for bio containing "Terry George"
    const mixed = await Director.find({ bio: /Terry George/i });
    console.log(`\nFound ${mixed.length} entries with 'Terry George' in bio:`);
    mixed.forEach(d => {
        console.log(`- Name: ${d.name}`);
        console.log(`  ID: ${d._id}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

debugDirector();
