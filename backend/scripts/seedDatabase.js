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

    // Read the JSON file
    const moviesPath = path.join(__dirname, 'movies-tmdb.json');
    const moviesJSON = await fs.readFile(moviesPath, 'utf-8');
    const moviesData = JSON.parse(moviesJSON);

    console.log(`Processing ${moviesData.length} movies...\n`);

    // Clear existing movies collection completely
    const deleteResult = await Movie.deleteMany({});
    console.log(`Cleared existing movies (deleted ${deleteResult.deletedCount} documents)\n`);

    // Process each movie and add derivedTags
    const moviesToInsert = moviesData.map(movie => {
      const derivedTags = generateTags({
        synopsis: movie.synopsis,
        keywords: movie.keywords,
        genres: movie.genres
      });

      console.log(`${movie.title}: [${derivedTags.join(', ')}]`);

      return {
        ...movie,
        derivedTags
      };
    });

    // Insert movies with error handling
    let insertedMovies;
    try {
      insertedMovies = await Movie.insertMany(moviesToInsert, { ordered: false });
    } catch (error) {
      // insertMany can have partial success with ordered: false
      if (error.insertedDocs) {
        insertedMovies = error.insertedDocs;
        console.log(`\n⚠ Warning: ${error.writeErrors?.length || 0} movies failed to insert`);
        error.writeErrors?.forEach(err => {
          const failedMovie = moviesToInsert[err.index];
          console.log(`  Failed: ${failedMovie.title} - ${err.errmsg}`);
        });
      } else {
        throw error;
      }
    }

    console.log(`\n✓ Successfully inserted ${insertedMovies.length} movies`);

    // Display tag distribution
    const tagCounts = {};
    insertedMovies.forEach(movie => {
      movie.derivedTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    console.log('\nTag distribution:');
    Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([tag, count]) => {
        console.log(`  ${tag}: ${count}`);
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
