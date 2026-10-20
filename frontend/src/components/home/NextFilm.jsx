import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { MdArrowOutward } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';
import { moviesAPI, userAPI } from '../../services/api';
import { citationLine } from '../film/canonWords';
import { sized } from '../movements/treatments';
import { notched } from '../ticket';

/**
 * Your next film, at the box office of an old picture house, at night.
 *
 * The neon over the booth flickers on as you arrive, and a ticket slides out
 * under the glass onto the counter: the film's poster printed on it, its title,
 * a seat for tonight. Lightbox cases either side show what's playing (the film
 * on your ticket) and what's next (click it, or "Another, please", for that
 * one). "Take this ticket" tears off the stub, as the usher does at the door,
 * and takes you in; the stubs of the tickets you passed on stay on the counter.
 *
 * Signed in, the tickets are your recommendations, stamped "for you"; signed
 * out (or before you've rated anything) they're films from the top of the
 * atlas, the same "another film" picks the front page makes.
 */

const EASE = [0.22, 1, 0.36, 1];

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
const STUB_NOTCHES = notched('calc(100% - 74px)');

const Ticket = ({ film, n, small = false, part }) => {
    const still = film.stills?.[0] || film.backdropUrl;
    const line = film.editorial?.hook || citationLine(film.provenance?.[0]);
    return (
        // `part` cuts it along the perforation, for tearing: the ticket, or the stub
        <div className={`relative flex bg-[#efe5cf] text-[#1c1812] ${small ? 'w-[14.5rem] h-[6.75rem]' : 'w-[min(36rem,92vw)] h-[11.5rem] sm:h-[12.5rem] md:h-[13.5rem]'}`} style={{ ...STUB_NOTCHES, clipPath: part === 'ticket' ? 'inset(0 74px 0 0)' : part === 'stub' ? 'inset(0 0 0 calc(100% - 74px))' : undefined }}>
            {/* the film's poster, printed on the ticket in a paper margin (its still when there's no poster) */}
            <div className={`relative h-full aspect-[2/3] shrink-0 ${small ? 'p-1.5' : 'p-2 sm:p-2.5'}`}>
                {(film.posterUrl || still)
                    ? <img src={sized(film.posterUrl || still, 'w342')} alt="" className="w-full h-full object-cover max-w-none shadow-[0_1px_3px_rgba(28,24,18,0.35)]" />
                    : <div className="w-full h-full bg-[#1c1812]/10" />}
            </div>
            {!small && (
                <div className="flex-1 min-w-0 px-3 sm:px-5 py-3 sm:py-4 flex flex-col">
                    <div className="flex items-center justify-between gap-3 whitespace-nowrap font-label text-[12px] tracking-[0.14em] uppercase text-[#1c1812]/60">
                        <span className="hidden sm:inline">Arthouse Atlas</span>
                        <span>Screen {(n % 3) + 1}</span>
                    </div>
                    <div className="mt-2 font-serif text-[1.3rem] sm:text-[1.6rem] md:text-[1.85rem] leading-[1.02] line-clamp-3 sm:line-clamp-2">{film.title}</div>
                    <div className="mt-1.5 font-label text-[12px] tracking-[0.14em] uppercase text-[#1c1812]/70 truncate max-sm:whitespace-normal max-sm:line-clamp-2">
                        {[(film.directors || [])[0], film.year, film.country].filter(Boolean).join(' · ')}
                    </div>
                    {line && <div className="hidden sm:block mt-2 font-serif italic text-[13px] leading-snug text-[#1c1812]/80 line-clamp-2">{line}</div>}
                    <div className="mt-auto flex items-end justify-end sm:justify-between text-right font-label text-[12px] tracking-[0.14em] uppercase">
                        <span className="hidden sm:inline">{tonight} · 20:00</span>
                        <span><span className="whitespace-nowrap">Row {seatFor(film._id)[0]} ·</span> <span className="whitespace-nowrap">Seat {seatFor(film._id).slice(1)}</span></span>
                    </div>
                </div>
            )}
            {small && <div className="flex-1 min-w-0 px-3 py-2 font-serif text-[15px] leading-tight line-clamp-3">{film.title}</div>}
            {/* the stub */}
            <div className={`relative shrink-0 flex flex-col items-center justify-between border-l-2 border-dashed border-[#1c1812]/30 ${small ? 'w-[40px] py-2' : 'w-[74px] py-4'}`}>
                <span className={`font-oswald font-bold tracking-[0.25em] [writing-mode:vertical-rl] rotate-180 ${small ? 'text-[8px]' : 'text-[11px]'}`}>ADMIT ONE</span>
                {!small && <span className="font-label text-[12px] tracking-[0.14em] text-[#1c1812]/60 [writing-mode:vertical-rl] rotate-180">№ {serialFor(film._id)}</span>}
            </div>
        </div>
    );
};

