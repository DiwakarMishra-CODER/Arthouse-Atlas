import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { pic } from '../directors/arrange';

/**
 * The studios a director worked with, after their movements: each one a roof from the Lot, lit by a
 * frame from the best known of their films it holds. The house lights come up on them one after
 * another as they come into view. The makers first, then the labels that release their films; on
 * each, its name and what it did for them, and the whole roof is the way into its page.
 */

const EASE = [0.22, 1, 0.36, 1];
const SEEN = { once: true, amount: 0.4 };
const COUNTRY = { 'United States of America': 'United States' };
const MOST = 6;

const films = (n) => `${n === 1 ? 'one' : n} of their films`;
const whatItDid = (h) => (h.kind === 'house' ? `Made ${films(h.n)}` : h.slug === 'criterion' ? `${films(h.n)} in its collection` : `Released ${films(h.n)}`);

// the roofs in rows that come out even: four side by side, five or six in threes
const COLUMNS = { 1: 'sm:grid-cols-2', 2: 'sm:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' };

const TheirStudios = ({ houses, reducedMotion = false }) => (
    <ul className={`own-transitions grid grid-cols-2 ${COLUMNS[Math.min(houses.length, MOST)] || 'lg:grid-cols-3'} gap-3 sm:gap-4 md:gap-6`}>
        {houses.slice(0, MOST).map((h, i) => (
            <li key={h.slug}>
                <Link to={`/studios/${h.slug}`} className="group relative block aspect-[4/3] sm:aspect-video overflow-hidden bg-[#0d0c0b] ring-1 ring-white/10 hover:ring-gold/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                    {h.s && <img src={pic(h.s, 'w780')} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover max-w-none transition-transform duration-700 group-hover:scale-105" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    {/* the house lights come up */}
                    {!reducedMotion && (
                        <motion.div
                            aria-hidden="true"
                            className="absolute inset-0 bg-black pointer-events-none"
                            initial={{ opacity: 0.92 }}
                            whileInView={{ opacity: 0 }}
                            viewport={SEEN}
                            transition={{ duration: 1.2, delay: 0.15 + i * 0.18, ease: EASE }}
                        />
                    )}
                    <span className="absolute inset-x-0 bottom-0 px-3 sm:px-4 pb-3">
                        <span className="block font-label text-[13px] md:text-[15px] tracking-[0.16em] uppercase text-white leading-tight">{h.name}</span>
                        <span className="mt-1 block font-label text-[12px] tracking-[0.12em] uppercase text-gray-300 leading-snug">
                            {whatItDid(h)}<span className="hidden sm:inline">{h.country && `  ·  ${COUNTRY[h.country] || h.country}`}</span>
                        </span>
                    </span>
                </Link>
            </li>
        ))}
    </ul>
);

export default TheirStudios;
