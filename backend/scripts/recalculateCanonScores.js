import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';
import { calculateArthouseScore } from '../services/arthouseScoring.js';
import {
  calculateBaseCanonScore,
  calculateCriticalConsensus,
  calculateFormalInnovation,
  calculateCulturalInfluence,
  calculateDepthScore
} from '../services/baseCanonScoring.js';

dotenv.config();

const recalculateAllScores = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const movies = await Movie.find({});
    console.log(`📊 Found ${movies.length} movies to recalculate\n`);
    console.log('═'.repeat(100));

    let updated = 0;
    let unchanged = 0;
    const significantChanges = [];

    for (const movie of movies) {
      const oldScore = movie.baseCanonScore || 0;

      // Refresh the sub-scores that feed into baseCanonScore, then persist them
      movie.criticalConsensus = calculateCriticalConsensus(movie);
      movie.formalInnovation = calculateFormalInnovation(movie);
      movie.culturalInfluence = calculateCulturalInfluence(movie);
      movie.depthScore = calculateDepthScore(movie);

      movie.arthouseScore = calculateArthouseScore(movie);
      const newScore = calculateBaseCanonScore(movie);

      const scoreDifference = newScore - oldScore;

      // Update the movie
      movie.baseCanonScore = newScore;
      await movie.save();

      if (Math.abs(scoreDifference) > 10) {
        significantChanges.push({
          title: movie.title,
          year: movie.year,
          oldScore,
          newScore,
          difference: scoreDifference,
          directors: movie.directors
        });
      }

      if (scoreDifference !== 0) {
        updated++;
      } else {
        unchanged++;
      }

      // Progress indicator
      if ((updated + unchanged) % 50 === 0) {
        console.log(`Progress: ${updated + unchanged}/${movies.length} movies processed...`);
      }
    }

    console.log('\n' + '═'.repeat(100));
    console.log('RECALCULATION COMPLETE');
    console.log('═'.repeat(100));
    console.log(`\n✅ Total Movies: ${movies.length}`);
    console.log(`📈 Scores Changed: ${updated}`);
    console.log(`➖ Scores Unchanged: ${unchanged}`);

    if (significantChanges.length > 0) {
      console.log(`\n🔥 SIGNIFICANT CHANGES (>10 points difference):`);
      console.log('-'.repeat(100));
      
      // Sort by difference magnitude
      significantChanges.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
      
      significantChanges.slice(0, 20).forEach((change, index) => {
        const direction = change.difference > 0 ? '⬆️' : '⬇️';
        console.log(`\n${index + 1}. ${change.title} (${change.year})`);
        console.log(`   Director(s): ${change.directors?.join(', ')}`);
        console.log(`   ${direction} ${change.oldScore} → ${change.newScore} (${change.difference > 0 ? '+' : ''}${change.difference})`);
      });
      
      if (significantChanges.length > 20) {
        console.log(`\n... and ${significantChanges.length - 20} more significant changes`);
      }
    }

    console.log('\n' + '═'.repeat(100));

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

recalculateAllScores();
