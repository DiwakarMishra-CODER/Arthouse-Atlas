import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js';
import { calculateArthouseScore, getScoreBreakdown } from '../services/arthouseScoring.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTHOUSE_THRESHOLD = 60; // Minimum score to keep
const DRY_RUN = process.argv.includes('--dry-run'); // Test mode without deleting

const pruneMainstreamMovies = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    console.log('=== Arthouse Database Pruning ===');
    console.log(`Threshold: ${ARTHOUSE_THRESHOLD}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no deletions)' : 'LIVE (will delete)'}\n`);

    // Get all movies
    const allMovies = await Movie.find({});
    console.log(`Total movies in database: ${allMovies.length}\n`);

    const toRemove = [];
    const toKeep = [];
    const preserved = [];

    console.log('Computing arthouse scores...\n');

    for (const movie of allMovies) {
      const score = calculateArthouseScore(movie);
      
      // Update score in database
      await Movie.updateOne({ _id: movie._id }, { arthouseScore: score });

      // Preserve Tier 1 & 2 (curated films)
      if (movie.tier === 1 || movie.tier === 2) {
        preserved.push({
          title: movie.title,
          year: movie.year,
          tier: movie.tier,
          score
        });
        continue;
      }

      // Check if meets threshold
      if (score < ARTHOUSE_THRESHOLD) {
        const breakdown = getScoreBreakdown(movie);
        toRemove.push({
          title: movie.title,
          year: movie.year,
          score,
          breakdown,
          popularity: movie.popularity,
          vote_average: movie.vote_average,
          vote_count: movie.vote_count,
          genres: movie.genres,
          country: movie.country,
          tier: movie.tier
        });
      } else {
        toKeep.push({
          title: movie.title,
          year: movie.year,
          score,
          tier: movie.tier
        });
      }
    }

    // Sort removals by score (lowest first)
    toRemove.sort((a, b) => a.score - b.score);

    console.log('\n=== Results ===');
    console.log(`Preserved (Tier 1 & 2): ${preserved.length}`);
    console.log(`Keeping (score >= ${ARTHOUSE_THRESHOLD}): ${toKeep.length}`);
    console.log(`Removing (score < ${ARTHOUSE_THRESHOLD}): ${toRemove.length}\n`);

    // Generate detailed removal report
    const reportPath = path.join(__dirname, 'pruning-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      threshold: ARTHOUSE_THRESHOLD,
      dryRun: DRY_RUN,
      stats: {
        total: allMovies.length,
        preserved: preserved.length,
        kept: toKeep.length,
        removed: toRemove.length
      },
      preserved,
      toRemove
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`Detailed report saved to: ${reportPath}\n`);

    // Show top 20 removals
    if (toRemove.length > 0) {
      console.log('=== Top 20 Films to Remove (lowest scores) ===\n');
      toRemove.slice(0, 20).forEach((movie, idx) => {
        console.log(`${idx + 1}. ${movie.title} (${movie.year}) - Score: ${movie.score}`);
        console.log(`   Popularity: ${movie.popularity.toFixed(1)} | Votes: ${movie.vote_average.toFixed(1)}/10 (${movie.vote_count})`);
        console.log(`   Genres: ${movie.genres.join(', ')}`);
        console.log(`   Country: ${movie.country || 'Unknown'}`);
        console.log(`   Breakdown: Pop:${movie.breakdown.popularity} Vote:${movie.breakdown.votePattern} Genre:${movie.breakdown.genre} Tags:${movie.breakdown.tags} Country:${movie.breakdown.country}`);
        console.log('');
      });
    }

    // Perform deletion
    if (!DRY_RUN && toRemove.length > 0) {
      console.log('\n⚠️  DELETING MAINSTREAM FILMS...\n');
      
      const idsToRemove = toRemove.map(m => 
        allMovies.find(movie => movie.title === m.title && movie.year === m.year)._id
      );

      const deleteResult = await Movie.deleteMany({ _id: { $in: idsToRemove } });
      console.log(`✅ Deleted ${deleteResult.deletedCount} films\n`);
    } else if (DRY_RUN && toRemove.length > 0) {
      console.log('\n🔍 DRY RUN: No films were deleted');
      console.log('   Run without --dry-run flag to perform actual deletion\n');
    }

    // Final stats
    const finalCount = await Movie.countDocuments();
    console.log('=== Final Database Stats ===');
    console.log(`Total films: ${finalCount}`);
    console.log(`Tier 1 (Curated): ${await Movie.countDocuments({ tier: 1 })}`);
    console.log(`Tier 2 (Director-based): ${await Movie.countDocuments({ tier: 2 })}`);
    console.log(`Tier 3 (Discovery): ${await Movie.countDocuments({ tier: 3 })}`);
    console.log(`Average arthouse score: ${(await Movie.aggregate([
      { $group: { _id: null, avg: { $avg: '$arthouseScore' } } }
    ]))[0]?.avg.toFixed(1) || 'N/A'}\n`);

    await mongoose.connection.close();
    console.log('Pruning complete!');

  } catch (error) {
    console.error('Pruning error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

pruneMainstreamMovies();
