import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Director from '../models/Director.js';

dotenv.config();

// Directors to remove (mainstream/commercial)
const DIRECTORS_TO_REMOVE = [
    'Christopher Nolan',
    'Quentin Tarantino',
    'Francis Ford Coppola',
    'Denis Villeneuve',
    'Guillermo del Toro',
    'Darren Aronofsky',
    'Alejandro González Iñárritu',
    'Ari Aster',
    'Greta Gerwig',
    'David Fincher',
    'John Ford',
    'Sergio Leone',
    'Kathryn Bigelow'
];

async function removeDirectors() {
    try {
        await connectDB();
        console.log('\n🗑️  Removing mainstream directors...\n');
        
        for (const name of DIRECTORS_TO_REMOVE) {
            const result = await Director.deleteOne({ name });
            if (result.deletedCount > 0) {
                console.log(`✓ Removed ${name}`);
            } else {
                console.log(`  ${name} not found (already removed)`);
            }
        }
        
        console.log('\n✓ Cleanup complete!\n');
        
        process.exit(0);
    } catch (error) {
        console.error('Error removing directors:', error);
        process.exit(1);
    }
}

removeDirectors();
