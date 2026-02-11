import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';

const PosterCard = ({ movie, showActions = true }) => {
    const { isAuthenticated, user, refreshUser } = useAuth();
    const [isHovered, setIsHovered] = useState(false);
    const [loading, setLoading] = useState(false);

    const isFavorited = user?.favorites?.some(fav => fav._id === movie._id || fav === movie._id);
    const isInWatchlist = user?.watchlist?.some(item => item._id === movie._id || item === movie._id);

    const handleFavorite = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) return;

        setLoading(true);
        try {
            if (isFavorited) {
                await userAPI.removeFromFavorites(movie._id);
            } else {
                await userAPI.addToFavorites(movie._id);
            }
            await refreshUser();
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleWatchlist = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) return;

        setLoading(true);
        try {
            if (isInWatchlist) {
                await userAPI.removeFromWatchlist(movie._id);
            } else {
                await userAPI.addToWatchlist(movie._id);
            }
            await refreshUser();
        } catch (error) {
            console.error('Failed to toggle watchlist:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Link
            to={`/movie/${movie._id}`}
            className="group block"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`relative ${isHovered ? 'z-50' : 'z-0'}`}>
                {/* Poster */}
                <div className="aspect-poster bg-surface overflow-hidden">
                    {movie.posterUrl ? (
                        <img
                            src={movie.posterUrl}
                            alt={movie.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted text-sm">
                            No Poster
                        </div>
                    )}

                    {/* Hover Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'
                        }`}>
                        <div className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                            }`}>
                            <h3 className="font-serif text-lg text-white mb-1 line-clamp-2">
                                {movie.title}
                            </h3>
                            <p className="text-gray-400 text-sm mb-3">
                                {movie.year} · {movie.directors?.[0] || 'Unknown'}
                            </p>

                            {/* Tags */}
                            {movie.derivedTags && movie.derivedTags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {movie.derivedTags.slice(0, 2).map((tag, idx) => (
                                        <span
                                            key={idx}
                                            className="text-xs px-2 py-1 bg-white/10 text-gray-300 border border-white/20"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {showActions && isAuthenticated && (
                        <div className={`absolute top-3 right-3 flex gap-2 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'
                            }`}>
                            <button
                                onClick={handleFavorite}
                                disabled={loading}
                                className={`p-2 backdrop-blur-md rounded-sm transition-colors ${isFavorited
                                    ? 'bg-accent-primary/90 text-white'
                                    : 'bg-black/60 text-white hover:bg-black/80'
                                    }`}
                                title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                            <button
                                onClick={handleWatchlist}
                                disabled={loading}
                                className={`p-2 backdrop-blur-md rounded-sm transition-colors ${isInWatchlist
                                    ? 'bg-accent-secondary/90 text-white'
                                    : 'bg-black/60 text-white hover:bg-black/80'
                                    }`}
                                title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default PosterCard;
