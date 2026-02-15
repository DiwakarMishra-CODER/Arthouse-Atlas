
import mongoose from 'mongoose';

const findMovies = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/artofcinema');
        console.log('MongoDB Connected');

        // Search for partial matches
        const napoleons = await mongoose.connection.collection('movies').find({ title: { $regex: 'Napoleon', $options: 'i' } }).toArray();
        const cures = await mongoose.connection.collection('movies').find({ title: { $regex: 'Cure', $options: 'i' } }).toArray();

        console.log('--- Napoleons found ---');
        napoleons.forEach(m => console.log(`"${m.title}" (ID: ${m._id})`));

        console.log('\n--- Cures found ---');
        cures.forEach(m => console.log(`"${m.title}" (ID: ${m._id})`));

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

findMovies();
