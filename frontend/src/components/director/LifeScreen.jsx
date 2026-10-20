import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MdArrowOutward } from 'react-icons/md';
import { sized, treatmentFor } from '../movements/treatments';

/**
 * A director's life, run through a projector.
 *
 * A large screen always shows one of their films — the year, the age they
 * were when they made it, the title, and one line about it. Beneath it, the
 * strip: every film as a frame, in order. Beneath that, the life itself, from
 * birth to death, each frame tied by a curve to the year it came from, and
 * their movements as bands. The screen walks through the career on its own
 * until you take over; hover or click a frame to put it on the screen.
 */

const GAP = 10;
const MIN_W = 880;
const CURVES = 84;
const HOLD = 6500; // ms each film stays on the screen while it plays by itself
const EASE = [0.22, 1, 0.36, 1];

const yearOf = (d) => (d ? parseInt(String(d).slice(0, 4), 10) || null : null);
const strongest = (f) => [...(f.provenance || [])].sort((a, b) => (b.weight || 0) - (a.weight || 0))[0];
const stillOf = (f) => f.stills?.[0] || f.backdropUrl || f.posterUrl;

// one line for every film: its hook if written, else what the canon says, else the facts
const lineFor = (f) => {
    if (f.editorial?.hook) return { text: f.editorial.hook, italic: true };
    const best = strongest(f);
    if (best) return { text: `${best.label} ${best.detail || ''}`.trim(), italic: false };
    return { text: [f.country, f.runtime && `${f.runtime} min`].filter(Boolean).join(' · '), italic: false };
};

