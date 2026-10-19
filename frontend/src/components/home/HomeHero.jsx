import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { animate, motion, useMotionTemplate, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion';
import { MdArrowDownward, MdArrowOutward, MdPlayArrow, MdRefresh } from 'react-icons/md';
import { moviesAPI } from '../../services/api';
import { useMotionPreference } from '../../hooks/useMotionPreference';
import useFilmLight from '../film/useFilmLight';
import { Letters } from '../film/CanonMarquee';
import { ordinal, citationLine } from '../film/canonWords';
import { sized } from '../movements/treatments';
import { createMosaicRenderer } from './mosaicRenderer';

/**
 * The front door: every film in the atlas, then one.
 *
 * The wall of all the films' stills develops out of the dark and drifts; the
 * pointer is a lens that lifts and names the tiles under it. Scroll, and the
 * camera dives into one tile — tonight's film, the same for everyone today,
 * chosen for a reason the screen gives (a director's birthday, a long Sunday) —
 * until it fills the screen and the marquee announces it. "Another film"
 * pulls back out to the wall and dives into the next pick.
 *
 * With reduced motion: a still wall with the title, and tonight's film below it.
 */

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const standingOf = (c) => (!c ? null : c.lead === 'atlas' ? `${ordinal(c.rank)} in the atlas` : `${ordinal(c.decadeRank)} of the ${c.decade}s`);
const EASE = [0.22, 1, 0.36, 1];

const HomeHero = () => {
    const navigate = useNavigate();
    const reducedMotion = useMotionPreference();
    const section = useRef(null);
    const canvas = useRef(null);
    const wall = useRef(null);
    const [index, setIndex] = useState(null);
    const [sprite, setSprite] = useState(null);
    const [film, setFilm] = useState(null);
    const [pick, setPick] = useState(0);
    const [arrived, setArrived] = useState(false);  // the dive has landed: the marquee may play
    const [swapping, setSwapping] = useState(false); // "another film" is pulling back out
    const [finalRect, setFinalRect] = useState(null); // where tonight's tile lands on screen
    const [handed, setHanded] = useState(false);       // the camera has arrived: the image has the picture
    const [handoffReady, setHandoffReady] = useState(null); // film id whose full still is decoded
    const date = useRef(today()).current;

    // the wall: a small sheet to show at once, then a sharp one swapped in when it arrives
    const sharp = useRef(null);
    useEffect(() => {
        let gone = false;
        fetch('/mosaic/mosaic.json').then((r) => r.json()).then((j) => { if (!gone) setIndex(j); }).catch(() => {});
        const small = new Image();
        small.onload = () => {
            if (gone) return;
            setSprite(small);
            const big = new Image();
            big.onload = () => { if (gone) return; sharp.current = big; wall.current?.setSprite(big); };
            big.src = '/mosaic/mosaic-2x.webp';
        };
        small.src = '/mosaic/mosaic-1x.webp';
        return () => { gone = true; };
    }, []);

    // tonight's film
    useEffect(() => {
        moviesAPI.getTonight(date).then((r) => setFilm(r.data)).catch(() => {});
    }, [date]);

    // scroll drives the dive; "another film" can pull it back out independently
    const { scrollYProgress: raw } = useScroll({ target: section, offset: ['start start', 'end end'] });
    // a spring between the scroll and the camera, so a mouse wheel's steps become one glide
    const p = useSpring(raw, { stiffness: 260, damping: 40, mass: 0.5, restDelta: 0.0001 });
    const dive = useTransform(p, [0.08, 0.66], [0, 1], { clamp: true });
    const push = useTransform(p, [0.66, 1], [0, 1], { clamp: true });
    const replay = useMotionValue(1);

    useEffect(() => {
        if (!index || !sprite || !canvas.current) return undefined;
        const r = createMosaicRenderer(canvas.current, {
            sprite,
            index,
            reducedMotion,
            getDive: () => Math.min(dive.get(), replay.get())
        });
        wall.current = r;
        if (sharp.current) r.setSprite(sharp.current); // if the sharp sheet beat the renderer here
        setFinalRect(r.getFinalRect());
        const onResize = () => { r.resize(); setFinalRect(r.getFinalRect()); };
        window.addEventListener('resize', onResize);
        return () => { window.removeEventListener('resize', onResize); r.destroy(); wall.current = null; };
    }, [index, sprite, reducedMotion, dive, replay]);

    useEffect(() => { if (film && wall.current) wall.current.setTarget(film._id); }, [film, index, sprite]);

    useMotionValueEvent(p, 'change', (v) => setArrived(v > 0.68));

    // the hand-off: when the dive completes, an ordinary image over the tile's final rectangle takes
    // the picture from the canvas (which then rests) — same still, same crop, same place
    const checkHanded = () => setHanded(Math.min(dive.get(), replay.get()) >= 0.999);
    useMotionValueEvent(dive, 'change', checkHanded);
    useMotionValueEvent(replay, 'change', checkHanded);
    const imgScale = useTransform(push, [0, 1], [1, 1.06]); // the slow push-in, on the compositor

    // while the wall covers the screen, tell the rest of the page (the starfield pauses, the navbar
    // skips its glass blur) — until the stage starts shrinking away at the end
    useMotionValueEvent(raw, 'change', (v) => {
        const cover = v < 0.92 ? 'home' : '';
        if ((document.documentElement.dataset.cover || '') !== cover) {
            if (cover) document.documentElement.dataset.cover = cover;
            else delete document.documentElement.dataset.cover;
        }
    });
    useEffect(() => {
        if (reducedMotion) return undefined;
        document.documentElement.dataset.cover = 'home';
        return () => { delete document.documentElement.dataset.cover; };
    }, [reducedMotion]);

    // scroll-linked opacities go through templates: framer would otherwise hand them to a native
    // scroll timeline that Chrome times against the whole page, not this section
    const restOpacity = useMotionTemplate`${useTransform(p, [0, 0.1], [1, 0])}`;
    const overlayOpacity = useMotionTemplate`${useTransform(p, [0.64, 0.74], [0, 1])}`;
    const hintOpacity = useMotionTemplate`${useTransform(p, [0, 0.04], [1, 0])}`;
    const restY = useTransform(p, [0, 0.1], [0, -60]);
    const stageScale = useTransform(p, [0.92, 1], [1, 0.9]);
    const stageRadius = useTransform(p, [0.92, 1], [0, 18]);

    const still = film && (film.stills?.[0] || film.backdropUrl);
    const light = useFilmLight(still);

    // the full-resolution still for the hand-off, decoded before it's ever shown
    useEffect(() => {
        if (!still || !film) return undefined;
        let gone = false;
        const img = new Image();
        img.src = sized(still, 'original');
        img.decode().then(() => { if (!gone) setHandoffReady(film._id); }).catch(() => {});
        return () => { gone = true; };
    }, [still, film]);

    // a slow, eased glide down into tonight's film, rather than the browser's quick smooth scroll;
    // any wheel or touch of your own takes over
    const toTonight = () => {
        const el = section.current;
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY + (el.offsetHeight - window.innerHeight) * 0.8;
        const glide = animate(window.scrollY, top, { duration: 3.2, ease: [0.65, 0, 0.35, 1], onUpdate: (y) => window.scrollTo(0, y) });
        const stop = () => { glide.stop(); window.removeEventListener('wheel', stop); window.removeEventListener('touchstart', stop); };
        window.addEventListener('wheel', stop, { passive: true });
        window.addEventListener('touchstart', stop, { passive: true });
        glide.then(stop);
    };

    // the words fade, the camera pulls slowly back to the wall, rests a beat, then dives into the next
    const another = async () => {
        if (swapping) return;
        setSwapping(true);
        const nextFilm = moviesAPI.getTonight(date, pick + 1).catch(() => null);
        await new Promise((r) => setTimeout(r, 450));
        await animate(replay, 0, { duration: 2.1, ease: [0.45, 0, 0.55, 1] });
        const next = await nextFilm;
        if (next) {
            setPick((k) => k + 1);
            setFilm(next.data);
            wall.current?.setTarget(next.data._id);
        }
        await new Promise((r) => setTimeout(r, 350));
        await animate(replay, 1, { duration: 2.8, ease: EASE });
        setSwapping(false);
    };

    const onPointer = (e) => {
        const r = canvas.current.getBoundingClientRect();
        wall.current?.setPointer(e.clientX - r.left, e.clientY - r.top);
    };
    const onClick = () => {
        const t = wall.current?.tileAtPointer();
        if (t && dive.get() === 0) navigate(`/movie/${t.id}`);
    };

    const counts = index?.counts;
    const meta = film && [(film.directors || []).join(' & '), film.year, film.country, film.runtime && `${film.runtime} min`].filter(Boolean).join('  ·  ');

    const restBlock = (
        <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="font-serif font-bold text-[3.4rem] sm:text-7xl md:text-8xl lg:text-[8.5rem] leading-[0.9] tracking-tight text-white [text-shadow:0_6px_60px_rgba(0,0,0,0.9)]">
                Arthouse Atlas
            </h1>
            <p className="mt-6 font-serif italic text-2xl md:text-3xl text-gray-100 [text-shadow:0_2px_24px_rgba(0,0,0,0.9)]">A century of cinema that matters.</p>
            <p className="mt-4 max-w-xl mx-auto text-base md:text-lg text-gray-300 leading-relaxed [text-shadow:0_2px_18px_rgba(0,0,0,0.95)]">
                {counts ? `${counts.films} films` : 'Every film here'}, each placed here by critics' polls, year-end lists and festival juries — not by an algorithm.
            </p>
            {counts && (
                <div className="mt-6 font-mono text-[11px] md:text-xs tracking-[0.3em] uppercase text-[#c5a059]">
                    {counts.films} films · {counts.directors} directors · {counts.movements} movements · {counts.from}–{counts.to}
                </div>
            )}
            <div className="mt-9 flex flex-wrap justify-center gap-3 pointer-events-auto">
                {!reducedMotion && (
                    <button onClick={toTonight} className="group flex items-center gap-2 px-6 py-3.5 bg-[#f4ecd8] text-[#141110] text-xs font-semibold tracking-[0.25em] uppercase shadow-[0_0_40px_rgba(255,214,150,0.35)] hover:shadow-[0_0_60px_rgba(255,214,150,0.6)] transition-shadow">
                        Tonight's film <MdArrowDownward className="text-base group-hover:translate-y-0.5 transition-transform" />
                    </button>
                )}
                <Link to="/explore" className="flex items-center gap-2 px-6 py-3.5 text-xs tracking-[0.25em] uppercase text-gray-100 ring-1 ring-white/30 bg-black/60 hover:ring-white/60 transition-colors">
                    Explore the atlas <MdArrowOutward />
                </Link>
            </div>
        </div>
    );

    const tonightBlock = film && (
        <div className="max-w-3xl">
            <div className="inline-block px-4 py-2 bg-[#f4ecd8] shadow-[inset_0_0_20px_rgba(255,214,150,0.6),0_0_40px_rgba(255,214,150,0.3)]">
                <Letters key={`${film._id}-${arrived}`} text={pick === 0 ? 'TONIGHT' : 'ALSO TONIGHT'} reducedMotion={reducedMotion || !arrived} className="block font-oswald font-bold text-2xl md:text-3xl leading-none tracking-[0.12em] text-[#141110]" />
            </div>
            {film.reason && <p className="mt-3 font-serif italic text-base md:text-lg text-[#f4ecd8]/90 [text-shadow:0_2px_16px_rgba(0,0,0,0.9)]">{film.reason}</p>}
            <h2 className="mt-4 font-serif font-bold text-5xl md:text-7xl leading-[0.95] text-white [text-shadow:0_4px_40px_rgba(0,0,0,0.8)]">{film.title}</h2>
            <div className="mt-4 font-mono text-[11px] md:text-xs tracking-[0.25em] uppercase text-gray-200">{meta}</div>
            {standingOf(film.canon) && (
                <div className="mt-2 font-mono text-[11px] md:text-xs tracking-[0.25em] uppercase" style={{ color: light }}>{standingOf(film.canon)}</div>
            )}
            {/* its hook, or, for a film without one, what the canon says of it */}
            {film.editorial?.hook
                ? <p className="mt-5 max-w-2xl font-serif italic text-xl md:text-2xl leading-snug text-gray-100">{film.editorial.hook}</p>
                : citationLine(film.provenance?.[0]) && <p className="mt-5 max-w-2xl font-serif text-xl md:text-2xl leading-snug text-gray-100">{citationLine(film.provenance[0])}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
                <Link to={`/movie/${film._id}`} className="flex items-center gap-2 px-6 py-3.5 text-xs font-semibold tracking-[0.25em] uppercase" style={{ backgroundColor: light, color: '#0a0a0a', boxShadow: `0 10px 40px ${light}55` }}>
                    Open the film <MdArrowOutward />
                </Link>
                {film.trailerUrl && (
                    <a href={film.trailerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-3.5 text-xs tracking-[0.2em] uppercase text-gray-100 ring-1 ring-white/30 bg-black/60 hover:ring-white/60 transition-colors">
                        <MdPlayArrow className="text-lg" /> Trailer
                    </a>
                )}
                {!reducedMotion && (
                    <button onClick={another} disabled={swapping} className="flex items-center gap-2 px-5 py-3.5 text-xs tracking-[0.2em] uppercase text-gray-100 ring-1 ring-white/30 bg-black/60 hover:ring-white/60 transition-colors disabled:opacity-50">
                        <MdRefresh className={`text-lg ${swapping ? 'animate-spin' : ''}`} /> Another film
                    </button>
                )}
            </div>
        </div>
    );

    // reduced motion: a still wall with the title, then tonight's film as its own block
    if (reducedMotion) {
        return (
            <>
                <section className="relative h-screen min-h-[560px] overflow-hidden">
                    <canvas ref={canvas} className="absolute inset-0 w-full h-full" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,rgba(5,5,5,0.78),rgba(5,5,5,0.35)_75%)]" />
                    <div className="relative h-full flex items-center justify-center">{restBlock}</div>
                </section>
                {film && (
                    <section className="relative max-w-6xl mx-auto px-4 md:px-10 py-20">
                        {still && <img src={sized(still, 'w1280')} alt="" className="w-full aspect-video object-cover ring-1 ring-white/10" />}
                        <div className="mt-10">{tonightBlock}</div>
                    </section>
                )}
            </>
        );
    }

    return (
        <section ref={section} className="relative h-[330vh]">
            <div className="sticky top-0 h-screen overflow-hidden">
                <motion.div className="absolute inset-0 overflow-hidden" style={{ scale: stageScale, borderRadius: stageRadius }}>
                    <canvas
                        ref={canvas}
                        className="absolute inset-0 w-full h-full touch-pan-y"
                        onPointerMove={onPointer}
                        onPointerLeave={() => wall.current?.setPointer(null)}
                        onClick={onClick}
                        aria-label="A wall of every film in the atlas"
                        role="img"
                    />

                    {/* tonight's still at full resolution, exactly over the tile the camera lands on */}
                    {film && still && finalRect && handoffReady === film._id && (
                        <motion.img
                            src={sized(still, 'original')}
                            alt=""
                            aria-hidden="true"
                            className="absolute max-w-none object-cover pointer-events-none"
                            style={{ ...finalRect, scale: imgScale, opacity: handed && !swapping ? 1 : 0 }}
                        />
                    )}

                    {/* the title, over a pool of dark so it reads on the wall */}
                    <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: restOpacity, y: restY }}>
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_48%_46%_at_50%_50%,rgba(5,5,5,0.86),rgba(5,5,5,0.55)_55%,transparent_80%)]" />
                        <div className="relative">{restBlock}</div>
                    </motion.div>

                    {/* tonight's words, once the camera has arrived (the canvas itself carries the picture) */}
                    {film && (
                        <motion.div className={`absolute inset-0 transition-opacity duration-500 ${swapping ? '!opacity-0' : ''} ${arrived ? '' : 'pointer-events-none'}`} style={{ opacity: overlayOpacity }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-transparent" />
                            <div className="absolute left-0 right-0 bottom-0 px-6 md:px-14 pb-14 md:pb-20">{tonightBlock}</div>
                        </motion.div>
                    )}
                </motion.div>

                <motion.div style={{ opacity: hintOpacity }} className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.35em] uppercase text-gray-400 pointer-events-none">
                    Scroll · into tonight's film
                </motion.div>
            </div>
        </section>
    );
};

export default HomeHero;
