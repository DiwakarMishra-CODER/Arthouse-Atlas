import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';
import { getScoreBreakdown } from '../services/arthouseScoring.js';

dotenv.config();

const checkFilm = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const film = await Movie.findOne({
    title: { $regex: 'All My Life', $options: 'i' }
  }).select('title year tier arthouseScore popularity vote_average vote_count genres country derivedTags');
  
  if (!film) {
    console.log('\n"All My Life" not found in database - already removed or never existed.\n');
  } else {
    console.log('\n=== All My Life ===\n');
    console.log(`Title: ${film.title} (${film.year})`);
    console.log(`Tier: ${film.tier} | Arthouse Score: ${film.arthouseScore}`);
    console.log(`Popularity: ${film.popularity.toFixed(1)} | Votes: ${film.vote_average}/10 (${film.vote_count})`);
    console.log(`Genres: ${film.genres.join(', ')}`);
    console.log(`Country: ${film.country}`);
    console.log(`Tags: ${film.derivedTags.join(', ')}\n`);
    
    const breakdown = getScoreBreakdown(film);
    console.log('Score Breakdown:');
    console.log(`  Popularity: ${breakdown.popularity} pts`);
    console.log(`  Vote Pattern: ${breakdown.votePattern} pts`);
    console.log(`  Genres: ${breakdown.genre} pts`);
    console.log(`  Tags: ${breakdown.tags} pts`);
    console.log(`  Country: ${breakdown.country} pts`);
    console.log(`  TOTAL: ${breakdown.total} pts\n`);
    
    if (film.arthouseScore < 60) {
      console.log('❌ This film SHOULD be removed (score < 60)\n');
    } else {
      console.log('✅ This film passes the threshold (score >= 60)\n');
    }
  }
  
  await mongoose.connection.close();
};

checkFilm();
