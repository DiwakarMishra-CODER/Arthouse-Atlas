import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaStar } from 'react-icons/fa';
import { MdBookmark, MdBookmarkBorder, MdCheck, MdFavorite, MdFavoriteBorder, MdPlayArrow } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';
import { useMovie } from '../../context/MovieContext';
import { sized } from '../movements/treatments';
import { useDecoded } from '../about/frames';

/**
 * What you can do with a film, on its page, in the words everyone knows.
 *
 * TrailerScreen: a little screen already playing the film's frames (they cut by themselves), a lit
 * play button breathing at its centre, and what it does beside it. Pressed, the little screen grows
 * into the full screen and the trailer plays there (TheScreen's projection shares its layoutId).
 * ShelfSigns: Watched, Watchlist, Favourite as the house's signs (serif capitals, like the navbar's
 * rooms); one that's yours is lit in the film's own light and strikes on like a lamp when pressed.
 * Your stars light the same way.
 * TicketDock: the same, always within reach past the title card: a slim glass sign-board at the top
 * right on a wide screen (its own little screen, the film's title, the signs, the stars), a bar along
 * the foot on a phone (there from the start).
 */

// what you can do with the film, and whether it's done
const useShelf = (movie) => {
    const { isAuthenticated } = useAuth();
    const shelf = useMovie();
    const id = movie._id;
    const items = [
        { key: 'watched', label: 'Watched', on: shelf.isWatched(id), Icon: MdCheck, OnIcon: MdCheck, toggle: () => shelf.toggleWatched(movie), say: (on) => (on ? 'Watched: yes. Press to undo' : 'Mark as watched') },
        { key: 'watchlist', label: 'Watchlist', on: shelf.isInWatchlist(id), Icon: MdBookmarkBorder, OnIcon: MdBookmark, toggle: () => shelf.toggleWatchlist(movie), say: (on) => (on ? 'On your watchlist. Press to remove' : 'Add to your watchlist') },
        { key: 'favourite', label: 'Favourite', on: shelf.isFavorite(id), Icon: MdFavoriteBorder, OnIcon: MdFavorite, toggle: () => shelf.toggleFavorite(movie), say: (on) => (on ? 'A favourite. Press to undo' : 'Add to your favourites') },
    ];
    // signed out, a mark is kept in this browser (MovieContext) and moves into the account at sign-in
    const act = (item) => item.toggle();
    return { items, act, signedIn: isAuthenticated, marked: shelf.marked, rating: shelf.getMovieRating(id), rate: (s) => shelf.setMovieRating(movie, s) };
};

// lit: the film's light, glowing
const glow = (light) => ({ color: light, textShadow: `0 0 12px ${light}99, 0 0 2px ${light}88` });

// the film's frames, cutting by themselves on a little screen (each decoded before it's shown)
const MiniFrames = ({ frames, every = 1800 }) => {
    const [ready, want] = useDecoded();
    const [k, setK] = useState(0);
    const urls = frames.map((f) => sized(f, 'w780'));
    const key = urls.join('|');
    useEffect(() => { want(key.split('|')); }, [key, want]);
    useEffect(() => {
        if (frames.length < 2) return undefined;
        const t = setInterval(() => setK((x) => (x + 1) % frames.length), every);
        return () => clearInterval(t);
    }, [frames.length, every]);
    return (
        <>
            {ready.has(urls[k]) && <img key={k} src={urls[k]} alt="" className="frame-push absolute inset-0 w-full h-full object-cover max-w-none" />}
            <span key={`s${k}`} aria-hidden="true" className="shutter absolute inset-0 bg-black" />
        </>
    );
};

const PlayDisc = ({ light, size = 'w-14 h-14', icon = 30 }) => (
    <span aria-hidden="true" className={`absolute inset-0 m-auto ${size} rounded-full flex items-center justify-center`}>
        <span className="lamp-breathe absolute inset-0 rounded-full" style={{ boxShadow: `0 0 0 2px ${light}, 0 0 26px ${light}` }} />
        <span className="relative w-full h-full rounded-full flex items-center justify-center bg-black/55 backdrop-blur-[2px]" style={{ color: light }}>
            <MdPlayArrow size={icon} className="translate-x-[1px]" />
        </span>
    </span>
);

