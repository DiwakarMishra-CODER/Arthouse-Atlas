import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MdAccountCircle, MdPerson, MdLogout } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const location = useLocation();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef(null);

    const isActive = (path) => location.pathname === path;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
                    <div className="flex items-center gap-12 flex-shrink-0">
                        <Link
                            to="/explore"
                            className={`text-sm tracking-wide uppercase ${isActive('/explore')
                                ? 'text-accent-primary'
                                : 'text-muted hover:text-gray-100'
                                }`}
                        >
                            Explore
                        </Link>

                        <Link
                            to="/directors"
                            className={`text-sm tracking-wide uppercase ${isActive('/directors') || location.pathname.startsWith('/directors/')
                                ? 'text-accent-primary'
                                : 'text-muted hover:text-gray-100'
                                }`}
                        >
                            Directors
                        </Link>

                        <Link
                            to="/movements"
                            className={`text-sm tracking-wide uppercase ${isActive('/movements')
                                ? 'text-accent-primary'
                                : 'text-muted hover:text-gray-100'
                                }`}
                        >
                            Movements
                        </Link>

                        <Link
                            to="/studios"
                            className={`text-sm tracking-wide uppercase ${isActive('/studios')
                                ? 'text-accent-primary'
                                : 'text-muted hover:text-gray-100'
                                }`}
                        >
                            Studios
                        </Link>



                        {isAuthenticated ? (
                            <div className="relative" ref={profileMenuRef}>
                                <button
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors focus:outline-none"
                                >
                                    <MdAccountCircle className="text-gray-300 text-3xl" />
                                </button>

                                {showProfileMenu && (
                                    <div className="absolute right-0 mt-3 w-56 py-2 bg-[#1a1a1a] border border-white/10 rounded-md shadow-2xl backdrop-blur-md z-50">
                                        <div className="px-5 py-3 border-b border-white/10 mb-2">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Signed in as</p>
                                            <p className="text-sm text-white font-medium truncate font-serif">{user?.username}</p>
                                        </div>

                                        <Link
                                            to="/profile"
                                            className="block px-5 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-[#d4af37] transition-colors flex items-center"
                                            onClick={() => setShowProfileMenu(false)}
                                        >
                                            <MdPerson className="text-lg mr-3" />
                                            My Profile
                                        </Link>

                                        <button
                                            onClick={() => {
                                                logout();
                                                setShowProfileMenu(false);
                                            }}
                                            className="block w-full text-left px-5 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-red-400 transition-colors flex items-center"
                                        >
                                            <MdLogout className="text-lg mr-3" />
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
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
        </nav >
    );
};

export default Navbar;
