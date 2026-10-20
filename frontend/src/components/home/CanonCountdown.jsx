import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion';
import { MdArrowOutward } from 'react-icons/md';
import { Letters } from '../film/CanonMarquee';
import { citationLine } from '../film/canonWords';
import { sized } from '../movements/treatments';

/**
 * The top of the canon, counted down from ten to one — one film per director,
 * so a place in the ten can sit lower in the atlas's own ranking (the server
 * picks them; their place here is their order).
 *
 * The section is the leader at the head of a reel: the circles, the crosshair,
 * the number, the hand sweeping round. It pins as you scroll, and each sweep of
 * the hand wipes the next film in over the last, round the dial, until it holds
 * full-screen. Number one ends the leader with its flash, and the marquee.
 *
 * With reduced motion: a plain ranked list.
 */

const EASE = [0.22, 1, 0.36, 1];
const STEP_VH = 85; // scroll per film
// within each film's step: the leader comes up, the hand sweeps, the leader goes, the film holds
const UP = 0.1;
const SWEPT = 0.65;
const GONE = 0.8;
const R = 4000; // the wipe's radius in px: far beyond any screen

// the dial swept so far (0–1), for the film at `j` with the reel at `s`
const sweepOf = (s, j) => Math.min(1, Math.max(0, (s - j - UP) / (SWEPT - UP)));

// the part of the screen the hand has passed, as a clip-path (clockwise from twelve)
const sector = (f) => {
    if (f <= 0) return 'polygon(50% 50%, 50% 50%, 50% 50%)';
    if (f >= 1) return 'none';
    const a = f * Math.PI * 2;
    const at = (t) => `calc(50% + ${(R * Math.sin(t)).toFixed(1)}px) calc(50% - ${(R * Math.cos(t)).toFixed(1)}px)`;
    const pts = ['50% 50%', at(0)];
    for (let t = Math.PI / 4; t < a; t += Math.PI / 4) pts.push(at(t));
    pts.push(at(a));
    return `polygon(${pts.join(', ')})`;
};

// one film's still, wiped in by its sweep and dropped once the next has covered it
// a screen wider than 1280 real pixels (a large or Retina display) shows the stills at full resolution
const SHARP = typeof window !== 'undefined' && window.innerWidth * (window.devicePixelRatio || 1) > 1300;

