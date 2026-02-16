import { Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import PortalModal from './PortalModal';

const PosterCard = ({ movie, showActions = true }) => {
    const { isAuthenticated, user, refreshUser } = useAuth();
    const [isHovered, setIsHovered] = useState(false);
    const [showTrailer, setShowTrailer] = useState(false);
    const [coords, setCoords] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false); // Mobile state
    const hoverTimeoutRef = useRef(null);
    const closeTimeoutRef = useRef(null);
    const cardRef = useRef(null);

    const isFavorited = user?.favorites?.some(fav => fav._id === movie._id || fav === movie._id);
    const isInWatchlist = user?.watchlist?.some(item => item._id === movie._id || item === movie._id);

    // Extract YouTube video ID from embed URL
    const getYouTubeId = (url) => {
        const match = url?.match(/\/embed\/([^?]+)/);
        return match?.[1] || '';
    };

    const videoId = getYouTubeId(movie.trailerUrl);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

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


    const handleMouseEnter = () => {
        // Clear closing timer if re-entering
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }

        setIsHovered(true);
        // Start 1-second timer for trailer
        hoverTimeoutRef.current = setTimeout(() => {
            if (cardRef.current) {
                const rect = cardRef.current.getBoundingClientRect();
                setCoords({
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                    height: rect.height
                });
                setShowTrailer(true);
            }
        }, 1000);
    };

    const handleMouseLeave = () => {
        // 100ms grace period to allow moving to portal
        closeTimeoutRef.current = setTimeout(() => {
            setIsHovered(false);
            setShowTrailer(false);
            setCoords(null);
            setIsMobileExpanded(false); // Reset mobile state
        }, 100);

        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
    };

    // Mobile Click Handler
    const handleMobileClick = (e) => {
        if (window.innerWidth < 768) {
            // If not expanded, prevent navigation and expand
            if (!isMobileExpanded) {
                e.preventDefault();
                e.stopPropagation(); // Stop event bubbling

                if (cardRef.current) {
                    const rect = cardRef.current.getBoundingClientRect();
                    setCoords({
                        top: rect.top + window.scrollY,
                        left: rect.left + window.scrollX,
                        width: rect.width,
                        height: rect.height
                    });
                    setShowTrailer(true);
                    setIsMobileExpanded(true);
                }
            }
            // If already expanded, let the Link navigation happen naturally (to details page)
            // or if they clicked a specific action button inside the portal, that logic takes over
        }
    };

    // Close portal on scroll or resize to prevent misalignment
    useEffect(() => {
        const handleScrollOrResize = () => {
            if (showTrailer) {
                setShowTrailer(false);
                setCoords(null);
            }
        };

        window.addEventListener('scroll', handleScrollOrResize);
        window.addEventListener('resize', handleScrollOrResize);

        return () => {
            window.removeEventListener('scroll', handleScrollOrResize);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [showTrailer]);

    const isExpanded = showTrailer && movie.trailerUrl && coords;

    return (
        <div
            className="group block relative"
            ref={cardRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Base Card - Always visible acting as placeholder/anchor */}
            <Link
                to={`/movie/${movie._id}`}
                onClick={handleMobileClick}
                className={`block aspect-poster bg-surface overflow-hidden relative ${isExpanded ? 'opacity-0' : 'opacity-100'}`}
            >
                {movie.posterUrl ? (
                    <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted text-sm">
                        No Poster
                    </div>
                )}

                {/* Hover Overlay (Only visible when NOT expanded) */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${isHovered && !isExpanded ? 'opacity-100' : 'opacity-0'
                    }`}>
                    <div className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 hidden md:block ${isHovered && !isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                        }`}>
                        <h3 className="font-serif text-lg text-white mb-1 line-clamp-2">
                            {movie.title}
                        </h3>
                        <p className="text-gray-400 text-sm mb-3">
                            {movie.year} · {movie.directors?.[0] || 'Unknown'}
                        </p>

                        {/* Quick Actions removed - moved to PortalModal */}
                    </div>
                </div>
            </Link>

            {/* Portal for Expanded Card */}
            {isExpanded && (
                <PortalModal
                    movie={movie}
                    coords={coords}
                    onClose={() => {
                        setShowTrailer(false);
                        setCoords(null);
                    }}
                    onMouseEnter={() => {
                        // Keep open when hovering the portal
                        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                    }}
                    onMouseLeave={handleMouseLeave}

                />
            )}
        </div>
    );
};

export default PosterCard;
