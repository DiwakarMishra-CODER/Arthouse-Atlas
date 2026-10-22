import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useNavigationType } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MdArrowBack, MdPause, MdPlayArrow } from 'react-icons/md';
import { moviesAPI } from '../../services/api';
import { useMotionPreference } from '../../hooks/useMotionPreference';
import { createAtlasRenderer } from './atlasRenderer';
import { buildAtlasModel } from './atlasModel';
import { stillSrc } from '../movements/treatments';

/**
 * A century of cinema, around the world — the earth at night.
 *
 * Every country the atlas has films from carries warm lights, like a city seen
 * from orbit. The years run from 1920 to now (by themselves while the map is on
 * screen, or under your hand on the slider), and a country's lights come up
 * while its cinema is happening. On wide screens the heading, the earth and the
 * years make one screen — the controls laid on the empty ocean at the map's
 * foot, so the first look shows it plays. "Now showing", under it, lists the
 * films of the moment.
 *
 * Click a country and the camera flies into it: its films become lights across
 * the land, one per film, and a panel lists them all. Hover a light or a line
 * of the list to find one in the other; click either to open the film. Click
 * the sea or "The whole world" to fly back out.
 */

const FROM = 1920;
const TO = new Date().getFullYear();
const SPEED = 3.2;      // years per second while it plays
const WINDOW = 4.5;     // the same "happening" window the map lights by
const STATE_KEY = 'home:atlas'; // where you were on the map, for coming back to it

// on coming back with the Back button, the map picks up where you left it
const remembered = (navigation) => {
    if (navigation !== 'POP') return null;
    try { return JSON.parse(sessionStorage.getItem(STATE_KEY)); } catch { return null; }
};