const Screen = ({ film, j, s, eager, near }) => {
    const clipPath = useTransform(s, (v) => sector(sweepOf(v, j)));
    // drawn only while it's on screen: from its sweep until the next has covered it
    const opacity = useTransform(s, (v) => (v > j + UP && v < j + 1 + GONE ? 1 : 0));
    const still = film.stills?.[0] || film.backdropUrl || film.posterUrl;
    // the full-size still, asked for once the film is near the gate, fading in over the 1280 one when it arrives
    const [asked, setAsked] = useState(false);
    const [sharp, setSharp] = useState(false);
    if (SHARP && near && !asked) setAsked(true);
    return (
        <motion.div style={{ clipPath, opacity }} className="absolute inset-0 bg-[#0a0a0a]">
            {still && <img src={sized(still, 'w1280')} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" className="absolute inset-0 w-full h-full object-cover max-w-none" />}
            {still && asked && (
                <img
                    src={sized(still, 'original')}
                    alt=""
                    decoding="async"
                    onLoad={() => setSharp(true)}
                    className="absolute inset-0 w-full h-full object-cover max-w-none transition-opacity duration-500"
                    style={{ opacity: sharp ? 1 : 0 }}
                />
            )}
        </motion.div>
    );
};

const CanonCountdown = ({ films, of, reducedMotion = false }) => {
    const section = useRef(null);
    // their place in the ten, then ten first, one last
    const reel = [...films].sort((a, b) => a.canonRank - b.canonRank).map((f, i) => ({ ...f, place: i + 1 })).reverse();
    const n = reel.length;

    const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
    const s = useSpring(useTransform(scrollYProgress, (p) => p * n), { stiffness: 220, damping: 38, mass: 0.5 });

    // the leader: up before each sweep, gone after it (on the very first frame it's already there)
    const leader = useTransform(s, (v) => {
        if (v >= n) return 0;
        const t = v - Math.floor(v);
        if (t < UP) return v < UP ? 1 : t / UP;
        if (t <= SWEPT) return 1;
        return Math.max(0, 1 - (t - SWEPT) / (GONE - SWEPT));
    });
    const hand = useTransform(s, (v) => sweepOf(v, Math.min(n - 1, Math.floor(v))) * 360);
    const heading = useTransform(s, [0, 0.15, 0.5], [1, 1, 0]);
    // the flash at the end of the leader, as number one comes in
    const flash = useTransform(s, [n - 1 + SWEPT - 0.04, n - 1 + SWEPT, n - 1 + SWEPT + 0.08], [0, 0.4, 0]);

    // which number the leader counts, and which film is in the gate (only these re-render)
    const [lead, setLead] = useState(0);
    const [shown, setShown] = useState(-1);
    useMotionValueEvent(s, 'change', (v) => {
        const k = Math.min(n - 1, Math.max(0, Math.floor(v)));
        setLead(k);
        setShown(v - k >= SWEPT ? k : k - 1);
    });

    // the stills further down the reel, fetched ahead so each sweep reveals a picture
    useEffect(() => {
        if (reducedMotion) return;
        films.forEach((f) => {
            const still = f.stills?.[0] || f.backdropUrl;
            if (still) new Image().src = sized(still, 'w1280');
        });
    }, [films, reducedMotion]);

    const jump = (j) => {
        const el = section.current;
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + ((j + 0.9) / n) * (el.offsetHeight - window.innerHeight), behavior: 'smooth' });
    };

    if (reducedMotion) {
        return (
            <ol className="max-w-4xl mx-auto px-4 divide-y divide-white/[0.08]">
                {[...reel].reverse().map((f) => (
                    <li key={f._id}>
                        <Link to={`/movie/${f._id}`} className="flex items-baseline gap-6 py-4 hover:bg-white/[0.03]">
                            <span className="font-oswald text-3xl text-[#f6d48f] w-12 text-right">{f.place}</span>
                            <span className="font-serif text-2xl text-white">{f.title}</span>
                            <span className="ml-auto font-label text-[12px] tracking-[0.14em] text-gray-500">{f.year}</span>
                        </Link>
                    </li>
                ))}
            </ol>
        );
    }

    const film = reel[shown];
    const line = film && (citationLine(film.provenance?.[0]) || film.editorial?.hook);

    return (
        // its height is pure CSS, so the page is full height on its first paint (Back lands exactly)
        <section ref={section} style={{ height: `calc(100vh + ${n * STEP_VH}vh)` }} className="relative">
            <div className="sticky top-0 h-screen overflow-hidden bg-[#3b3a37]">
                {/* the screen: each film wiped in over the last */}
                {reel.map((f, j) => <Screen key={f._id} film={f} j={j} s={s} eager={j < 2} near={j >= lead - 1 && j <= lead + 1} />)}
                {/* the vignette, and the dark at the foot for the title — one layer, as every layer over the sweep repaints with it */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.65)_100%),linear-gradient(to_top,rgba(0,0,0,0.95),rgba(0,0,0,0.5)_25%,transparent_60%)]" />

                {/* the leader, dimming the picture beneath it */}
                <motion.div style={{ opacity: leader }} className="absolute inset-0 pointer-events-none bg-black/35">
                    <svg viewBox="-50 -50 100 100" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
                        <g stroke="rgba(255,255,255,0.75)" fill="none" strokeWidth="0.35">
                            <line x1="-500" y1="0" x2="500" y2="0" />
                            <line x1="0" y1="-500" x2="0" y2="500" />
                            <circle r="30" />
                            <circle r="35" strokeWidth="0.6" />
                        </g>
                        <text y="13" textAnchor="middle" className="font-oswald" fontWeight="700" fontSize="38" fill="white" stroke="rgba(0,0,0,0.4)" strokeWidth="0.4">
                            {reel[lead]?.place}
                        </text>
                    </svg>
                    {/* the hand, apart from the dial: turning it moves a layer instead of repainting the screen */}
                    <motion.div style={{ rotate: hand }} className="absolute left-1/2 top-1/2 w-0 h-0">
                        <span className="absolute left-[-1px] bottom-0 w-[2px] h-[150vmax] bg-white/90" />
                    </motion.div>
                </motion.div>
                <motion.div style={{ opacity: flash }} className="absolute inset-0 bg-[#fff8e8] pointer-events-none" />

                {/* the heading, on the opening frame */}
                <motion.div style={{ opacity: heading }} className="absolute inset-x-0 top-[13vh] text-center px-4 pointer-events-none">
                    <div className="font-label text-[12px] tracking-[0.14em] uppercase text-white/70">The canon, counted down · one film per director</div>
                    <h2 className="mt-3 font-serif text-4xl md:text-6xl text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.6)]">The ten films the critics agree on most</h2>
                </motion.div>

                {/* the film in the gate */}
                <div className="absolute left-6 md:left-14 right-6 md:right-[22rem] bottom-10 md:bottom-14">
                    <AnimatePresence mode="wait">
                        {film && (
                            <motion.div key={film._id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
                                {film.place === 1 ? (
                                    <div className="w-fit mb-4 px-3 py-1.5 bg-[#f4ecd8] shadow-[0_0_30px_rgba(255,214,150,0.4)]">
                                        <Letters text="NUMBER ONE" className="block font-oswald font-bold text-lg leading-none tracking-[0.12em] text-[#141110]" />
                                    </div>
                                ) : (
                                    <div className="mb-2 font-oswald text-lg tracking-[0.2em] text-[#f6d48f]">No. {film.place}</div>
                                )}
                                <Link to={`/movie/${film._id}`} className="group inline-flex items-baseline gap-3">
                                    <h3 className="font-serif text-4xl md:text-7xl leading-[1.05] text-white group-hover:opacity-80 transition-opacity">{film.title}</h3>
                                    <MdArrowOutward className="text-2xl text-white/60 group-hover:text-white transition-colors" />
                                </Link>
                                <div className="font-label mt-3 text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gray-300">
                                    {[(film.directors || []).join(' & '), film.year, film.country].filter(Boolean).join('  ·  ')}
                                </div>
                                {line && <p className="mt-3 max-w-2xl font-serif text-lg md:text-xl text-gray-200 leading-snug">{line}</p>}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* the reel, ten to one: where you are, and a way to any of them (on its own dark glass, so a bright still can't drown it) */}
                <nav className="hidden md:flex absolute right-10 bottom-10 w-80 flex-col gap-1.5 px-5 py-4 bg-black/70 ring-1 ring-white/10" aria-label="The ten">
                    {reel.map((f, j) => (
                        <button key={f._id} type="button" onClick={() => jump(j)} className={`group flex items-baseline gap-3 text-left transition-colors ${j === shown ? 'text-[#f6d48f]' : 'text-white/75 hover:text-white'}`}>
                            <span className="w-6 text-right font-oswald text-sm">{f.place}</span>
                            <span className={`h-px self-center transition-all duration-500 ${j === shown ? 'w-8 bg-[#f6d48f]' : 'w-3 bg-white/30'}`} />
                            <span className="font-serif text-[15px] truncate">{f.title}</span>
                        </button>
                    ))}
                    <Link to="/explore" className="mt-4 inline-flex items-center gap-2 font-label text-[12px] tracking-[0.14em] uppercase text-white/60 hover:text-white transition-colors">
                        See all {of}, ranked <MdArrowOutward />
                    </Link>
                </nav>
                {/* on a phone: the reel as ticks */}
                <div className="md:hidden absolute top-20 inset-x-6 flex gap-1.5" aria-hidden="true">
                    {reel.map((f, j) => <span key={f._id} className={`h-[3px] flex-1 transition-colors ${j <= shown ? 'bg-[#f6d48f]' : 'bg-white/20'}`} />)}
                </div>
            </div>
        </section>
    );
};

export default CanonCountdown;
