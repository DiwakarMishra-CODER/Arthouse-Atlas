import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { sized } from '../movements/treatments';
import { useDecoded } from '../about/frames';
import { evidenceWords, factWords } from '../foryou/whyWords';

/**
 * Films like it, as a double bill: this film held on the left, and on the right the film to pair it
 * with, cutting to the next pairing on its own (a frame of black between, the camera creeping in),
 * each with why in plain words: how many of the people who loved this film loved that one too, or
 * what the two share. The bar in the corner is the clock; a hand on it holds the bill. Under it, every
 * pairing as a strip to choose from. Stacked on a phone: this film a band on top, the pairing below.
 */

const STEP = 4800; // ms on each pairing
const REST = 7000; // ms a hand on it holds the bill
const still = (f) => f?.stills?.[0] || f?.backdropUrl || f?.posterUrl || null;

const DoubleBill = ({ film, picks, light, reducedMotion }) => {
    const [at, setAt] = useState(0);
    const [held, setHeld] = useState(false);
    const [seen, setSeen] = useState(false);
    const [ready, want] = useDecoded();
    const block = useRef(null);
    const strip = useRef(null);
    const letGo = useRef(null);
    const swipe = useRef(null);
    const swiped = useRef(false);
    const n = picks.length;
    const pick = picks[at];

    useEffect(() => {
        const el = block.current;
        if (!el) return undefined;
        const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.5 });
        io.observe(el);
        return () => io.disconnect();
    }, []);
    useEffect(() => () => clearTimeout(letGo.current), []);
    useEffect(() => {
        want([pick, picks[(at + 1) % n]].map((f) => (still(f) ? sized(still(f), 'w1280') : null)));
    }, [pick, picks, at, n, want]);
    // the strip follows the bill (sideways only: the page itself never moves)
    useEffect(() => {
        const r = strip.current;
        const el = r?.children[at];
        if (el) r.scrollTo({ left: el.offsetLeft - (r.clientWidth - el.offsetWidth) / 2, behavior: reducedMotion ? 'auto' : 'smooth' });
    }, [at, reducedMotion]);

    const hold = () => {
        setHeld(true);
        clearTimeout(letGo.current);
        letGo.current = setTimeout(() => setHeld(false), REST);
    };
    const go = (k) => { hold(); setAt(((k % n) + n) % n); };
    if (!pick) return null;

    const big = still(pick) ? sized(still(pick), 'w1280') : null;
    const src = big && (ready.has(big) ? big : sized(still(pick), 'w300')); // its strip picture, until the sharp one is ready
    const because = pick.because;
    const why = because
        ? evidenceWords({ film: { title: film.title }, reason: because.reason, together: because.together, shared: because.shared }, { turn: at })
        : 'Close to it in kind: its genres, moods and movement.';
    const fact = because?.reason === 'viewers' ? factWords(because.shared) : null;
    const playing = seen && !held && !reducedMotion;

    return (
        <section className="pt-24 md:pt-32 pb-28">
            <div className="flex items-end justify-between gap-6 mb-8">
                <div>
                    <h2 className="font-serif text-4xl md:text-5xl">Films like it</h2>
                    <p className="mt-2 font-serif italic text-lg text-gray-400">Each one paired with {film.title}, and why.</p>
                </div>
                <Link to={`/explore?like=${film._id}`} className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-300 hover:text-white pb-2 whitespace-nowrap">See them all ›</Link>
            </div>

            <div
                ref={block}
                tabIndex={0}
                aria-label={`Films like ${film.title}. Arrow keys change the film.`}
                onKeyDown={(e) => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (d) { e.preventDefault(); go(at + d); } }}
                className="relative flex flex-col md:flex-row md:h-[min(70svh,620px)] bg-black ring-1 ring-white/[0.08] overflow-hidden select-none"
            >
                {/* this film, held */}
                <div className="relative h-32 md:h-auto md:w-[38%] shrink-0 overflow-hidden">
                    {still(film) && <img src={sized(still(film), 'w1280')} alt="" className="absolute inset-0 w-full h-full object-cover max-w-none" />}
                    <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.85),rgba(0,0,0,0.2)_60%,rgba(0,0,0,0.35))]" />
                    <div className="absolute left-4 md:left-7 bottom-3 md:bottom-7 right-4 [text-shadow:0_1px_10px_rgba(0,0,0,0.9)]">
                        <div className="font-label text-[12px] tracking-[0.18em] uppercase" style={{ color: light }}>If you loved</div>
                        <div className="mt-1 font-serif italic text-xl md:text-3xl leading-tight text-white line-clamp-2">{film.title}</div>
                    </div>
                </div>

                {/* the film to pair it with, cutting to the next */}
                <Link
                    to={`/movie/${pick._id}`}
                    className="group relative aspect-[4/5] sm:aspect-video md:aspect-auto md:flex-1 overflow-hidden touch-pan-y"
                    onPointerDown={(e) => { swipe.current = e.clientX; swiped.current = false; }}
                    onPointerUp={(e) => { const dx = swipe.current == null ? 0 : e.clientX - swipe.current; swipe.current = null; if (Math.abs(dx) > 50) { swiped.current = true; go(at + (dx < 0 ? 1 : -1)); } }}
                    onClick={(e) => { if (swiped.current) e.preventDefault(); }}
                    onDragStart={(e) => e.preventDefault()}
                >
                    {src && <img key={at} src={src} alt="" className="frame-push absolute inset-0 w-full h-full object-cover max-w-none [-webkit-user-drag:none]" />}
                    <span key={`s${at}`} aria-hidden="true" className="shutter absolute inset-0 bg-black" />
                    <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.9),rgba(0,0,0,0.35)_45%,transparent_70%)]" />
                    <div key={`t${at}`} className="subtitle-in absolute left-4 md:left-12 bottom-16 md:bottom-8 right-4 md:right-48 [text-shadow:0_1px_12px_rgba(0,0,0,0.9)]">
                        <div className="font-label text-[12px] tracking-[0.18em] uppercase text-gold">Then see</div>
                        <div className="mt-1 font-serif italic text-2xl md:text-[2.6rem] leading-tight text-white group-hover:text-gold-light line-clamp-2">{pick.title}</div>
                        <div className="mt-1 font-label text-[12px] tracking-[0.14em] uppercase text-gray-300 truncate">{[pick.directors?.join(' & '), pick.year].filter(Boolean).join(' · ')}</div>
                        <p className="mt-3 max-w-xl font-serif text-[1.05rem] md:text-[1.2rem] leading-snug text-gray-100">{why}</p>
                        {fact && <div className="mt-2 font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">{fact}</div>}
                    </div>
                </Link>

                {/* the ampersand at the seam of the bill */}
                <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-32 md:left-[38%] md:top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-black ring-1 ring-gold/70 font-serif italic text-2xl md:text-3xl text-gold shadow-[0_0_30px_rgba(0,0,0,0.8)]">&amp;</span>

                {/* the clock and the hands */}
                <div className="absolute right-3 md:right-6 bottom-3 md:bottom-6 flex flex-col items-end gap-1">
                    <span className="relative block w-20 md:w-28 h-[3px] bg-white/25 overflow-hidden">
                        <span
                            key={at}
                            className="prize-clock absolute inset-0 bg-gold"
                            style={{ '--hold': `${STEP}ms`, animationPlayState: playing ? 'running' : 'paused' }}
                            onAnimationEnd={(e) => { if (e.animationName === 'prize-clock') setAt((a) => (a + 1) % n); }}
                        />
                    </span>
                    <div className="flex items-center">
                        <button type="button" aria-label="The film before" onClick={() => go(at - 1)} className="w-11 h-11 flex items-center justify-center text-gray-200 hover:text-white"><MdChevronLeft size={26} /></button>
                        <span className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-300 tabular-nums">{at + 1} of {n}</span>
                        <button type="button" aria-label="The next film" onClick={() => go(at + 1)} className="w-11 h-11 flex items-center justify-center text-gray-200 hover:text-white"><MdChevronRight size={26} /></button>
                    </div>
                </div>
            </div>

            {/* every pairing, to choose from */}
            <ol ref={strip} aria-label="Films like it" className="mt-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 pt-2 [scrollbar-width:none]">
                {picks.map((f, k) => {
                    const on = k === at;
                    return (
                        <li key={f._id} className="shrink-0 snap-start">
                            <button type="button" aria-pressed={on} onClick={() => go(k)} className={`group block w-[150px] md:w-[184px] text-left transition-[transform,opacity] duration-300 ${on ? '-translate-y-1' : 'opacity-70 hover:opacity-100'}`}>
                                <span className={`relative block aspect-video overflow-hidden bg-[#111] ${on ? 'ring-2 ring-gold' : 'ring-1 ring-white/15'}`}>
                                    {still(f) && <img src={sized(still(f), 'w300')} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover max-w-none" />}
                                </span>
                                <span className={`block mt-1.5 text-[13px] leading-tight line-clamp-1 ${on ? 'text-white' : 'text-gray-300'}`}>{f.title}</span>
                            </button>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
};

export default DoubleBill;