const AtlasMap = ({ heading = null }) => {
    const navigate = useNavigate();
    const navigation = useNavigationType();
    const [back] = useState(() => remembered(navigation));
    const reducedMotion = useMotionPreference();
    const box = useRef(null);
    const canvas = useRef(null);
    const map = useRef(null);
    const controls = useRef(null);
    const slider = useRef(null);
    const year = useRef(back?.year ?? 1948);
    const [assets, setAssets] = useState(null);   // { topo, regions }
    const [films, setFilms] = useState(null);
    const [playing, setPlaying] = useState(back ? back.playing : !reducedMotion);
    const [status, setStatus] = useState({ year: back?.year ?? 1948 });
    const [hovered, setHovered] = useState(null);
    const hoverKey = useRef(null);    // the same, as the map last drew it, for a tap to read at once
    const touching = useRef(false);   // the last press on the map was a finger (or pen), not a mouse
    const [selected, setSelected] = useState(back?.selected ?? null);
    const [filmCard, setFilmCard] = useState(null);   // the film light under the pointer, and where
    // the years hold still while you're choosing from "Now showing", so a film can't change under your hand
    const [held, setHeld] = useState(false);
    const holding = useRef(false);
    const release = useRef(0);
    const mouseIn = useRef(false);

    useEffect(() => {
        let gone = false;
        const json = (u) => fetch(u).then((r) => r.json());
        Promise.all([json('/atlas/countries.json'), json('/atlas/regions.json')])
            .then(([topo, regions]) => { if (!gone) setAssets({ topo, regions }); })
            .catch(() => {});
        moviesAPI.getAtlasFilms().then((r) => { if (!gone) setFilms(r.data); }).catch(() => {});
        return () => { gone = true; };
    }, []);

    // which country holds which films: plain data, shared with the renderer
    const model = useMemo(() => (assets && films
        ? buildAtlasModel(films, assets.regions, assets.topo.objects.countries.geometries.map((g) => g.properties.name))
        : null), [assets, films]);

    useEffect(() => {
        if (!assets || !model || !canvas.current) return undefined;
        const r = createAtlasRenderer(canvas.current, {
            ...assets,
            model,
            getYear: () => year.current,
            // on wide screens the controls lie over the map's foot: the world keeps clear of the slider,
            // a country of all of them
            room: () => (window.matchMedia('(min-width: 768px)').matches
                ? { world: (slider.current?.offsetHeight || 0) + 10, country: (controls.current?.offsetHeight || 0) + 16 }
                : { world: 0, country: 0 }),
            onStatus: setStatus,
            onHover: (k) => { hoverKey.current = k; setHovered(k); },
            // the canvas's width travels with the card, for keeping it on screen
            onFilmHover: (hit) => setFilmCard(hit ? { ...hit, cw: canvas.current?.clientWidth || 0 } : null)
        });
        map.current = r;
        // a country that was open when you left is open again, without the flight
        if (back?.selected) r.setSelected(back.selected, { instant: true });
        const onResize = () => r.resize();
        window.addEventListener('resize', onResize);
        return () => { window.removeEventListener('resize', onResize); r.destroy(); map.current = null; };
    }, [assets, model, back]);

    useEffect(() => { map.current?.setSelected(selected); }, [selected]);

    // remember where you are on the map, so the Back button returns you to it
    useEffect(() => {
        const save = () => sessionStorage.setItem(STATE_KEY, JSON.stringify({ selected, year: Math.round(year.current), playing }));
        save();
        const id = setInterval(save, 1000); // the year keeps moving while it plays
        return () => { clearInterval(id); save(); };
    }, [selected, playing]);

    // the years play forward while the map is on screen, and loop
    useEffect(() => {
        if (!playing) return undefined;
        let raf = 0;
        let last = performance.now();
        let onScreen = false;
        const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { threshold: 0.3 });
        if (box.current) io.observe(box.current);
        const tick = (now) => {
            raf = requestAnimationFrame(tick);
            const dt = Math.min(0.1, (now - last) / 1000);
            last = now;
            if (!onScreen || holding.current) return;
            year.current += SPEED * dt;
            if (year.current > TO + 2) year.current = FROM;
        };
        raf = requestAnimationFrame(tick);
        return () => { cancelAnimationFrame(raf); io.disconnect(); };
    }, [playing]);

    // hold now; let go now, or a little later (a touch has no pointer resting on the card to keep holding)
    const hold = (on, after = 0) => {
        clearTimeout(release.current);
        const set = () => { holding.current = on; setHeld(on); };
        if (on || !after) set();
        else release.current = setTimeout(set, after);
    };
    useEffect(() => () => clearTimeout(release.current), []);
    const touchHold = (e) => { if (e.pointerType !== 'mouse') { hold(true); hold(false, 4000); } };

    const onSlide = (e) => {
        setPlaying(false);
        year.current = Number(e.target.value);
        setStatus((s) => ({ ...s, year: Math.round(year.current) }));
    };
    const onPointer = (e) => {
        const r = canvas.current.getBoundingClientRect();
        map.current?.setPointer(e.clientX - r.left, e.clientY - r.top);
    };
    const letGo = () => { map.current?.setPointer(null); setFilmCard(null); };
    // a finger has no hover: it marks its point as it presses, and keeps it (lifting a finger leaves the
    // map at once) until the tap has been read
    const onPointerDown = (e) => {
        touching.current = e.pointerType !== 'mouse';
        if (touching.current) onPointer(e);
    };
    // a film opens; a country flies in; the sea, from inside a country, flies back out
    const onClick = () => {
        const act = () => {
            const film = map.current?.filmAtPointer();
            if (film) return navigate(`/movie/${film.id}`);
            if (hoverKey.current) return setSelected(hoverKey.current);
            if (selected) return setSelected(null);
            return null;
        };
        if (!touching.current) return act();
        // the map finds what's under the finger as it draws: read it a frame or two on
        requestAnimationFrame(() => requestAnimationFrame(() => { act(); letGo(); }));
        return null;
    };

    const label = (key) => model?.labelFor(key) || '';
    // the map's own name for a place, shortened for running text
    const shortName = (key) => ({ 'United States of America': 'the United States', 'United Kingdom': 'the United Kingdom', 'Bosnia and Herz.': 'Bosnia' }[key] || (key || '').replace(/^point:/, ''));
    const y = status.year;

    // the films of the moment, worldwide
    const strip = useMemo(() => (films || [])
        .filter((f) => Math.abs(f.y - y) < WINDOW)
        .sort((a, b) => a.y - b.y || (a.r ?? 9999) - (b.r ?? 9999)), [films, y]);
    // the open country's films, all of them, in order
    const countryFilms = selected && model ? model.filmsFor(selected) : [];

    const hoverCount = hovered && model ? model.filmsFor(hovered) : [];
    const hoverNow = hoverCount.filter((f) => Math.abs(f.y - y) < WINDOW).length;

    return (
        <div ref={box}>
            {/* the first look — heading, earth, years — fills one screen on wide screens */}
            <div className="md:h-[100svh] md:min-h-[560px] md:max-h-[1100px] md:pt-20 md:pb-4 flex flex-col">
                {heading}
                <div className="relative md:flex-1 md:min-h-0">
                    {/* the earth, its edges dissolving into the page rather than boxed */}
                    <div className="relative w-full aspect-[2/1] min-h-[260px] md:aspect-auto md:h-full md:min-h-0 [mask-image:radial-gradient(ellipse_75%_75%_at_50%_50%,#000_70%,transparent_100%)]">
                        <canvas
                            ref={canvas}
                            className="absolute inset-0 w-full h-full"
                            onPointerMove={onPointer}
                            onPointerDown={onPointerDown}
                            onPointerLeave={(e) => { if (e.pointerType === 'mouse') letGo(); }}
                            onPointerCancel={letGo}
                            onClick={onClick}
                            role="img"
                            aria-label="A world map at night, each country's lights coming up while its cinema happens"
                        />
                    </div>

                    {/* the film light under the pointer */}
                    {filmCard && (
                        <div
                            className="absolute z-20 w-56 pointer-events-none bg-[#0b0b0c]/95 ring-1 ring-[#f6d48f]/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                            style={{ left: Math.min(filmCard.x + 18, filmCard.cw - 236), top: Math.max(0, filmCard.y - 70) }}
                        >
                            {filmCard.film.s && <img src={stillSrc(filmCard.film.s)} alt="" className="w-full aspect-video object-cover" />}
                            <div className="px-3 py-2.5">
                                <div className="font-serif text-white leading-tight">{filmCard.film.t}</div>
                                <div className="mt-1 font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">{[filmCard.film.d, filmCard.film.y].filter(Boolean).join(' · ')}</div>
                            </div>
                        </div>
                    )}

                    {/* the open country: all its films, beside it on wide screens */}
                    <AnimatePresence>
                        {selected && (
                            <motion.aside
                                key={selected}
                                className="md:absolute md:inset-y-0 md:right-0 md:w-[40%] mt-4 md:mt-0 flex flex-col md:pl-10 md:bg-gradient-to-l md:from-[#050505] md:via-[#050505]/95 md:to-transparent"
                                initial={reducedMotion ? false : { opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
                                transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <button onClick={() => setSelected(null)} className="self-start flex items-center gap-2 font-label text-[12px] tracking-[0.14em] uppercase text-gray-400 hover:text-white transition-colors">
                                    <MdArrowBack /> The whole world
                                </button>
                                <h3 className="mt-4 font-serif text-3xl md:text-4xl text-white leading-tight">{label(selected)}</h3>
                                <div className="mt-1 font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">
                                    {countryFilms.length} {countryFilms.length === 1 ? 'film' : 'films'}{countryFilms.length ? ` · ${countryFilms[0].y}–${countryFilms[countryFilms.length - 1].y}` : ''}
                                </div>
                                <ol className="mt-5 flex-1 min-h-0 max-h-80 md:max-h-none overflow-y-auto pr-2 [scrollbar-width:thin]" onMouseLeave={() => map.current?.setFilmHighlight(null)}>
                                    {countryFilms.map((f) => {
                                        const now = Math.abs(f.y - y) < WINDOW;
                                        return (
                                            <li key={f.id}>
                                                <button
                                                    onClick={() => navigate(`/movie/${f.id}`)}
                                                    onMouseEnter={() => map.current?.setFilmHighlight(f.id)}
                                                    onFocus={() => map.current?.setFilmHighlight(f.id)}
                                                    className="group w-full flex items-baseline gap-4 py-2 text-left border-b border-white/[0.06]"
                                                >
                                                    <span className={`font-label text-[12px] tabular-nums w-10 shrink-0 ${now ? 'text-[#f6d48f]' : 'text-gray-600'}`}>{f.y}</span>
                                                    <span className={`font-serif leading-snug transition-colors ${now ? 'text-white' : 'text-gray-400'} group-hover:text-[#f6d48f]`}>{f.t}</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </motion.aside>
                        )}
                    </AnimatePresence>

                    {/* the country under the pointer, named in the map's empty corner (under it on a phone) */}
                    <div className="mt-1 md:mt-0 md:absolute md:left-0 md:top-0 md:pointer-events-none min-h-[1.25rem] font-label text-[12px] tracking-[0.14em] uppercase text-gray-300">
                        {hovered && !selected
                            ? <>{label(hovered)} <span className="text-gray-500">· {hoverCount.length} {hoverCount.length === 1 ? 'film' : 'films'}{hoverNow ? ` · ${hoverNow} around ${y}` : ''} · click to fly in</span></>
                            : <span className="text-gray-500">{selected ? 'Hover a light to see the film · click the sea to fly back out' : 'Click a country to fly into it and see its films'}</span>}
                    </div>

                    {/* the year, and your hand on it: on wide screens, laid on the ocean at the map's foot */}
                    <div ref={controls} className={`mt-6 md:mt-0 md:absolute md:left-0 md:bottom-0 md:pointer-events-none ${selected ? 'md:right-[42%]' : 'md:right-0'}`}>
                        <div className="md:pointer-events-auto md:w-[min(25rem,32%)]">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setPlaying((p) => !p)}
                                    aria-label={playing ? 'Pause the years' : 'Play the years'}
                                    className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full ring-1 ring-white/25 bg-[#050505]/60 text-white hover:bg-white/10 transition-colors"
                                >
                                    {playing ? <MdPause className="text-xl" /> : <MdPlayArrow className="text-xl" />}
                                </button>
                                <div className="font-oswald font-bold text-5xl md:text-6xl leading-none text-[#f6d48f] tabular-nums w-[4.5ch]">{y}</div>
                            </div>
                            <p className="mt-3 min-h-[1.75rem] font-serif text-lg text-gray-200 leading-snug [text-shadow:0_1px_12px_#050505]">
                                {selected
                                    ? <>Around {y} in {shortName(selected)}: <span className="text-[#f6d48f]">{countryFilms.filter((f) => Math.abs(f.y - y) < WINDOW).length}</span> of its {countryFilms.length} films, lit on the map.</>
                                    : status.top?.length
                                    ? <>Around {y}, cinema is brightest in {status.top.map((k, i) => (
                                        <span key={k}>{i > 0 && (i === status.top.length - 1 ? ' and ' : ', ')}<span className="text-[#f6d48f]">{shortName(k)}</span></span>
                                    ))}.</>
                                    : <>Around {y}, the atlas is quiet.</>}
                            </p>
                        </div>
                        <div ref={slider} className="mt-4 md:pointer-events-auto">
                            <input type="range" min={FROM} max={TO} step="1" value={y} onChange={onSlide} aria-label="Year" className="atlas-slider w-full" />
                            <div className="mt-2 flex justify-between font-label text-[12px] tracking-[0.14em] text-gray-500">
                                <span>{FROM}</span><span>1950</span><span>1980</span><span>2000</span><span>{TO}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* now showing: the films of the moment, worldwide */}
            {!selected && (
                <div className="mt-10">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">
                            Now showing <span className="text-gray-500">· {Math.ceil(y - WINDOW)}–{Math.floor(y + WINDOW)} · {strip.length} {strip.length === 1 ? 'film' : 'films'}</span>
                            {held && playing && <span className="ml-3 text-[#f6d48f]">· the years wait while you choose</span>}
                        </div>
                        <Link to="/explore" className="shrink-0 whitespace-nowrap py-3.5 -my-3.5 font-label text-[12px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">All {films?.length || ''} films →</Link>
                    </div>
                    <ol
                        className="flex gap-3 overflow-x-auto pb-3 snap-x [scrollbar-width:thin]"
                        onPointerEnter={(e) => { if (e.pointerType === 'mouse') { mouseIn.current = true; hold(true); } }}
                        onPointerLeave={(e) => { if (e.pointerType === 'mouse') { mouseIn.current = false; hold(false); map.current?.setHighlight(null); } }}
                        onPointerDown={touchHold}
                        // a swipe along the strip holds too, a moment past its end
                        onScroll={() => { if (!mouseIn.current) { hold(true); hold(false, 2500); } }}
                        onFocus={() => hold(true)}
                        onBlur={(e) => { if (!mouseIn.current && !e.currentTarget.contains(e.relatedTarget)) hold(false); }}
                    >
                        {strip.map((f) => (
                            <li key={f.id} className="snap-start shrink-0 w-40 md:w-48">
                                <button
                                    onClick={() => navigate(`/movie/${f.id}`)}
                                    onMouseEnter={() => map.current?.setHighlight(model?.keyFor(f.c))}
                                    onFocus={() => map.current?.setHighlight(model?.keyFor(f.c))}
                                    className="group block w-full text-left"
                                >
                                    <span className="block aspect-video overflow-hidden bg-[#111] ring-1 ring-white/10 group-hover:ring-[#f6d48f]/70 transition-colors">
                                        {f.s && <img src={stillSrc(f.s)} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                                    </span>
                                    <span className="block mt-2 font-serif text-[15px] leading-tight text-gray-100 line-clamp-2 group-hover:text-white">{f.t}</span>
                                    <span className="block mt-0.5 font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">{f.y} · {f.c}</span>
                                </button>
                            </li>
                        ))}
                        {!strip.length && <li className="py-6 font-serif italic text-gray-500">No films in the atlas from these years.</li>}
                    </ol>
                </div>
            )}
        </div>
    );
};

export default AtlasMap;
