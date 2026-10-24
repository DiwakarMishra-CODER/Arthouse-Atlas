import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MdEmojiEvents, MdLogout } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import BackButton from './BackButton';

/**
 * The house's signs. The navbar is the row of signs over the doors of a picture house:
 * every room of the atlas is a door, lettered in serif capitals the way theatres lettered
 * theirs, and the room you're in has its sign lit (gold leaf, glowing), the way a screen's
 * sign lights while its film is running. Change rooms and the new sign strikes on like a
 * lamp, and a leader's sweep wipes round the house's crest once, counting in the next reel.
 */

const ROOMS = [
    { to: '/explore', label: 'Explore' },
    { to: '/directors', label: 'Directors' },
    { to: '/movements', label: 'Movements' },
    { to: '/studios', label: 'Studios' },
    { to: '/recommendations', label: 'For You' },
];
const inRoom = (path, to) => (to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`));

// the mark: the house's crest, a roundel with the atlas's A. Behind the letter a leader's
// sweep wipes round once for every page you open (keyed to the page), counting in the next reel.
const HouseMark = ({ reel }) => (
    <span aria-hidden="true" className="relative inline-block w-[30px] h-[30px] flex-shrink-0">
        <span key={reel} className="leader-wipe absolute inset-[4px] rounded-full" />
        <svg viewBox="0 0 30 30" className="absolute inset-0 w-full h-full text-gold" fill="none" stroke="currentColor">
            <circle cx="15" cy="15" r="14" strokeWidth="1.1" />
            <circle cx="15" cy="15" r="11.5" strokeWidth="0.6" opacity="0.6" />
            <text x="15" y="20.5" textAnchor="middle" fontFamily="Newsreader, Georgia, serif" fontStyle="italic" fontSize="15" fill="currentColor" stroke="none">A</text>
        </svg>
    </span>
);

const SIGN = 'house-sign font-serif font-medium uppercase tracking-[0.16em]';

const Navbar = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const location = useLocation();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [lightsDown, setLightsDown] = useState(false);
    const [peek, setPeek] = useState(false); // the pointer at the top edge, while the lights are down
    const profileMenuRef = useRef(null);

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

    // over the top of a page the bar dissolves into it; once content passes beneath, it becomes dark glass
    useEffect(() => {
        // a page made of full-screen scenes (the home page, marked data-scene) keeps the gradient all
        // the way down: blurring scenes that change every frame is the most expensive thing a page can
        // ask of the GPU, and switching the glass on as one passes reads as a flicker
        // while a scene marked data-lights-down holds the whole screen, the house lights go down: the bar
        // leaves until the scene lets go
        const onScroll = () => {
            setScrolled(window.scrollY > 24 && !document.querySelector('[data-scene]'));
            setLightsDown([...document.querySelectorAll('[data-lights-down]')].some((el) => {
                const r = el.getBoundingClientRect();
                return r.top <= 2 && r.bottom >= window.innerHeight - 2;
            }));
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [location.pathname]);
    // with the lights down, reaching for the top of the screen brings the bar back while you need it
    useEffect(() => {
        if (!lightsDown) return undefined;
        const onMove = (e) => setPeek((was) => (was ? e.clientY < 110 : e.clientY < 56));
        window.addEventListener('mousemove', onMove, { passive: true });
        return () => { window.removeEventListener('mousemove', onMove); setPeek(false); };
    }, [lightsDown]);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isMobileMenuOpen]);

    const closeMobileMenu = () => setIsMobileMenuOpen(false);
    // signing in brings you back here (from the sign-in page itself, back to wherever you were before it)
    const back = /^\/(login|register)/.test(location.pathname) ? location.state : { from: location.pathname + location.search };
    const initial = (user?.username || '?').trim().charAt(0).toUpperCase();

    return (
        <>
        {/* the way back, under the bar: it goes when the bar goes (the lights down) and comes back with it */}
        <BackButton hidden={lightsDown && !peek} />
        <nav
            className={`fixed top-0 left-0 right-0 z-50 focus-within:!opacity-100 focus-within:!translate-y-0 ${lightsDown && !peek && !isMobileMenuOpen ? 'opacity-0 -translate-y-full pointer-events-none' : ''}`}
            style={{ transition: 'opacity 600ms ease, transform 700ms cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
            <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-[150%] -z-10 pointer-events-none bg-gradient-to-b from-[#050505]/85 via-[#050505]/40 to-transparent transition-opacity duration-500 ${scrolled ? 'opacity-0' : 'opacity-100'}`} />
            <div aria-hidden="true" className={`absolute inset-0 -z-10 pointer-events-none bg-[#050505]/60 backdrop-blur-xl transition-opacity duration-500 ${scrolled ? 'opacity-100' : 'opacity-0'}`}>
                {/* the glass's lower edge catches the light */}
                <span className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(217,173,98,0.35)_50%,transparent)]" />
            </div>

            {/* on a phone, the rooms: their signs strike on one after another */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 lg:hidden bg-[#050505] flex flex-col justify-center px-8">
                    <div aria-hidden="true" className="projected-black absolute inset-0" />
                    <ul className="relative space-y-4">
                        {[{ to: '/', label: 'Home' }, ...ROOMS, { to: '/about', label: 'About' }].map(({ to, label }, i) => {
                            const here = inRoom(location.pathname, to);
                            return (
                                <li key={to}>
                                    <Link
                                        to={to}
                                        onClick={closeMobileMenu}
                                        aria-current={here ? 'page' : undefined}
                                        className={`${SIGN} menu-sign inline-block text-[2rem] leading-tight tracking-[0.08em] ${here ? 'is-lit' : 'text-gray-100'}`}
                                        style={{ '--i': i }}
                                    >
                                        {label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="relative mt-12 flex items-center gap-6">
                        {isAuthenticated ? (
                            <>
                                <Link to="/profile" onClick={closeMobileMenu} className={`${SIGN} text-sm text-gray-200`}>Your profile</Link>
                                <button type="button" onClick={() => { logout(); closeMobileMenu(); }} className={`${SIGN} text-sm text-gray-400`}>Sign out</button>
                            </>
                        ) : (
                            <>
                                <Link to="/profile" onClick={closeMobileMenu} className={`${SIGN} text-sm text-gray-200`}>Your profile</Link>
                                {/* one door: the page it opens has Join too */}
                                <Link to="/login" state={back} onClick={closeMobileMenu} className={`${SIGN} text-sm px-5 py-2.5 ring-1 ring-gold/60 text-gold`}>Sign in</Link>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="relative max-w-[1800px] mx-auto px-5 md:px-8 py-5 md:py-6">
                <div className="flex justify-between items-center">
                    {/* the name over the door */}
                    <Link to="/" className="group z-50 relative flex items-center gap-3 shrink-0 whitespace-nowrap" onClick={closeMobileMenu} aria-label="Arthouse Atlas, home">
                        <HouseMark reel={location.pathname} />
                        <span className="font-serif text-[1.4rem] md:text-[1.55rem] leading-none tracking-[-0.01em] text-white">
                            Arthouse <span className="italic text-gold transition-colors group-hover:text-gold-light">Atlas</span>
                        </span>
                    </Link>

                    {/* the rooms */}
                    {/* (from 1024px wide: below that the rooms and the door don't fit, so one word opens them) */}
                    <div className="hidden lg:flex items-center gap-5 xl:gap-11 flex-shrink-0 ml-8">
                        <ul className="flex items-center gap-5 xl:gap-11">
                            {ROOMS.map(({ to, label }) => {
                                const here = inRoom(location.pathname, to);
                                return (
                                    <li key={to}>
                                        <Link to={to} aria-current={here ? 'page' : undefined} className={`${SIGN} text-[13px] ${here ? 'is-lit' : 'text-gray-300 hover:text-white'}`}>
                                            {label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>

                        <span aria-hidden="true" className="w-px h-4 bg-white/15" />

                        {/* how the atlas is made: a quiet word beside the door, not a room */}
                        <Link to="/about" aria-current={inRoom(location.pathname, '/about') ? 'page' : undefined} className={`${SIGN} hidden xl:inline-flex text-[13px] ${inRoom(location.pathname, '/about') ? 'is-lit' : 'text-gray-400 hover:text-white'}`}>
                            About
                        </Link>

                        {isAuthenticated ? (
                            <div className="relative" ref={profileMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    aria-label="Your profile"
                                    aria-expanded={showProfileMenu}
                                    className={`${SIGN} group flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 text-[13px] ring-1 ring-gold/50 hover:ring-gold ${showProfileMenu || inRoom(location.pathname, '/profile') ? 'is-lit' : 'text-gold'}`}
                                >
                                    <span aria-hidden="true" className="flex items-center justify-center w-7 h-7 rounded-full ring-1 ring-gold/60 font-serif normal-case tracking-normal text-[15px] text-gold-light">{initial}</span>
                                    <span className="hidden xl:inline">Your profile</span>
                                    <span aria-hidden="true" className={`text-[10px] transition-transform duration-300 ${showProfileMenu ? 'rotate-180' : ''}`}>▼</span>
                                </button>

                                {/* your ticket: who's in the seat, torn along its perforation from what you can do */}
                                {showProfileMenu && (
                                    <div className="ticket-drop absolute right-0 mt-3 w-64 z-50 drop-shadow-[0_18px_40px_rgba(0,0,0,0.75)]">
                                        <div className="relative bg-[#15120e] ring-1 ring-gold/35">
                                            <div className="px-5 pt-4 pb-4">
                                                <div className="flex items-center justify-between font-label text-[12px] tracking-[0.14em] uppercase">
                                                    <span className="text-gold">Admit one</span>
                                                    <span className="text-gray-500">Signed in</span>
                                                </div>
                                                <p className="mt-2 font-serif text-2xl leading-tight text-white truncate">{user?.username}</p>
                                            </div>
                                            {/* the perforation, notched at both edges */}
                                            <div aria-hidden="true" className="relative mx-3 border-t border-dashed border-white/25">
                                                <span className="absolute -left-[1.3rem] -top-[9px] w-[18px] h-[18px] rounded-full bg-[#050505] ring-1 ring-gold/35 [clip-path:inset(0_0_0_50%)]" />
                                                <span className="absolute -right-[1.3rem] -top-[9px] w-[18px] h-[18px] rounded-full bg-[#050505] ring-1 ring-gold/35 [clip-path:inset(0_50%_0_0)]" />
                                            </div>
                                            <div className="py-2">
                                                <Link
                                                    to="/profile"
                                                    className="group/t flex items-center gap-3 px-5 py-2.5 hover:bg-white/[0.04]"
                                                    onClick={() => setShowProfileMenu(false)}
                                                >
                                                    <MdEmojiEvents aria-hidden="true" className="text-lg text-gold-light" />
                                                    <span>
                                                        <span className="block font-label text-[13px] tracking-[0.14em] uppercase text-white group-hover/t:text-gold-light">Your profile</span>
                                                        <span className="block font-serif italic text-[15px] text-gray-400">Your awards night</span>
                                                    </span>
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        logout();
                                                        setShowProfileMenu(false);
                                                    }}
                                                    className="group/t flex w-full items-center gap-3 text-left px-5 py-2.5 hover:bg-white/[0.04]"
                                                >
                                                    <MdLogout aria-hidden="true" className="text-lg text-gray-400" />
                                                    <span className="font-label text-[13px] tracking-[0.14em] uppercase text-gray-300 group-hover/t:text-white">Sign out</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                            {/* your awards night, for everyone (before you've marked a film, it shows the maker's) */}
                            <Link to="/profile" aria-current={inRoom(location.pathname, '/profile') ? 'page' : undefined} className={`${SIGN} hidden xl:inline-flex text-[13px] ${inRoom(location.pathname, '/profile') ? 'is-lit' : 'text-gray-300 hover:text-white'}`}>
                                Your profile
                            </Link>
                            {/* one door: the page it opens has Join too */}
                            <Link
                                to="/login"
                                state={back}
                                className={`${SIGN} text-[13px] px-5 py-2 ring-1 ring-gold/50 ${inRoom(location.pathname, '/login') || inRoom(location.pathname, '/register') ? 'is-lit' : 'text-gold hover:bg-gold hover:text-black transition-colors'}`}
                            >
                                Sign in
                            </Link>
                            </>
                        )}
                    </div>

                    {/* on a phone, one plain word opens the rooms */}
                    <button
                        type="button"
                        className={`${SIGN} lg:hidden relative z-50 text-[13px] text-gray-100 py-2`}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-expanded={isMobileMenuOpen}
                    >
                        {isMobileMenuOpen ? 'Close' : 'Menu'}
                    </button>
                </div>
            </div>
        </nav>
        </>
    );
};

export default Navbar;
