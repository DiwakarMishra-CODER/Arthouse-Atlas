import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const rollbackRecentAdditions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get current count
    const currentCount = await Movie.countDocuments();
    console.log(`Current movie count: ${currentCount}`);

    if (currentCount <= 382) {
      console.log('Database already has 382 or fewer movies. No rollback needed.');
      await mongoose.connection.close();
      return;
    }

    const toDelete = currentCount - 382;
    console.log(`\nWill delete the ${toDelete} most recently added movies...\n`);

    // Find the most recently added movies (by createdAt)
    const recentMovies = await Movie.find()
      .sort({ createdAt: -1 })
      .limit(toDelete)
      .select('title year createdAt');

    console.log('Movies to be deleted:');
    recentMovies.forEach(movie => {
      console.log(`  - ${movie.title} (${movie.year})`);
    });

    // Delete them
    const movieIds = recentMovies.map(m => m._id);
    const result = await Movie.deleteMany({ _id: { $in: movieIds } });

    console.log(`\n✅ Deleted ${result.deletedCount} movies`);

    const finalCount = await Movie.countDocuments();
    console.log(`Final movie count: ${finalCount}`);

    await mongoose.connection.close();
    console.log('\nRollback completed!');
  } catch (error) {
    console.error('Rollback error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

rollbackRecentAdditions();
