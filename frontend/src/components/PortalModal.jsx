import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';

const PortalModal = ({ movie, coords, onClose, onMouseEnter, onMouseLeave }) => {
    const { isAuthenticated, user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const navigate = useNavigate();

    // Initial mount animation trigger
    useEffect(() => {
        requestAnimationFrame(() => setMounted(true));
    }, []);

    const toggleMute = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsMuted(!isMuted);
    };

    // Open full YouTube trailer in new tab
    const handleOpenYoutube = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!movie.trailerUrl) return;

        // Extract video ID from embed URL (e.g., https://www.youtube.com/embed/VIDEO_ID)
        const videoId = movie.trailerUrl.split('/embed/')[1]?.split('?')[0];
        if (videoId) {
            window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
        }
    };

    const isFavorited = user?.favorites?.some(fav => fav._id === movie._id || fav === movie._id);
    const isInWatchlist = user?.watchlist?.some(item => item._id === movie._id || item === movie._id);
    const isWatched = user?.watched?.some(item => item._id === movie._id || item === movie._id);

    // Extract YouTube video ID
    const getYouTubeId = (url) => {
        const match = url?.match(/\/embed\/([^?]+)/);
        return match?.[1] || '';
    };

    const videoId = getYouTubeId(movie.trailerUrl);

    // --- DIMENSIONS & POSITIONING ---
    // Calculate expanded dimensions (Netflix style: ~1.5x - 2x width)
    const originalWidth = coords.width;
    const expandedWidth = Math.max(350, originalWidth * 1.5); // Min 350px, usually 1.5x
    const aspectVideo = 9 / 16;
    const videoHeight = expandedWidth * aspectVideo;
    const infoHeight = 140; // Space for title, buttons, tags
    const totalHeight = videoHeight + infoHeight;

    // Center horizontally relative to original card
    let left = coords.left + (coords.width / 2) - (expandedWidth / 2);
    // Center vertically over original card
    let top = coords.top + (coords.height / 2) - (totalHeight / 2);

    // Safety Clamps (Screen Bounds)
    const padding = 16;
    const windowWidth = window.innerWidth;

    // Clamp Left/Right
    if (left < padding) left = padding;
    if (left + expandedWidth > windowWidth - padding) {
        left = windowWidth - expandedWidth - padding;
    }

    // Clamp Top (optional - if it goes off top, maybe push down?)
    // For now, let it float naturally, maybe clamped to top padding
    // if (top < padding) top = padding; // Uncomment if we want to force it down

    const handleFavorite = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            if (isFavorited) await userAPI.removeFromFavorites(movie._id);
            else await userAPI.addToFavorites(movie._id);
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
            if (isInWatchlist) await userAPI.removeFromWatchlist(movie._id);
            else await userAPI.addToWatchlist(movie._id);
            await refreshUser();
        } catch (error) {
            console.error('Failed to toggle watchlist:', error);
        } finally {
            setLoading(false);
        }
    };



    const handleBackgroundClick = (e) => {
        // Only navigate if it wasn't a button click that bubbled up
        // Although we use stopPropagation on buttons, this is a safety check
        // e.target check might be tricky with nested elements, 
        // so we rely on buttons doing stopPropagation.

        // Ensure we don't block interaction with controls if any
        if (e.defaultPrevented) return;

        onClose(); // Cleanup
        navigate(`/movie/${movie._id}`);
    };

    return createPortal(
        <>
            {/* Transparent Backdrop for Click-Outside (Mobile) */}
            <div
                className="fixed inset-0 bg-black/10 z-[9990] md:hidden"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            />


            {/* The Modal Card */}
            <div
                className={`absolute bg-[#141414] rounded-md shadow-2xl overflow-hidden pointer-events-auto transition-all duration-300 ease-out origin-center group ring-1 ring-white/10 z-[9999]`}
                style={{
                    top: top,
                    left: left,
                    width: expandedWidth,
                    height: totalHeight,
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'scale(1)' : 'scale(0.9)',
                }}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <div
                    className="block w-full h-full relative cursor-pointer"
                    onClick={handleBackgroundClick}
                >

                    {/* Video Section (Top) */}
                    <div className="relative w-full aspect-video bg-black">
                        <iframe
                            src={`${movie.trailerUrl}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&modestbranding=1&loop=1&playlist=${videoId}`}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            allow="autoplay; encrypted-media"
                            frameBorder="0"
                            title={`${movie.title} trailer`}
                        />

                        {/* Mute Button - Needs pointer-events-auto since iframe is disabled or covered */}
                        <button
                            onClick={toggleMute}
                            className="absolute bottom-4 right-4 z-20 p-2 rounded-full bg-black/50 border border-white/20 text-white hover:bg-white/20 transition-colors pointer-events-auto"
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                            )}
                        </button>

                        {/* Gradient Overlay for text readability at bottom of video */}
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#141414] via-[#141414]/60 to-transparent pointer-events-none" />
                    </div>

                    {/* Info Section (Bottom) */}
                    <div className="p-4 flex flex-col justify-start h-[140px]">

                        {/* Row 1: Action Buttons & Title */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex gap-2">
                                {/* Details Button (Replaces static Play) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/movie/${movie._id}`);
                                    }}
                                    className="flex items-center justify-center w-8 h-8 bg-white/10 border-2 border-white/20 rounded-full hover:bg-white hover:text-black hover:border-white transition text-white pointer-events-auto"
                                    title="View Details"
                                >
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                                </button>

                                {isAuthenticated && (
                                    <>
                                        <button
                                            onClick={handleWatchlist}
                                            className="flex items-center justify-center w-8 h-8 border-2 border-gray-400 rounded-full hover:border-white text-white transition pointer-events-auto"
                                            title={isInWatchlist ? "Remove from List" : "Add to List"}
                                        >
                                            {isInWatchlist ? (
                                                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                                            ) : (
                                                <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                                            )}
                                        </button>

                                        <button
                                            onClick={handleFavorite}
                                            className="flex items-center justify-center w-8 h-8 border-2 border-gray-400 rounded-full hover:border-white text-white transition pointer-events-auto"
                                            title={isFavorited ? "Unfavorite" : "Favorite"}
                                        >
                                            <svg className={`w-3 h-3 ${isFavorited ? 'fill-red-500 stroke-red-500' : 'stroke-white fill-none'}`} viewBox="0 0 24 24" strokeWidth="2">                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                            </svg>
                                        </button>
                                    </>
                                )}

                                {/* YouTube Trailer Button */}
                                {movie.trailerUrl && (
                                    <button
                                        onClick={handleOpenYoutube}
                                        className="flex items-center justify-center w-8 h-8 border-2 border-gray-400 rounded-full hover:border-white text-white transition pointer-events-auto"
                                        title="Watch on YouTube"
                                    >
                                        <svg className="w-4 h-4 fill-red-600" viewBox="0 0 24 24">
                                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Metadata */}
                        <div className="mb-2">
                            <h3 className="font-serif text-lg font-bold text-white leading-tight mb-1 line-clamp-1">
                                {movie.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-300">
                                <span>{movie.year}</span>
                                <span>{movie.runtime ? (String(movie.runtime).includes('h') ? movie.runtime : `${movie.runtime} min`) : '1h 45m'}</span>
                            </div>
                        </div>

                        {/* Row 3: Genres */}
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="line-clamp-1">
                                {movie.genres?.slice(0, 3).join(' • ') || 'Drama • Thriller'}
                            </span>
                        </div>
                    </div>
                </div>
            </div >
        </>,
        document.body
    );
};

export default PortalModal;
