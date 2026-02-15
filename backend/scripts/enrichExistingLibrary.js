import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js';
import { fetchMovieDetailsById } from './fetchFromTMDB.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Delay helper for rate limiting
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const enrichExistingLibrary = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Fetch all existing movies
    const movies = await Movie.find({});
    const initialCount = movies.length;
    console.log(`📚 Found ${initialCount} movies to enrich\n`);
    console.log('Starting enrichment process...\n');

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      const progress = `[${i + 1}/${movies.length}]`;

      // Skip if no tmdbId
      if (!movie.tmdbId) {
        console.warn(`${progress} ⚠️  Skipping "${movie.title}" - no tmdbId`);
        skipped++;
        continue;
      }

      try {
        // Fetch metadata from TMDB
        const metadata = await fetchMovieDetailsById(movie.tmdbId);

        if (!metadata) {
          console.error(`${progress} ✗ Failed to fetch "${movie.title}"`);
          errors++;
          continue;
        }

        // Update movie with new metadata
        movie.cinematographers = metadata.cinematographers || [];
        movie.composers = metadata.composers || [];
        movie.productionCompanies = metadata.productionCompanies || [];
        movie.backdropUrl = metadata.backdropUrl || null;

        await movie.save();
        updated++;

        // Log with metadata summary
        const dopText = metadata.cinematographers.length > 0 
          ? metadata.cinematographers.join(', ') 
          : 'none';
        const compText = metadata.composers.length > 0 
          ? metadata.composers.join(', ') 
          : 'none';
        
        console.log(`${progress} ✓ "${movie.title}" (${movie.year})`);
        console.log(`         DoP: ${dopText}`);
        console.log(`         Composer: ${compText}`);
        console.log(`         Companies: ${metadata.productionCompanies.join(', ') || 'none'}`);
        console.log('');

      } catch (error) {
        console.error(`${progress} ✗ Error enriching "${movie.title}": ${error.message}`);
        errors++;
      }

      // Rate limiting: 250ms delay between requests
      await delay(250);
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Enrichment Summary');
    console.log('='.repeat(60));
    console.log(`✓ Successfully updated: ${updated} movies`);
    console.log(`⚠️  Skipped (no tmdbId): ${skipped} movies`);
    console.log(`✗ Errors: ${errors} movies`);
    console.log('-'.repeat(60));
    
    const finalCount = await Movie.countDocuments();
    console.log(`📚 Initial count: ${initialCount}`);
    console.log(`📚 Final count: ${finalCount}`);
    
    if (finalCount !== initialCount) {
      console.log(`\n⚠️  WARNING: Movie count changed! Expected ${initialCount}, got ${finalCount}`);
    } else {
      console.log(`\n✅ SUCCESS: Movie count unchanged (${finalCount})`);
    }
    console.log('='.repeat(60));

    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
    console.log('Enrichment process complete!\n');

  } catch (error) {
    console.error('Fatal error during enrichment:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

enrichExistingLibrary();
