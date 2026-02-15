import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MdAccountCircle, MdPerson, MdLogout } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const location = useLocation();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isMobileMenuOpen]);

    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/5">
            <div className="max-w-[1800px] mx-auto px-8 py-6">
                <div className="flex justify-between items-center">
                    {/* Wordmark Logo */}
                    <Link to="/" className="group z-50 relative" onClick={closeMobileMenu}>
                        <h1 className="font-serif text-2xl tracking-tight text-gray-100 group-hover:text-accent-primary transition-colors">
                            Arthouse <span className="text-accent-primary">Atlas</span>
                        </h1>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-12 flex-shrink-0">
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
                            <div className="flex items-center gap-6">
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
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden z-50 relative w-10 h-10 flex flex-col justify-center items-center gap-1.5 focus:outline-none"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        <span className={`w-8 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                        <span className={`w-8 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
                        <span className={`w-8 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <div className={`fixed inset-0 bg-black/95 backdrop-blur-xl z-40 flex flex-col items-center justify-center transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
                <div className="flex flex-col items-center gap-8 text-center">
                    <Link
                        to="/explore"
                        onClick={closeMobileMenu}
                        className="text-2xl font-serif text-white hover:text-accent-primary transition-colors"
                    >
                        Explore
                    </Link>
                    <Link
                        to="/directors"
                        onClick={closeMobileMenu}
                        className="text-2xl font-serif text-white hover:text-accent-primary transition-colors"
                    >
                        Directors
                    </Link>
                    <Link
                        to="/movements"
                        onClick={closeMobileMenu}
                        className="text-2xl font-serif text-white hover:text-accent-primary transition-colors"
                    >
                        Movements
                    </Link>
                    <Link
                        to="/studios"
                        onClick={closeMobileMenu}
                        className="text-2xl font-serif text-white hover:text-accent-primary transition-colors"
                    >
                        Studios
                    </Link>

                    <div className="w-16 h-px bg-white/10 my-4"></div>

                    {isAuthenticated ? (
                        <>
                            <div className="text-gray-400 text-sm uppercase tracking-widest mb-2">
                                {user?.username}
                            </div>
                            <Link
                                to="/profile"
                                onClick={closeMobileMenu}
                                className="text-xl text-white hover:text-accent-primary transition-colors flex items-center gap-2"
                            >
                                <MdPerson /> My Profile
                            </Link>
                            <button
                                onClick={() => {
                                    logout();
                                    closeMobileMenu();
                                }}
                                className="text-xl text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
                            >
                                <MdLogout /> Sign Out
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col gap-6 mt-4">
                            <Link
                                to="/login"
                                onClick={closeMobileMenu}
                                className="text-xl text-white hover:text-accent-primary transition-colors"
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/register"
                                onClick={closeMobileMenu}
                                className="px-8 py-3 bg-accent-primary text-black font-medium tracking-wide uppercase hover:bg-white transition-colors"
                            >
                                Join Atlas
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav >
    );
};

export default Navbar;
