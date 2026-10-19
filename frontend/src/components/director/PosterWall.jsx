import { useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sized } from '../movements/treatments';

/**
 * Their posters, hung on a dark papered wall with one light.
 *
 * The wall is deep-red art-deco paper under low house lights, so every poster
 * reads; a spotlight follows the cursor (and wanders when there isn't one)
 * and warms whatever it falls on. As the wall arrives, each poster's picture
 * lamp comes on in turn, with a flicker. Every poster casts a shadow away from the light, so the shadows
 * swing as it moves. Hover a poster and its picture lamp comes on, and it
 * tilts towards the cursor with glare across the glass.
 *
 * Everything moves through CSS variables set directly on the elements, so the
 * light can run every frame without re-rendering React. Under reduced motion
 * or on touch screens the wall is simply lit.
 */

// a salon hang: small fixed drops so the row never looks ruled
const DROP = [0, 28, 10, 36, 6, 22, 40, 14, 30, 2, 18, 34];

const PosterWall = ({ films, accent, reducedMotion = false }) => {
    const wall = useRef(null);
    const cursor = useRef(false);
    const hung = films.filter((f) => f.posterUrl);

    // each poster's centre, in wall coordinates, for its shadow
    useLayoutEffect(() => {
        const el = wall.current;
        if (!el) return undefined;
        const measure = () => {
            // the light starts mid-wall, in pixels so the shadows can be computed from it
            if (!cursor.current) {
                el.style.setProperty('--mx', `${el.clientWidth / 2}px`);
                el.style.setProperty('--my', `${el.clientHeight * 0.4}px`);
            }
            el.querySelectorAll('[data-poster]').forEach((p) => {
                p.style.setProperty('--cx', `${p.offsetLeft + p.offsetWidth / 2}px`);
                p.style.setProperty('--cy', `${p.offsetTop + p.offsetHeight / 2}px`);
            });
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [hung.length]);

    // the light wanders on its own while it's on screen and no cursor is holding it
    useEffect(() => {
        const el = wall.current;
        if (!el || reducedMotion) return undefined;
        let raf = 0;
        let visible = false;
        const io = new IntersectionObserver(([e]) => {
            visible = e.isIntersecting;
            if (visible) el.classList.add('is-on'); // the lamps come on, once
        }, { threshold: 0.25 });
        io.observe(el);
        const start = performance.now();
        const tick = (t) => {
            if (visible && !cursor.current) {
                const s = (t - start) / 1000;
                const w = el.clientWidth;
                const h = el.clientHeight;
                el.style.setProperty('--mx', `${w * (0.5 + 0.38 * Math.sin(s * 0.31))}px`);
                el.style.setProperty('--my', `${h * (0.45 + 0.28 * Math.sin(s * 0.47 + 1.2))}px`);
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => { cancelAnimationFrame(raf); io.disconnect(); };
    }, [reducedMotion]);

    if (!hung.length) return null;

    const moveLight = (e) => {
        const el = wall.current;
        const r = el.getBoundingClientRect();
        cursor.current = true;
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    // the hovered poster leans towards the cursor; the glare follows it across the glass
    const tilt = (e) => {
        const card = e.currentTarget;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', `${(px - 0.5) * 16}deg`);
        card.style.setProperty('--rx', `${(0.5 - py) * 12}deg`);
        card.style.setProperty('--gx', `${px * 100}%`);
        card.style.setProperty('--gy', `${py * 100}%`);
    };
    const untilt = (e) => {
        e.currentTarget.style.setProperty('--ry', '0deg');
        e.currentTarget.style.setProperty('--rx', '0deg');
    };

    return (
        <div
            ref={wall}
            onMouseMove={moveLight}
            onMouseLeave={() => { cursor.current = false; }}
            className={`poster-wall relative px-4 md:px-10 pt-16 pb-20 overflow-hidden ring-1 ring-white/[0.06] ${reducedMotion ? 'poster-wall-lit' : ''}`}
            style={{ '--spot': accent }}
        >
            <ul className="relative z-10 flex flex-wrap justify-center gap-x-10 md:gap-x-12 gap-y-16">
                {hung.map((f, i) => (
                    <motion.li
                        key={f._id}
                        data-poster
                        className="poster relative w-[38%] sm:w-[9.5rem] md:w-[11rem]"
                        style={{ marginTop: DROP[i % DROP.length], '--i': i }}
                        initial={reducedMotion ? false : { opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.7, delay: (i % 6) * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <Link to={`/movie/${f._id}`} className="group block" onMouseMove={tilt} onMouseLeave={untilt}>
                            {/* the picture lamp, which comes on when you look */}
                            <span aria-hidden="true" className="relative block mx-auto w-16 h-2 rounded-sm bg-gradient-to-b from-[#c9a86a] to-[#7a5f33] shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                                <span className="lamp-cone absolute left-1/2 top-full -translate-x-1/2 w-[150%] h-40 opacity-0 transition-opacity duration-500" />
                            </span>
                            <span className="poster-frame relative mt-3 block aspect-[2/3] transition-transform duration-300 ease-out">
                                <img src={sized(f.posterUrl, 'w342')} alt={`${f.title} poster`} loading="lazy" className="w-full h-full object-cover ring-1 ring-black" />
                                {/* warm wash from the lamp, and glare on the glass */}
                                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#ffd9a0]/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <span aria-hidden="true" className="poster-glare absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </span>
                            {/* the plaque */}
                            <span className="mt-5 block mx-auto max-w-[95%] px-3 py-2 text-center bg-gradient-to-b from-[#3a3125] to-[#241e16] ring-1 ring-[#5b4b33]/60 shadow-[0_6px_14px_rgba(0,0,0,0.6)]">
                                <span className="block font-serif text-[13px] leading-tight text-[#e8d9b5] line-clamp-2">{f.title}</span>
                                <span className="block mt-0.5 font-mono text-[9px] tracking-[0.25em] text-[#b39d73]">{f.year}</span>
                            </span>
                        </Link>
                    </motion.li>
                ))}
            </ul>

            {/* the dark, with one light in it */}
            <div aria-hidden="true" className="poster-wall-dark absolute inset-0 z-20 pointer-events-none" />
        </div>
    );
};

export default PosterWall;
