import { useState, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { moviesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import FilterPanel from '../components/FilterPanel';
import PosterCard from '../components/PosterCard';
import LoadingSkeleton from '../components/LoadingSkeleton';

const Explore = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const { user, setUser } = useAuth();

    // Lazy initialize state from sessionStorage
    const [movies, setMovies] = useState(() => {
        const saved = sessionStorage.getItem('explore_movies_v3');
        return saved ? JSON.parse(saved) : [];
    });

    const [loading, setLoading] = useState(() => {
        // If we have movies, we aren't loading
        const savedMovies = sessionStorage.getItem('explore_movies_v3');
        return !savedMovies;
    });

    const [filters, setFilters] = useState(() => {
        const saved = sessionStorage.getItem('explore_filters_v3');
        return saved ? JSON.parse(saved) : {
            search: searchParams.get('search') || '',
            director: searchParams.get('director') || '',
            genre: searchParams.get('genre') || '',
            decade: searchParams.get('decade') || '',
        };
    });

    const [allTags, setAllTags] = useState([]);
    const [allGenres, setAllGenres] = useState([]);
    const [allDirectors, setAllDirectors] = useState([]);
    const [allTitles, setAllTitles] = useState([]);

    const [selectedTags, setSelectedTags] = useState(() => {
        const saved = sessionStorage.getItem('explore_tags_v3');
        if (saved) return JSON.parse(saved);
        const tagsParam = searchParams.get('tags');
        const moodParam = searchParams.get('mood');
        if (moodParam) return [moodParam];
        return tagsParam ? tagsParam.split(',') : [];
    });

    // Sync State with URL Params (Back/Forward navigation support)
    useEffect(() => {
        const moodParam = searchParams.get('mood');
        const genreParam = searchParams.get('genre');
        // We can also check tags if we want to support both
        const tagsParam = searchParams.get('tags');

        if (moodParam) {
            setSelectedTags([moodParam]);
        } else if (tagsParam) {
            setSelectedTags(tagsParam.split(','));
        }

        if (genreParam) {
            setFilters(prev => ({ ...prev, genre: genreParam }));
        }
    }, [searchParams]);

    // Track if initial mount has completed to avoid double fetching
    const hasInitialized = useRef(false);

    // Track shuffle mode and seed
    const [isShuffled, setIsShuffled] = useState(() => {
        const saved = sessionStorage.getItem('explore_is_shuffled_v3');
        return saved === 'true'; // Default false (Curated) unless saved as true
    });

    const [shuffleSeed, setShuffleSeed] = useState(() => {
        const saved = sessionStorage.getItem('explore_seed_v3');
        return saved ? parseInt(saved, 10) : Date.now();
    });

    // Save state to sessionStorage whenever it changes
    useEffect(() => {
        sessionStorage.setItem('explore_movies_v3', JSON.stringify(movies));
        sessionStorage.setItem('explore_filters_v3', JSON.stringify(filters));
        sessionStorage.setItem('explore_tags_v3', JSON.stringify(selectedTags));
        sessionStorage.setItem('explore_is_shuffled_v3', isShuffled.toString());
        sessionStorage.setItem('explore_seed_v3', shuffleSeed.toString());
    }, [movies, filters, selectedTags, isShuffled, shuffleSeed]);

    // Scroll Restoration
    useEffect(() => {
        const savedScroll = sessionStorage.getItem('explore_scroll');
        if (savedScroll && movies.length > 0) {
            window.scrollTo(0, parseFloat(savedScroll));
        }

        const handleScroll = () => {
            sessionStorage.setItem('explore_scroll', window.scrollY.toString());
        };

        // Throttle scroll save
        let timeoutId;
        const throttledScroll = () => {
            if (!timeoutId) {
                timeoutId = setTimeout(() => {
                    handleScroll();
                    timeoutId = null;
                }, 100);
            }
        };

        window.addEventListener('scroll', throttledScroll);
        return () => {
            window.removeEventListener('scroll', throttledScroll);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [movies.length]); // Only re-run if movies length changes (loaded)

    // Initial Data Fetch (Tags, Genres, Directors)
    useEffect(() => {
        fetchTags();
        fetchGenres();
        fetchDirectors();
        fetchTitles();

        // Only fetch movies if we don't have them
        if (movies.length === 0) {
            fetchMovies();
        }
        hasInitialized.current = true;
    }, []);

    // Re-fetch when filters/tags change (but NOT on initial mount if we have data)
    // Refactoring useEffects

    // Re-fetch when tags/filters (except search) change
    // Re-fetch when tags/filters (except search) change
    const prevFiltersRef = useRef(filters);
    const prevTagsRef = useRef(selectedTags);
    const prevShuffleRef = useRef(isShuffled);

    useEffect(() => {
        if (!hasInitialized.current) return;

        const filtersChanged =
            filters.genre !== prevFiltersRef.current.genre ||
            filters.decade !== prevFiltersRef.current.decade ||
            filters.director !== prevFiltersRef.current.director;

        const tagsChanged = JSON.stringify(selectedTags) !== JSON.stringify(prevTagsRef.current);
        const shuffleChanged = isShuffled !== prevShuffleRef.current;

        if (filtersChanged || tagsChanged || shuffleChanged) {
            fetchMovies();
        }

        // Update refs
        prevFiltersRef.current = filters;
        prevTagsRef.current = selectedTags;
        prevShuffleRef.current = isShuffled;
    }, [filters.genre, filters.decade, filters.director, selectedTags, isShuffled]);

    // Debounce search
    useEffect(() => {
        if (!hasInitialized.current) return;
        // Logic fix: Verify change against Ref, but ALSO update Ref after!
        if (filters.search === prevFiltersRef.current.search) return;

        const timer = setTimeout(() => {
            fetchMovies();
            // Upate ref to current search so we don't re-run or block future valid same-updates (though state change implies diff)
            // Actually, simply updating the ref in the previous effect is cleaner if we include search in deps?
            // No, we want debouncing ONLY for search.
            prevFiltersRef.current = { ...prevFiltersRef.current, search: filters.search };
        }, 500);

        return () => clearTimeout(timer);
    }, [filters.search]);


    const fetchTags = async () => {
        try {
            const response = await moviesAPI.getTags();
            setAllTags(response.data.filter(Boolean));
        } catch (error) {
            console.error('Failed to fetch tags:', error);
        }
    };

    const fetchGenres = async () => {
        try {
            const response = await moviesAPI.getGenres();
            setAllGenres(response.data.filter(Boolean));
        } catch (error) {
            console.error('Failed to fetch genres:', error);
        }
    };

    const fetchDirectors = async () => {
        try {
            const response = await moviesAPI.getDirectors();
            setAllDirectors(response.data.filter(Boolean));
        } catch (error) {
            console.error('Failed to fetch directors:', error);
        }
    };

    const fetchTitles = async () => {
        try {
            const response = await moviesAPI.getTitles();
            setAllTitles(response.data.filter(Boolean));
        } catch (error) {
            console.error('Failed to fetch titles:', error);
        }
    };


    const fetchMovies = async (options = {}) => {
        // Handle both old signature (boolean) and new options object
        const forceShuffle = typeof options === 'boolean' ? options : options?.forceShuffle || false;
        const overrideFilters = options?.filters || null;
        const overrideTags = options?.tags || null;

        setLoading(true);
        try {
            // Use overrides if provided, otherwise use current state
            const activeFilters = overrideFilters || filters;
            const activeTags = overrideTags || selectedTags;

            const params = { ...activeFilters, limit: 500 };

            const effectiveShuffle = forceShuffle || isShuffled;

            if (effectiveShuffle) {
                params.random = 'true';
                params._t = Date.now();
            } else {
                params.curated = 'true';
            }

            // If user has filtered (search/tags/etc), disable curated/random default behavior
            const hasFilters = activeFilters.search || activeFilters.director || activeFilters.genre || activeFilters.decade || activeTags.length > 0;
            if (hasFilters) {
                delete params.curated;
                delete params.random;
            }

            if (activeTags.length > 0) {
                params.tags = activeTags.join(',');
            }
            const response = await moviesAPI.getMovies(params);
            setMovies(response.data.movies);

        } catch (error) {
            console.error('Failed to fetch movies:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleShuffle = () => {
        const newSeed = Date.now();
        setShuffleSeed(newSeed);
        setIsShuffled(true);
        fetchMovies({ forceShuffle: true });
    };

    const handleClearFilters = () => {
        // 1. Reset all local state
        const emptyFilters = { search: '', director: '', genre: '', decade: '' };
        setFilters(emptyFilters);
        setSelectedTags([]);

        // 2. Clear URL params
        setSearchParams({});

        // 3. Clear Cache
        sessionStorage.removeItem('arthouse_explore_state');

        // 4. Force immediate re-fetch with empty values (bypassing state update lag)
        fetchMovies({
            filters: emptyFilters,
            tags: [],
            forceShuffle: false // preserve current shuffle state or reset? User said "snaps back to full database", implies default? 
            // Usually "Clear All" means "Show me everything".
            // If they were shuffled, maybe keep shuffled? Or reset to curated?
            // "App snaps back to full database". 
            // Let's assume standard "curated" default if no shuffle.
        });
    };

    const handleFilterChange = (e) => {
        // ... existing logic ...
        // (No changes needed here, but need to keep it)
        sessionStorage.removeItem('arthouse_explore_state');

        const newFilters = {
            ...filters,
            [e.target.name]: e.target.value,
        };

        setFilters(newFilters);

        const newParams = {};
        if (newFilters.search) newParams.search = newFilters.search;
        if (newFilters.director) newParams.director = newFilters.director;
        if (newFilters.genre) newParams.genre = newFilters.genre;
        if (newFilters.decade) newParams.decade = newFilters.decade;
        if (selectedTags.length > 0) newParams.tags = selectedTags.join(',');

        setSearchParams(newParams);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        sessionStorage.removeItem('arthouse_explore_state');
        fetchMovies();
    };

    const handleTagToggle = (tag) => {
        sessionStorage.removeItem('arthouse_explore_state');
        const newTags = selectedTags.includes(tag)
            ? selectedTags.filter((t) => t !== tag)
            : [...selectedTags, tag];
        setSelectedTags(newTags);

        const newParams = {};
        if (filters.search) newParams.search = filters.search;
        if (filters.director) newParams.director = filters.director;
        if (filters.genre) newParams.genre = filters.genre;
        if (filters.decade) newParams.decade = filters.decade;
        if (newTags.length > 0) newParams.tags = newTags.join(',');
        setSearchParams(newParams);
    };

    return (
        <div className="min-h-screen pt-24">
            <Toaster position="bottom-right" />

            <div className="max-w-[1800px] mx-auto px-8">
                {/* Page Header */}
                <div className="mb-12 flex items-center justify-between">
                    <div>
                        <h1 className="font-serif text-6xl text-gray-100 mb-4">Explore</h1>
                        <p className="text-muted text-lg">
                            {movies.length} {movies.length === 1 ? 'film' : 'films'} found
                        </p>
                    </div>

                    {/* Shuffle Button */}
                    <button
                        onClick={handleShuffle}
                        disabled={loading}
                        className="px-6 py-3 bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-50"
                        title="Shuffle results"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Shuffle
                    </button>
                </div>

                <div className="flex gap-12">
                    {/* Filter Sidebar */}
                    <FilterPanel
                        allTags={allTags}
                        allGenres={allGenres}
                        allDirectors={allDirectors}
                        allTitles={allTitles}
                        selectedTags={selectedTags}
                        onTagToggle={handleTagToggle}
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onSearch={handleSearch}
                        onClear={handleClearFilters}
                    />

                    {/* Results Grid */}
                    < div className="flex-1" >
                        {
                            loading ? (
                                <LoadingSkeleton />
                            ) : movies.length > 0 ? (
                                <div className="masonry-grid">
                                    {movies.map((movie) => (
                                        <div key={movie._id} className="relative hover:z-50">
                                            <PosterCard
                                                movie={movie}

                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20">
                                    <p className="text-muted text-lg mb-4">No films match your criteria</p>
                                    <button
                                        onClick={() => {
                                            setFilters({ search: '', director: '', genre: '', decade: '' });
                                            setSelectedTags([]);
                                            fetchMovies();
                                        }}
                                        className="px-6 py-3 border border-accent-primary/30 text-accent-primary text-sm tracking-wide uppercase hover:bg-accent-primary/10 transition-colors"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            )}
                    </div >
                </div >
            </div >
        </div >
    );
};

export default Explore;
