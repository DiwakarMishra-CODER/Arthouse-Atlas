import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';
import Movie from '../models/Movie.js';

dotenv.config();

/**
 * Migration Script: Add Stills to Movies
 * 
 * Fetches 2-4 high-quality still images from TMDB API for each movie with a tmdbId
 * and populates the 'stills' array field.
 * 
 * TMDB Image Strategy:
 * - Fetches from /movie/{id}/images endpoint
 * - Prioritizes backdrops (landscape stills)
 * - Selects 2-4 highest-rated images
 * - Stores full TMDB URLs (w780 size for quality)
 * 
 * Usage: node backend/scripts/migration-add-stills.js
 */

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780'; // High quality for Ken Burns
const RATE_LIMIT_DELAY = 250; // 4 requests per second (TMDB limit is 40/10s)

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch still images for a movie from TMDB
 */
async function fetchStillsFromTMDB(tmdbId) {
  try {
    const response = await axios.get(
      `${TMDB_BASE_URL}/movie/${tmdbId}/images`,
      {
        params: {
          api_key: TMDB_API_KEY,
          include_image_language: 'en,null' // English or language-neutral
        }
      }
    );

    // Get backdrops (landscape stills), sorted by vote average
    const backdrops = response.data.backdrops || [];
    
    if (backdrops.length === 0) {
      return [];
    }

    // Sort by vote average (quality indicator) and take top 2-4
    const sortedBackdrops = backdrops
      .filter(img => img.vote_average > 0) // Only rated images
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, 4); // Take up to 4 best stills

    // If no rated backdrops, fall back to first 2-4
    const selectedBackdrops = sortedBackdrops.length > 0 
      ? sortedBackdrops 
      : backdrops.slice(0, 4);

    // Convert to full URLs
    return selectedBackdrops.map(img => `${TMDB_IMAGE_BASE}${img.file_path}`);

  } catch (error) {
    if (error.response?.status === 404) {
      console.warn(`  ⚠️  TMDB ID ${tmdbId} not found (404)`);
    } else if (error.response?.status === 429) {
      console.error(`  ❌ Rate limit exceeded. Waiting 10s...`);
      await sleep(10000);
      return fetchStillsFromTMDB(tmdbId); // Retry
    } else {
      console.error(`  ❌ Error fetching stills for TMDB ${tmdbId}:`, error.message);
    }
    return [];
  }
}

/**
 * Main migration function
 */
async function migrateStills() {
  console.log('\n🎬 Starting Stills Migration...\n');

  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env file');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all movies with tmdbId but no stills
    const moviesToUpdate = await Movie.find({
      tmdbId: { $exists: true, $ne: null },
      $or: [
        { stills: { $exists: false } },
        { stills: { $size: 0 } }
      ]
    });

    console.log(`📊 Found ${moviesToUpdate.length} movies to update\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < moviesToUpdate.length; i++) {
      const movie = moviesToUpdate[i];
      const progress = `[${i + 1}/${moviesToUpdate.length}]`;

      console.log(`${progress} Processing: ${movie.title} (${movie.year})`);
      console.log(`  TMDB ID: ${movie.tmdbId}`);

      // Fetch stills from TMDB
      const stills = await fetchStillsFromTMDB(movie.tmdbId);

      if (stills.length > 0) {
        // Update movie with stills
        movie.stills = stills;
        await movie.save();
        console.log(`  ✅ Added ${stills.length} stills\n`);
        successCount++;
      } else {
        console.log(`  ⚠️  No stills found, skipping\n`);
        skipCount++;
      }

      // Rate limiting
      if (i < moviesToUpdate.length - 1) {
        await sleep(RATE_LIMIT_DELAY);
      }
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Migration Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Success: ${successCount} movies updated`);
    console.log(`⚠️  Skipped: ${skipCount} movies (no stills found)`);
    console.log(`❌ Errors: ${errorCount} movies failed`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run migration
migrateStills();
