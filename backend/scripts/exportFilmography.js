import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exportMovieList = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const movies = await Movie.find({})
    .select('title year tier arthouseScore')
    .sort({ year: 1, title: 1 });
  
  console.log(`\n=== Arthouse Atlas: ${movies.length} Films ===\n`);
  
  // Group by decade
  const byDecade = {};
  movies.forEach(movie => {
    const decade = Math.floor(movie.year / 10) * 10;
    if (!byDecade[decade]) byDecade[decade] = [];
    byDecade[decade].push(movie);
  });
  
  // Display by decade
  Object.keys(byDecade).sort().forEach(decade => {
    console.log(`\n=== ${decade}s (${byDecade[decade].length} films) ===\n`);
    byDecade[decade].forEach(movie => {
      const tier = movie.tier === 1 ? 'T1' : movie.tier === 2 ? 'T2' : 'T3';
      console.log(`${movie.year} - ${movie.title} [${tier}] (Score: ${movie.arthouseScore})`);
    });
  });
  
  // Save to file
  const output = {
    totalFilms: movies.length,
    byTier: {
      tier1: movies.filter(m => m.tier === 1).length,
      tier2: movies.filter(m => m.tier === 2).length,
      tier3: movies.filter(m => m.tier === 3).length
    },
    films: movies.map(m => ({
      title: m.title,
      year: m.year,
      tier: m.tier,
      arthouseScore: m.arthouseScore
    }))
  };
  
  await fs.writeFile(
    path.join(__dirname, 'complete-filmography.json'),
    JSON.stringify(output, null, 2)
  );
  
  console.log(`\n\n=== Summary ===`);
  console.log(`Total Films: ${movies.length}`);
  console.log(`Tier 1 (Curated): ${output.byTier.tier1}`);
  console.log(`Tier 2 (Director-based): ${output.byTier.tier2}`);
  console.log(`Tier 3 (Discovery): ${output.byTier.tier3}`);
  console.log(`\nComplete list saved to: complete-filmography.json\n`);
  
  await mongoose.connection.close();
};

exportMovieList();
