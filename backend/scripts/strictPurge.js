import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../models/Movie.js';

dotenv.config();

const FILMS_TO_REMOVE = [
  // A. Franchise / Blockbuster
  { title: "The Lord of the Rings: The Fellowship of the Ring", year: 2001 },
  { title: "The Lord of the Rings: The Two Towers", year: 2002 },
  { title: "The Lord of the Rings: The Return of the King", year: 2003 },
  { title: "The Hobbit: The Desolation of Smaug", year: 2013 },
  { title: "Harry Potter and the Prisoner of Azkaban", year: 2004 },
  { title: "The Dark Knight", year: 2008 },
  { title: "The Dark Knight Rises", year: 2012 },
  { title: "Batman Begins", year: 2005 },
  { title: "Isle of Dogs", year: 2018 },
  { title: "Guillermo del Toro's Pinocchio", year: 2022 },
  { title: "Ponyo", year: 2008 },
  
  // B. Prestige Hollywood
  { title: "The Godfather", year: 1972 },
  { title: "The Godfather Part II", year: 1974 },
  { title: "GoodFellas", year: 1990 },
  { title: "Casino", year: 1995 },
  { title: "The Irishman", year: 2019 },
  { title: "The Departed", year: 2006 },
  { title: "The Last Emperor", year: 1987 },
  { title: "The Social Network", year: 2010 },
  { title: "Zodiac", year: 2007 },
  { title: "Fight Club", year: 1999 },
  { title: "Gone Girl", year: 2014 },
  { title: "The Prestige", year: 2006 },
  { title: "Shutter Island", year: 2010 },
  
  // C. Mainstream Crowd-Pleasers
  { title: "Billy Elliot", year: 2000 },
  { title: "The Intouchables", year: 2011 },
  { title: "Jojo Rabbit", year: 2019 },
  { title: "About Time", year: 2013 },
  { title: "Room", year: 2015 },
  { title: "The Curious Case of Benjamin Button", year: 2008 },
  { title: "Pride & Prejudice", year: 2005 },
  { title: "The Woman King", year: 2022 },
  { title: "Dangal", year: 2016 },
  { title: "Hacksaw Ridge", year: 2016 },
  { title: "My Name Is Khan", year: 2010 },
  { title: "Fatherhood", year: 2021 },
  { title: "Feel the Beat", year: 2020 },
  { title: "20th Century Girl", year: 2022 },
  
  // D. Genre Entertainment
  { title: "Se7en", year: 1995 },
  { title: "The Game", year: 1997 },
  { title: "Tombstone", year: 1993 },
  { title: "The Maltese Falcon", year: 1941 },
  
  // E. Misfit / Database Noise
  { title: "Around the World in 80 Days", year: 2004 },
  { title: "Tribes of the Moon: The Making of Nightbreed", year: 2014 },
  { title: "A Dog's Will", year: 2000 },
  { title: "Sorry If I Call You Love", year: 2014 },
  { title: "Elite Squad", year: 2007 }
];

const strictPurge = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');
  
  console.log('=== Strict Arthouse Purge ===\n');
  console.log(`Films to remove: ${FILMS_TO_REMOVE.length}\n`);
  
  let totalRemoved = 0;
  const notFound = [];
  const removed = [];
  
  for (const film of FILMS_TO_REMOVE) {
    const result = await Movie.deleteOne({ 
      title: film.title, 
      year: film.year 
    });
    
    if (result.deletedCount > 0) {
      console.log(`✅ ${film.title} (${film.year})`);
      totalRemoved++;
      removed.push(film);
    } else {
      notFound.push(film);
    }
  }
  
  const finalCount = await Movie.countDocuments();
  const tier1 = await Movie.countDocuments({ tier: 1 });
  const tier2 = await Movie.countDocuments({ tier: 2 });
  const tier3 = await Movie.countDocuments({ tier: 3 });
  
  console.log(`\n=== Results ===`);
  console.log(`Removed: ${totalRemoved} films`);
  console.log(`Not found (already removed): ${notFound.length} films`);
  console.log(`\n=== Final Database ===`);
  console.log(`Total: ${finalCount} films`);
  console.log(`  Tier 1 (Curated): ${tier1}`);
  console.log(`  Tier 2 (Director-based): ${tier2}`);
  console.log(`  Tier 3 (Discovery): ${tier3}\n`);
  
  if (notFound.length > 0) {
    console.log('Already removed:');
    notFound.forEach(f => console.log(`  - ${f.title} (${f.year})`));
  }
  
  await mongoose.connection.close();
};

strictPurge();
