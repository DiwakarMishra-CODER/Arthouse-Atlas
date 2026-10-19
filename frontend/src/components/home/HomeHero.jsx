import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { animate, motion, useMotionTemplate, useMotionValue, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import { MdArrowDownward, MdArrowOutward, MdPlayArrow, MdRefresh } from 'react-icons/md';
import { moviesAPI } from '../../services/api';
import { useMotionPreference } from '../../hooks/useMotionPreference';
import useFilmLight from '../film/useFilmLight';
import { Letters } from '../film/CanonMarquee';
import { sized } from '../movements/treatments';
import { createMosaicRenderer } from './mosaicRenderer';

/**
 * The front door: every film in the atlas, then one.
 *
 * The wall of all the films' stills develops out of the dark and drifts; the
 * pointer is a lens that lifts and names the tiles under it. Scroll, and the
 * camera dives into one tile — tonight's film, the same for everyone today —
 * until it fills the screen and the marquee announces it. "Another film"
 * pulls back out to the wall and dives into the next pick.
 *
 * With reduced motion: a still wall with the title, and tonight's film below it.
 */

const ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
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
    const date = useRef(today()).current;

    // the wall: one sprite sheet and its index
    useEffect(() => {
        let gone = false;
        fetch('/mosaic/mosaic.json').then((r) => r.json()).then((j) => { if (!gone) setIndex(j); }).catch(() => {});
        const img = new Image();
        img.onload = () => { if (!gone) setSprite(img); };
        img.src = '/mosaic/mosaic.jpg';
        return () => { gone = true; };
    }, []);

    // tonight's film
    useEffect(() => {
        moviesAPI.getTonight(date).then((r) => setFilm(r.data)).catch(() => {});
    }, [date]);

    // scroll drives the dive; "another film" can pull it back out independently
    const { scrollYProgress: p } = useScroll({ target: section, offset: ['start start', 'end end'] });
    const dive = useTransform(p, [0.08, 0.66], [0, 1], { clamp: true });
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
        const onResize = () => r.resize();
        window.addEventListener('resize', onResize);
        return () => { window.removeEventListener('resize', onResize); r.destroy(); wall.current = null; };
    }, [index, sprite, reducedMotion, dive, replay]);

    useEffect(() => { if (film && wall.current) wall.current.setTarget(film._id); }, [film, index, sprite]);

    useMotionValueEvent(p, 'change', (v) => setArrived(v > 0.7));

    // scroll-linked opacities go through templates: framer would otherwise hand them to a native
    // scroll timeline that Chrome times against the whole page, not this section
    const restOpacity = useMotionTemplate`${useTransform(p, [0, 0.1], [1, 0])}`;
    const stillOpacity = useMotionTemplate`${useTransform(p, [0.48, 0.6], [0, 1])}`;
    const hintOpacity = useMotionTemplate`${useTransform(p, [0, 0.04], [1, 0])}`;
    const restY = useTransform(p, [0, 0.1], [0, -60]);
    const stillScale = useTransform(p, [0.62, 1], [1.08, 1]);
    const stageScale = useTransform(p, [0.92, 1], [1, 0.9]);
    const stageRadius = useTransform(p, [0.92, 1], [0, 18]);

    const still = film && (film.stills?.[0] || film.backdropUrl);
    const light = useFilmLight(still);

    const toTonight = () => {
        const el = section.current;
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + (el.offsetHeight - window.innerHeight) * 0.8, behavior: 'smooth' });
    };

    const another = async () => {
        if (swapping) return;
        setSwapping(true);
        await animate(replay, 0, { duration: 1.1, ease: [0.4, 0, 0.2, 1] });
        try {
            const next = await moviesAPI.getTonight(date, pick + 1);
            setPick((k) => k + 1);
            setFilm(next.data);
            wall.current?.setTarget(next.data._id);
        } catch { /* stay with tonight's film */ }
        await animate(replay, 1, { duration: 1.7, ease: EASE });
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
                <Link to="/explore" className="flex items-center gap-2 px-6 py-3.5 text-xs tracking-[0.25em] uppercase text-gray-100 ring-1 ring-white/30 bg-black/40 backdrop-blur-sm hover:ring-white/60 transition-colors">
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
            <h2 className="mt-5 font-serif font-bold text-5xl md:text-7xl leading-[0.95] text-white [text-shadow:0_4px_40px_rgba(0,0,0,0.8)]">{film.title}</h2>
            <div className="mt-4 font-mono text-[11px] md:text-xs tracking-[0.25em] uppercase text-gray-200">{meta}</div>
            {standingOf(film.canon) && (
                <div className="mt-2 font-mono text-[11px] md:text-xs tracking-[0.25em] uppercase" style={{ color: light }}>{standingOf(film.canon)}</div>
            )}
            {film.editorial?.hook && <p className="mt-5 max-w-2xl font-serif italic text-xl md:text-2xl leading-snug text-gray-100">{film.editorial.hook}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
                <Link to={`/movie/${film._id}`} className="flex items-center gap-2 px-6 py-3.5 text-xs font-semibold tracking-[0.25em] uppercase" style={{ backgroundColor: light, color: '#0a0a0a', boxShadow: `0 10px 40px ${light}55` }}>
                    Open the film <MdArrowOutward />
                </Link>
                {film.trailerUrl && (
                    <a href={film.trailerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-3.5 text-xs tracking-[0.2em] uppercase text-gray-100 ring-1 ring-white/30 bg-black/40 backdrop-blur-md hover:ring-white/60 transition-colors">
                        <MdPlayArrow className="text-lg" /> Trailer
                    </a>
                )}
                {!reducedMotion && (
                    <button onClick={another} disabled={swapping} className="flex items-center gap-2 px-5 py-3.5 text-xs tracking-[0.2em] uppercase text-gray-100 ring-1 ring-white/30 bg-black/40 backdrop-blur-md hover:ring-white/60 transition-colors disabled:opacity-50">
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

                    {/* the title, over a pool of dark so it reads on the wall */}
                    <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: restOpacity, y: restY }}>
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_48%_46%_at_50%_50%,rgba(5,5,5,0.86),rgba(5,5,5,0.55)_55%,transparent_80%)]" />
                        <div className="relative">{restBlock}</div>
                    </motion.div>

                    {/* tonight's film, at full resolution once the camera arrives */}
                    {film && (
                        <motion.div className={`absolute inset-0 transition-opacity duration-500 ${swapping ? '!opacity-0' : ''} ${arrived ? '' : 'pointer-events-none'}`} style={{ opacity: stillOpacity }}>
                            {still && <motion.img key={film._id} src={sized(still, 'original')} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ scale: stillScale }} />}
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
