import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { treatmentFor, sized } from './treatments';

/**
 * A movement card. Every card has the same anatomy — still, title, tagline,
 * meta — so the wall reads at a glance. What differs is the content: the
 * movement's own films, which the still cuts through on hover, and a single
 * hairline in the movement's accent colour. The full visual treatment lives
 * on the movement's own page.
 */
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

    return (
        <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            className={className}
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
                <div className="relative aspect-video overflow-hidden bg-[#0d0d0e]">
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

                {/* the movement's accent */}
                <div className="h-[2px] w-12 mt-5 transition-all duration-500 group-hover:w-24" style={{ backgroundColor: t.accent }} />

                {/* text */}
                <h3 className={`mt-3 font-serif text-white leading-tight group-hover:text-white/90 ${teaser ? 'text-4xl md:text-5xl' : 'text-2xl'}`}>
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
    );
};

export default MovementCard;