export const TrailerScreen = ({ frames, light, trailer, onClick, buttonRef, shared, hidden }) => (
    <button ref={buttonRef} type="button" onClick={onClick} className="group flex items-center gap-4 md:gap-5 text-left">
        {hidden
            ? <span className="block w-[168px] md:w-[216px] aspect-video" />
            : (
                <motion.span layoutId={shared} transition={{ duration: 0.6, ease: [0.6, 0, 0.2, 1] }} className="relative block w-[168px] md:w-[216px] aspect-video overflow-hidden bg-black ring-1 ring-white/25 shadow-[0_16px_40px_rgba(0,0,0,0.6)] group-hover:ring-white/50">
                    <MiniFrames frames={frames} />
                    <span aria-hidden="true" className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-colors" />
                    <PlayDisc light={light} />
                </motion.span>
            )}
        <span className="[text-shadow:0_2px_14px_rgba(0,0,0,0.8)]">
            <span className="block font-label text-[14px] md:text-[15px] tracking-[0.16em] uppercase text-white group-hover:text-gold-light">{trailer ? 'Watch the trailer' : 'Watch its frames'}</span>
            <span className="block mt-0.5 font-serif italic text-[15px] md:text-base text-gray-300">{trailer ? 'It plays right here' : 'No trailer online: its frames run instead'}</span>
        </span>
    </button>
);

// a sign of the house: dark until it's yours, then lit in the film's light
const Sign = ({ it, light, act, compact = false, i = 0 }) => {
    const Icon = it.on ? it.OnIcon : it.Icon;
    return (
        <button
            type="button"
            aria-pressed={it.on}
            aria-label={it.say(it.on)}
            onClick={() => act(it)}
            className={`group relative flex items-center gap-2 rounded-full font-serif font-medium uppercase transition-colors ${compact ? 'h-9 px-3 text-[12px] tracking-[0.14em]' : 'h-11 px-4 md:px-5 text-[13px] tracking-[0.16em] bg-black/45 backdrop-blur-sm ring-1'} ${it.on ? '' : 'text-gray-200 hover:text-white ring-white/25 hover:ring-white/50'}`}
            style={it.on ? { ...glow(light), '--tw-ring-color': `${light}99`, backgroundColor: compact ? undefined : `${light}1f` } : undefined}
        >
            <span key={it.on ? 'lit' : 'dark'} className={it.on ? 'sign-on flex items-center gap-2' : 'flex items-center gap-2'} style={{ '--i': i }}>
                <Icon aria-hidden="true" className={compact ? 'text-[15px]' : 'text-[17px]'} /> {it.label}
            </span>
        </button>
    );
};

const Stars = ({ rating, rate, light, size = 'text-[18px]', cell = 'w-8 h-10' }) => {
    const [hover, setHover] = useState(0);
    return (
        <span className="flex" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((s) => {
                const lit = (hover || rating) >= s;
                return (
                    <button key={s} type="button" aria-label={`Rate it ${s} out of 5`} aria-pressed={rating === s} onMouseEnter={() => setHover(s)} onClick={() => rate(s)} className={`${cell} flex items-center justify-center`}>
                        <FaStar key={lit ? 'lit' : 'dark'} className={`${size} ${lit ? 'sign-on' : 'text-white/25'}`} style={lit ? { color: light, filter: `drop-shadow(0 0 6px ${light}aa)`, '--i': s - 1 } : undefined} />
                    </button>
                );
            })}
        </span>
    );
};

export const ShelfSigns = ({ movie, light }) => {
    const { items, act, signedIn, marked, rating, rate } = useShelf(movie);
    return (
        <div role="group" aria-label="Keep track of this film" className="[text-shadow:0_2px_14px_rgba(0,0,0,0.7)]">
            {/* (from three films marked, your awards night has winners: it's offered here) */}
            {marked >= 3 ? (
                <div className="mb-2 font-label text-[12px] tracking-[0.14em] uppercase text-gray-300">
                    {!signedIn && 'Kept on this device · '}<Link to="/profile" className="text-gold underline decoration-gold/50 underline-offset-4 hover:text-gold-light">Your awards night is ready ›</Link>
                </div>
            ) : !signedIn && (
                <div className="mb-2 font-label text-[12px] tracking-[0.14em] uppercase text-gray-300">
                    Kept on this device · <Link to="/login" state={{ from: window.location.pathname }} className="text-gold underline decoration-gold/50 underline-offset-4 hover:text-gold-light">Sign in</Link> to keep it everywhere
                </div>
            )}
            <div className="flex flex-wrap items-center gap-2.5">
                {items.map((it) => <Sign key={it.key} it={it} light={light} act={act} />)}
            </div>
            <div className="mt-2 flex items-center gap-3">
                <span className="font-label text-[12px] tracking-[0.16em] uppercase text-gray-200">Rate it</span>
                <Stars rating={rating} rate={rate} light={light} />
            </div>
        </div>
    );
};

