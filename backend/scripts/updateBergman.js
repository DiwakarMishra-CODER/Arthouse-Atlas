import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import Director from '../models/Director.js';

dotenv.config({ path: '../.env' });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const updateBergman = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const directorName = 'Ingmar Bergman';
        const director = await Director.findOne({ name: directorName });

        if (!director) {
            console.log('Ingmar Bergman not found in DB');
            return;
        }

        console.log(`Updating ${directorName}...`);
        
        // Search TMDB for ID (or use existing if valid)
        // Bergman's TMDB ID is 6648 (Directing)
        const tmdbId = 6648; 

        // Fetch details
        const detailsUrl = `${TMDB_BASE_URL}/person/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
        const detailsRes = await axios.get(detailsUrl);
        const data = detailsRes.data;

        // Fetch images for tagged profile
        const imagesUrl = `${TMDB_BASE_URL}/person/${tmdbId}/images?api_key=${TMDB_API_KEY}`;
        const imagesRes = await axios.get(imagesUrl);
        const profiles = imagesRes.data.profiles;
        
        let profileUrl = '';
        if (profiles && profiles.length > 0) {
            // Pick highest voted or just first
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
        console.log('✅ Successfully updated Ingmar Bergman');
        console.log(`Bio length: ${director.bio.length}`);
        console.log(`Profile URL: ${director.profileUrl}`);

    } catch (error) {
        console.error('Error updating director:', error.message);
    } finally {
        await mongoose.connection.close();
    }
};

updateBergman();
