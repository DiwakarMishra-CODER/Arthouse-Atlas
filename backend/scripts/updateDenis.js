import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import Director from '../models/Director.js';

dotenv.config({ path: '../.env' });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const updateDenis = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const directorName = 'Claire Denis';
        const director = await Director.findOne({ name: directorName });

        if (!director) {
            console.log('Claire Denis not found in DB');
            return;
        }

        console.log(`Updating ${directorName}...`);
        
        // Correct TMDB ID for Director Claire Denis is 9888
        const tmdbId = 9888; 

        // Fetch details
        const detailsUrl = `${TMDB_BASE_URL}/person/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
        const detailsRes = await axios.get(detailsUrl);
        const data = detailsRes.data;

        // Fetch images
        const imagesUrl = `${TMDB_BASE_URL}/person/${tmdbId}/images?api_key=${TMDB_API_KEY}`;
        const imagesRes = await axios.get(imagesUrl);
        const profiles = imagesRes.data.profiles;
        
        let profileUrl = '';
        if (profiles && profiles.length > 0) {
             profileUrl = `https://image.tmdb.org/t/p/original${profiles[0].file_path}`;
        } else if (data.profile_path) {
             profileUrl = `https://image.tmdb.org/t/p/original${data.profile_path}`;
        }

        director.bio = data.biography || '';
        director.birthDate = data.birthday || '';
        director.deathDate = data.deathday || null;
        director.placeOfBirth = data.place_of_birth || '';
        director.profileUrl = profileUrl;
        director.tmdbId = tmdbId;

        await director.save();
        console.log('✅ Successfully updated Claire Denis');
        console.log(`Bio length: ${director.bio.length}`);
        console.log(`Profile URL: ${director.profileUrl}`);

    } catch (error) {
        console.error('Error updating director:', error.message);
    } finally {
        await mongoose.connection.close();
    }
};

updateDenis();
