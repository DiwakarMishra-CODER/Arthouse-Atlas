import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';

dotenv.config();

const MAINSTREAM_FILMS = [
  { title: 'The Dark Knight', year: 2008 },
  { title: 'Inception', year: 2010 },
  { title: 'Interstellar', year: 2014 },
  { title: 'Django Unchained', year: 2012 },
  { title: 'Inglourious Basterds', year: 2009 },
  { title: 'Joker', year: 2019 },
  { title: 'Crash', year: 2004 },
  { title: 'Green Book', year: 2018 },
  { title: 'The King\'s Speech', year: 2010 },
  { title: 'Bohemian Rhapsody', year: 2018 },
  { title: 'Avatar', year: 2009 },
  { title: 'Top Gun: Maverick', year: 2022 }
];

const removeMainstreamFilms = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');
  
  console.log('=== Removing Mainstream Blockbusters ===\n');
  
  let totalRemoved = 0;
  const notFound = [];
  
  for (const film of MAINSTREAM_FILMS) {
    const result = await Movie.deleteOne({ 
      title: film.title, 
      year: film.year 
    });
    
    if (result.deletedCount > 0) {
      console.log(`✅ Removed: ${film.title} (${film.year})`);
      totalRemoved++;
    } else {
      console.log(`⚠️  Not found: ${film.title} (${film.year})`);
      notFound.push(film);
    }
  }
  
  const finalCount = await Movie.countDocuments();
  
  console.log(`\n=== Results ===`);
  console.log(`Removed: ${totalRemoved} films`);
  console.log(`Not found: ${notFound.length} films`);
  console.log(`Total films remaining: ${finalCount}\n`);
  
  await mongoose.connection.close();
};

removeMainstreamFilms();
