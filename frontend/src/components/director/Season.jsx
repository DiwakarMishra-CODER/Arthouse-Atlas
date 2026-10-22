import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sized } from '../movements/treatments';

/**
 * The movements a director belongs to, after their films: each one a wide screen showing the
 * movement's own still. As it comes into view the masking parts and the picture opens, as a screen
 * does before the film; it's the same move for every movement. On the picture: its name, its years,
 * how many of the atlas's films it holds, who else made it, and the way into its page. The whole
 * screen is the link.
 */

const EASE = [0.22, 1, 0.36, 1];
const SEEN = { once: true, amount: 0.35 };

const yearsOf = (m) => {
    if (!m.startYear) return m.era || null;
    const ongoing = !m.endYear || m.endYear >= new Date().getFullYear();
    return `${m.startYear}–${ongoing ? 'now' : m.endYear}`;
};
const withWhom = (others = []) => {
    if (!others.length) return null;
    if (others.length <= 2) return `with ${others.join(' and ')}`;
    const rest = others.length - 2;
    return `with ${others.slice(0, 2).join(', ')} and ${rest} ${rest === 1 ? 'other' : 'others'}`;
};

const Season = ({ movements, reducedMotion = false }) => (
    // (own-transitions: the masking moves every frame, and the site's blanket transition would drag it)
    <div className="own-transitions flex flex-col gap-8 md:gap-12">
        {movements.map((m) => {
            const facts = [yearsOf(m), m.films ? `${m.films} ${m.films === 1 ? 'film' : 'films'} in the atlas` : null, withWhom(m.others)].filter(Boolean);
            return (
                <Link
                    key={m._id}
                    to={`/movements/${m.tag || m._id}`}
                    className="group relative block overflow-hidden bg-black aspect-[4/3] sm:aspect-video lg:aspect-[21/9] ring-1 ring-white/10 hover:ring-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                    {m.still && (
                        <motion.img
                            src={sized(m.still, 'w1280')}
                            alt=""
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover max-w-none"
                            style={{ objectPosition: m.heroFocus || '50% 35%' }}
                            initial={reducedMotion ? false : { scale: 1.08 }}
                            whileInView={{ scale: 1 }}
                            viewport={SEEN}
                            transition={{ duration: 2.4, ease: EASE }}
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />
                    <div aria-hidden="true" className="absolute inset-0 still-grain opacity-60 pointer-events-none" />
                    {/* the masking parts, top and bottom, and the screen opens */}
                    {!reducedMotion && ['top-0 origin-top', 'bottom-0 origin-bottom'].map((edge) => (
                        <motion.div
                            key={edge}
                            aria-hidden="true"
                            className={`absolute inset-x-0 h-1/2 bg-black ${edge}`}
                            initial={{ scaleY: 1 }}
                            whileInView={{ scaleY: 0 }}
                            viewport={SEEN}
                            transition={{ duration: 1.1, ease: EASE }}
                        />
                    ))}
                    <motion.div
                        className="absolute inset-x-0 bottom-0 p-5 md:p-10"
                        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={SEEN}
                        transition={{ duration: 0.8, delay: 0.75, ease: EASE }}
                    >
                        <div className="font-serif font-light text-[2rem] sm:text-5xl md:text-6xl leading-[1.02] text-white">{m.title}</div>
                        {facts.length > 0 && <div className="mt-3 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gray-200">{facts.join('  ·  ')}</div>}
                        <span className="mt-5 inline-flex items-center min-h-11 px-5 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold ring-1 ring-gold/50 bg-black/40 transition-colors duration-200 group-hover:bg-gold group-hover:text-black">
                            Open the movement ›
                        </span>
                    </motion.div>
                </Link>
            );
        })}
    </div>
);

export default Season;
