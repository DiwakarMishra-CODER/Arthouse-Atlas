import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js'; // Ensure this path is correct relative to scripts folder

// ESM dirname workarounds
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
const envPath = path.resolve(process.cwd(), 'backend/.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const debugTags = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGODB_URI or MONGO_URI is not defined in .env');
    }
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Find movies with "Iran Afghanistan" in derivedTags
    const targetTag = "Iran Afghanistan";
    const movies = await Movie.find({ derivedTags: targetTag }, 'title derivedTags');

    console.log(`Found ${movies.length} movies with tag "${targetTag}":`);
    movies.forEach(m => {
      console.log(`- ${m.title} [${m._id}]`);
    });

    // Also list all unique tags to see if there are other weird ones
    const allTags = await Movie.distinct('derivedTags');
    console.log('\nAll Unique Tags (sorted):');
    console.log(allTags.sort());

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
    process.exit();
  }
};

debugTags();
