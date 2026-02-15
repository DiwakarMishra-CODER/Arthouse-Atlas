
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Movie from '../models/Movie.js'; // Adjust path as needed

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const removeMovies = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/artofcinema');
        console.log('MongoDB Connected');

        const targets = ['Napoleon', 'Cure'];

        for (const title of targets) {
            // Case-insensitive regex search
            const result = await Movie.deleteOne({ title: { $regex: new RegExp(`^${title}$`, 'i') } });
            
            if (result.deletedCount > 0) {
                console.log(`Successfully removed: ${title}`);
            } else {
                console.log(`Movie not found: ${title}`);
            }
        }

        console.log('Removal process complete.');
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

removeMovies();
