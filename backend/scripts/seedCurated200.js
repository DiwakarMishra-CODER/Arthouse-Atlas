import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';
import { generateTags } from '../services/taggingService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Read the curated JSON file
    const moviesPath = path.join(__dirname, 'movies-curated-200.json');
    const moviesJSON = await fs.readFile(moviesPath, 'utf-8');
    const moviesData = JSON.parse(moviesJSON);

    console.log(`Processing ${moviesData.length} curated films...\n`);

    // Clear existing movies collection
    const deleteResult = await Movie.deleteMany({});
    console.log(`Cleared existing movies (deleted ${deleteResult.deletedCount} documents)\n`);

    // Process each movie: add derivedTags and decade
    const moviesToInsert = moviesData.map(movie => {
      const derivedTags = generateTags({
        synopsis: movie.synopsis,
        keywords: movie.keywords,
        genres: movie.genres
      });

      const decade = Math.floor(movie.year / 10) * 10;

      console.log(`${movie.title} (${movie.year}): [${derivedTags.join(', ')}]`);

      return {
        ...movie,
        derivedTags,
        decade
      };
    });

    // Insert movies
    const insertedMovies = await Movie.insertMany(moviesToInsert, { ordered: false });
    console.log(`\n✓ Successfully inserted ${insertedMovies.length} movies`);

    // Compute statistics
    const tagCounts = {};
    const decadeCounts = {};

    insertedMovies.forEach(movie => {
      // Count tags
      movie.derivedTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });

      // Count decades
      const decade = movie.decade;
      decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
    });

    // Display tag distribution
    console.log('\nTag distribution:');
    Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([tag, count]) => {
        console.log(`  ${tag}: ${count}`);
      });

    // Display decade distribution
    console.log('\nDecade distribution:');
    Object.entries(decadeCounts)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([decade, count]) => {
        console.log(`  ${decade}s: ${count} films`);
      });

    await mongoose.connection.close();
    console.log('\nDatabase seeding completed!');
  } catch (error) {
    console.error('Seeding error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedDatabase();