// past the title card, the shelf stays within reach
export const TicketDock = ({ movie, light, frames, onPlay, playLabel }) => {
    const { items, act, signedIn, rating, rate } = useShelf(movie);
    const [shown, setShown] = useState(false); // (a wide screen: once past the title card)
    const [atFoot, setAtFoot] = useState(false); // (a phone: out of the way of the page's foot)
    const [stars, setStars] = useState(false); // a phone's stars, opened from the bar
    const [dark, setDark] = useState(false); // the house lights down (no navbar): the board moves up

    useEffect(() => {
        const onScroll = () => {
            setShown(window.scrollY > window.innerHeight * 0.4);
            setAtFoot(window.scrollY + window.innerHeight > document.documentElement.scrollHeight - 140);
            setDark([...document.querySelectorAll('[data-lights-down]')].some((el) => {
                const r = el.getBoundingClientRect();
                return r.top <= 2 && r.bottom >= window.innerHeight - 2;
            }));
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return createPortal(
        <>
            {/* a wide screen: a slim glass sign-board at the top right */}
            <aside
                aria-label="Keep track of this film"
                className={`own-transitions hidden md:flex fixed right-6 lg:right-10 top-[80px] z-40 items-center gap-1 h-14 pl-1.5 pr-4 rounded-full bg-[#0b0a09]/80 backdrop-blur-md ring-1 ring-white/12 shadow-[0_14px_40px_rgba(0,0,0,0.6)] transition-[transform,opacity] duration-700 ease-out ${shown ? (dark ? '-translate-y-[58px] opacity-100' : 'translate-y-0 opacity-100') : '-translate-y-4 opacity-0 pointer-events-none'}`}
            >
                {onPlay && (
                    <button type="button" onClick={onPlay} aria-label={playLabel} className="group relative w-[76px] aspect-video overflow-hidden rounded-full ring-1 ring-white/20 hover:ring-white/50">
                        {shown && <MiniFrames frames={frames} every={2200} />}
                        <span aria-hidden="true" className="absolute inset-0 bg-black/30" />
                        <PlayDisc light={light} size="w-7 h-7" icon={17} />
                    </button>
                )}
                <span className="max-w-[11rem] truncate pl-2.5 pr-1 font-serif italic text-[15px] text-white">{movie.title}</span>
                <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/15" />
                {items.map((it, i) => <Sign key={`${it.key}-${shown}`} it={it} light={light} act={act} compact i={i} />)}
                <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/15" />
                <Stars rating={rating} rate={rate} light={light} size="text-[14px]" cell="w-6 h-9" />
                {!signedIn && <span className="sr-only">Kept on this device until you sign in</span>}
            </aside>

            {/* a phone: a bar along the foot, there from the start */}
            <aside aria-label="Keep track of this film" className={`md:hidden fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ${atFoot ? 'translate-y-full' : 'translate-y-0'}`}>
                {stars && (
                    <div className="flex items-center justify-center gap-2 py-1.5 bg-[#0b0a09]/95 backdrop-blur-md border-t border-white/10">
                        <span className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-200">Rate it</span>
                        <Stars rating={rating} rate={(s) => { rate(s); setStars(false); }} light={light} size="text-[22px]" cell="w-10 h-11" />
                    </div>
                )}
                <div className="grid grid-cols-5 bg-[#0b0a09]/90 backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
                    {onPlay && (
                        <button type="button" onClick={onPlay} aria-label={playLabel} className="flex flex-col items-center justify-center gap-1 h-[60px] font-label text-[11px] tracking-[0.1em] uppercase text-white">
                            <span className="relative w-[44px] aspect-video overflow-hidden ring-1 ring-white/25">
                                <MiniFrames frames={frames} every={2400} />
                                <PlayDisc light={light} size="w-5 h-5" icon={13} />
                            </span>
                            Trailer
                        </button>
                    )}
                    {items.map((it) => {
                        const Icon = it.on ? it.OnIcon : it.Icon;
                        return (
                            <button key={it.key} type="button" aria-label={it.say(it.on)} aria-pressed={it.on} onClick={() => act(it)} className="flex flex-col items-center justify-center gap-1 h-[60px] font-label text-[11px] tracking-[0.1em] uppercase text-gray-200" style={it.on ? glow(light) : undefined}>
                                <span key={it.on ? 'lit' : 'dark'} className={it.on ? 'sign-on' : ''}><Icon aria-hidden="true" className="text-[21px]" /></span>
                                {it.label}
                            </button>
                        );
                    })}
                    <button type="button" onClick={() => setStars((v) => !v)} aria-label={rating ? `You rated it ${rating} out of 5. Change it` : 'Rate it'} className="flex flex-col items-center justify-center gap-1 h-[60px] font-label text-[11px] tracking-[0.1em] uppercase text-gray-200" style={rating ? glow(light) : undefined}>
                        <FaStar aria-hidden="true" className="text-[18px]" />
                        {rating ? `Rated ${rating}` : 'Rate'}
                    </button>
                </div>
            </aside>
        </>,
        document.body,
    );
};
