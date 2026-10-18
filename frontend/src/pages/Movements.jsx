import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { movementsAPI } from '../services/api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import MovementCard from '../components/movements/MovementCard';
import FilmStripTimeline from '../components/movements/FilmStripTimeline';
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

    if (loading) {
        return (
            <div className="h-screen w-full bg-black flex items-center justify-center">
                <div className="text-primary text-xl font-serif animate-pulse motion-reduce:animate-none">Threading the projector...</div>
            </div>
        );
    }

    const living = movements.filter((m) => !m.endYear).length;

    return (
        <div className="min-h-screen bg-black text-white pt-28 pb-28 overflow-x-clip selection:bg-primary selection:text-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

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
                <FilmStripTimeline movements={movements} isVisible={matches} accentFor={(m) => treatmentFor(m).accent} />

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

                {/* the grid — chronological, left to right */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                    {visible.map((m, i) => (
                        <MovementCard key={m._id} movement={m} reducedMotion={reducedMotion} eager={i < 3} />
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
