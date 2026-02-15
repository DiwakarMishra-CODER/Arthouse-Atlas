
import mongoose from 'mongoose';
import Movie from '../models/Movie.js';

const MONGODB_URI = 'mongodb+srv://diwakarmishraemail_db_user:1wrt5zalVdwb2BJS@arthouse-atlas.uhbuitc.mongodb.net/arthouse_atlas?retryWrites=true&w=majority&appName=arthouse-atlas';

const curationList = [
    "Drive My Car", "Titane", "Aftersun", "The Zone of Interest", "Anatomy of a Fall",
    "Decision to Leave", "The Worst Person in the World", "The Souvenir: Part II",
    "Memoria", "Petite Maman", "All That Breathes", "EO", "Flee",
    "Wheel of Fortune and Fantasy", "The Power of the Dog", "Close",
    "Saint Omer", "La Chimera", "The Great Freedom", "A Hero",
    "The Lost Daughter", "The Hand of God", "Past Lives",
    "I Saw the TV Glow", "All We Imagine as Light"
];

const checkExisting = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to Atlas');

        const existing = await Movie.find({
            title: { $in: curationList.map(t => new RegExp(`^${t}$`, 'i')) }
        }).select('title');

        const existingTitles = existing.map(m => m.title.toLowerCase());
        const missing = curationList.filter(t => !existingTitles.includes(t.toLowerCase()));

        console.log('--- Status Report ---');
        console.log(`Found: ${existing.length}`);
        console.log(`Missing: ${missing.length}`);
        console.log('\nMissing Titles:');
        console.log(JSON.stringify(missing, null, 2));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkExisting();
