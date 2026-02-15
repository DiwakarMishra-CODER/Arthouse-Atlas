import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Director from '../models/Director.js';

dotenv.config();

async function clearDirectors() {
    try {
        await connectDB();
        console.log('\n🗑️  Clearing directors collection...\n');
        
        const result = await Director.deleteMany({});
        
        console.log(`✓ Deleted ${result.deletedCount} directors\n`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error clearing directors:', error);
        process.exit(1);
    }
}

clearDirectors();
