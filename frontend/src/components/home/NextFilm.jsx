import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { MdArrowOutward } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';
import { moviesAPI, userAPI } from '../../services/api';
import { citationLine } from '../film/canonWords';
import { sized } from '../movements/treatments';

/**
 * Your next film, printed at the box office.
 *
 * A ticket machine feeds out a ticket as the section arrives: the film's poster
 * printed on it, its title, and a seat for tonight. "Print another"
 * tears it off onto the pile beside the machine and feeds the next. Signed in,
 * the tickets are your recommendations, stamped "for you"; signed out (or
 * before you've rated anything) they're films from the top of the atlas, the
 * same "another film" picks the front page makes.
 */

const EASE = [0.22, 1, 0.36, 1];
const INK = '#1c1812';

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const hash = (id = '') => [...String(id)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
// a seat and a ticket number for each film, the same every time
const seatFor = (id) => { const n = hash(id); return `${'DEFGHJK'[n % 7]}${(n % 14) + 1}`; };
const serialFor = (id) => String(hash(id) % 1000000).padStart(6, '0');
const tonight = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();

// the punched notches either side of the stub's perforation
const NOTCHES = 'radial-gradient(circle 9px at calc(100% - 74px) 0, transparent 98%, #000 100%), radial-gradient(circle 9px at calc(100% - 74px) 100%, transparent 98%, #000 100%)';
const notched = { WebkitMaskImage: NOTCHES, WebkitMaskComposite: 'source-in', maskImage: NOTCHES, maskComposite: 'intersect' };

const Ticket = ({ film, n, small = false }) => {
    const still = film.stills?.[0] || film.backdropUrl;
    const line = film.editorial?.hook || citationLine(film.provenance?.[0]);
    return (
        <div className={`relative flex bg-[#efe5cf] text-[#1c1812] ${small ? 'w-[14.5rem] h-[6.75rem]' : 'w-[min(36rem,92vw)] h-[12.5rem] md:h-[13.5rem]'}`} style={notched}>
            {/* the film's poster, printed on the ticket in a paper margin (its still when there's no poster) */}
            <div className={`relative h-full aspect-[2/3] shrink-0 ${small ? 'p-1.5' : 'p-2.5'}`}>
                {(film.posterUrl || still)
                    ? <img src={sized(film.posterUrl || still, 'w342')} alt="" className="w-full h-full object-cover max-w-none shadow-[0_1px_3px_rgba(28,24,18,0.35)]" />
                    : <div className="w-full h-full bg-[#1c1812]/10" />}
            </div>
            {!small && (
                <div className="flex-1 min-w-0 px-5 py-4 flex flex-col">
                    <div className="flex items-center justify-between gap-3 whitespace-nowrap font-mono text-[9px] tracking-[0.25em] uppercase text-[#1c1812]/60">
                        <span className="hidden sm:inline">Arthouse Atlas</span>
                        <span>Screen {(n % 3) + 1}</span>
                    </div>
                    <div className="mt-2 font-serif text-[1.6rem] md:text-[1.85rem] leading-[1.02] line-clamp-2">{film.title}</div>
                    <div className="mt-1.5 font-mono text-[10px] tracking-[0.15em] uppercase text-[#1c1812]/70 truncate">
                        {[(film.directors || [])[0], film.year, film.country].filter(Boolean).join(' · ')}
                    </div>
                    {line && <div className="hidden sm:block mt-2 font-serif italic text-[13px] leading-snug text-[#1c1812]/80 line-clamp-2">{line}</div>}
                    <div className="mt-auto flex items-end justify-end sm:justify-between font-mono text-[10px] tracking-[0.18em] uppercase">
                        <span className="hidden sm:inline">{tonight} · 20:00</span>
                        <span>Row {seatFor(film._id)[0]} · Seat {seatFor(film._id).slice(1)}</span>
                    </div>
                </div>
            )}
            {small && <div className="flex-1 min-w-0 px-3 py-2 font-serif text-[15px] leading-tight line-clamp-3">{film.title}</div>}
            {/* the stub */}
            <div className={`relative shrink-0 flex flex-col items-center justify-between border-l-2 border-dashed border-[#1c1812]/30 ${small ? 'w-[40px] py-2' : 'w-[74px] py-4'}`}>
                <span className={`font-oswald font-bold tracking-[0.25em] [writing-mode:vertical-rl] rotate-180 ${small ? 'text-[8px]' : 'text-[11px]'}`}>ADMIT ONE</span>
                {!small && <span className="font-mono text-[9px] tracking-[0.1em] text-[#1c1812]/60 [writing-mode:vertical-rl] rotate-180">№ {serialFor(film._id)}</span>}
            </div>
        </div>
    );
};

const NextFilm = ({ reducedMotion = false }) => {
    const { isAuthenticated } = useAuth();
    const box = useRef(null);
    const arrived = useInView(box, { once: true, amount: 0.4 });
    // { key, films } — your picks for this sign-in state (none: the atlas picks instead)
    const [recs, setRecs] = useState({ key: null, films: [] });
    const [printed, setPrinted] = useState([]); // every ticket so far, the newest last
    const [busy, setBusy] = useState(false);
    const key = isAuthenticated ? 'in' : 'out';

    useEffect(() => {
        let gone = false;
        if (!isAuthenticated) {
            Promise.resolve().then(() => { if (!gone) setRecs({ key: 'out', films: [] }); });
            return () => { gone = true; };
        }
        userAPI.getRecommendations()
            .then((res) => { if (!gone) setRecs({ key: 'in', films: res.data.recommendations?.slice(0, 12) || [] }); })
            .catch(() => { if (!gone) setRecs({ key: 'in', films: [] }); });
        return () => { gone = true; };
    }, [isAuthenticated]);

    const ready = recs.key === key;
    const mine = ready && recs.films.length > 0;

    // the next ticket: your next pick, or the atlas's next "another film" (the front page shows its first)
    const print = useCallback(async (count) => {
        setBusy(true);
        try {
            const film = mine
                ? recs.films[count % recs.films.length]
                : (await moviesAPI.getTonight(today(), count + 1)).data;
            if (film) setPrinted((p) => [...p, { film, n: count, mine }]);
        } catch { /* the machine stays as it was */ }
        setBusy(false);
    }, [mine, recs]);

    // a new sign-in state starts a new roll
    const [roll, setRoll] = useState(key);
    if (roll !== key) { setRoll(key); setPrinted([]); }

    // the first ticket feeds out as the section arrives
    useEffect(() => {
        if (!arrived || !ready || printed.length || busy) return undefined;
        const t = setTimeout(() => print(0), 200);
        return () => clearTimeout(t);
    }, [arrived, ready, printed.length, busy, print]);

    const current = printed[printed.length - 1];
    const pile = printed.slice(-4, -1);

    return (
        <div ref={box} className="relative flex flex-col items-center">
            {/* the pile of torn-off tickets, beside the machine */}
            <div className="hidden lg:block absolute left-0 top-28 w-[15rem] h-64">
                <AnimatePresence>
                    {pile.map((t, i) => (
                        <motion.div
                            key={t.n}
                            className="absolute left-0 top-0"
                            initial={reducedMotion ? false : { x: 260, y: -20, rotate: 8, opacity: 0 }}
                            animate={{ x: i * 10, y: i * 26, rotate: [-9, 4, -3][i % 3], opacity: 1 }}
                            exit={{ opacity: 0, y: 40 }}
                            transition={{ duration: 0.7, ease: EASE }}
                        >
                            <Link to={`/movie/${t.film._id}`} className="block shadow-[0_14px_30px_rgba(0,0,0,0.6)] hover:-translate-y-1 transition-transform" aria-label={t.film.title}>
                                <Ticket film={t.film} n={t.n} small />
                            </Link>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* the machine */}
            <div className="relative z-10 w-[min(40rem,96vw)] rounded-t-2xl bg-gradient-to-b from-[#24221f] to-[#121110] ring-1 ring-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] px-6 pt-4 pb-5">
                {['left-2.5', 'right-2.5'].map((x) => <span key={x} className={`absolute top-2.5 ${x} w-2 h-2 rounded-full bg-gradient-to-br from-[#6b6560] to-[#262320] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]`} />)}
                <div className="flex items-center justify-between">
                    {/* the brass plate */}
                    <span className="px-3 py-1 rounded-sm bg-gradient-to-b from-[#d9b877] to-[#9c7a3e] text-[#2a1d0b] font-oswald font-bold text-[11px] tracking-[0.35em] uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.6)]">Box office</span>
                    <span className="flex items-center gap-2 font-mono text-[9px] tracking-[0.25em] uppercase text-gray-400">
                        <span className={`w-2 h-2 rounded-full ${busy ? 'bg-[#ff7a4d] shadow-[0_0_10px_#ff7a4d] animate-pulse' : 'bg-[#7bd88f] shadow-[0_0_8px_#7bd88f]'}`} />
                        {busy ? 'Printing' : 'Ready'}
                    </span>
                </div>
                {/* the slot the tickets feed out of */}
                <div className="mt-4 h-2.5 rounded-full bg-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.08)]" />
            </div>

            {/* the ticket, feeding out of the slot */}
            <div className="relative -mt-1.5 w-[min(36rem,92vw)] h-[13.5rem] md:h-[14.5rem] overflow-hidden">
                <AnimatePresence initial={false}>
                    {current && (
                        <motion.div
                            key={current.n}
                            className="absolute inset-x-0 top-0"
                            initial={reducedMotion ? false : { y: '-102%' }}
                            // fed in jerks, as a printer feeds
                            animate={{ y: ['-102%', '-74%', '-70%', '-38%', '-34%', '0%'], transition: { duration: 1.6, times: [0, 0.22, 0.34, 0.6, 0.72, 1], ease: 'easeOut' } }}
                            exit={{ x: '-70%', y: 30, rotate: -10, opacity: 0, transition: { duration: 0.5, ease: 'easeIn' } }}
                        >
                            <Link to={`/movie/${current.film._id}`} className="group block w-fit mx-auto">
                                <div className="relative transition-transform duration-300 group-hover:translate-y-1">
                                    <Ticket film={current.film} n={current.n} />
                                    {/* the stamp, once it's printed */}
                                    <motion.span
                                        initial={reducedMotion ? false : { scale: 1.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 0.8 }}
                                        transition={{ delay: reducedMotion ? 0 : 1.65, type: 'spring', stiffness: 500, damping: 18 }}
                                        className="absolute left-[38%] bottom-9 sm:left-auto sm:right-[92px] sm:bottom-9 px-2 py-1 border-2 border-[#a3302a] text-[#a3302a] font-oswald font-bold text-[11px] tracking-[0.2em] uppercase rotate-[-12deg] mix-blend-multiply pointer-events-none"
                                    >
                                        {current.mine ? 'For you' : 'Tonight'}
                                    </motion.span>
                                </div>
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={() => print(printed.length)}
                    disabled={busy || !ready}
                    className="px-6 py-3 bg-[#f4ecd8] text-[#141110] text-xs font-semibold tracking-[0.25em] uppercase disabled:opacity-60 hover:bg-white transition-colors"
                >
                    {printed.length ? 'Print another' : 'Print a ticket'}
                </button>
                {current && (
                    <Link to={`/movie/${current.film._id}`} className="inline-flex items-center gap-2 px-6 py-3 text-xs tracking-[0.25em] uppercase text-gray-100 ring-1 ring-white/30 hover:ring-white/60 transition-colors">
                        Take this ticket <MdArrowOutward />
                    </Link>
                )}
            </div>
            <p className="mt-5 text-sm text-gray-400 text-center">
                {mine
                    ? <Link to="/recommendations" className="hover:text-white transition-colors">All your picks, with why each was chosen →</Link>
                    : isAuthenticated
                    ? <>Rate a few films and the tickets become <Link to="/explore" className="text-gray-200 underline underline-offset-4 hover:text-white">yours</Link>.</>
                    : <><Link to="/login" className="text-gray-200 underline underline-offset-4 hover:text-white">Sign in</Link> and the box office prints films picked for you.</>}
            </p>
        </div>
    );
};

export default NextFilm;
