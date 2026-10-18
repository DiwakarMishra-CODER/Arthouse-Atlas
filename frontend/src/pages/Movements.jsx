import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { movementsAPI } from '../services/api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import MovementCard from '../components/movements/MovementCard';
import FilmStripTimeline from '../components/movements/FilmStripTimeline';
import ProjectionRoom from '../components/movements/ProjectionRoom';
import { treatmentFor } from '../components/movements/treatments';

/**
 * Movements — every school in the atlas, in the order they began.
 * One card anatomy, one grid, one reading direction; hover a card and it
 * cuts through that movement's own films.
 */

const REGION_GROUP = {
    'Western Europe': 'Europe',
    'Eastern Europe & USSR': 'Europe',
    'East Asia': 'Asia',
    'South & West Asia': 'Asia',
    'Americas': 'Americas',
    'Global': 'Everywhere'
};
const FILTERS = ['All', 'Europe', 'Asia', 'Americas', 'Everywhere', 'Still happening'];

const Movements = () => {
    const [movements, setMovements] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [hovered, setHovered] = useState(null);
    const [inView, setInView] = useState(null);
    const gridRef = useRef(null);
    const reducedMotion = useMotionPreference();

    useEffect(() => {
        Promise.all([movementsAPI.getAll(), movementsAPI.getStats().catch(() => ({ data: null }))])
            .then(([all, s]) => { setMovements(all.data); setStats(s.data); })
            .catch((err) => console.error('Failed to fetch movements:', err))
            .finally(() => setLoading(false));
    }, []);

    const matches = (m) => (filter === 'All' ? true
        : filter === 'Still happening' ? !m.endYear
            : REGION_GROUP[m.region] === filter);

    const visible = useMemo(() => movements
        .filter(matches)
        .sort((a, b) => (a.startYear - b.startYear) || (b.filmCount - a.filmCount)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [movements, filter]);

    // the card crossing the middle of the screen lights the room while you read down the century
    useEffect(() => {
        const grid = gridRef.current;
        if (!grid) return undefined;
        const io = new IntersectionObserver((entries) => {
            const hit = entries.filter((e) => e.isIntersecting).pop();
            if (hit) setInView(hit.target.dataset.id);
        }, { rootMargin: '-45% 0px -45% 0px' });
        grid.querySelectorAll('[data-id]').forEach((el) => io.observe(el));
        const leaveGrid = new IntersectionObserver(([e]) => { if (!e.isIntersecting) setInView(null); }, { rootMargin: '-45% 0px -45% 0px' });
        leaveGrid.observe(grid);
        return () => { io.disconnect(); leaveGrid.disconnect(); };
    }, [visible]);

    const reels = useMemo(() => {
        const byDecade = new Map();
        visible.forEach((m) => {
            const d = Math.floor(m.startYear / 10) * 10;
            if (!byDecade.has(d)) byDecade.set(d, []);
            byDecade.get(d).push(m);
        });
        return [...byDecade].map(([decade, items]) => ({
            decade,
            items,
            films: items.reduce((n, m) => n + (m.filmCount || 0), 0),
            places: [...new Set(items.map((m) => (REGION_GROUP[m.region] === 'Everywhere' ? 'Global' : REGION_GROUP[m.region])).filter(Boolean))]
        }));
    }, [visible]);
    const CENTURY = Array.from({ length: Math.floor(new Date().getFullYear() / 10) - 191 }, (_, i) => 1920 + i * 10);
    const goTo = (id) => document.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });

    const lit = movements.find((m) => m._id === (hovered || inView));
    const tint = lit ? treatmentFor(lit).accent : '#c5a059';

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <div className="text-primary text-xl font-serif animate-pulse motion-reduce:animate-none">Threading the projector...</div>
            </div>
        );
    }

    const living = movements.filter((m) => !m.endYear).length;

    return (
        <div className="min-h-screen text-white pt-28 pb-28 overflow-x-clip selection:bg-primary selection:text-black">
            <ProjectionRoom tint={tint} reducedMotion={reducedMotion} />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* opening */}
                <motion.header
                    initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-14 md:mb-20"
                >
                    <div className="lg:col-span-7">
                        <div className="text-primary text-xs tracking-[0.3em] uppercase mb-5">
                            {movements.length} movements · 1920 to now
                        </div>
                        <h1 className="font-serif font-bold leading-[0.95] text-6xl md:text-8xl">Movements</h1>
                    </div>
                    <p className="lg:col-span-5 text-gray-300 text-lg leading-relaxed font-light lg:pb-2">
                        Cinema doesn't advance in a line. It breaks out — in a defeated country, a studio town, a
                        generation that saw the same films at the same cinémathèque. Here are those outbreaks, in the
                        order they began. {living} are still happening. Hover a card to see its films.
                    </p>
                </motion.header>

                {/* the century as a film strip */}
                <FilmStripTimeline movements={movements} isVisible={matches} accentFor={(m) => treatmentFor(m).accent} onHover={(m) => setHovered(m ? m._id : null)} />

                {/* filters */}
                <nav className="flex flex-wrap gap-x-7 gap-y-1 mb-12 border-b border-white/10" aria-label="Filter movements">
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            aria-pressed={filter === f}
                            className={`py-3 -mb-px border-b-2 text-sm transition-colors ${filter === f ? 'text-white border-primary' : 'text-gray-400 border-transparent hover:text-white'}`}
                        >
                            {f}
                            {f !== 'All' && (
                                <span className="ml-2 text-xs text-gray-500">
                                    {f === 'Still happening' ? living : movements.filter((m) => REGION_GROUP[m.region] === f).length}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* the wall, cut into reels by decade — the timeline above, unrolled */}
                <div ref={gridRef}>
                    {reels.map(({ decade, items, films, places }) => (
                        <section key={decade} className="grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-8 py-14 md:py-20 border-t border-white/[0.06] first:border-t-0 first:pt-0">
                            {/* the decade's rail: where it sits in the century, what it held, and an index that follows you down */}
                            <header className="lg:col-span-3">
                                <div className="lg:sticky lg:top-32">
                                    <div className="inline-flex gap-[3px] px-[5px] py-[4px] bg-[#121212] border-y border-white/10" aria-hidden="true">
                                        {CENTURY.map((d) => (
                                            <span
                                                key={d}
                                                className="w-[11px] h-[8px] transition-colors duration-[1400ms]"
                                                style={{ backgroundColor: d === decade ? tint : reels.some((r) => r.decade === d) ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)' }}
                                            />
                                        ))}
                                    </div>
                                    <h2 className="mt-5 font-serif text-6xl md:text-7xl text-white leading-none tracking-tight">
                                        {decade}<span className="italic transition-colors duration-[1400ms]" style={{ color: tint }}>s</span>
                                    </h2>
                                    <p className="mt-4 text-[11px] tracking-[0.2em] uppercase text-gray-400">
                                        {items.length} {items.length === 1 ? 'movement' : 'movements'} · {films} films
                                    </p>
                                    <p className="mt-1 text-[11px] tracking-[0.2em] uppercase text-gray-500">{places.join(' · ')}</p>

                                    {items.length > 1 && (
                                        <ol className="hidden lg:block mt-8 space-y-1 border-l border-white/[0.08]">
                                            {items.map((m) => {
                                                const on = (hovered || inView) === m._id;
                                                return (
                                                    <li key={m._id}>
                                                        <button
                                                            onClick={() => goTo(m._id)}
                                                            onMouseEnter={() => setHovered(m._id)}
                                                            onMouseLeave={() => setHovered(null)}
                                                            className={`relative -ml-px flex w-full items-baseline gap-3 py-1 pl-4 text-left border-l-2 transition-colors duration-300 ${on ? 'text-white' : 'border-transparent text-gray-500 hover:text-gray-200'}`}
                                                            style={on ? { borderColor: treatmentFor(m).accent } : undefined}
                                                        >
                                                            <span className="font-mono text-[11px] tabular-nums" style={on ? { color: treatmentFor(m).accent } : undefined}>{m.startYear}</span>
                                                            <span className="font-serif text-[15px] leading-snug">{m.title}</span>
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                    )}
                                </div>
                            </header>

                            {/* a contact sheet: two columns, the second dropped half a frame, read in zigzag order */}
                            <div className={`lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-14 ${items.length > 1 ? 'sm:pb-28' : ''}`}>
                                {items.map((m, i) => (
                                    <div
                                        key={m._id}
                                        data-id={m._id}
                                        className={items.length === 1 ? 'sm:col-span-2' : i % 2 === 1 ? 'sm:translate-y-28' : ''}
                                        onMouseEnter={() => setHovered(m._id)}
                                        onMouseLeave={() => setHovered(null)}
                                    >
                                        <MovementCard movement={m} size={items.length === 1 ? 'wide' : 'card'} reducedMotion={reducedMotion} eager={decade === reels[0].decade && i < 2} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                {/* closing */}
                <div className="border-t border-white/10 pt-16 mt-24 max-w-3xl">
                    <p className="font-serif text-2xl md:text-3xl text-gray-200 leading-snug">
                        Schools are how we remember cinema. They are not how it was made.
                    </p>
                    {stats && (
                        <p className="text-gray-400 mt-5 text-lg font-light">
                            {stats.unassignedFilms} of the {stats.totalFilms} films in the atlas belong to none of these —{' '}
                            <Link to="/explore" className="text-primary hover:text-white transition-colors border-b border-primary/40 hover:border-white">
                                they are in Explore
                            </Link>.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Movements;
