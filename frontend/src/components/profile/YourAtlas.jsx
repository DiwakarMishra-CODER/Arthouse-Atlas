import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MdArrowBack, MdPlayArrow } from 'react-icons/md';
import { createAtlasRenderer } from '../home/atlasRenderer';
import { buildAtlasModel } from '../home/atlasModel';
import { pic } from '../directors/arrange';
import Picker from './Picker';

/**
 * Your atlas: the home page's earth at night, lit only by the films you've seen. At rest every country
 * you've seen a film from glows, brighter for more of them. The first time it comes into view (and
 * whenever you press play) your years run: from your oldest film to your newest, each country lighting
 * up while its films of yours were made, and then everything comes back on at once. Click a country and
 * the camera flies in: your films from it, as lights across the land and as a list beside it.
 */

const FADE = 600; // ms for every film to go out (or come back) around the years playing
const PLACE = { 'United States of America': 'United States', 'United Kingdom of Great Britain and Northern Ireland': 'United Kingdom' };
const shortName = (key) => ({ 'United States of America': 'the United States', 'United Kingdom': 'the United Kingdom' }[key] || (key || '').replace(/^point:/, ''));
const seenWord = (n) => (n === 1 ? '1 film you’ve seen' : `${n} films you’ve seen`);
const listOf = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0] || '');

