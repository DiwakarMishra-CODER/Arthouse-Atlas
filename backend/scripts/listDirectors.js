import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Director from '../models/Director.js';

dotenv.config({ path: '../.env' });

const listDirectors = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const directors = await Director.find().select('name').sort({ name: 1 });
    
    console.log('\n=== All Directors ===');
    directors.forEach(d => console.log(d.name));
    console.log(`\nTotal: ${directors.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

listDirectors();
