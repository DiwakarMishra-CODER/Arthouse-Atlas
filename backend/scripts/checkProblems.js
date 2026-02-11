import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';

dotenv.config();

const checkFilms = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const problematicFilms = await Movie.find({
    $or: [
      { title: { $regex: 'blackpink', $options: 'i' } },
      { title: { $regex: 'selena', $options: 'i' } },
      { title: { $regex: 'purple hearts', $options: 'i' } }
    ]
  }).select('title year tier arthouseScore popularity vote_average vote_count genres country derivedTags');
  
  console.log('\nProblematic Films Found:\n');
  problematicFilms.forEach(film => {
    console.log(`Title: ${film.title} (${film.year})`);
    console.log(`Tier: ${film.tier} | Score: ${film.arthouseScore}`);
    console.log(`Popularity: ${film.popularity} | Votes: ${film.vote_average}/10 (${film.vote_count})`);
    console.log(`Genres: ${film.genres.join(', ')}`);
    console.log(`Country: ${film.country}`);
    console.log(`Tags: ${film.derivedTags.join(', ')}`);
    console.log('---\n');
  });
  
  await mongoose.connection.close();
};

checkFilms();