const YourAtlas = ({ films, reducedMotion }) => {
    const navigate = useNavigate();
    const box = useRef(null);
    const canvas = useRef(null);
    const map = useRef(null);
    const year = useRef(2000);
    const all = useRef(1);
    const hoverKey = useRef(null);
    const touching = useRef(false);
    const [assets, setAssets] = useState(null);
    const [playing, setPlaying] = useState(false);
    const [status, setStatus] = useState({ year: null, top: [] });
    const [hovered, setHovered] = useState(null);
    const [selected, setSelected] = useState(null);
    const [filmCard, setFilmCard] = useState(null);

    useEffect(() => {
        let gone = false;
        const json = (u) => fetch(u).then((r) => r.json());
        Promise.all([json('/atlas/countries.json'), json('/atlas/regions.json')])
            .then(([topo, regions]) => { if (!gone) setAssets({ topo, regions }); })
            .catch(() => {});
        return () => { gone = true; };
    }, []);

    const model = useMemo(() => (assets ? buildAtlasModel(films, assets.regions, assets.topo.objects.countries.geometries.map((g) => g.properties.name)) : null), [assets, films]);
    // the countries your films were made in (the Soviet Union once, not as its fifteen states), most first;
    // each flies the map to its place
    const ranked = useMemo(() => {
        if (!model) return [];
        const n = new Map();
        films.forEach((f) => n.set(f.c, (n.get(f.c) || 0) + 1));
        return [...n].map(([country, count]) => ({ country, n: count, key: model.keyFor(country) }))
            .filter((c) => c.key).sort((a, b) => b.n - a.n || a.country.localeCompare(b.country));
    }, [model, films]);
    const span = useMemo(() => {
        const ys = films.map((f) => f.y).filter(Boolean);
        return ys.length ? [Math.min(...ys), Math.max(...ys)] : [1950, 2000];
    }, [films]);

    useEffect(() => {
        if (!assets || !model || !canvas.current) return undefined;
        const r = createAtlasRenderer(canvas.current, {
            ...assets,
            model,
            getYear: () => year.current,
            getAll: () => all.current,
            onStatus: setStatus,
            onHover: (k) => { hoverKey.current = k; setHovered(k); },
            onFilmHover: (hit) => setFilmCard(hit ? { ...hit, cw: canvas.current?.clientWidth || 0 } : null),
        });
        map.current = r;
        const onResize = () => r.resize();
        window.addEventListener('resize', onResize);
        return () => { window.removeEventListener('resize', onResize); r.destroy(); map.current = null; };
    }, [assets, model]);
    useEffect(() => { map.current?.setSelected(selected); }, [selected]);

    // your years, played once: everything goes out, the years run, everything comes back on
    const play = () => {
        if (reducedMotion || playing) return;
        setPlaying(true);
        setSelected(null);
        const [from, to] = [span[0] - 3, span[1] + 3];
        const run = Math.min(9000, Math.max(4500, (to - from) * 110)); // ms
        const t0 = performance.now();
        const tick = (now) => {
            const t = now - t0;
            all.current = t < FADE ? 1 - t / FADE : t > FADE + run ? Math.min(1, (t - FADE - run) / FADE) : 0;
            year.current = from + (to - from) * Math.min(1, Math.max(0, (t - FADE) / run));
            if (t < run + FADE * 2) requestAnimationFrame(tick);
            else { all.current = 1; setPlaying(false); }
        };
        requestAnimationFrame(tick);
    };
    // the first time it's on screen, it plays
    const played = useRef(false);
    useEffect(() => {
        const el = box.current;
        if (!el || !model || reducedMotion) return undefined;
        const io = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !played.current) { played.current = true; play(); }
        }, { threshold: 0.45 });
        io.observe(el);
        return () => io.disconnect();
        // (play reads only refs and the span)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [model, reducedMotion]);

    const onPointer = (e) => {
        const r = canvas.current.getBoundingClientRect();
        map.current?.setPointer(e.clientX - r.left, e.clientY - r.top);
    };
    const letGo = () => { map.current?.setPointer(null); setFilmCard(null); };
    const onClick = () => {
        const act = () => {
            const film = map.current?.filmAtPointer();
            if (film) return navigate(`/movie/${film.id}`);
            if (hoverKey.current) return setSelected(hoverKey.current);
            if (selected) return setSelected(null);
            return null;
        };
        if (!touching.current) return act();
        requestAnimationFrame(() => requestAnimationFrame(() => { act(); letGo(); }));
        return null;
    };

    const label = (key) => model?.labelFor(key) || '';
    const countryFilms = selected && model ? model.filmsFor(selected) : [];
    const hoverN = hovered && model ? model.filmsFor(hovered).length : 0;
    const y = status.year;
    const countries = ranked.length;

    return (
        <section ref={box} className="pt-20 md:pt-28">
            <div className="max-w-7xl mx-auto px-4 md:px-10">
                <div className="flex items-baseline gap-4">
                    <h2 className="font-serif font-light text-3xl md:text-5xl text-white">Your atlas</h2>
                    <span className="flex-1 h-px bg-white/10" />
                </div>
                <p className="mt-2 max-w-3xl font-serif italic text-lg text-gray-300">Where the films you’ve seen come from. The brighter a country, the more of your films were made there.</p>

                {/* the countries, most first: each flies the map in */}
                <div className="mt-6">
                    <Picker
                        size="md"
                        label="Fly to a country"
                        layoutId="atlas-rule"
                        value={selected ? ranked.find((c) => c.key === selected)?.country || selected : 'world'}
                        onChange={(k) => setSelected(k === 'world' ? null : ranked.find((c) => c.country === k)?.key || null)}
                        onHover={(k) => map.current?.setHighlight(k && k !== 'world' ? ranked.find((c) => c.country === k)?.key : null)}
                        items={[
                            { key: 'world', label: 'The whole world', count: films.length },
                            ...ranked.slice(0, 10).map(({ country, n }) => ({ key: country, label: PLACE[country] || country, count: n })),
                        ]}
                    />
                </div>

                <div className="relative mt-4">
                    {/* the earth, lit by your films, its edges dissolving into the page */}
                    <div className="relative w-full aspect-[16/10] md:aspect-[2/1] [mask-image:radial-gradient(ellipse_75%_75%_at_50%_50%,#000_70%,transparent_100%)]">
                        <canvas
                            ref={canvas}
                            className="absolute inset-0 w-full h-full"
                            onPointerMove={onPointer}
                            onPointerDown={(e) => { touching.current = e.pointerType !== 'mouse'; if (touching.current) onPointer(e); }}
                            onPointerLeave={(e) => { if (e.pointerType === 'mouse') letGo(); }}
                            onPointerCancel={letGo}
                            onClick={onClick}
                            role="img"
                            aria-label={`A world map at night, lit by your films: ${countries} ${countries === 1 ? 'country' : 'countries'}`}
                        />
                    </div>

                    {/* the film light under the pointer */}
                    {filmCard && (
                        <div className="absolute z-20 w-52 pointer-events-none bg-[#0b0b0c]/95 ring-1 ring-gold/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)]" style={{ left: Math.min(filmCard.x + 18, filmCard.cw - 220), top: Math.max(0, filmCard.y - 70) }}>
                            {filmCard.film.s && <img src={pic(filmCard.film.s, 'w300')} alt="" className="w-full aspect-video object-cover max-w-none" />}
                            <div className="px-3 py-2.5">
                                <div className="font-serif text-white leading-tight">{filmCard.film.t}</div>
                                <div className="mt-1 font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">{[filmCard.film.d, filmCard.film.y].filter(Boolean).join(' · ')}</div>
                            </div>
                        </div>
                    )}

                    {/* a country open: your films from it */}
                    <AnimatePresence>
                        {selected && (
                            <motion.aside
                                key={selected}
                                className="md:absolute md:inset-y-0 md:right-0 md:w-[38%] mt-4 md:mt-0 flex flex-col md:pl-10 md:bg-gradient-to-l md:from-[#050505] md:via-[#050505]/95 md:to-transparent"
                                initial={reducedMotion ? false : { opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
                                transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <button type="button" onClick={() => setSelected(null)} className="self-start flex items-center gap-2 min-h-11 font-label text-[12px] tracking-[0.14em] uppercase text-gray-300 hover:text-white">
                                    <MdArrowBack aria-hidden="true" /> The whole world
                                </button>
                                <h3 className="mt-2 font-serif text-3xl md:text-4xl text-white leading-tight">{label(selected)}</h3>
                                <div className="mt-1 font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">
                                    {seenWord(countryFilms.length)}{countryFilms.length ? ` · ${countryFilms[0].y}–${countryFilms.at(-1).y}` : ''}
                                </div>
                                <ol className="mt-4 flex-1 min-h-0 max-h-72 md:max-h-none overflow-y-auto pr-2 [scrollbar-width:thin]" onMouseLeave={() => map.current?.setFilmHighlight(null)}>
                                    {countryFilms.map((f) => (
                                        <li key={f.id}>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/movie/${f.id}`)}
                                                onMouseEnter={() => map.current?.setFilmHighlight(f.id)}
                                                onFocus={() => map.current?.setFilmHighlight(f.id)}
                                                className="group w-full flex items-center gap-3 py-2 text-left border-b border-white/[0.06]"
                                            >
                                                {f.s && <img src={pic(f.s, 'w185')} alt="" loading="lazy" className="w-16 aspect-video object-cover max-w-none shrink-0 ring-1 ring-white/10" />}
                                                <span className="min-w-0">
                                                    <span className="block font-serif leading-snug text-gray-100 group-hover:text-gold-light truncate">{f.t}</span>
                                                    <span className="block font-label text-[11px] tracking-[0.14em] uppercase text-gray-500">{f.y}</span>
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ol>
                            </motion.aside>
                        )}
                    </AnimatePresence>
                </div>

                {/* what the map is showing, and your years to play */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                    <button
                        type="button"
                        onClick={play}
                        disabled={playing || reducedMotion}
                        className="shrink-0 self-start inline-flex items-center gap-2 min-h-11 px-4 ring-1 ring-gold/60 text-gold font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase hover:bg-gold hover:text-black disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gold transition-colors"
                    >
                        <MdPlayArrow aria-hidden="true" className="text-lg" /> Play your years
                    </button>
                    <p className="min-h-[1.75rem] font-serif text-lg text-gray-200 leading-snug">
                        {playing && y != null ? (
                            <>
                                <span className="font-oswald font-bold text-2xl text-gold tabular-nums align-[-2px] mr-3">{y}</span>
                                {status.top?.length ? <>Your films from around then: {listOf(status.top.map((k) => shortName(k)))}.</> : <>None of your films from around then.</>}
                            </>
                        ) : hovered && !selected ? (
                            <>{label(hovered)}: {seenWord(hoverN)}. Click to fly in.</>
                        ) : selected ? (
                            <>Point at a light to see the film. Click the sea to fly back out.</>
                        ) : (
                            <>{films.length} {films.length === 1 ? 'film' : 'films'} from {countries} {countries === 1 ? 'country' : 'countries'}, {span[0]}–{span[1]}. Click a country to fly in.</>
                        )}
                    </p>
                </div>
            </div>
        </section>
    );
};

export default YourAtlas;
