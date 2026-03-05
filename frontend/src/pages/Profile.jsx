import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMovie } from '../context/MovieContext';
import PosterCard from '../components/PosterCard';
import LoadingSkeleton from '../components/LoadingSkeleton';

const Profile = () => {
    const { user, loading } = useAuth();
    const { ratings } = useMovie();
    const sortedRatings = [...ratings].sort((a, b) => b.rating - a.rating);

    if (loading) {
        return (
            <div className="min-h-screen pt-24">
                <LoadingSkeleton />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <p className="text-muted">Please sign in to view your profile</p>
            </div>
        );
    }

    return (
        <>
            {/* MOBILE VIEW (Favorites Only) */}
            <div className="md:hidden min-h-screen bg-black pt-28 pb-10 px-4 text-white">
                {/* Header */}
                <div className="flex items-end gap-2 mb-8 border-b border-white/10 pb-4">
                    <h1 className="text-3xl font-cinzel text-white">Favorites</h1>
                    <span className="text-[#C5A059] text-xs font-mono mb-1">
                        ({user.favorites?.length || 0})
                    </span>
                </div>

                {/* Favorites Grid */}
                {user.favorites && user.favorites.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                        {user.favorites.map((movie) => (
                            <Link
                                to={`/movie/${movie._id}`}
                                key={movie._id}
                                className="relative group"
                            >
                                <img
                                    src={movie.posterUrl}
                                    alt={movie.title}
                                    className="w-full aspect-[2/3] object-cover rounded shadow-lg border border-[#C5A059]/20"
                                />
                                {/* Mobile Title Hidden as per requirements */}
                                <div className="hidden md:block absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs truncate">
                                    {movie.title}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center mt-20">
                        <p className="text-gray-500 font-cinzel italic text-sm mb-6">No favorites yet.</p>
                        <Link
                            to="/explore"
                            className="inline-block px-6 py-2 border border-[#C5A059] text-[#C5A059] text-xs uppercase tracking-widest hover:bg-[#C5A059] hover:text-black transition-colors"
                        >
                            Explore Films
                        </Link>
                    </div>
                )}

                {/* Watched History Section */}
                <div className="flex items-end gap-2 mb-8 border-b border-white/10 pb-4 mt-12">
                    <h1 className="text-3xl font-cinzel text-white">Watched</h1>
                    <span className="text-[#C5A059] text-xs font-mono mb-1">
                        ({user.watched?.length || 0})
                    </span>
                </div>

                {user.watched && user.watched.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                        {user.watched.map((movie) => (
                            <Link
                                to={`/movie/${movie._id}`}
                                key={movie._id}
                                className="relative group"
                            >
                                <img
                                    src={movie.posterUrl}
                                    alt={movie.title}
                                    className="w-full aspect-[2/3] object-cover rounded shadow-lg border border-[#C5A059]/20"
                                />
                                <div className="hidden md:block absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs truncate">
                                    {movie.title}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center mt-10">
                        <p className="text-gray-500 font-cinzel italic text-sm">No films watched yet.</p>
                    </div>
                )}

                {/* Watchlist Section */}
                <div className="flex items-end gap-2 mb-8 border-b border-white/10 pb-4 mt-12">
                    <h1 className="text-3xl font-cinzel text-white">Watchlist</h1>
                    <span className="text-[#C5A059] text-xs font-mono mb-1">
                        ({user.watchlist?.length || 0})
                    </span>
                </div>

                {user.watchlist && user.watchlist.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                        {user.watchlist.map((movie) => (
                            <Link
                                to={`/movie/${movie._id}`}
                                key={movie._id}
                                className="relative group"
                            >
                                <img
                                    src={movie.posterUrl}
                                    alt={movie.title}
                                    className="w-full aspect-[2/3] object-cover rounded shadow-lg border border-[#C5A059]/20"
                                />
                                <div className="hidden md:block absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs truncate">
                                    {movie.title}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center mt-10">
                        <p className="text-gray-500 font-cinzel italic text-sm">Your watchlist is empty.</p>
                    </div>
                )}

                {/* Ratings Section — Mobile */}
                <div className="flex items-end gap-2 mb-6 border-b border-white/10 pb-4 mt-12">
                    <h1 className="text-3xl font-cinzel text-white">Your Ratings</h1>
                    <span className="text-[#C5A059] text-xs font-mono mb-1">
                        ({sortedRatings.length})
                    </span>
                </div>

                {sortedRatings.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                        {sortedRatings.map((item) => (
                            <div key={item.id} className="flex flex-col group">
                                <Link to={`/movie/${item.id}`}>
                                    <img
                                        src={item.movie?.posterUrl}
                                        alt={item.movie?.title}
                                        className="w-full aspect-[2/3] object-cover rounded shadow-lg border border-white/5 group-hover:border-[#C5A059]/50 transition-colors"
                                    />
                                </Link>
                                <div className="flex justify-center gap-1 mt-1.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <span
                                            key={star}
                                            className={`text-base ${item.rating >= star ? 'text-[#C5A059]' : 'text-white/30'}`}
                                        >
                                            ★
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center mt-10">
                        <p className="text-gray-500 font-cinzel italic text-sm">No films rated yet.</p>
                    </div>
                )}
            </div>

            {/* DESKTOP VIEW */}
            <div className="hidden md:block min-h-screen pt-24 pb-20">
                <div className="max-w-[1800px] mx-auto px-8">
                    {/* User Info */}
                    <div className="mb-20">
                        <h1 className="font-serif text-7xl text-gray-100 mb-3">
                            {user.username}
                        </h1>
                        <p className="text-muted text-lg">{user.email}</p>
                    </div>

                    {/* Favorites */}
                    <div className="mb-24">
                        <div className="mb-10">
                            <h2 className="font-serif text-4xl text-gray-100 mb-2">Favorites</h2>
                            <p className="text-muted">
                                {user.favorites?.length || 0} {user.favorites?.length === 1 ? 'film' : 'films'}
                            </p>
                        </div>

                        {user.favorites && user.favorites.length > 0 ? (
                            <div className="masonry-grid">
                                {user.favorites.map((movie) => (
                                    <div key={movie._id} className="relative hover:z-50">
                                        <PosterCard movie={movie} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 border border-white/10">
                                <p className="text-muted text-lg mb-6">No favorites yet</p>
                                <a
                                    href="/explore"
                                    className="inline-block px-8 py-4 bg-accent-primary/10 border border-accent-primary/30 text-accent-primary tracking-wide uppercase text-sm hover:bg-accent-primary/20 transition-colors"
                                >
                                    Explore Films
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Watched History */}
                    <div>
                        <div className="mb-10">
                            <h2 className="font-serif text-4xl text-gray-100 mb-2">Watched History</h2>
                            <p className="text-muted">
                                {user.watched?.length || 0} {user.watched?.length === 1 ? 'film' : 'films'}
                            </p>
                        </div>

                        {user.watched && user.watched.length > 0 ? (
                            <div className="masonry-grid">
                                {user.watched.map((movie) => (
                                    <div key={movie._id} className="relative hover:z-50">
                                        <PosterCard movie={movie} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 border border-white/10">
                                <p className="text-muted text-lg">No films watched yet</p>
                            </div>
                        )}
                    </div>

                    {/* Watchlist */}
                    <div className="mt-24">
                        <div className="mb-10">
                            <h2 className="font-serif text-4xl text-gray-100 mb-2">Watchlist</h2>
                            <p className="text-muted">
                                {user.watchlist?.length || 0} {user.watchlist?.length === 1 ? 'film' : 'films'}
                            </p>
                        </div>

                        {user.watchlist && user.watchlist.length > 0 ? (
                            <div className="masonry-grid">
                                {user.watchlist.map((movie) => (
                                    <div key={movie._id} className="relative hover:z-50">
                                        <PosterCard movie={movie} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 border border-white/10">
                                <p className="text-muted text-lg">No films in watchlist</p>
                            </div>
                        )}
                    </div>

                    {/* Ratings — Desktop */}
                    <div className="mt-24">
                        <div className="mb-10">
                            <h2 className="font-serif text-4xl text-gray-100 mb-2">Your Ratings</h2>
                            <p className="text-muted">
                                {sortedRatings.length} {sortedRatings.length === 1 ? 'film' : 'films'} rated
                            </p>
                        </div>

                        {sortedRatings.length > 0 ? (
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                {sortedRatings.map((item) => (
                                    <div key={item.id} className="flex flex-col group">
                                        <Link to={`/movie/${item.id}`}>
                                            <img
                                                src={item.movie?.posterUrl}
                                                alt={item.movie?.title}
                                                className="w-full aspect-[2/3] object-cover rounded-lg shadow-xl border border-white/5 group-hover:border-[#C5A059]/50 transition-colors duration-300"
                                            />
                                        </Link>
                                        <div className="flex justify-center gap-1.5 mt-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <span
                                                    key={star}
                                                    className={`text-xl ${item.rating >= star ? 'text-[#C5A059]' : 'text-white/30'}`}
                                                >
                                                    ★
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 border border-white/10">
                                <p className="text-muted text-lg">No films rated yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Profile;
