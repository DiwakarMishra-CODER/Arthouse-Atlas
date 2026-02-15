import dotenv from 'dotenv';
import axios from 'axios';
import connectDB from '../config/database.js';
import Director from '../models/Director.js';
import Movement from '../models/Movement.js';

dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

async function searchDirectorByName(name) {
    try {
        const searchResponse = await axios.get(
            `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`
        );
        
        if (searchResponse.data.results && searchResponse.data.results.length > 0) {
            // Get the first result
            const person = searchResponse.data.results[0];
            return person.id;
        }
        
        console.log(`  ✗ No TMDB match found for "${name}"`);
        return null;
    } catch (error) {
        console.error(`  ✗ Error searching for ${name}:`, error.message);
        return null;
    }
}

async function fetchDirectorData(name) {
    try {
        const tmdbId = await searchDirectorByName(name);
        
        if (!tmdbId) {
            return null;
        }
        
        // Fetch person details
        const personResponse = await axios.get(
            `${TMDB_BASE_URL}/person/${tmdbId}?api_key=${TMDB_API_KEY}`
        );
        
        const person = personResponse.data;
        
        // Fetch images
        const imagesResponse = await axios.get(
            `${TMDB_BASE_URL}/person/${tmdbId}/images?api_key=${TMDB_API_KEY}`
        );
        
        const profileUrl = person.profile_path 
            ? `${IMAGE_BASE_URL}${person.profile_path}` 
            : '';
        
        // Try to get a backdrop
        let backdropUrl = '';
        const taggedImagesResponse = await axios.get(
            `${TMDB_BASE_URL}/person/${tmdbId}/tagged_images?api_key=${TMDB_API_KEY}`
        );
        
        if (taggedImagesResponse.data.results && taggedImagesResponse.data.results.length > 0) {
            const taggedImage = taggedImagesResponse.data.results[0];
            if (taggedImage.file_path) {
                backdropUrl = `${IMAGE_BASE_URL}${taggedImage.file_path}`;
            }
        }
        
        // If no tagged image, try movie credits
        if (!backdropUrl) {
            const creditsResponse = await axios.get(
                `${TMDB_BASE_URL}/person/${tmdbId}/movie_credits?api_key=${TMDB_API_KEY}`
            );
            
            const directedFilms = creditsResponse.data.crew
                .filter(c => c.job === 'Director')
                .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            
            if (directedFilms.length > 0 && directedFilms[0].backdrop_path) {
                backdropUrl = `${IMAGE_BASE_URL}${directedFilms[0].backdrop_path}`;
            }
        }
        
        return {
            name: name,
            tmdbId: tmdbId,
            bio: person.biography || '',
            birthDate: person.birthday || '',
            deathDate: person.deathday || null,
            placeOfBirth: person.place_of_birth || '',
            profileUrl,
            backdropUrl,
            keyStyles: [],
            eras: [],
            awards: []
        };
    } catch (error) {
        console.error(`  ✗ Error fetching director ${name}:`, error.message);
        return null;
    }
}

async function seedDirectors() {
    try {
        await connectDB();
        console.log('\nStarting Non-Destructive Director Sync...\n');
        
        // 1. Fetch Movements
        const movements = await Movement.find({});
        console.log(`Found ${movements.length} movements to scan.`);

        // 2. Extract & Deduplicate Names
        const allNames = movements.flatMap(m => 
            m.keyDirectors.map(d => typeof d === 'string' ? d : d.name)
        );
        const uniqueNames = [...new Set(allNames)];
        console.log(`Found ${uniqueNames.length} unique directors from Movements to process.\n`);
        console.log('Unique names:', uniqueNames);

        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        
        // 3. Sync Loop
        for (const name of uniqueNames) {
            console.log(`Processing: ${name}`);
            // Check if exists
            const existingDirector = await Director.findOne({ 
                name: { $regex: new RegExp(`^${name}$`, 'i') } 
            });

            if (existingDirector && existingDirector.profileUrl) {
                console.log(`Skipping ${name} - Already exists with profile.`);
                skippedCount++;
                continue;
            }

            console.log(`Syncing ${name}...`);
            try {
                const directorData = await fetchDirectorData(name);
                
                if (directorData) {
                    await Director.findOneAndUpdate(
                        { tmdbId: directorData.tmdbId },
                        directorData,
                        { upsert: true, new: true }
                    );
                    
                    if (existingDirector) {
                        console.log(`  ✓ Updated ${name} data`);
                        updatedCount++;
                    } else {
                        console.log(`  ✓ Added ${name} to database`);
                        addedCount++;
                    }
                } else {
                    console.log(`  ✗ Could not find/sync ${name}`);
                }
            } catch (innerError) {
                console.error(`Error processing ${name}:`, innerError);
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 250));
        }
        
        const totalDirectors = await Director.countDocuments();
        
        console.log(`\n✓ Sync complete!`);
        console.log(`Total Directors in DB: ${totalDirectors}`);
        console.log(`Added: ${addedCount}`);
        console.log(`Updated: ${updatedCount}`);
        console.log(`Skipped (Already Good): ${skippedCount}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
}

seedDirectors();