// a lightbox poster case on the front of the house, bulbs chasing round it
const PosterCase = ({ label, film, onClick, to, dim = false }) => {
    const poster = film && (film.posterUrl || film.stills?.[0] || film.backdropUrl);
    const inner = (
        <>
            <div className="relative aspect-[2/3] overflow-hidden bg-[#141110]">
                <AnimatePresence initial={false}>
                    {poster && (
                        <motion.img
                            key={poster}
                            src={sized(poster, 'w500')}
                            alt=""
                            className={`absolute inset-0 w-full h-full object-cover max-w-none ${dim ? 'brightness-[0.55] group-hover:brightness-90' : ''} transition-[filter] duration-500`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                        />
                    )}
                </AnimatePresence>
                {/* the glass of the case */}
                <span className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,0.12),transparent_35%,transparent_70%,rgba(255,255,255,0.05))]" />
            </div>
            <div className="mt-2 text-center font-oswald font-bold text-[11px] tracking-[0.35em] uppercase text-[#f4dcae]">{label}</div>
        </>
    );
    const box = 'group relative block p-3 pb-2 bg-[#1b1410] ring-1 ring-gold/40 shadow-[0_0_40px_rgba(255,200,130,0.12),inset_0_0_20px_rgba(0,0,0,0.6)]';
    return (
        <div className="relative">
            {/* the bulbs, round the frame */}
            <div className="absolute -inset-2 flex flex-col justify-between pointer-events-none" aria-hidden="true">
                {[0, 1].map((row) => (
                    <div key={row} className="flex justify-between">
                        {Array.from({ length: 7 }, (_, k) => <span key={k} className="marquee-bulb w-1.5 h-1.5 rounded-full" style={{ '--b': (k + row) % 3 }} />)}
                    </div>
                ))}
            </div>
            {onClick
                ? <button type="button" onClick={onClick} className={`${box} w-full text-left`} aria-label={`${label}: ${film?.title || ''}`}>{inner}</button>
                : <Link to={to || '/explore'} className={box} aria-label={`${label}: ${film?.title || ''}`}>{inner}</Link>}
        </div>
    );
};

