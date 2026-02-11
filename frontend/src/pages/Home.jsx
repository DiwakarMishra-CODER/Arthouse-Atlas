import { useState, useEffect } from 'react';
import { moviesAPI } from '../services/api';
import HeroCollage from '../components/HeroCollage';
import PosterCard from '../components/PosterCard';
import LoadingSkeleton from '../components/LoadingSkeleton';

// Deterministic hero movies in exact order
const HERO_TITLES = ['Mulholland Drive', 'Persona', 'Portrait of a Lady on Fire'];

const Home = () => {
    const [heroMovies, setHeroMovies] = useState([]);
    const [recentMovies, setRecentMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHeroMovies();
        fetchRecentMovies();
    }, []);

    const fetchHeroMovies = async () => {
        try {
            // Fetch the 3 hero movies directly by title
            const response = await moviesAPI.getMovies({
                titles: HERO_TITLES.join(','),
                limit: 3
            });

            // Sort the results to match HERO_TITLES order
            const sortedMovies = HERO_TITLES.map(title =>
                response.data.movies.find(movie =>
                    movie.title.toLowerCase().trim() === title.toLowerCase().trim()
                )
            ).filter(Boolean);

            setHeroMovies(sortedMovies);
        } catch (error) {
            console.error('Failed to fetch hero movies:', error);
        }
    };

    const fetchRecentMovies = async () => {
        try {
            const response = await moviesAPI.getMovies({ limit: 24 });
            setRecentMovies(response.data.movies);
        } catch (error) {
            console.error('Failed to fetch movies:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-24">
            {/* Hero Section */}
            <div className="max-w-[1800px] mx-auto px-8 mb-24">
                <HeroCollage movies={heroMovies} />
            </div>

            {/* Horizontal Carousel - Recently Added */}
            <div className="mb-24">
                <div className="max-w-[1800px] mx-auto px-8 mb-8">
                    <h2 className="font-serif text-4xl text-gray-100">Recently Added</h2>
                    <p className="text-muted mt-2">New arrivals in our collection</p>
                </div>

                {loading ? (
                    <LoadingSkeleton />
                ) : (
                    <div className="overflow-x-auto scroll-snap-x px-8 pb-4 hide-scrollbar">
                        <div className="flex gap-6 w-max">
                            {recentMovies.slice(0, 12).map((movie) => (
                                <div key={movie._id} className="w-56 flex-shrink-0">
                                    <PosterCard movie={movie} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Featured Section */}
            <div className="max-w-[1800px] mx-auto px-8 mb-24">
                <div className="grid grid-cols-2 gap-16">
                    <div>
                        <h3 className="font-serif text-3xl text-gray-100 mb-4">
                            Slow Cinema
                        </h3>
                        <p className="text-muted leading-relaxed mb-6">
                            Films that embrace duration, stillness, and contemplation. Experience time
                            unfolding at its own pace.
                        </p>
                        <a
                            href="/explore?tags=slow"
                            className="inline-block px-6 py-3 border border-accent-primary/30 text-accent-primary text-sm tracking-wide uppercase hover:bg-accent-primary/10 transition-colors"
                        >
                            Explore →
                        </a>
                    </div>
                    <div>
                        <h3 className="font-serif text-3xl text-gray-100 mb-4">
                            Dreamlike Narratives
                        </h3>
                        <p className="text-muted leading-relaxed mb-6">
                            Cinema that blurs reality and imagination, exploring the surreal and
                            subconscious through visual poetry.
                        </p>
                        <a
                            href="/explore?tags=dreamlike"
                            className="inline-block px-6 py-3 border border-accent-primary/30 text-accent-primary text-sm tracking-wide uppercase hover:bg-accent-primary/10 transition-colors"
                        >
                            Explore →
                        </a>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default Home;