const LifeScreen = ({ director, films, movements, accent, reducedMotion = false }) => {
    const ref = useRef(null);
    const [w, setW] = useState(1100);
    const [active, setActive] = useState(0);
    const [manual, setManual] = useState(false); // once you take over, it stops playing by itself
    const now = new Date().getFullYear();

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const ro = new ResizeObserver(([e]) => setW(Math.max(MIN_W, Math.floor(e.contentRect.width))));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const dated = useMemo(() => films.filter((f) => f.year), [films]);
    const born = yearOf(director.birthDate);
    const died = yearOf(director.deathDate);
    const y0 = born || Math.min(...dated.map((f) => f.year)) - 30;
    const y1 = died || now;
    const x = (y) => 6 + ((y - y0) / Math.max(1, y1 - y0)) * (w - 12);

    // plays through the career by itself until someone picks a film
    useEffect(() => {
        if (manual || reducedMotion || dated.length < 2) return undefined;
        const id = setTimeout(() => setActive((i) => (i + 1) % dated.length), HOLD);
        return () => clearTimeout(id);
    }, [active, manual, reducedMotion, dated.length]);
    const pick = (i) => { setManual(true); setActive(i); };

    // frames as wide as fit in one row, each as near its own year as the others allow
    const n = Math.max(1, dated.length);
    const fw = Math.max(60, Math.min(132, (w - (n - 1) * GAP) / n));
    const fh = Math.round((fw * 9) / 16);
    const placed = useMemo(() => {
        const left = dated.map((f) => Math.min(w - fw, Math.max(0, x(f.year) - fw / 2)));
        for (let i = 1; i < left.length; i++) left[i] = Math.max(left[i], left[i - 1] + fw + GAP);
        for (let i = left.length - 1; i >= 0; i--) left[i] = Math.min(left[i], i === left.length - 1 ? w - fw : left[i + 1] - fw - GAP);
        return dated.map((f, i) => ({ f, left: Math.max(0, left[i]) }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dated, w, fw, y0, y1]);

    const lineY = fh + CURVES;
    const bandsTop = lineY + 58;
    const height = bandsTop + movements.length * 24 + 8;
    const decades = [];
    for (let d = Math.ceil(y0 / 10) * 10; d <= y1; d += 10) decades.push(d);

    const film = dated[active];
    if (!film) return null;
    const line = lineFor(film);
    const age = born ? film.year - born : null;

    return (
        <div>
            {/* ===== the screen ===== */}
            <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-black ring-1 ring-white/10 shadow-[0_50px_120px_rgba(0,0,0,0.8)]">
                <AnimatePresence initial={false}>
                    <motion.div
                        key={film._id}
                        className="absolute inset-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.1, ease: 'easeInOut' }}
                    >
                        <motion.img
                            src={sized(stillOf(film), 'w1280')}
                            alt=""
                            className="w-full h-full object-cover"
                            initial={{ scale: reducedMotion ? 1 : 1.12 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: HOLD / 1000 + 1.5, ease: 'linear' }}
                        />
                    </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />

                {/* the age, set huge into the frame */}
                {age != null && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={film._id}
                            className="absolute top-4 right-5 md:top-6 md:right-8 text-right pointer-events-none"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6, ease: EASE }}
                        >
                            <div className="font-label text-[12px] tracking-[0.14em] uppercase text-white/60">Age when made</div>
                            <div className="font-serif font-bold leading-none text-[4.5rem] md:text-[8rem] text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.75)]">{age}</div>
                        </motion.div>
                    </AnimatePresence>
                )}

                <AnimatePresence mode="wait">
                    <motion.div
                        key={film._id}
                        className="absolute left-5 right-5 bottom-5 md:left-10 md:bottom-9 md:right-1/3"
                        initial="hidden"
                        animate="shown"
                        exit={{ opacity: 0, transition: { duration: 0.25 } }}
                        variants={{ shown: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } } }}
                    >
                        {[
                            <div key="k" className="font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase" style={{ color: accent }}>
                                {film.year}  ·  film {active + 1} of {dated.length}
                            </div>,
                            <Link key="t" to={`/movie/${film._id}`} className="group mt-2 inline-flex items-baseline gap-3 font-serif text-3xl md:text-6xl leading-[1.02] text-white">
                                {film.title}
                                <MdArrowOutward className="text-xl md:text-3xl opacity-50 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                            </Link>,
                            line.text ? <p key="l" className={`mt-3 max-w-2xl text-base md:text-lg text-gray-200 ${line.italic ? 'font-serif italic' : 'font-label text-xs md:text-sm tracking-[0.14em] uppercase text-gray-300'}`}>{line.text}</p> : null
                        ].filter(Boolean).map((el) => (
                            <motion.div key={el.key} variants={{ hidden: { opacity: 0, y: 14 }, shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}>
                                {el}
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>

                {/* how long until the next film, while it plays by itself */}
                {!manual && !reducedMotion && dated.length > 1 && (
                    <motion.span
                        key={`timer-${active}`}
                        className="absolute left-0 bottom-0 h-[2px] origin-left"
                        style={{ backgroundColor: accent, width: '100%' }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: HOLD / 1000, ease: 'linear' }}
                    />
                )}
            </div>

            {/* ===== the strip, and the life it came from ===== */}
            <div ref={ref} className="mt-8 overflow-x-auto overflow-y-hidden -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:thin]">
                <div className="relative" style={{ width: w, height }}>
                    <svg className="absolute inset-0 pointer-events-none overflow-visible" width={w} height={lineY} aria-hidden="true">
                        {placed.map(({ f, left }, i) => {
                            const fx = left + fw / 2;
                            const tx = x(f.year);
                            const mid = fh + CURVES * 0.55;
                            const on = i === active;
                            return (
                                <g key={f._id}>
                                    <motion.path
                                        d={`M ${fx} ${fh + 4} C ${fx} ${mid}, ${tx} ${mid}, ${tx} ${lineY}`}
                                        fill="none"
                                        stroke={on ? accent : 'rgba(255,255,255,0.18)'}
                                        strokeWidth={on ? 2 : 1}
                                        style={{ transition: 'stroke 0.4s' }}
                                        initial={reducedMotion ? false : { pathLength: 0 }}
                                        whileInView={{ pathLength: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.8, delay: 0.3 + i * 0.05, ease: EASE }}
                                    />
                                    <circle cx={tx} cy={lineY} r={on ? 4.5 : 2.5} fill={on ? accent : 'rgba(255,255,255,0.7)'} style={{ transition: 'r 0.3s' }} />
                                </g>
                            );
                        })}
                    </svg>

                    {/* the frames */}
                    {placed.map(({ f, left }, i) => {
                        const on = i === active;
                        return (
                            <button
                                key={f._id}
                                onMouseEnter={() => pick(i)}
                                onFocus={() => pick(i)}
                                onClick={() => pick(i)}
                                aria-label={`${f.title} (${f.year})`}
                                aria-pressed={on}
                                className="absolute top-1 overflow-hidden bg-[#111] transition-[transform,box-shadow] duration-300 focus:outline-none"
                                style={{
                                    left,
                                    width: fw,
                                    height: fh,
                                    transform: on ? 'translateY(-4px)' : undefined,
                                    boxShadow: on ? `0 0 0 2px ${accent}, 0 10px 30px ${accent}55` : '0 0 0 1px rgba(255,255,255,0.14)'
                                }}
                            >
                                <img src={sized(stillOf(f), 'w300')} alt="" loading="lazy" className={`w-full h-full object-cover transition-[filter] duration-500 ${on ? '' : 'grayscale brightness-[0.7] hover:brightness-100'}`} />
                            </button>
                        );
                    })}

                    {/* the life */}
                    <motion.div
                        className="absolute h-px origin-left bg-white/35"
                        style={{ top: lineY, left: x(y0), width: x(y1) - x(y0) }}
                        initial={reducedMotion ? false : { scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.6, ease: EASE }}
                    />
                    {decades.map((d) => (
                        <div key={d} className="absolute" style={{ left: x(d), top: lineY - 3 }}>
                            <span className="absolute w-px h-1.5 bg-white/30" />
                            <span className="absolute top-3 -translate-x-1/2 font-label text-[12px] text-gray-500">{d}</span>
                        </div>
                    ))}
                    <span className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" style={{ left: x(y0), top: lineY }} />
                    <span className="absolute font-label text-[12px] tracking-[0.14em] uppercase text-gray-400" style={{ left: x(y0), top: lineY + 30 }}>{born ? `Born ${born}` : ''}</span>
                    {died ? (
                        <span className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white" style={{ left: x(y1), top: lineY }} />
                    ) : (
                        <span className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full motion-safe:animate-pulse" style={{ left: x(y1), top: lineY, backgroundColor: accent, boxShadow: `0 0 12px ${accent}` }} />
                    )}
                    <span className="absolute -translate-x-full font-label text-[12px] tracking-[0.14em] uppercase text-gray-400 whitespace-nowrap" style={{ left: x(y1), top: lineY + 30 }}>{died ? `Died ${died}` : 'Still working'}</span>

                    {/* their movements, beneath the life */}
                    {movements.map((m, i) => {
                        const a = Math.max(y0, m.startYear);
                        const b = Math.min(y1, m.endYear || now);
                        if (b < a) return null;
                        const t = treatmentFor(m);
                        return (
                            <Link key={m._id} to={`/movements/${m.tag || m._id}`} className="group absolute flex items-center" style={{ left: x(a), top: bandsTop + i * 24 }}>
                                <span className="h-[6px] group-hover:brightness-125 transition-[filter]" style={{ width: Math.max(8, x(b) - x(a)), backgroundColor: t.accent, backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 5px, rgba(0,0,0,0.5) 5px 7px)' }} />
                                <span className="ml-3 whitespace-nowrap font-serif text-sm text-gray-300 group-hover:text-white transition-colors">{m.title}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default LifeScreen;