const NextFilm = ({ reducedMotion = false }) => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const box = useRef(null);
    const arrived = useInView(box, { once: true, amount: 0.35 });
    // { key, films } — your picks for this sign-in state (none: the atlas picks instead)
    const [recs, setRecs] = useState({ key: null, films: [] });
    const [printed, setPrinted] = useState([]); // every ticket so far, the newest last
    const [upcoming, setUpcoming] = useState(null); // the next one, fetched ahead for the "next" case
    const [busy, setBusy] = useState(false);
    const [tearing, setTearing] = useState(false);
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

    // ticket number `count`: your next pick, or the atlas's next "another film" (the front page shows its first)
    const pickAt = useCallback(async (count) => (mine
        ? recs.films[count % recs.films.length]
        : (await moviesAPI.getTonight(today(), count + 1)).data), [mine, recs]);

    const print = useCallback(async (count) => {
        setBusy(true);
        try {
            const film = upcoming?.n === count ? upcoming.film : await pickAt(count);
            if (film) setPrinted((p) => [...p, { film, n: count, mine }]);
            pickAt(count + 1).then((next) => setUpcoming({ n: count + 1, film: next })).catch(() => {});
        } catch { /* the booth stays as it was */ }
        setBusy(false);
    }, [mine, pickAt, upcoming]);

    // a new sign-in state starts a new roll
    const [roll, setRoll] = useState(key);
    if (roll !== key) { setRoll(key); setPrinted([]); setUpcoming(null); }

    // the first ticket slides out as the section arrives
    useEffect(() => {
        if (!arrived || !ready || printed.length || busy) return undefined;
        const t = setTimeout(() => print(0), 900);
        return () => clearTimeout(t);
    }, [arrived, ready, printed.length, busy, print]);

    const current = printed[printed.length - 1];
    const stubs = printed.slice(-5, -1);

    // the usher's tear: the stub stays, the ticket goes in with you
    const take = () => {
        if (!current || tearing) return;
        if (reducedMotion) { navigate(`/movie/${current.film._id}`); return; }
        setTearing(true);
        setTimeout(() => navigate(`/movie/${current.film._id}`), 700);
    };

    return (
        <div ref={box} className="relative">
            {/* the front of the house: fluted walls, warm light falling from above */}
            <div className="absolute inset-x-[-4%] -top-16 bottom-0 pointer-events-none bg-[repeating-linear-gradient(90deg,#0e0a08_0_22px,#161009_22px_24px)] [mask-image:radial-gradient(ellipse_55%_45%_at_50%_50%,#000_25%,transparent_100%)]" />
            <div className="absolute inset-x-0 -top-10 h-[80%] pointer-events-none bg-[radial-gradient(ellipse_40%_45%_at_50%_40%,rgba(255,190,120,0.14),transparent_70%)]" />

            <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-start gap-10 lg:gap-12">
                {/* now showing: the film on your ticket */}
                <div className="hidden lg:block justify-self-end w-[12.5rem] mt-16">
                    <PosterCase label="Now showing" film={current?.film} to={current && `/movie/${current.film._id}`} />
                </div>

                {/* the booth */}
                <div className="relative flex flex-col items-center">
                    {/* the neon */}
                    <div className={`font-serif italic text-4xl md:text-5xl text-[#ffe6ee] [text-shadow:0_0_4px_#fff,0_0_12px_#ff4f87,0_0_28px_#ff2a6d,0_0_60px_#ff2a6d] ${arrived && !reducedMotion ? 'neon-on' : ''}`}>
                        Box Office
                    </div>
                    {/* the window */}
                    <div className="relative mt-4 w-[min(21rem,80vw)] aspect-[4/3] rounded-t-full p-[7px] bg-gradient-to-b from-[#e2c27f] via-[#a8823f] to-[#6d5226] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                        <div className="relative w-full h-full rounded-t-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_70%,#6b4320,#2a1a0d_60%,#120b06)]">
                            {/* the cashier's lamp, and a card propped against the glass */}
                            <span className="absolute left-1/2 top-[30%] -translate-x-1/2 w-40 h-40 rounded-full bg-[radial-gradient(circle,rgba(255,210,140,0.45),transparent_65%)]" />
                            <div className="absolute left-1/2 bottom-[16%] -translate-x-1/2 rotate-[-3deg] px-4 py-2 bg-[#efe5cf] text-[#1c1812] shadow-[0_6px_14px_rgba(0,0,0,0.5)] text-center">
                                <div className="font-oswald font-bold text-sm tracking-[0.3em] uppercase">Tonight</div>
                                <div className="font-label text-[12px] tracking-[0.14em] whitespace-nowrap">20:00 · {current ? `Screen ${(current.n % 3) + 1}` : 'All screens'}</div>
                            </div>
                            {/* the grille at the speaking hole */}
                            <span className="absolute left-1/2 top-[14%] -translate-x-1/2 w-14 h-14 rounded-full bg-[repeating-radial-gradient(circle,transparent_0_3px,rgba(226,194,127,0.5)_3px_4px)] opacity-70" />
                            {/* the glass */}
                            <span className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.14),transparent_30%,transparent_62%,rgba(255,255,255,0.07)_70%,transparent_80%)]" />
                            <span className="absolute right-4 bottom-3 flex items-center gap-1.5 font-label text-[12px] tracking-[0.14em] uppercase text-white/60">
                                <span className={`w-1.5 h-1.5 rounded-full ${busy ? 'bg-[#ff7a4d] shadow-[0_0_8px_#ff7a4d] animate-pulse' : 'bg-[#7bd88f] shadow-[0_0_6px_#7bd88f]'}`} />
                                {busy ? 'Printing' : 'Open'}
                            </span>
                        </div>
                    </div>
                    {/* the counter, and the slot under the glass */}
                    <div className="relative w-[min(38rem,96vw)] h-5 bg-gradient-to-b from-[#c9a35c] to-[#6d5226] shadow-[0_8px_20px_rgba(0,0,0,0.6)]">
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-1 w-[min(36.5rem,93vw)] h-1.5 rounded-full bg-black shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)]" />
                    </div>

                    {/* the ticket, sliding out onto the counter */}
                    <div className="relative w-[min(36rem,92vw)] h-[12.5rem] sm:h-[13.5rem] md:h-[14.5rem] overflow-hidden">
                        <AnimatePresence initial={false}>
                            {current && (
                                <motion.div
                                    key={current.n}
                                    className="absolute inset-x-0 top-0"
                                    initial={reducedMotion ? false : { y: '-102%' }}
                                    // fed in jerks, as a ticket printer feeds
                                    animate={{ y: ['-102%', '-74%', '-70%', '-38%', '-34%', '0%'], transition: { duration: 1.6, times: [0, 0.22, 0.34, 0.6, 0.72, 1], ease: 'easeOut' } }}
                                    exit={{ x: '-60%', y: 30, rotate: -8, opacity: 0, transition: { duration: 0.5, ease: 'easeIn' } }}
                                >
                                    <button type="button" onClick={take} aria-label={`Take the ticket for ${current.film.title}`} className="group relative block w-fit mx-auto text-left">
                                        {tearing ? (
                                            <>
                                                {/* torn along the perforation: the ticket goes, the stub stays */}
                                                <motion.div initial={false} animate={{ x: -70, y: -16, rotate: -6, opacity: [1, 1, 0] }} transition={{ duration: 0.65, ease: [0.4, 0, 1, 1], opacity: { duration: 0.65, times: [0, 0.7, 1] } }}>
                                                    <Ticket film={current.film} n={current.n} part="ticket" />
                                                </motion.div>
                                                <motion.div className="absolute inset-0" initial={false} animate={{ x: 10, y: 14, rotate: 7 }} transition={{ duration: 0.5, ease: EASE }}>
                                                    <Ticket film={current.film} n={current.n} part="stub" />
                                                </motion.div>
                                            </>
                                        ) : (
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
                                        )}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={take}
                            disabled={!current || tearing}
                            className="font-label inline-flex items-center min-h-11 gap-2 px-6 py-3 bg-[#f4ecd8] text-[#141110] text-xs font-medium tracking-[0.14em] uppercase hover:bg-white disabled:opacity-60 transition-colors"
                        >
                            Take this ticket <MdArrowOutward />
                        </button>
                        <button
                            type="button"
                            onClick={() => print(printed.length)}
                            disabled={busy || !ready || tearing}
                            className="font-label min-h-11 px-6 py-3 text-xs tracking-[0.14em] uppercase text-gray-100 ring-1 ring-white/30 hover:ring-white/60 disabled:opacity-60 transition-colors"
                        >
                            {printed.length ? 'Another, please' : 'A ticket, please'}
                        </button>
                    </div>
                    <p className="mt-5 text-sm text-gray-400 text-center">
                        {mine
                            ? <Link to="/recommendations" className="hover:text-white transition-colors">All your picks, with why each was chosen →</Link>
                            : isAuthenticated
                            ? <>Rate a few films and the tickets become <Link to="/explore" className="py-3 text-gray-200 underline underline-offset-4 hover:text-white">yours</Link>.</>
                            : <><Link to="/login" className="py-3 text-gray-200 underline underline-offset-4 hover:text-white">Sign in</Link> and the box office picks films for you.</>}
                    </p>
                </div>

                {/* next up: click for that one; below it, the stubs of the ones you passed on */}
                <div className="hidden lg:block justify-self-start w-[12.5rem] mt-16">
                    <PosterCase label="Next up" film={upcoming?.film} onClick={() => !busy && print(printed.length)} dim />
                    {stubs.length > 0 && (
                        <div className="mt-8">
                            <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">Your stubs</div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {stubs.map((t) => (
                                    <Link key={t.n} to={`/movie/${t.film._id}`} title={t.film.title} className="block w-9 h-14 overflow-hidden ring-1 ring-[#efe5cf]/30 hover:ring-[#efe5cf] rotate-[-4deg] odd:rotate-[3deg] transition-[box-shadow]">
                                        {t.film.posterUrl && <img src={sized(t.film.posterUrl, 'w92')} alt={t.film.title} className="w-full h-full object-cover" />}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NextFilm;
