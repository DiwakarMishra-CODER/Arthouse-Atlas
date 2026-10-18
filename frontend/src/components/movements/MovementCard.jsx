import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { treatmentFor, sized } from './treatments';

/**
 * A movement card. Every card has the same anatomy — still, title, tagline,
 * meta — so the wall reads at a glance. What differs is the content: the
 * movement's own films, which the still cuts through on hover, and its span
 * on a hairline of the century, lit in the movement's accent colour. The full
 * visual treatment lives on the movement's own page.
 *
 * size: 'card' (the wall) · 'wide' (a decade's only movement) · 'teaser' (next reel)
 */
const YEAR_MIN = 1918;
const YEAR_MAX = new Date().getFullYear() + 1;
const pct = (y) => `${((y - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100}%`;

const MovementCard = ({ movement: m, size = 'card', className = '', reducedMotion = false, eager = false }) => {
    const t = treatmentFor(m);
    const [hover, setHover] = useState(false);
    const [armed, setArmed] = useState(false); // fetch the extra stills only once someone shows interest
    const [frame, setFrame] = useState(0);

    const hero = sized(m.heroBackdrop);
    const reel = [hero, ...(m.topFilms || []).map((f) => sized(f.still)).filter((u) => u && u !== hero)].slice(0, 5);
    const cycles = reel.length > 1 && !reducedMotion;

    useEffect(() => {
        if (!hover || !cycles) return undefined;
        const id = setInterval(() => setFrame((f) => (f + 1) % reel.length), 900);
        return () => clearInterval(id);
    }, [hover, cycles, reel.length]);

    const enter = () => { setHover(true); setArmed(true); };
    const leave = () => { setHover(false); setFrame(0); };
    const images = cycles && armed ? reel : [hero];
    const teaser = size === 'teaser';
    const wide = size === 'wide';

    return (
        // the clip lives on an inner layer: an element clipped to nothing never counts as in view
        <motion.div
            initial={reducedMotion ? false : 'hidden'}
            whileInView="shown"
            viewport={{ once: true, margin: '-60px' }}
            variants={{ hidden: { opacity: 0, y: 24 }, shown: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className={className}
        >
            <motion.div
                variants={{ hidden: { clipPath: 'inset(-12px -12px 101% -12px)' }, shown: { clipPath: 'inset(-12px -12px -2% -12px)' } }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
            <Link
                to={`/movements/${m.tag || m._id}`}
                onMouseEnter={enter}
                onMouseLeave={leave}
                onFocus={enter}
                onBlur={leave}
                className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-black"
                aria-label={`${m.title}, ${m.era}, ${m.filmCount} films`}
            >
                {/* still */}
                <div className={`relative overflow-hidden bg-[#0d0d0e] ${wide ? 'aspect-video sm:aspect-[21/9]' : 'aspect-video'}`}>
                    {hero ? images.map((src, i) => (
                        <img
                            key={src}
                            src={src}
                            alt=""
                            loading={eager && i === 0 ? 'eager' : 'lazy'}
                            className="absolute inset-0 w-full h-full object-cover saturate-[0.8] brightness-[0.92] transition-[filter,transform] duration-700 ease-out group-hover:saturate-100 group-hover:brightness-100 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                            style={{ objectPosition: m.heroFocus || '50% 35%', opacity: i === frame ? 1 : 0 }}
                        />
                    )) : <div className="absolute inset-0" style={{ backgroundColor: m.cardColor || '#151515' }} />}

                    {/* start year — keeps the wall legible as a timeline */}
                    <span className="absolute top-3 left-3 font-mono text-xs tracking-wider text-white bg-black/65 backdrop-blur-sm px-2 py-1">
                        {m.startYear}
                    </span>

                    {/* which film is showing, while the reel runs */}
                    {hover && cycles && (m.topFilms || []).length > 0 && (
                        <span className="absolute bottom-3 right-3 font-mono text-[11px] text-white/90 bg-black/65 backdrop-blur-sm px-2 py-1 max-w-[70%] truncate">
                            {(frame === 0 ? m.heroCredit?.title : m.topFilms.filter((f) => sized(f.still) !== hero)[frame - 1]?.title) || ''}
                        </span>
                    )}
                </div>

                {/* its span on the century — the same reel as the timeline above */}
                {teaser ? (
                    <div className="h-[2px] w-12 mt-5 transition-all duration-500 group-hover:w-24" style={{ backgroundColor: t.accent }} />
                ) : (
                    <div className="relative h-[3px] mt-5" aria-hidden="true">
                        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.12]" />
                        <span
                            className="absolute inset-y-0 overflow-hidden opacity-75 transition-opacity duration-500 group-hover:opacity-100"
                            style={{ left: pct(m.startYear), right: `calc(100% - ${pct(m.endYear || YEAR_MAX)})`, minWidth: 3, backgroundColor: t.accent }}
                        >
                            <span className="absolute inset-y-0 -left-8 w-8 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[calc(100%+40rem)] transition-transform duration-[1400ms] ease-in-out motion-reduce:hidden" />
                        </span>
                        {!m.endYear && (
                            <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[7px] h-[7px] rounded-full motion-safe:animate-pulse" style={{ left: pct(YEAR_MAX), backgroundColor: t.accent, boxShadow: `0 0 10px ${t.accent}` }} />
                        )}
                    </div>
                )}

                {/* text */}
                <h3 className={`mt-3 font-serif text-white leading-tight group-hover:text-white/90 ${teaser ? 'text-4xl md:text-5xl' : wide ? 'text-3xl' : 'text-2xl'}`}>
                    {m.title}
                </h3>
                {(m.tagline || m.vibe) && (
                    <p className={`mt-1.5 font-serif italic text-gray-400 ${teaser ? 'text-xl' : 'text-base line-clamp-1'}`}>
                        {m.tagline || m.vibe}
                    </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tracking-[0.18em] uppercase text-gray-400">
                    <span>{m.era}</span>
                    <span aria-hidden="true">·</span>
                    <span>{m.region}</span>
                    <span aria-hidden="true">·</span>
                    <span>{m.filmCount} films</span>
                </div>
            </Link>
            </motion.div>
        </motion.div>
    );
};

export default MovementCard;
