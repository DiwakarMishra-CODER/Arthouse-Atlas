import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Movement from '../models/Movement.js';
import Movie from '../models/Movie.js';
import Director from '../models/Director.js';
import { movementsData } from '../data/movementsData.js';

dotenv.config();

const seedMovements = async () => {
  try {
    await connectDB();
    console.log('Connected to database...');

    let updatedCount = 0;
    let createdCount = 0;

    // cleanup: Remove movements that are not in the data file
    const validTitles = movementsData.map(m => m.title);
    const deleteResult = await Movement.deleteMany({ title: { $nin: validTitles } });
    console.log(`Cleaned up ${deleteResult.deletedCount} removed movements.`);

    for (const movementData of movementsData) {
      console.log(`Processing movement: ${movementData.title}`);

      // Try to find IDs for essential films
      const essentialFilmsWithIds = await Promise.all(
        movementData.essentialFilms.map(async (film) => {
          // Flexible title search (case-insensitive)
          const movie = await Movie.findOne({ 
            title: { $regex: new RegExp(`^${film.title}$`, 'i') } 
          });
          
          if (movie) {
            console.log(`  ✓ Found movie: ${film.title} (${movie._id})`);
            return {
              ...film,
              movieId: movie._id,
              posterUrl: movie.posterUrl || film.posterUrl,
            };
          } else {
            console.log(`  - Movie not found: ${film.title}`);
            return film;
          }
        })
      );

      // Map & Lookup Directors
      const resolvedDirectors = await Promise.all(
        (movementData.keyDirectors || []).map(async (name) => {
          // Case-insensitive regex search for safety
          const dir = await Director.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') } 
          });

          if (dir) {
              console.log(`  ✓ Found director: ${name} (${dir._id})`);
          } else {
              console.log(`  - Director not found: ${name}`);
          }

          return {
            name: name,
            directorId: dir ? dir._id : null
          };
        })
      );

      const movementToSave = {
        ...movementData,
        essentialFilms: essentialFilmsWithIds,
        keyDirectors: resolvedDirectors
      };

      const result = await Movement.findOneAndUpdate(
        { title: movementData.title },
        movementToSave,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      
      console.log(`  > Saved movement: ${movementData.title}`);
    }

    console.log('\nAll movements seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding movements:', error);
    process.exit(1);
  }
};

seedMovements();
