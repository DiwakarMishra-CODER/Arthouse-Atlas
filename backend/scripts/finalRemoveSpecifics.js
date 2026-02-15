
import mongoose from 'mongoose';
import Movie from '../models/Movie.js';

const MONGODB_URI = 'mongodb+srv://diwakarmishraemail_db_user:1wrt5zalVdwb2BJS@arthouse-atlas.uhbuitc.mongodb.net/arthouse_atlas?retryWrites=true&w=majority&appName=arthouse-atlas';

const finalCleanup = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Successfully connected to MongoDB Atlas');

        const targets = [
            { id: '698f660fc7ad0ae21f21968d', title: 'Cure (2022)' },
            { id: '698f64b0320d8e6d8cc98ada', title: 'Napoleon (2023)' }
        ];

        for (const target of targets) {
            const result = await Movie.findByIdAndDelete(target.id);
            if (result) {
                console.log(`✅ Removed: ${target.title} [ID: ${target.id}]`);
            } else {
                console.log(`❌ Not found by ID: ${target.title} [ID: ${target.id}]`);
                // Fallback to title search just in case
                const fallback = await Movie.deleteOne({ title: target.title.split(' (')[0].toUpperCase(), year: parseInt(target.title.match(/\d+/)[0]) });
                console.log(`   Fallback search for "${target.title}": ${fallback.deletedCount > 0 ? 'Deleted' : 'Still not found'}`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
};

finalCleanup();
