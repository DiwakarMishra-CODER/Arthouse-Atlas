import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import Movie from '../models/Movie.js';

dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Helper function to add delay (rate limiting)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch trailer from TMDB
const fetchTrailer = async (tmdbId) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}/videos`, {
      params: { api_key: TMDB_API_KEY }
    });

    const videos = response.data.results;

    // Filter for YouTube trailers
    const trailers = videos.filter(v => v.site === 'YouTube' && v.type === 'Trailer');

    if (trailers.length === 0) return null;

    // Prefer official trailers, or most recent
    const official = trailers.find(t => t.official === true);
    const selected = official || trailers.sort((a, b) => 
      new Date(b.published_at) - new Date(a.published_at)
    )[0];

    return `https://www.youtube.com/embed/${selected.key}`;
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // Movie not found on TMDB
    }
    console.error(`Error fetching trailer for tmdbId ${tmdbId}:`, error.message);
    return null;
  }
};

const fetchAllTrailers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find all movies with tmdbId
    const movies = await Movie.find({ tmdbId: { $exists: true, $ne: null } });
    console.log(`📊 Found ${movies.length} movies with TMDB IDs\n`);
    console.log('═'.repeat(100));

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      
      // Progress indicator
      process.stdout.write(`\rProcessing: ${i + 1}/${movies.length} | Success: ${successCount} | Failed: ${failureCount} | Skipped: ${skippedCount}`);

      // Fetch trailer
      const trailerUrl = await fetchTrailer(movie.tmdbId);

      if (trailerUrl) {
        // Update movie with trailer URL
        await Movie.updateOne(
          { _id: movie._id },
          { $set: { trailerUrl } }
        );
        successCount++;
      } else {
        failureCount++;
      }

      // Rate limiting: 250ms delay between requests (4 req/sec)
      await delay(250);
    }

    console.log('\n\n' + '═'.repeat(100));
    console.log('TRAILER FETCH COMPLETE');
    console.log('═'.repeat(100));
    console.log(`\n✅ Total Movies Processed: ${movies.length}`);
    console.log(`🎬 Trailers Found: ${successCount}`);
    console.log(`❌ No Trailer: ${failureCount}`);

    // Show some examples
    console.log('\n📺 Sample Movies with Trailers:');
    console.log('-'.repeat(100));
    const samplesWithTrailers = await Movie.find({ trailerUrl: { $exists: true, $ne: null } })
      .limit(10)
      .select('title year trailerUrl');
    
    samplesWithTrailers.forEach((movie, idx) => {
      console.log(`${idx + 1}. ${movie.title} (${movie.year})`);
      console.log(`   ${movie.trailerUrl}`);
    });

    console.log('\n' + '═'.repeat(100));

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fetchAllTrailers();
