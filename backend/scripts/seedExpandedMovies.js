import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';
import { generateTags } from '../services/taggingService.js';
import { calculateArthouseScore } from '../services/arthouseScoring.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory (parent of scripts)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const seedExpandedMovies = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Read the expanded movies JSON
    const moviesPath = path.join(__dirname, 'movies-expanded.json');
    const moviesJSON = await fs.readFile(moviesPath, 'utf-8');
    const moviesData = JSON.parse(moviesJSON);

    console.log(`Processing ${moviesData.length} expanded films...\n`);

    // Get existing tmdbIds to avoid duplicates
    const existingMovies = await Movie.find({}, 'tmdbId');
    const existingIds = new Set(existingMovies.map(m => m.tmdbId).filter(Boolean));

    console.log(`Existing films in DB: ${existingMovies.length}`);
    console.log(`Films to process: ${moviesData.length}\n`);

    // Filter out duplicates and process
    const moviesToInsert = [];
    let skipped = 0;

    for (const movie of moviesData) {
      if (existingIds.has(movie.tmdbId)) {
        skipped++;
        continue;
      }

      const derivedTags = generateTags({
        synopsis: movie.synopsis,
        keywords: movie.keywords,
        genres: movie.genres
      });

      const decade = Math.floor(movie.year / 10) * 10;

      // Calculate arthouse score
      const arthouseScore = calculateArthouseScore({
        ...movie,
        derivedTags
      });

      console.log(`${movie.title} (${movie.year}) [Tier ${movie.tier}] Score: ${arthouseScore}: [${derivedTags.join(', ')}]`);

      moviesToInsert.push({
        ...movie,
        derivedTags,
        decade,
        arthouseScore
      });

      existingIds.add(movie.tmdbId);
    }

    if (moviesToInsert.length === 0) {
      console.log('\nNo new movies to insert (all duplicates)');
      await mongoose.connection.close();
      return;
    }

    // Insert new movies
    const insertedMovies = await Movie.insertMany(moviesToInsert, { ordered: false });
    console.log(`\n✓ Successfully inserted ${insertedMovies.length} new movies`);
    console.log(`⚠ Skipped ${skipped} duplicates`);

    // Compute statistics
    const tierCounts = { 2: 0, 3: 0 };
    const tagCounts = {};

    insertedMovies.forEach(movie => {
      tierCounts[movie.tier] = (tierCounts[movie.tier] || 0) + 1;
      
      movie.derivedTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // Display tier distribution
    console.log('\nTier distribution:');
    console.log(`  Tier 2 (Director-based): ${tierCounts[2] || 0} films`);
    console.log(`  Tier 3 (Discovery): ${tierCounts[3] || 0} films`);

    // Display top tags
    console.log('\nTop tags:');
    Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .forEach(([tag, count]) => {
        console.log(`  ${tag}: ${count}`);
      });

    // Final database stats
    const totalMovies = await Movie.countDocuments();
    const tier1Count = await Movie.countDocuments({ tier: 1 });
    const tier2Count = await Movie.countDocuments({ tier: 2 });
    const tier3Count = await Movie.countDocuments({ tier: 3 });

    console.log('\n=== Final Database Stats ===');
    console.log(`Total films: ${totalMovies}`);
    console.log(`  Tier 1 (Curated): ${tier1Count}`);
    console.log(`  Tier 2 (Director-based): ${tier2Count}`);
    console.log(`  Tier 3 (Discovery): ${tier3Count}`);

    await mongoose.connection.close();
    console.log('\nDatabase seeding completed!');
  } catch (error) {
    console.error('Seeding error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedExpandedMovies();
