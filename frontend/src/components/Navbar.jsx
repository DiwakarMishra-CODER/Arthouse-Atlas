import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/5">
            <div className="max-w-[1800px] mx-auto px-8 py-6">
                <div className="flex justify-between items-center">
                    {/* Wordmark Logo */}
                    <Link to="/" className="group">
                        <h1 className="font-serif text-2xl tracking-tight text-gray-100 group-hover:text-accent-primary transition-colors">
                            Arthouse <span className="text-accent-primary">Atlas</span>
                        </h1>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-12">
                        <Link
                            to="/explore"
                            className={`text-sm tracking-wide uppercase ${isActive('/explore')
                                    ? 'text-accent-primary'
                                    : 'text-muted hover:text-gray-100'
                                }`}
                        >
                            Explore
                        </Link>

                        {isAuthenticated && (
                            <Link
                                to="/recommendations"
                                className={`text-sm tracking-wide uppercase ${isActive('/recommendations')
                                        ? 'text-accent-primary'
                                        : 'text-muted hover:text-gray-100'
                                    }`}
                            >
                                For You
                            </Link>
                        )}

                        {isAuthenticated ? (
                            <>
                                <Link
                                    to="/profile"
                                    className={`text-sm tracking-wide uppercase ${isActive('/profile')
                                            ? 'text-accent-primary'
                                            : 'text-muted hover:text-gray-100'
                                        }`}
                                >
                                    {user?.username}
                                </Link>
                                <button
                                    onClick={logout}
                                    className="text-sm tracking-wide uppercase text-muted hover:text-gray-100"
                                >
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="text-sm tracking-wide uppercase text-muted hover:text-gray-100"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-6 py-2 bg-accent-primary/10 border border-accent-primary/30 text-accent-primary text-sm tracking-wide uppercase hover:bg-accent-primary/20 transition-colors"
                                >
                                    Join
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
