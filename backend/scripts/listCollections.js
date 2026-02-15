
import mongoose from 'mongoose';

const listCollections = async () => {
    try {
        const client = await mongoose.connect('mongodb://127.0.0.1:27017/artofcinema');
        const collections = await client.connection.db.listCollections().toArray();
        console.log('Collections in artofcinema:', collections.map(c => c.name));
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

listCollections();
