import { AnimatePresence, motion } from 'framer-motion';
import { sized } from '../movements/treatments';

/**
 * Films most people have seen: say which you loved, which weren't for you, or skip the ones you
 * haven't seen. Each answer folds its card away and the next one takes its place.
 */
const QuickRate = ({ films, onLoved, onNotFor, onSkip, show = 4, reducedMotion }) => (
    <ul className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8">
        <AnimatePresence initial={false} mode="popLayout">
            {films.slice(0, show).map((f) => (
                <motion.li
                    key={f._id}
                    layout={!reducedMotion}
                    initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: -10 }}
                    transition={{ duration: 0.35, ease: [0.3, 0.7, 0.2, 1] }}
                    className="min-w-0"
                >
                    <div className="relative aspect-[16/10] overflow-hidden ring-1 ring-white/10 bg-[#0d0c0b]">
                        {f.still && <img src={sized(f.still, 'w780')} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover max-w-none" />}
                        <span aria-hidden="true" className="absolute inset-0 still-grain opacity-60" />
                    </div>
                    <div className="mt-3 font-serif text-[1.15rem] leading-tight text-white truncate">{f.title}</div>
                    <div className="font-label text-[11px] tracking-[0.14em] uppercase text-gray-500 truncate">{[f.year, f.directors?.[0]].filter(Boolean).join(' · ')}</div>
                    <div className="mt-3 flex flex-col gap-1.5">
                        <button type="button" onClick={() => onLoved(f)} className="px-3 py-2 bg-gold text-black font-label text-[12px] tracking-[0.14em] uppercase hover:bg-gold-light transition-colors">Loved it</button>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button type="button" onClick={() => onNotFor(f)} className="px-2 py-2 ring-1 ring-white/20 text-gray-200 font-label text-[11px] tracking-[0.14em] uppercase hover:ring-white/50">Not for me</button>
                            <button type="button" onClick={() => onSkip(f)} className="px-2 py-2 ring-1 ring-white/20 text-gray-400 font-label text-[11px] tracking-[0.14em] uppercase hover:ring-white/50 hover:text-white">Haven’t seen</button>
                        </div>
                    </div>
                </motion.li>
            ))}
        </AnimatePresence>
    </ul>
);

export default QuickRate;
