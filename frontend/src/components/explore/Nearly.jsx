import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sized } from '../movements/treatments';

/**
 * A small wall's near misses. Words on the board narrow the wall one after another, so a few picks can
 * leave three films and no idea which word did it. Under a small wall, each word on the board gets a row:
 * the word struck through in red grease pencil, how many films taking it off would bring in, those
 * films (the most acclaimed first), and a button that takes it off. Every film in a row fits all your
 * other words.
 *
 * rows: [{ key, n, films, word, onDrop }], the biggest first; `empty`: the wall itself has nothing.
 */

const filmsWord = (n) => `${n} ${n === 1 ? 'film' : 'films'}`;

// the word on its slot, with a pencil line through it that draws in as the row comes into view
const Struck = ({ word, still }) => (
    <span className="relative inline-block mx-1.5 px-2.5 py-1 ring-1 ring-gold/50 bg-black/40 font-label uppercase text-[12.5px] md:text-[13.5px] tracking-[0.12em] text-gold-light">
        {word}
        <svg aria-hidden="true" viewBox="0 0 100 20" preserveAspectRatio="none" className="absolute inset-x-[-4px] top-1/2 -translate-y-1/2 w-[calc(100%+8px)] h-4 overflow-visible pointer-events-none">
            <motion.path
                d="M1 12 C 22 9, 48 11, 70 8 S 92 7, 99 6"
                fill="none"
                stroke="#d2382b"
                strokeWidth="2.4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={still ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, amount: 1 }}
                transition={{ duration: 0.5, delay: 0.25, ease: 'easeInOut' }}
            />
        </svg>
    </span>
);

const Row = ({ row, still }) => (
    <motion.div
        initial={still ? false : { opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-white/10 pb-3.5">
            <p className="text-[16px] md:text-[18px] leading-relaxed text-gray-300">
                Take off <Struck word={row.word} still={still} /> and <b className="font-semibold text-white">{filmsWord(row.n)}</b> {row.n === 1 ? 'comes' : 'come'} in
            </p>
            <button type="button" onClick={row.onDrop} className="inline-flex items-center gap-2 min-h-11 px-4 ring-1 ring-gold/60 text-gold-light font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase hover:bg-gold hover:text-black transition-colors">
                Take it off <span aria-hidden="true">→</span>
            </button>
        </div>
        <ul className="mt-4 -mx-4 px-4 flex gap-3 overflow-x-auto snap-x [scrollbar-width:none] md:mx-0 md:px-0 md:grid md:grid-cols-6 md:gap-4 md:overflow-visible">
            {row.films.map((f) => {
                const picture = f.still || f.backdropUrl || f.posterUrl;
                return (
                    <li key={f._id} className="snap-start shrink-0 w-[44%] sm:w-[30%] md:w-auto">
                        <Link to={`/movie/${f._id}`} className="group block">
                            <span className="block aspect-[16/10] overflow-hidden bg-[#141210] ring-1 ring-white/10 transition-shadow group-hover:ring-white/40">
                                {picture && <img src={sized(picture, 'w300')} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover max-w-none grayscale-[0.55] brightness-[0.85] transition-[filter] duration-500 group-hover:grayscale-0 group-hover:brightness-100" />}
                            </span>
                            <span className="mt-2 block font-serif text-[15px] leading-tight text-gray-100 line-clamp-2 group-hover:text-white">{f.title}</span>
                            <span className="block font-label text-[11px] tracking-[0.14em] text-gray-500">{f.year}</span>
                        </Link>
                    </li>
                );
            })}
            {row.n > row.films.length && (
                <li className="snap-start shrink-0 w-[44%] sm:w-[30%] md:w-auto">
                    <button type="button" onClick={row.onDrop} className="w-full aspect-[16/10] flex items-center justify-center border border-dashed border-white/25 font-label text-[12px] tracking-[0.14em] uppercase text-gray-300 hover:text-white hover:border-white/50 transition-colors">
                        +{row.n - row.films.length} more
                    </button>
                </li>
            )}
        </ul>
    </motion.div>
);

const Nearly = ({ rows, empty = false, reducedMotion: still = false }) => (
    <section aria-labelledby="nearly" className={empty ? 'mt-12' : 'mt-24 md:mt-28'}>
        <div className="text-center">
            <div className="font-label uppercase text-[12px] md:text-[13px] tracking-[0.3em] text-gold">Nearly</div>
            <h2 id="nearly" className="mt-2 font-serif font-light text-[26px] md:text-[34px] leading-tight text-white">Films that miss just one of your words</h2>
            <p className="mt-2 mx-auto max-w-xl text-[15px] leading-relaxed text-gray-400">Each row fits everything else you chose.</p>
        </div>
        <div className="mt-10 md:mt-12 space-y-12 md:space-y-14">
            {rows.map((r) => <Row key={r.key} row={r} still={still} />)}
        </div>
    </section>
);

export default Nearly;
