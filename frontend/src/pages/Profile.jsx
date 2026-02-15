import { useAuth } from '../context/AuthContext';
import PosterCard from '../components/PosterCard';
import LoadingSkeleton from '../components/LoadingSkeleton';

const Profile = () => {
    const { user, loading } = useAuth();

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
        <div className="min-h-screen pt-24 pb-20">
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
            </div>
        </div>
    );
};

export default Profile;
