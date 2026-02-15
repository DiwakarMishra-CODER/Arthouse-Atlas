import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Movie from '../models/Movie.js';

// ESM dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

async function checkCount() {
    try {
        await connectDB();
        const count = await Movie.countDocuments();
        console.log(`\n🎥 Total Movies in Database: ${count}`);
        
        // Optional: Check if Columbus exists
        const columbus = await Movie.findOne({ title: "Columbus" });
        if (columbus) {
            console.log(`✅ "Columbus" is present.`);
        } else {
            console.log(`❌ "Columbus" is MISSING.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkCount();
