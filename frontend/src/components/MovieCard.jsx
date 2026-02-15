import { Link } from 'react-router-dom';
import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import AnimatedStillReel from './motion/AnimatedStillReel';

const MovieCard = ({ movie, showActions = true }) => {
    const { isAuthenticated, user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const isFavorited = user?.favorites?.some(fav => fav._id === movie._id || fav === movie._id);
    const isInWatchlist = user?.watchlist?.some(item => item._id === movie._id || item === movie._id);

    // Motion system support
    const hasStills = movie.stills && movie.stills.length > 0;
    const isMotionActive = isHovered;

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

    const timerRef = useRef(null);
    const isLongPress = useRef(false);

    // Touch-and-Hold Logic
    const handleTouchStart = () => {
        isLongPress.current = false;
        timerRef.current = setTimeout(() => {
            isLongPress.current = true;
            setIsHovered(true); // Trigger the "hover" effect
        }, 500); // 500ms delay
    };

    const handleTouchEnd = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setIsHovered(false); // Unmount immediately on release
    };

    const handleTouchMove = () => {
        // If user scrolls, cancel the long press
        if (timerRef.current) clearTimeout(timerRef.current);
        setIsHovered(false);
    };

    const handleClick = (e) => {
        if (isLongPress.current) {
            e.preventDefault(); // Stop navigation
            e.stopPropagation();
            isLongPress.current = false; // Reset
        }
    };

    return (
        <Link
            to={`/movie/${movie._id}`}
            className="group block"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onClick={handleClick}
        >
            <div className="relative overflow-hidden rounded-lg bg-cinema-gray hover:ring-2 hover:ring-cinema-accent transition-all duration-300">
                {/* Poster / Animated Reel */}
                <div className="aspect-[2/3] overflow-hidden bg-cinema-dark relative">
                    {hasStills ? (
                        <>
                            {/* Static poster (shown when not active) */}
                            <div
                                className="absolute inset-0 transition-opacity duration-500"
                                style={{
                                    opacity: isMotionActive ? 0 : 1,
                                    zIndex: isMotionActive ? 0 : 2
                                }}
                            >
                                <img
                                    src={movie.posterUrl}
                                    alt={movie.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Animated still reel (shown on hover/tap) */}
                            <div
                                className="absolute inset-0"
                                style={{
                                    zIndex: isMotionActive ? 2 : 0
                                }}
                            >
                                <AnimatedStillReel
                                    stills={movie.stills}
                                    isActive={isMotionActive}
                                    fallbackImage={movie.posterUrl}
                                    duration={8000}
                                    interval={3500}
                                />
                            </div>
                        </>
                    ) : movie.posterUrl ? (
                        <img
                            src={movie.posterUrl}
                            alt={movie.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                            No Poster
                        </div>
                    )}
                </div>

                {/* Actions Overlay */}
                {showActions && isAuthenticated && (
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={handleFavorite}
                            disabled={loading}
                            className={`p-2 rounded-full backdrop-blur-sm ${isFavorited
                                ? 'bg-red-500 text-white'
                                : 'bg-black/50 text-white hover:bg-black/70'
                                }`}
                            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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
                            className={`p-2 rounded-full backdrop-blur-sm ${isInWatchlist
                                ? 'bg-blue-500 text-white'
                                : 'bg-black/50 text-white hover:bg-black/70'
                                }`}
                            title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                {/* Info */}
                <div className="p-3">
                    <h3 className="font-semibold text-cinema-accent line-clamp-1 mb-1">
                        {movie.title}
                    </h3>
                    <p className="text-sm text-gray-400">
                        {movie.year} • {movie.directors?.[0] || 'Unknown'}
                    </p>
                    {movie.derivedTags && movie.derivedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {movie.derivedTags.slice(0, 3).map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="text-xs px-2 py-1 bg-cinema-dark text-gray-400 rounded"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default MovieCard;
