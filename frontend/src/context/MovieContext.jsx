import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { userAPI } from '../services/api';

const MovieContext = createContext(null);

// what this browser kept: read once, as the state's starting value (a separate load-on-mount effect
// lost them in development, where React runs effects twice and the save step wrote the empty start)
const kept = (key) => {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
};

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
    const [favorites, setFavorites] = useState(() => kept('favorites'));
    const [watchlist, setWatchlist] = useState(() => kept('watchlist'));
    const [watched, setWatched] = useState(() => kept('watched'));
    const [ratings, setRatings] = useState(() => kept('ratings'));
    // films you've said aren't for you (For You never picks them); kept like ratings
    const [notFor, setNotFor] = useState(() => kept('notFor'));

    // Guard against rapid double-clicks causing duplicate API calls
    const pendingToggles = useRef(new Set());
    // the marks from this browser already sent to the account this visit (so they go once)
    const sentHere = useRef(new Set());

    // 1. (what this browser kept is the state's starting value, above)

    // 2. Sync with User from DB (Run when user changes)
    useEffect(() => {
        if (user) {
            // what was marked in this browser while signed out comes along into the account, as
            // ratings do (only those marked here: on a shared computer, nobody else's account moves)
            const idOf = (m) => String(m?._id || m?.id || m);
            const shelf = { favorites: [user.favorites, setFavorites], watchlist: [user.watchlist, setWatchlist], watched: [user.watched, setWatched] };
            const toKeep = {};
            for (const [key, [theirs, set]] of Object.entries(shelf)) {
                if (!theirs) continue;
                const here = kept(key).filter((m) => m?.local && !theirs.some((t) => idOf(t) === idOf(m)));
                set([...theirs, ...here]);
                const fresh = here.map(idOf).filter((id) => !sentHere.current.has(`${key}:${id}`));
                if (fresh.length) {
                    toKeep[key] = fresh;
                    fresh.forEach((id) => sentHere.current.add(`${key}:${id}`));
                }
            }
            // (they show at once from here; the account's own copy takes over on the next load)
            if (Object.keys(toKeep).length) userAPI.keepShelf(toKeep).catch(() => {});
            if (user.ratings) {
                const saved = user.ratings.filter((r) => r.movie).map((r) => ({ id: r.movie._id, rating: r.value, movie: r.movie }));
                // films rated in this browser while signed out come along into the account (only
                // those: on a shared computer, someone else's account ratings never move)
                let here = [];
                try { here = (JSON.parse(localStorage.getItem('ratings')) || []).filter((r) => r?.local && r.id && !saved.some((s) => s.id === r.id)); } catch { here = []; }
                here.forEach((r) => userAPI.rateMovie(r.id, r.rating).catch(() => {}));
                setRatings([...saved, ...here.map(({ id, rating, movie }) => ({ id, rating, movie }))]);
            }
            if (user.notFor) setNotFor(user.notFor.map((m) => String(m._id || m)));
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

    useEffect(() => {
        localStorage.setItem("notFor", JSON.stringify(notFor));
    }, [notFor]);

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
        const movieId = movie._id || movie.id || movie;
        // signed out, it's kept in this browser, and goes into the account at sign-in
        if (!isAuthenticated) {
            setFavorites((prev) => (isFavorite(movieId)
                ? prev.filter((m) => (m._id || m.id || m) !== movieId)
                : [...prev, { _id: movieId, title: movie.title, local: true }]));
            return;
        }
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
        const movieId = movie._id || movie.id || movie;
        // signed out, it's kept in this browser, and goes into the account at sign-in
        if (!isAuthenticated) {
            setWatchlist((prev) => (isInWatchlist(movieId)
                ? prev.filter((m) => (m._id || m.id || m) !== movieId)
                : [...prev, { _id: movieId, title: movie.title, local: true }]));
            return;
        }
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
        const movieId = movie._id || movie.id || movie;
        // signed out, it's kept in this browser, and goes into the account at sign-in
        if (!isAuthenticated) {
            setWatched((prev) => (isWatched(movieId)
                ? prev.filter((m) => (m._id || m.id || m) !== movieId)
                : [...prev, { _id: movieId, title: movie.title, local: true }]));
            return;
        }
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

    // Rating helpers. Signed in, ratings are saved to the account (they shape
    // For You); signed out, they stay in this browser.
    const setMovieRating = async (movie, score) => {
        const movieId = movie._id || movie.id;
        if (pendingToggles.current.has(`rt-${movieId}`)) return;
        const clearing = ratings.find((r) => r.id === movieId)?.rating === score;
        setRatings((prev) => {
            const existing = prev.find((r) => r.id === movieId);
            // Clicking same score toggles it off
            if (existing && existing.rating === score) {
                return prev.filter((r) => r.id !== movieId);
            }
            // signed out, a rating is marked as made here, so it can move into an account at sign-in
            const here = isAuthenticated ? {} : { local: true };
            if (existing) {
                return prev.map((r) => r.id === movieId ? { ...r, rating: score, ...here } : r);
            }
            return [...prev, { id: movieId, rating: score, movie, ...here }];
        });

        if (!isAuthenticated) return;
        pendingToggles.current.add(`rt-${movieId}`);
        try {
            if (clearing) await userAPI.clearRating(movieId);
            else await userAPI.rateMovie(movieId, score);
        } catch (error) {
            console.error('Failed to save rating:', error);
        } finally {
            pendingToggles.current.delete(`rt-${movieId}`);
        }
    };

    const getMovieRating = (id) => ratings.find((r) => r.id === id)?.rating || 0;

    // "Not for me": signed in, saved to the account; signed out, kept in this browser
    const isNotFor = (id) => notFor.includes(String(id));
    const toggleNotFor = async (movie) => {
        const movieId = String(movie._id || movie.id || movie);
        if (pendingToggles.current.has(`nf-${movieId}`)) return;
        setNotFor((prev) => (prev.includes(movieId) ? prev.filter((id) => id !== movieId) : [...prev, movieId]));
        if (!isAuthenticated) return;
        pendingToggles.current.add(`nf-${movieId}`);
        try {
            await userAPI.toggleNotFor(movieId);
        } catch (error) {
            console.error('Failed to save "not for me":', error);
        } finally {
            pendingToggles.current.delete(`nf-${movieId}`);
        }
    };

    // what this browser has marked, as the awards night without an account wants it, and how many
    // films that is (the film page offers the night once there are three)
    const idOf = (m) => m?._id || m?.id || m;
    const marks = { favorites: favorites.map(idOf), watched: watched.map(idOf), watchlist: watchlist.map(idOf), notFor: notFor.map(idOf), ratings: ratings.map((r) => ({ id: r.id, value: r.rating })) };
    const marked = new Set([...marks.favorites, ...marks.watched, ...marks.ratings.map((r) => r.id)]).size;

    const value = {
        marks,
        marked,
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
        notFor,
        isNotFor,
        toggleNotFor,
    };

    return <MovieContext.Provider value={value}>{children}</MovieContext.Provider>;
};
