import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion';
import { MdSkipNext } from 'react-icons/md';
import { sized } from './treatments';

/**
 * A movement's films on a length of 35mm.
 *
 * The section pins while you scroll and the strip runs sideways through the
 * gate, one frame per film in the order they were made. Like a projector's
 * claw, it pulls one frame at a time and holds it dead centre in the gate,
 * rather than sliding continuously. The frame in the gate
 * plays in the movement's grade; the rest wait in grey. Beneath the strip, the
 * film in the gate is named — year, director, and its one-line hook. "Skip the reel" goes past it.
 */

const SPROCKETS = 'bg-[repeating-linear-gradient(90deg,transparent_0_12px,#000_12px_22px)]';
const EASE = [0.22, 1, 0.36, 1];

const FilmReel = ({ films, treatment: t }) => {
    const section = useRef(null);
    const track = useRef(null);
    const [geo, setGeo] = useState({ step: 0, pad: 0 });
    const [active, setActive] = useState(0);

    // frame pitch, and the lead-in that puts frame 0 in the middle of the strip as rendered (not of the viewport)
    useLayoutEffect(() => {
        const measure = () => {
            const el = track.current;
            if (!el) return;
            const frames = el.querySelectorAll('[data-frame]');
            if (!frames.length) return;
            const fw = frames[0].offsetWidth;
            const step = frames.length > 1 ? frames[1].offsetLeft - frames[0].offsetLeft : fw;
            setGeo({ step, pad: (el.parentElement.clientWidth - fw) / 2 });
        };
        measure();
        const ro = new ResizeObserver(measure);
        if (track.current) ro.observe(track.current.parentElement);
        return () => ro.disconnect();
    }, [films.length]);
    const travel = geo.step * (films.length - 1);

    const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
    // the claw: scroll picks the frame, a stiff spring pulls it into the gate and it holds there
    const pull = useSpring(0, { stiffness: 260, damping: 32, mass: 0.6 });
    useMotionValueEvent(scrollYProgress, 'change', (p) => {
        const i = Math.min(films.length - 1, Math.max(0, Math.round(p * (films.length - 1))));
        setActive(i);
        pull.set(-i * geo.step);
    });
    useLayoutEffect(() => { pull.jump(-active * geo.step); }, [geo.step]); // eslint-disable-line react-hooks/exhaustive-deps
    const x = pull;
    const sprocketX = useTransform(x, (v) => v % 22); // the holes repeat every 22px, so they can loop

    const film = films[active];
    const still = (f) => f && sized(f.stills?.[0] || f.backdropUrl, 'w780');

    // past the reel, to whatever follows it
    const skip = () => {
        const el = section.current;
        if (el) window.scrollTo({ top: el.getBoundingClientRect().bottom + window.scrollY, behavior: 'auto' });
    };

    // vertical scroll spent per frame — enough to linger, not so much it drags
    const height = `calc(100vh + ${Math.round(travel * 0.75)}px)`;

    return (
        <section ref={section} style={{ height }} className="relative">
            <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden">
                {/* the gate: frame lines marking where the film plays */}
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-[min(560px,78vw)] z-20" aria-hidden="true">
                        {['top-[-14px] left-0 border-t border-l', 'top-[-14px] right-0 border-t border-r', 'bottom-[-14px] left-0 border-b border-l', 'bottom-[-14px] right-0 border-b border-r'].map((c) => (
                            <span key={c} className={`absolute w-5 h-5 ${c}`} style={{ borderColor: t.accent }} />
                        ))}
                    </div>

                    {/* the strip */}
                    <div className="relative bg-[#101010] border-y border-white/10 py-[26px]">
                        <motion.div style={{ x: sprocketX }} className="absolute top-[7px] -left-6 -right-6 h-[9px]">
                            <div className={`h-full ${SPROCKETS}`} />
                        </motion.div>
                        <motion.div style={{ x: sprocketX }} className="absolute bottom-[7px] -left-6 -right-6 h-[9px]">
                            <div className={`h-full ${SPROCKETS}`} />
                        </motion.div>

                        <motion.ol ref={track} style={{ x, paddingLeft: geo.pad }} className="flex gap-[14px]">
                            {films.map((f, i) => {
                                const on = i === active;
                                return (
                                    <li key={f._id} data-frame className="relative shrink-0 w-[min(560px,78vw)]">
                                        {/* edge print */}
                                        <div className="absolute -top-[22px] left-1 right-1 flex justify-between font-label text-[12px] tracking-[0.14em] text-gold/60">
                                            <span>{String(i + 1).padStart(2, '0')}A</span>
                                            <span>{f.year}</span>
                                        </div>
                                        <Link
                                            to={`/movie/${f._id}`}
                                            tabIndex={on ? 0 : -1}
                                            aria-label={`${f.title} (${f.year})`}
                                            className="block aspect-video overflow-hidden bg-[#0a0a0a] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                        >
                                            {still(f) ? (
                                                <img
                                                    src={still(f)}
                                                    alt=""
                                                    loading={i < 3 ? 'eager' : 'lazy'}
                                                    className="w-full h-full object-cover transition-[filter,opacity,transform] duration-700"
                                                    style={{
                                                        filter: on ? t.screenFilter : 'grayscale(1) brightness(0.55)',
                                                        opacity: on ? 1 : 0.6,
                                                        transform: on ? 'scale(1)' : 'scale(1.04)'
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center font-serif italic text-gray-500">{f.title}</div>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </motion.ol>
                    </div>
                </div>

                {/* the film in the gate */}
                <div className="relative mx-auto mt-10 w-[min(560px,78vw)] min-h-[9.5rem]">
                    <div className="flex items-center justify-between font-label text-[12px] tracking-[0.14em] text-gray-500 mb-4">
                        <span style={{ color: t.accent }}>{String(active + 1).padStart(2, '0')} / {String(films.length).padStart(2, '0')}</span>
                        <span className="h-px flex-1 mx-4 bg-white/10 relative overflow-hidden">
                            <motion.span className="absolute inset-y-0 left-0 right-0 origin-left" style={{ scaleX: scrollYProgress, backgroundColor: t.accent }} />
                        </span>
                        {/* a long reel (a movement can hold 40 films) is never a wall: past it in one tap */}
                        <button type="button" onClick={skip} className="shrink-0 inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-full bg-black/50 ring-1 ring-gold/60 text-gray-100 uppercase hover:ring-gold-light hover:text-white">
                            Skip the reel <MdSkipNext aria-hidden="true" size={16} className="text-gold-light" />
                        </button>
                    </div>
                    <AnimatePresence mode="wait">
                        {film && (
                            <motion.div
                                key={film._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.3, ease: EASE }}
                            >
                                <Link to={`/movie/${film._id}`} className="group inline-block">
                                    <h3 className="font-serif text-3xl md:text-4xl leading-tight text-white group-hover:opacity-80 transition-opacity">
                                        {film.title}
                                    </h3>
                                </Link>
                                <div className="font-label mt-2 text-[12px] tracking-[0.14em] uppercase text-gray-400">
                                    {[film.year, (film.directors || []).join(', '), film.country, film.runtime && `${film.runtime} min`].filter(Boolean).join('  ·  ')}
                                </div>
                                {film.editorial?.hook && (
                                    <p className="mt-3 font-serif italic text-lg text-gray-300 leading-snug">{film.editorial.hook}</p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
};

export default FilmReel;
