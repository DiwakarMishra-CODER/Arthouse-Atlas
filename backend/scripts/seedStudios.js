
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import connectDB from '../config/database.js';
import Movie from '../models/Movie.js';
import Studio from '../models/Studio.js';

console.log('Script file loaded');
dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const studiosData = [
    {
        name: "The Criterion Collection",
        tagline: "Preserving the art of film.",
        curatorNote: "The Criterion Collection is the gold standard for restorations and definitive editions — a curator, archivist and educator rolled into one. Their editions have shaped how generations discover world cinema.",
        tier: "Restoration",
        films: ["Tokyo Story", "Persona", "Seven Samurai", "Stalker"]
    },
    {
        name: "A24",
        tagline: "Modern auteurs, amplified.",
        curatorNote: "A24 has redefined contemporary indie prestige — championing bold, conversation-starting auteurs and creating a cultural identity around festival-first cinema.",
        tier: "Disruptor",
        films: ["Moonlight", "Aftersun", "The Lighthouse", "First Reformed"]
    },
    {
        name: "NEON",
        tagline: "Bold. Provocative. Unfiltered.",
        curatorNote: "NEON specializes in festival breakthroughs — fearless, often polarizing films that travel from Cannes to global audiences. Their slate skews modern, daring and auteur-driven.",
        tier: "Disruptor",
        films: ["Parasite", "Portrait of a Lady on Fire", "Titane", "Drive My Car"]
    },
    {
        name: "Sony Pictures Classics",
        tagline: "Prestige international cinema.",
        curatorNote: "A studio-backed specialty arm that reliably acquires sophisticated auteur and international titles — strong awards visibility with careful theatrical rollouts.",
        tier: "Major",
        films: ["The Diving Bell and the Butterfly", "Ida", "Capernaum", "Call Me by Your Name"]
    },
    {
        name: "IFC Films",
        tagline: "Launchpad for independent voices.",
        curatorNote: "IFC and Sundance Selects are key U.S. platforms for indie auteurs and festival discoveries — a perfect home for smaller, character-driven films seeking critical audiences.",
        tier: "Boutique",
        films: ["Boyhood", "We Need to Talk About Kevin", "Certain Women", "Frances Ha"]
    },
    {
        name: "Kino Lorber",
        tagline: "Classics, restorations and world cinema.",
        curatorNote: "Kino Lorber is an archivist-forward label that brings restored classics and international milestones back into circulation — essential for any serious film library.",
        tier: "Archive",
        films: ["Metropolis", "M", "Ugetsu", "Battleship Potemkin"]
    },
    {
        name: "MK2 Films",
        tagline: "Europe’s auteur engine.",
        curatorNote: "MK2 has been instrumental in producing and distributing major European auteur films, from intimate dramas to formally ambitious works that define festival seasons.",
        tier: "International",
        films: ["Amour", "Caché", "Certified Copy", "Three Colors: Blue"]
    },
    {
        name: "Film4 Productions",
        tagline: "Risk-taking British cinema.",
        curatorNote: "Film4 has a long track record of funding daring, socially engaged and formally adventurous British films — a vital patron for local auteur voices.",
        tier: "Boutique",
        films: ["Under the Skin", "The Favourite", "This Is England", "Room"]
    },
    {
        name: "Dogwoof",
        tagline: "Documentary specialists.",
        curatorNote: "Dogwoof curates and distributes high-profile documentary cinema — films that combine journalistic urgency with cinematic artistry.",
        tier: "Boutique",
        films: ["The Act of Killing", "Searching for Sugar Man", "Honeyland", "All That Breathes"]
    },
    {
        name: "Curzon",
        tagline: "UK theatrical home for world cinema.",
        curatorNote: "Curzon / Artificial Eye curates a steady stream of European and international auteurs for UK theatres — the distributor of record for many contemporary festival darlings.",
        tier: "International",
        films: ["The White Ribbon", "The Worst Person in the World", "The Handmaiden", "The Grand Budapest Hotel"]
    }
];

