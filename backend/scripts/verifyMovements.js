import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Movement from '../models/Movement.js';

dotenv.config();

const verifyMovements = async () => {
    try {
        await connectDB();
        console.log('Connected to database...');

        const movements = await Movement.find({});
        console.log(`Found ${movements.length} movements.`);

        if (movements.length > 0) {
            const first = movements[0];
            console.log('Sample movement:', first.title);
            console.log('  Tag:', first.tag);
            console.log('  Icon:', first.icon);
            console.log('  Color:', first.cardColor);
            console.log('  Description:', first.description ? 'Present' : 'Missing');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error verifying movements:', error);
        process.exit(1);
    }
};

verifyMovements();
