import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { moviesAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import TagChip from '../components/TagChip';
import LoadingSkeleton from '../components/LoadingSkeleton';

const MovieDetail = () => {
    const { id } = useParams();
    const { isAuthenticated, user, refreshUser } = useAuth();
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchMovie();
    }, [id]);

    const fetchMovie = async () => {
        try {
            const response = await moviesAPI.getMovieById(id);
            setMovie(response.data);
        } catch (error) {
            console.error('Failed to fetch movie:', error);
        } finally {
            setLoading(false);
        }
    };

    const isFavorited = user?.favorites?.some(fav => fav._id === id || fav === id);
    const isInWatchlist = user?.watchlist?.some(item => item._id === id || item === id);

    const handleFavorite = async () => {
        if (!isAuthenticated) return;

        setActionLoading(true);
        try {
            if (isFavorited) {
                await userAPI.removeFromFavorites(id);
            } else {
                await userAPI.addToFavorites(id);
            }
            await refreshUser();
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleWatchlist = async () => {
        if (!isAuthenticated) return;

        setActionLoading(true);
        try {
            if (isInWatchlist) {
                await userAPI.removeFromWatchlist(id);
            } else {
                await userAPI.addToWatchlist(id);
            }
            await refreshUser();
        } catch (error) {
            console.error('Failed to toggle watchlist:', error);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-24">
                <LoadingSkeleton />
            </div>
        );
    }

    if (!movie) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <p className="text-muted">Film not found</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-20">
            <div className="max-w-[1600px] mx-auto px-8">
                <div className="grid grid-cols-12 gap-16">
                    {/* Sticky Poster */}
                    <div className="col-span-4">
                        <div className="sticky top-24">
                            {movie.posterUrl ? (
                                <img
                                    src={movie.posterUrl}
                                    alt={movie.title}
                                    className="w-full aspect-poster object-cover shadow-2xl"
                                />
                            ) : (
                                <div className="w-full aspect-poster bg-surface flex items-center justify-center">
                                    <span className="text-muted">No Poster</span>
                                </div>
                            )}

                            {isAuthenticated && (
                                <div className="mt-6 space-y-3">
                                    <button
                                        onClick={handleFavorite}
                                        disabled={actionLoading}
                                        className={`w-full py-4 text-sm tracking-wide uppercase transition-colors ${isFavorited
                                            ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                                            } border`}
                                    >
                                        {isFavorited ? '♥ Favorited' : '♡ Add to Favorites'}
                                    </button>
                                    <button
                                        onClick={handleWatchlist}
                                        disabled={actionLoading}
                                        className={`w-full py-4 text-sm tracking-wide uppercase transition-colors ${isInWatchlist
                                            ? 'bg-accent-secondary/20 border-accent-secondary text-accent-secondary'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                                            } border`}
                                    >
                                        {isInWatchlist ? '✓ In Watchlist' : '+ Add to Watchlist'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="col-span-8">
                        {/* Title */}
                        <h1 className="font-serif text-7xl text-gray-100 leading-tight mb-6">
                            {movie.title}
                        </h1>

                        {/* Meta Info */}
                        <div className="flex items-center gap-6 text-muted text-lg mb-12">
                            <span>{movie.year}</span>
                            {movie.runtime && (
                                <>
                                    <span>·</span>
                                    <span>{movie.runtime} min</span>
                                </>
                            )}
                            {movie.country && (
                                <>
                                    <span>·</span>
                                    <span>{movie.country}</span>
                                </>
                            )}
                        </div>

                        {/* Director */}
                        {movie.directors && movie.directors.length > 0 && (
                            <div className="mb-10">
                                <h2 className="text-xs uppercase tracking-wider text-muted mb-3">
                                    Director{movie.directors.length > 1 ? 's' : ''}
                                </h2>
                                <p className="font-serif text-2xl text-accent-primary">
                                    {movie.directors.join(', ')}
                                </p>
                            </div>
                        )}

                        {/* Synopsis */}
                        <div className="mb-10">
                            <h2 className="text-xs uppercase tracking-wider text-muted mb-4">Synopsis</h2>
                            <p className="text-gray-300 text-lg leading-relaxed">
                                {movie.synopsis}
                            </p>
                        </div>

                        {/* Arthouse Tags */}
                        {movie.derivedTags && movie.derivedTags.length > 0 && (
                            <div className="mb-10">
                                <h2 className="text-xs uppercase tracking-wider text-muted mb-4">
                                    Cinematic Qualities
                                </h2>
                                <div className="flex flex-wrap gap-3">
                                    {movie.derivedTags.map((tag, idx) => (
                                        <TagChip key={idx} tag={tag} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Genres */}
                        {movie.genres && movie.genres.length > 0 && (
                            <div className="mb-10">
                                <h2 className="text-xs uppercase tracking-wider text-muted mb-4">Genres</h2>
                                <div className="flex flex-wrap gap-3">
                                    {movie.genres.map((genre, idx) => (
                                        <span
                                            key={idx}
                                            className="px-4 py-2 bg-white/5 border border-white/10 text-gray-400 text-sm"
                                        >
                                            {genre}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MovieDetail;