const fetchMovieFromTMDB = async (title) => {
    try {
        let searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
        const searchRes = await axios.get(searchUrl);
        
        if (!searchRes.data.results || searchRes.data.results.length === 0) {
            console.log(`  ✗ TMDB: Not found "${title}"`);
            return null;
        }

        const tmdbMovie = searchRes.data.results[0];
        const tmdbId = tmdbMovie.id;

        const detailsRes = await axios.get(
            `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,keywords,videos`
        );
        const details = detailsRes.data;

        const directors = details.credits.crew
            .filter(person => person.job === 'Director')
            .map(person => person.name);

        const keywords = details.keywords?.keywords?.map(k => k.name) || [];
        const genres = details.genres?.map(g => g.name) || [];

        const trailer = details.videos?.results?.find(
            v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
        );
        const trailerUrl = trailer ? `https://www.youtube.com/embed/${trailer.key}` : null;

        const arthouseScore = Math.floor(Math.random() * (99 - 85 + 1)) + 85;

        return {
            title: details.title,
            year: new Date(details.release_date).getFullYear(),
            synopsis: details.overview,
            directors: directors,
            runtime: details.runtime,
            country: details.production_countries?.[0]?.name || 'Unknown',
            posterUrl: details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : null,
            backdropUrl: details.backdrop_path ? `${IMAGE_BASE_URL}${details.backdrop_path}` : null,
            trailerUrl: trailerUrl,
            genres: genres,
            keywords: keywords,
            tmdbId: tmdbId,
            vote_average: details.vote_average,
            vote_count: details.vote_count,
            popularity: details.popularity,
            arthouseScore: arthouseScore
        };
    } catch (error) {
        console.error(`  ✗ Error fetching "${title}":`, error.message);
        return null;
    }
};

const seedStudios = async () => {
    try {
        await connectDB();
        console.log('\nStarting Studios Seed...\n');

        // Clear existing studios to prevent duplicates/stale data
        await Studio.deleteMany({});
        console.log('Cleared existing studios.');

        for (const [index, studioData] of studiosData.entries()) {
            console.log(`\nProcessing Studio: ${studioData.name}`);
            const featuredFilms = [];

            for (const filmTitle of studioData.films) {
                // 1. Find or Create Movie
                let movie = await Movie.findOne({ 
                    title: { $regex: new RegExp(`^${filmTitle}$`, 'i') } 
                });

                if (!movie) {
                    console.log(`  ↗ Fetching movie: ${filmTitle}...`);
                    const movieData = await fetchMovieFromTMDB(filmTitle);
                    if (movieData) {
                        // Check duplicate by TMDB ID
                        const existing = await Movie.findOne({ tmdbId: movieData.tmdbId });
                        if (existing) {
                             movie = existing;
                             console.log(`  ✓ Found existing by ID: ${movie.title}`);
                        } else {
                            movie = await Movie.create(movieData);
                            console.log(`  ✓ Created: ${movie.title}`);
                        }
                    }
                    await delay(250);
                } else {
                    // console.log(`  ✓ Movie exists: ${movie.title}`);
                }

                if (movie) {
                    featuredFilms.push({
                        title: movie.title,
                        movieId: movie._id,
                        posterUrl: movie.posterUrl
                    });
                }
            }

            // Create Studio
            await Studio.create({
                name: studioData.name,
                tagline: studioData.tagline,
                curatorNote: studioData.curatorNote,
                tier: studioData.tier,
                featuredFilms: featuredFilms,
                sortOrder: index
            });
            console.log(`  > Created Studio: ${studioData.name} with ${featuredFilms.length} films`);
        }

        console.log('\nStudio Seeding Complete!');
        process.exit(0);

    } catch (error) {
        console.error('Seeding Error:', error);
        process.exit(1);
    }
};

seedStudios();
