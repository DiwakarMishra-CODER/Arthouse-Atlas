import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { moviesAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import TagChip from '../components/TagChip';
import LoadingSkeleton from '../components/LoadingSkeleton';

const MovieDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
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
    const isWatched = user?.watched?.some(item => item._id === id || item === id);

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

    const handleWatched = async () => {
        if (!isAuthenticated) return;

        setActionLoading(true);
        try {
            await userAPI.toggleWatched(id);
            await refreshUser();
        } catch (error) {
            console.error('Failed to toggle watched:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleTrailer = () => {
        if (movie.trailerUrl) {
            window.open(movie.trailerUrl, '_blank');
        } else {
            window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' trailer')}`, '_blank');
        }
    };

    // Navigation handlers for deep linking
    const handleTagClick = (tag) => {
        navigate(`/explore?tags=${encodeURIComponent(tag)}`);
    };

    const handleGenreClick = (genre) => {
        navigate(`/explore?genre=${encodeURIComponent(genre)}`);
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

    // Prepare background image (backdrop with fallback to blurred poster)
    const backgroundImage = movie.backdropUrl || movie.posterUrl;
    const useBlur = !movie.backdropUrl && movie.posterUrl;

    // Credits sections (only show if data exists)
    const creditsSections = [
        { label: 'DIRECTOR', data: movie.directors },
        { label: 'CINEMATOGRAPHY', data: movie.cinematographers },
        { label: 'SCORE', data: movie.composers },
        { label: 'STUDIO', data: movie.productionCompanies }
    ].filter(section => section.data && section.data.length > 0);

    return (
        <>
            {/* MOBILE VIEW (Stitch UI) */}
            <div className="md:hidden min-h-screen bg-black text-white pt-20 pb-20 font-sans">
                {/* Mobile Header (Backdrop) */}
                <div className="relative w-full h-[35vh]">
                    <img
                        src={movie.backdropUrl || movie.posterUrl}
                        alt={movie.title}
                        className="w-full h-full object-cover brightness-50"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                    {/* Back Button Overlay */}
                    <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 bg-black/50 rounded-full text-white z-20 backdrop-blur-sm">
                        <span className="material-icons-round">arrow_back</span>
                    </button>
                </div>

                {/* Floating Poster */}
                <div className="relative -mt-24 z-10 flex justify-center">
                    <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="w-40 rounded-lg shadow-2xl border border-white/10"
                    />
                </div>

                {/* Content Stack */}
                <div className="flex flex-col items-center px-6 mt-6 gap-6">
                    {/* Title */}
                    <h1 className="text-3xl font-serif text-center text-[#C5A059] leading-tight">
                        {movie.title}
                    </h1>

                    {/* Metadata */}
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <span>{movie.year}</span>
                        {movie.runtime && <span>• {movie.runtime} min</span>}
                        {movie.country && <span>• {movie.country}</span>}
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full max-w-sm space-y-4">
                        {/* Watch Trailer */}
                        <button
                            onClick={handleTrailer}
                            className="w-full bg-white text-black py-3 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                        >
                            <span className="material-icons-round">play_arrow</span>
                            Watch Trailer
                        </button>

                        {/* Icon Row */}
                        {isAuthenticated && (
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={handleWatchlist}
                                    title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                                    className={`w-12 h-12 rounded-xl border border-white/20 flex items-center justify-center transition-colors ${isInWatchlist ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}
                                >
                                    <span className="material-icons-round text-2xl">{isInWatchlist ? 'bookmark' : 'bookmark_border'}</span>
                                </button>
                                <button
                                    onClick={handleWatched}
                                    title={isWatched ? "Mark as Watched" : "Mark as Unwatched"}
                                    className={`w-12 h-12 rounded-xl border border-white/20 flex items-center justify-center transition-colors ${isWatched ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}
                                >
                                    <span className="material-icons-round text-2xl">{isWatched ? 'check_circle' : 'radio_button_unchecked'}</span>
                                </button>
                                <button
                                    onClick={handleFavorite}
                                    title={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
                                    className={`w-12 h-12 rounded-xl border border-white/20 flex items-center justify-center transition-colors ${isFavorited ? 'bg-red-500 border-red-500 text-white' : 'text-white hover:bg-white/10'}`}
                                >
                                    <span className="material-icons-round text-2xl">{isFavorited ? 'favorite' : 'favorite_border'}</span>
                                </button>
                            </div>
                        )}
                    </div>

                </div>

                {/* Mobile Tags Section (Genres & Moods) */}
                <div className="flex flex-wrap justify-center gap-2 mt-6 px-4">
                    {/* Genres (Gold Highlights) */}
                    {movie.genres && movie.genres.map((genre, idx) => (
                        <Link
                            key={`genre-${idx}`}
                            to={`/explore?genre=${encodeURIComponent(genre)}`}
                            className="px-3 py-1 bg-[#C5A059]/10 border border-[#C5A059]/30 rounded-full text-[#C5A059] text-[10px] uppercase tracking-widest"
                        >
                            {genre}
                        </Link>
                    ))}

                    {/* Moods/Styles (Subtle Tags) */}
                    {movie.derivedTags && movie.derivedTags.map((tag, idx) => (
                        <Link
                            key={`mood-${idx}`}
                            to={`/explore?mood=${encodeURIComponent(tag)}`}
                            className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-gray-400 text-[10px] uppercase tracking-widest hover:border-[#C5A059] transition-colors"
                        >
                            {tag}
                        </Link>
                    ))}
                </div>

                {/* Synopsis */}
                <p className="text-gray-300 text-center leading-relaxed text-sm line-clamp-4 active:line-clamp-none transition-all" onClick={(e) => e.target.classList.toggle('line-clamp-4')}>
                    {movie.synopsis}
                </p>

                {/* Credits Grid */}
                <div className="grid grid-cols-2 gap-4 w-full text-left mt-4 border-t border-white/10 pt-6">
                    {creditsSections.map((section, idx) => (
                        <div key={idx} className="mb-2">
                            <div className="text-[#C5A059] text-xs uppercase mb-1">{section.label}</div>
                            <div className="text-white text-sm line-clamp-1">
                                {section.label === 'DIRECTOR' && movie.directorId ? (
                                    <Link
                                        to={`/directors/${movie.directorId}`}
                                        className="text-[#C5A059] border-b border-[#C5A059]/30 hover:text-white hover:border-white transition-colors"
                                    >
                                        {section.data.join(', ')}
                                    </Link>
                                ) : (
                                    section.data.join(', ')
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* DESKTOP VIEW */}
            <div className="hidden md:block min-h-screen bg-[#121212] text-white">
                {/* Navbar Spacer */}
                <div className="h-16" />

                {/* Cinematic Hero Section */}
                <div className="relative w-full h-[65vh] overflow-hidden">
                    {/* Background Image */}
                    {backgroundImage && (
                        <img
                            src={backgroundImage}
                            alt={movie.title}
                            className={`w-full h-full object-cover object-top ${useBlur ? 'blur-xl scale-110' : ''}`}
                        />
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
                </div>

                {/* Content Overlap Section */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-20 pb-12">
                    <div className="flex flex-col md:flex-row gap-8">

                        {/* Floating Poster */}
                        <div className="flex-shrink-0 mx-auto md:mx-0">
                            <div className="w-40 md:w-64 lg:w-72 aspect-[2/3] rounded-lg shadow-2xl overflow-hidden ring-1 ring-white/20">
                                {movie.posterUrl ? (
                                    <img
                                        src={movie.posterUrl}
                                        alt={`${movie.title} poster`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                        <span className="text-muted">No Poster</span>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            {isAuthenticated && (
                                <div className="mt-4 flex flex-col gap-3">
                                    {/* PRIMARY ACTION: WATCH TRAILER */}
                                    <button
                                        onClick={handleTrailer}
                                        className="w-full bg-white text-black font-bold font-cinzel py-4 mb-4 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 tracking-widest rounded-xl"
                                    >
                                        <span className="material-icons-round">play_arrow</span>
                                        WATCH TRAILER
                                    </button>

                                    {/* SECONDARY ACTIONS: MONOCHROME ICON ROW */}
                                    <div className="flex items-center gap-4 w-full">

                                        {/* 1. WATCHED (Checkmark Circle) */}
                                        <button
                                            onClick={handleWatched}
                                            disabled={actionLoading}
                                            title={isWatched ? "Mark as Unwatched" : "Mark as Watched"}
                                            className="flex-1 h-14 border border-white/20 rounded-xl transition-all duration-300 flex items-center justify-center group hover:bg-white hover:text-black"
                                        >
                                            <span className="material-icons-round text-2xl">
                                                {isWatched ? 'check_circle' : 'radio_button_unchecked'}
                                            </span>
                                        </button>

                                        {/* 2. WATCHLIST (Bookmark) */}
                                        <button
                                            onClick={handleWatchlist}
                                            disabled={actionLoading}
                                            title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                                            className="flex-1 h-14 border border-white/20 rounded-xl transition-all duration-300 flex items-center justify-center group hover:bg-white hover:text-black"
                                        >
                                            <span className="material-icons-round text-2xl">
                                                {isInWatchlist ? 'bookmark' : 'bookmark_border'}
                                            </span>
                                        </button>

                                        {/* 3. FAVORITE (Heart) */}
                                        <button
                                            onClick={handleFavorite}
                                            disabled={actionLoading}
                                            title={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
                                            className="flex-1 h-14 border border-white/20 rounded-xl transition-all duration-300 flex items-center justify-center group hover:bg-white hover:text-black"
                                        >
                                            <span className="material-icons-round text-2xl">
                                                {isFavorited ? 'favorite' : 'favorite_border'}
                                            </span>
                                        </button>

                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Text Info */}
                        <div className="flex-1 text-center md:text-left md:pt-8 lg:pt-12 space-y-8">

                            {/* Title & Meta */}
                            <div>
                                <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                                    {movie.title}
                                </h1>

                                {/* Meta Row */}
                                <div className="flex items-center justify-center md:justify-start gap-3 text-gray-400 text-base">
                                    <span>{movie.year}</span>
                                    {movie.runtime && (
                                        <>
                                            <span>•</span>
                                            <span>{movie.runtime} min</span>
                                        </>
                                    )}
                                    {movie.country && (
                                        <>
                                            <span>•</span>
                                            <span>{movie.country}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Synopsis */}
                            <div>
                                <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Synopsis</h2>
                                <p className="font-serif text-base md:text-lg leading-relaxed text-gray-300">
                                    {movie.synopsis}
                                </p>
                            </div>

                            {/* Arthouse Credits Grid */}
                            {creditsSections.length > 0 && (
                                <div>
                                    <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-4">Credits</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                        {creditsSections.map((section, idx) => (
                                            <div key={idx}>
                                                <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                                                    {section.label}
                                                </div>
                                                <div className="text-sm md:text-base text-white font-light">
                                                    {section.label === 'DIRECTOR' && movie.directorId ? (
                                                        <Link
                                                            to={`/directors/${movie.directorId}`}
                                                            className="text-accent-primary hover:text-white border-b border-accent-primary/30 hover:border-white transition-colors"
                                                        >
                                                            {section.data.join(', ')}
                                                        </Link>
                                                    ) : (
                                                        section.data.join(', ')
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Cinematic Qualities */}
                            {movie.derivedTags && movie.derivedTags.length > 0 && (
                                <div>
                                    <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-3">
                                        MOOD & STYLE
                                    </h2>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                        {movie.derivedTags.map((tag, idx) => (
                                            <TagChip key={idx} tag={tag} onClick={() => navigate(`/explore?mood=${encodeURIComponent(tag)}`)} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Genres */}
                            {movie.genres && movie.genres.length > 0 && (
                                <div>
                                    <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Genres</h2>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                        {movie.genres.map((genre, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleGenreClick(genre)}
                                                className="px-3 py-1.5 bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-white/10 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                                            >
                                                {genre}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MovieDetail;
