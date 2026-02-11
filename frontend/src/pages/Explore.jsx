import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { moviesAPI } from '../services/api';
import FilterPanel from '../components/FilterPanel';
import PosterCard from '../components/PosterCard';
import LoadingSkeleton from '../components/LoadingSkeleton';

const Explore = () => {
    const [searchParams] = useSearchParams();
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        director: '',
        genre: '',
        decade: '',
    });
    const [allTags, setAllTags] = useState([]);
    const [allGenres, setAllGenres] = useState([]);
    const [selectedTags, setSelectedTags] = useState(() => {
        const tagsParam = searchParams.get('tags');
        return tagsParam ? tagsParam.split(',') : [];
    });

    useEffect(() => {
        fetchTags();
        fetchGenres();
        fetchMovies();
    }, []);

    useEffect(() => {
        fetchMovies();
    }, [selectedTags]);

    const fetchTags = async () => {
        try {
            const response = await moviesAPI.getTags();
            setAllTags(response.data);
        } catch (error) {
            console.error('Failed to fetch tags:', error);
        }
    };

    const fetchGenres = async () => {
        try {
            const response = await moviesAPI.getGenres();
            setAllGenres(response.data);
        } catch (error) {
            console.error('Failed to fetch genres:', error);
        }
    };

    const fetchMovies = async () => {
        setLoading(true);
        try {
            const params = { ...filters, limit: 500 };
            if (selectedTags.length > 0) {
                params.tags = selectedTags.join(',');
            }
            const response = await moviesAPI.getMovies(params);
            setMovies(response.data.movies);
        } catch (error) {
            console.error('Failed to fetch movies:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({
            ...filters,
            [e.target.name]: e.target.value,
        });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchMovies();
    };

    const handleTagToggle = (tag) => {
        setSelectedTags((prev) => {
            if (prev.includes(tag)) {
                return prev.filter((t) => t !== tag);
            } else {
                return [...prev, tag];
            }
        });
    };

    return (
        <div className="min-h-screen pt-24">
            <div className="max-w-[1800px] mx-auto px-8">
                {/* Page Header */}
                <div className="mb-12">
                    <h1 className="font-serif text-6xl text-gray-100 mb-4">Explore</h1>
                    <p className="text-muted text-lg">
                        {movies.length} {movies.length === 1 ? 'film' : 'films'} found
                    </p>
                </div>

                <div className="flex gap-12">
                    {/* Filter Sidebar */}
                    <FilterPanel
                        allTags={allTags}
                        allGenres={allGenres}
                        selectedTags={selectedTags}
                        onTagToggle={handleTagToggle}
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onSearch={handleSearch}
                    />

                    {/* Results Grid */}
                    <div className="flex-1">
                        {loading ? (
                            <LoadingSkeleton />
                        ) : movies.length > 0 ? (
                            <div className="masonry-grid">
                                {movies.map((movie) => (
                                    <div key={movie._id} className="relative hover:z-50">
                                        <PosterCard movie={movie} />
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Explore;
