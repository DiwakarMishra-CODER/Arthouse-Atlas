import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { userAPI } from '../services/api';

const MovieContext = createContext(null);

export const useMovie = () => {
    const context = useContext(MovieContext);
    if (!context) {
        throw new Error('useMovie must be used within a MovieProvider');
    }
    return context;
};

export const MovieProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();

    // Local state for optimistic UI
    const [favorites, setFavorites] = useState([]);
    const [watchlist, setWatchlist] = useState([]);
    const [watched, setWatched] = useState([]);
    const [ratings, setRatings] = useState([]);

    // Guard against rapid double-clicks causing duplicate API calls
    const pendingToggles = useRef(new Set());

    // 1. Initial Load from LocalStorage (Run ONCE on mount)
    useEffect(() => {
        const storedFavs = JSON.parse(localStorage.getItem("favorites")) || [];
        const storedWatch = JSON.parse(localStorage.getItem("watchlist")) || [];
        const storedRatings = JSON.parse(localStorage.getItem("ratings")) || [];
        setFavorites(storedFavs);
        setWatchlist(storedWatch);
        setRatings(storedRatings);
    }, []);

    // 2. Sync with User from DB (Run when user changes)
    useEffect(() => {
        if (user) {
            if (user.favorites) setFavorites(user.favorites);
            if (user.watchlist) setWatchlist(user.watchlist);
            if (user.watched) setWatched(user.watched);
        } else {
            // Optional: Clear on logout, or keep local? 
            // Better to keep local for now or clear if strict security needed.
            // setFavorites([]); 
            // setWatchlist([]);
        }
    }, [user]);

    // 3. Persist to LocalStorage (Run on state change)
    useEffect(() => {
        localStorage.setItem("favorites", JSON.stringify(favorites));
    }, [favorites]);

    useEffect(() => {
        localStorage.setItem("watchlist", JSON.stringify(watchlist));
    }, [watchlist]);

    useEffect(() => {
        localStorage.setItem("watched", JSON.stringify(watched));
    }, [watched]);

    useEffect(() => {
        localStorage.setItem("ratings", JSON.stringify(ratings));
    }, [ratings]);

    // Helper: Check if movie is in favorites
    const isFavorite = (movieId) => {
        return favorites.some(m => (m._id === movieId || m.id === movieId || m === movieId));
    };

    // Helper: Check if movie is in watchlist
    const isInWatchlist = (movieId) => {
        return watchlist.some(m => (m._id === movieId || m.id === movieId || m === movieId));
    };

    // Helper: Check if movie is watched
    const isWatched = (movieId) => {
        return watched.some(m => (m._id === movieId || m.id === movieId || m === movieId));
    };

    const toggleFavorite = async (movie) => {
        if (!isAuthenticated) return;
        const movieId = movie._id || movie.id || movie;
        // Block if already in-flight
        if (pendingToggles.current.has(`fav-${movieId}`)) return;
        pendingToggles.current.add(`fav-${movieId}`);

        const movieObj = typeof movie === 'object' ? movie : { _id: movieId };
        setFavorites((prev) => {
            if (isFavorite(movieId)) {
                return prev.filter((m) => (m._id || m.id || m) !== movieId);
            } else {
                return [...prev, movieObj];
            }
        });

        try {
            await userAPI.toggleFavorite(movieId);
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        } finally {
            pendingToggles.current.delete(`fav-${movieId}`);
        }
    };

    const toggleWatchlist = async (movie) => {
        if (!isAuthenticated) return;
        const movieId = movie._id || movie.id || movie;
        // Block if already in-flight
        if (pendingToggles.current.has(`wl-${movieId}`)) return;
        pendingToggles.current.add(`wl-${movieId}`);

        const movieObj = typeof movie === 'object' ? movie : { _id: movieId };
        setWatchlist((prev) => {
            if (isInWatchlist(movieId)) {
                return prev.filter((m) => (m._id || m.id || m) !== movieId);
            } else {
                return [...prev, movieObj];
            }
        });

        try {
            await userAPI.toggleWatchlist(movieId);
        } catch (error) {
            console.error('Failed to toggle watchlist:', error);
        } finally {
            pendingToggles.current.delete(`wl-${movieId}`);
        }
    };

    const toggleWatched = async (movie) => {
        if (!isAuthenticated) return;
        const movieId = movie._id || movie.id || movie;
        // Block if already in-flight
        if (pendingToggles.current.has(`wd-${movieId}`)) return;
        pendingToggles.current.add(`wd-${movieId}`);

        const movieObj = typeof movie === 'object' ? movie : { _id: movieId };
        setWatched((prev) => {
            if (isWatched(movieId)) {
                return prev.filter((m) => (m._id || m.id || m) !== movieId);
            } else {
                return [...prev, movieObj];
            }
        });

        try {
            await userAPI.toggleWatched(movieId);
        } catch (error) {
            console.error('Failed to toggle watched:', error);
        } finally {
            pendingToggles.current.delete(`wd-${movieId}`);
        }
    };

    // Rating helpers
    const setMovieRating = (movie, score) => {
        const movieId = movie._id || movie.id;
        setRatings((prev) => {
            const existing = prev.find((r) => r.id === movieId);
            // Clicking same score toggles it off
            if (existing && existing.rating === score) {
                return prev.filter((r) => r.id !== movieId);
            }
            if (existing) {
                return prev.map((r) => r.id === movieId ? { ...r, rating: score } : r);
            }
            return [...prev, { id: movieId, rating: score, movie }];
        });
    };

    const getMovieRating = (id) => ratings.find((r) => r.id === id)?.rating || 0;

    const value = {
        isFavorite,
        isInWatchlist,
        isWatched,
        toggleFavorite,
        toggleWatchlist,
        toggleWatched,
        favorites,
        watchlist,
        watched,
        ratings,
        setMovieRating,
        getMovieRating,
    };

    return <MovieContext.Provider value={value}>{children}</MovieContext.Provider>;
};
