import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';
import { calculateArthouseScore, getScoreBreakdown } from '../services/arthouseScoring.js';

dotenv.config();

const testCanonScoring = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    console.log('═'.repeat(100));
    console.log('TESTING TIME-WEIGHTED CANON SCORE ALGORITHM');
    console.log('═'.repeat(100));

    // Test Case 1: Seven Samurai
    console.log('\n📊 TEST CASE 1: Seven Samurai (1954)');
    console.log('-'.repeat(100));
    
    const sevenSamurai = await Movie.findOne({ 
      title: { $regex: 'Seven Samurai', $options: 'i' } 
    });

    if (sevenSamurai) {
      const breakdown = getScoreBreakdown(sevenSamurai);
      console.log(`Title: ${sevenSamurai.title} (${sevenSamurai.year})`);
      console.log(`Director(s): ${sevenSamurai.directors?.join(', ')}`);
      console.log(`Rating: ${sevenSamurai.vote_average}`);
      console.log(`Genres: ${sevenSamurai.genres?.join(', ')}`);
      console.log(`\n🎯 SCORE BREAKDOWN:`);
      console.log(`  - Is Classic (>25 years + rating >7.7): ${breakdown.isClassic ? '✅ YES' : '❌ NO'}`);
      console.log(`  - Is Auteur (Kurosawa): ${breakdown.isAuteur ? '✅ YES (+15)' : '❌ NO'}`);
      console.log(`  - Masterpiece Floor (>8.2): ${breakdown.masterpieceFloor ? '✅ YES (min 85)' : '❌ NO'}`);
      console.log(`  - Popularity Score: ${breakdown.popularity}`);
      console.log(`  - Vote Pattern Score: ${breakdown.votePattern}`);
      console.log(`  - Genre Score: ${breakdown.genre} (Action penalty waived for classics)`);
      console.log(`  - Tags Score: ${breakdown.tags}`);
      console.log(`  - Country Score: ${breakdown.country}`);
      console.log(`  - Auteur Bonus: ${breakdown.auteurBonus}`);
      console.log(`\n✨ FINAL SCORE: ${breakdown.total}/100`);
    } else {
      console.log('❌ Seven Samurai not found in database');
    }

    // Test Case 2: 2001: A Space Odyssey
    console.log('\n\n📊 TEST CASE 2: 2001: A Space Odyssey (1968)');
    console.log('-'.repeat(100));
    
    const odyssey = await Movie.findOne({ 
      title: { $regex: '2001.*Space Odyssey', $options: 'i' } 
    });

    if (odyssey) {
      const breakdown = getScoreBreakdown(odyssey);
      console.log(`Title: ${odyssey.title} (${odyssey.year})`);
      console.log(`Director(s): ${odyssey.directors?.join(', ')}`);
      console.log(`Rating: ${odyssey.vote_average}`);
      console.log(`Genres: ${odyssey.genres?.join(', ')}`);
      console.log(`Country: ${odyssey.country}`);
      console.log(`\n🎯 SCORE BREAKDOWN:`);
      console.log(`  - Is Classic (>25 years + rating >7.7): ${breakdown.isClassic ? '✅ YES' : '❌ NO'}`);
      console.log(`  - Is Auteur (Kubrick): ${breakdown.isAuteur ? '✅ YES (+15)' : '❌ NO'}`);
      console.log(`  - Masterpiece Floor (>8.2): ${breakdown.masterpieceFloor ? '✅ YES (min 85)' : '❌ NO'}`);
      console.log(`  - Popularity Score: ${breakdown.popularity}`);
      console.log(`  - Vote Pattern Score: ${breakdown.votePattern}`);
      console.log(`  - Genre Score: ${breakdown.genre} (Sci-Fi penalty waived for auteur)`);
      console.log(`  - Tags Score: ${breakdown.tags}`);
      console.log(`  - Country Score: ${breakdown.country} (USA penalty removed for rating >7.8)`);
      console.log(`  - Auteur Bonus: ${breakdown.auteurBonus}`);
      console.log(`\n✨ FINAL SCORE: ${breakdown.total}/100`);
    } else {
      console.log('❌ 2001: A Space Odyssey not found in database');
    }

    // Test Case 3: Additional test - The Godfather
    console.log('\n\n📊 TEST CASE 3: The Godfather (1972)');
    console.log('-'.repeat(100));
    
    const godfather = await Movie.findOne({ 
      title: { $regex: 'Godfather', $options: 'i' },
      year: 1972
    });

    if (godfather) {
      const breakdown = getScoreBreakdown(godfather);
      console.log(`Title: ${godfather.title} (${godfather.year})`);
      console.log(`Director(s): ${godfather.directors?.join(', ')}`);
      console.log(`Rating: ${godfather.vote_average}`);
      console.log(`Genres: ${godfather.genres?.join(', ')}`);
      console.log(`\n🎯 SCORE BREAKDOWN:`);
      console.log(`  - Is Classic (>25 years + rating >7.7): ${breakdown.isClassic ? '✅ YES' : '❌ NO'}`);
      console.log(`  - Is Auteur (Coppola): ${breakdown.isAuteur ? '✅ YES (+15)' : '❌ NO'}`);
      console.log(`  - Masterpiece Floor (>8.2): ${breakdown.masterpieceFloor ? '✅ YES (min 85)' : '❌ NO'}`);
      console.log(`  - Popularity Score: ${breakdown.popularity}`);
      console.log(`  - Vote Pattern Score: ${breakdown.votePattern}`);
      console.log(`  - Genre Score: ${breakdown.genre}`);
      console.log(`  - Tags Score: ${breakdown.tags}`);
      console.log(`  - Country Score: ${breakdown.country} (USA penalty removed for rating >7.8)`);
      console.log(`  - Auteur Bonus: ${breakdown.auteurBonus}`);
      console.log(`\n✨ FINAL SCORE: ${breakdown.total}/100`);
    } else {
      console.log('❌ The Godfather not found in database');
    }

    console.log('\n' + '═'.repeat(100));
    console.log('TEST COMPLETE');
    console.log('═'.repeat(100));

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testCanonScoring();
