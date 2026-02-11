import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';
import { calculateBaseCanonScore } from '../services/baseCanonScoring.js';
import { assignMoods } from '../services/moodService.js';

dotenv.config();

const migrateDiscoveryFields = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');
  
  console.log('=== Migrating Discovery Engine Fields ===\n');
  
  const allFilms = await Movie.find({});
  console.log(`Processing ${allFilms.length} films...\n`);
  
  let updated = 0;
  
  for (const film of allFilms) {
    // Calculate BaseCanonScore
    const baseCanonScore = calculateBaseCanonScore(film);
    
    // Assign moods
    const moods = assignMoods(film);
    
    // Update film
    await Movie.updateOne(
      { _id: film._id },
      {
        $set: {
          baseCanonScore,
          moods: new Map(Object.entries(moods)),
          showCount: 0,
          lastShownAt: null,
          festivalWins: [],
          movements: [],
          depthScore: 50
        }
      }
    );
    
    updated++;
    
    if (updated % 50 === 0) {
      console.log(`Updated ${updated}/${allFilms.length} films...`);
    }
  }
  
  console.log `\n✅ Migration complete!`;
  console.log(`Updated ${updated} films with discovery engine fields\n`);
  
  // Show sample films with scores
  const samples = await Movie.find({}).sort({ baseCanonScore: -1 }).limit(10);
  
  console.log('Top 10 films by BaseCanonScore:');
  samples.forEach((film, idx) => {
    const moodsList = film.moods ? Array.from(film.moods.keys()).slice(0, 3).join(', ') : 'none';
    console.log(`${idx + 1}. ${film.title} (${film.year}) - Score: ${film.baseCanonScore} | Moods: ${moodsList}`);
  });
  
  await mongoose.connection.close();
};

migrateDiscoveryFields();
