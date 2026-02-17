import { createContext, useContext, useState, useEffect } from 'react';
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

    // 1. Initial Load from LocalStorage (Run ONCE on mount)
    useEffect(() => {
        const storedFavs = JSON.parse(localStorage.getItem("favorites")) || [];
        const storedWatch = JSON.parse(localStorage.getItem("watchlist")) || [];
        setFavorites(storedFavs);
        setWatchlist(storedWatch);
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

        // Ensure we have an ID
        const movieId = movie._id || movie.id || movie;
        const movieObj = typeof movie === 'object' ? movie : { _id: movieId }; // Minimal object if passed ID only

        // Optimistic Update
        setFavorites((prev) => {
            if (isFavorite(movieId)) {
                return prev.filter((m) => (m._id || m.id || m) !== movieId); // REMOVE
            } else {
                return [...prev, movieObj]; // ADD
            }
        });

        // Backend Sync
        try {
            await userAPI.toggleFavorite(movieId);
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            // Revert on failure involves complex logic, skipping for "Nuclear" simple approach
            // causing a re-fetch of user would correct it eventually.
        }
    };

    const toggleWatchlist = async (movie) => {
        if (!isAuthenticated) return;

        const movieId = movie._id || movie.id || movie;
        const movieObj = typeof movie === 'object' ? movie : { _id: movieId };

        // Optimistic Update
        setWatchlist((prev) => {
            if (isInWatchlist(movieId)) {
                return prev.filter((m) => (m._id || m.id || m) !== movieId); // REMOVE
            } else {
                return [...prev, movieObj]; // ADD
            }
        });

        // Backend Sync
        try {
            await userAPI.toggleWatchlist(movieId);
        } catch (error) {
            console.error('Failed to toggle watchlist:', error);
        }
    };

    const toggleWatched = async (movie) => {
        if (!isAuthenticated) return;

        const movieId = movie._id || movie.id || movie;
        const movieObj = typeof movie === 'object' ? movie : { _id: movieId };

        // Optimistic Update
        setWatched((prev) => {
            if (isWatched(movieId)) {
                return prev.filter((m) => (m._id || m.id || m) !== movieId); // REMOVE
            } else {
                return [...prev, movieObj]; // ADD
            }
        });

        // Backend Sync
        try {
            await userAPI.toggleWatched(movieId);
        } catch (error) {
            console.error('Failed to toggle watched:', error);
        }
    };

    const value = {
        isFavorite,
        isInWatchlist,
        isWatched,
        toggleFavorite,
        toggleWatchlist,
        toggleWatched,
        favorites,
        watchlist,
        watched
    };

    return <MovieContext.Provider value={value}>{children}</MovieContext.Provider>;
};
