import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Movie from '../models/Movie.js';

dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// List of movies to seed
const MOVIES_TO_SEED = [
    // Japanese Cinema
    "Seven Samurai", "Rashomon", "Ikiru", "Throne of Blood", "Ran",
    "Tokyo Story", "Late Spring", "An Autumn Afternoon",
    "Ugetsu", "Sansho the Bailiff", "The Life of Oharu",
    // Kubrick
    "2001: A Space Odyssey", "Barry Lyndon", "A Clockwork Orange", "The Shining",
    // Hitchcock
    "Vertigo", "Psycho", "Rear Window", "Notorious",
    // Bergman
    "Persona", "The Seventh Seal", "Wild Strawberries", "Cries and Whispers", "Fanny and Alexander",
    // Fellini
    "8½", "La Dolce Vita", "La Strada", "Amarcord",
    // French New Wave & Classic
    "Breathless", "Pierrot le Fou", "Weekend", "Contempt",
    "The 400 Blows", "Jules and Jim", "Day for Night",
    "Cléo from 5 to 7", "Vagabond", "The Gleaners and I",
    "My Night at Maud’s", "Claire’s Knee", "A Tale of Winter",
    "Céline and Julie Go Boating", "Out 1",
    "Le Samouraï", "Army of Shadows",
    "Au Hasard Balthazar", "Pickpocket", "A Man Escaped",
    "Jeanne Dielman, 23 quai du Commerce, 1080 Bruxelles", "News from Home",
    "Beau Travail", "35 Shots of Rum",
    "Holy Motors", "Mauvais Sang", "Les Amants du Pont-Neuf",
    "L’Humanité", "Twentynine Palms",
    // Wong Kar-wai & Asian Cinema
    "In the Mood for Love", "Chungking Express", "Happy Together", "2046",
    "A City of Sadness", "Flowers of Shanghai", "The Assassin",
    "Yi Yi", "A Brighter Summer Day",
    "Vive L’Amour", "Goodbye, Dragon Inn", "Stray Dogs",
    "Uncle Boonmee Who Can Recall His Past Lives", "Tropical Malady", "Cemetery of Splendour",
    "Right Now, Wrong Then", "On the Beach at Night Alone", "The Woman Who Ran",
    "Oldboy", "The Handmaiden", "Decision to Leave",
    "My Neighbor Totoro", "Spirited Away", "Princess Mononoke",
    "Perfect Blue", "Millennium Actress", "Paprika",
    // Tarkovsky & Russian
    "Andrei Rublev", "Mirror", "Stalker", "Solaris",
    "Russian Ark", "Mother and Son", "Faust",
    "Battleship Potemkin", "Ivan the Terrible",
    // Scorsese & American
    "Taxi Driver", "Raging Bull", "The Irishman",
    "Citizen Kane", "The Magnificent Ambersons", "Touch of Evil",
    "Sunset Boulevard", "Double Indemnity", "The Apartment",
    "Do the Right Thing", "Malcolm X",
    "Moonlight", "If Beale Street Could Talk",
    // Malick & Lynch & PTA
    "Days of Heaven", "The Thin Red Line", "The Tree of Life",
    "Mulholland Drive", "Blue Velvet", "Eraserhead",
    "There Will Be Blood", "Phantom Thread", "Magnolia",
    "Nashville", "McCabe & Mrs. Miller", "Short Cuts",
    // Kiarostami & Iranian
    "Close-Up", "Taste of Cherry", "Where Is the Friend’s House?",
    // Almodóvar & Spanish/European
    "Talk to Her", "All About My Mother", "Volver",
    "The Spirit of the Beehive", "El Sur", "Close Your Eyes",
    "Aniki-Bóbó", "Francisca", "Gebos’ Shadow",
    // Kieslowski & Polish/Hungarian
    "Three Colours: Blue", "The Double Life of Véronique", "Dekalog",
    "Possession", "On the Silver Globe",
    "The Red and the White", "The Round-Up",
    "Satantango", "Werckmeister Harmonies", "The Turin Horse",
    // Buñuel & Surrealism
    "The Discreet Charm of the Bourgeoisie", "Belle de Jour", "The Exterminating Angel",
    // Lang & German
    "Metropolis", "M",
    "Ali: Fear Eats the Soul", "The Marriage of Maria Braun", "Berlin Alexanderplatz",
    // Von Trier & Haneke
    "Breaking the Waves", "Dancer in the Dark", "Melancholia",
    "The Piano Teacher", "Caché", "Amour", "The White Ribbon",
    // Others / Contemporary Arthouse
    "The Piano", "An Angel at My Table", "The Power of the Dog",
    "Aguirre, the Wrath of God", "Fitzcarraldo", "Grizzly Man",
    "Black Girl", "Xala", "Camp de Thiaroye",
    "India Song",
    "The Match Factory Girl", "Le Havre", "Fallen Leaves",
    "Silent Light", "Post Tenebras Lux",
    "La Ciénaga", "The Headless Woman", "Zama",
    "In Vanda’s Room", "Colossal Youth", "Vitalina Varela",
    "Once Upon a Time in Anatolia", "Winter Sleep", "About Dry Grasses",
    "Certain Women", "Wendy and Lucy", "First Cow",
    "L’Avventura", "Red Desert", "Blow-Up",
    "Landscape in the Mist", "The Travelling Players", "Ulysses’ Gaze"
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getTrailer(tmdbId) {
    try {
        const response = await axios.get(
            `${TMDB_BASE_URL}/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}`
        );
        
        const videos = response.data.results;
        const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube') ||
                       videos.find(v => v.type === 'Teaser' && v.site === 'YouTube');
                       
        return trailer ? `https://www.youtube.com/embed/${trailer.key}` : null;
    } catch (error) {
        return null;
    }
}

async function getCredits(tmdbId) {
    try {
        const response = await axios.get(
            `${TMDB_BASE_URL}/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`
        );
        return response.data;
    } catch (error) {
        return null;
    }
}

async function seedMovies() {
    try {
        await connectDB();
        console.log('Connected to MongoDB');
        
        let addedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const title of MOVIES_TO_SEED) {
            // Check if movie exists
            const existingMovie = await Movie.findOne({ title: { $regex: new RegExp(`^${title}$`, 'i') } });
            
            if (existingMovie) {
                console.log(`Skipping existing movie: ${title}`);
                skippedCount++;
                continue;
            }

            console.log(`Searching for: ${title}`);
            
            // Search TMDB
            const searchRes = await axios.get(
                `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`
            );

            if (!searchRes.data.results?.length) {
                console.log(`❌ No results found for: ${title}`);
                errorCount++;
                continue;
            }

            // Get first result
            const tmdbMovie = searchRes.data.results[0];
            
            // Fetch full details
            const detailsRes = await axios.get(
                `${TMDB_BASE_URL}/movie/${tmdbMovie.id}?api_key=${TMDB_API_KEY}`
            );
            const details = detailsRes.data;

            // Fetch credits
            const credits = await getCredits(tmdbMovie.id);
            const directors = credits?.crew
                .filter(c => c.job === 'Director')
                .map(c => c.name) || [];

            // Fetch trailer
            const trailerUrl = await getTrailer(tmdbMovie.id);

            // Create or update movie object
            const releaseDate = new Date(details.release_date);
            const releaseYear = !isNaN(releaseDate.getTime()) ? releaseDate.getFullYear() : 0;

            const newMovie = {
                title: details.title,
                year: releaseYear,
                synopsis: details.overview,
                directors: directors,
                runtime: details.runtime,
                country: details.production_countries?.[0]?.name,
                posterUrl: `https://image.tmdb.org/t/p/w500${details.poster_path}`,
                backdropUrl: `https://image.tmdb.org/t/p/original${details.backdrop_path}`,
                genres: details.genres.map(g => g.name),
                tmdbId: details.id,
                vote_average: details.vote_average,
                vote_count: details.vote_count,
                popularity: details.popularity,
                trailerUrl: trailerUrl,
                // Only set default score if creating new, but here we overwrite
                arthouseScore: 85 + Math.floor(Math.random() * 15),
                tier: 1 
            };

            // Use findOneAndUpdate with upsert to avoid duplicate key errors
            await Movie.findOneAndUpdate(
                { tmdbId: details.id },
                { $set: newMovie },
                { upsert: true, new: true }
            );

            console.log(`✅ Added/Updated: ${title} (${newMovie.year})`);
            addedCount++;
            
            // Rate limiting
            await sleep(250);
        }

        console.log('\n--- Seeding Complete ---');
        console.log(`Added: ${addedCount}`);
        console.log(`Skipped: ${skippedCount}`);
        console.log(`Errors: ${errorCount}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    }
}

seedMovies();
