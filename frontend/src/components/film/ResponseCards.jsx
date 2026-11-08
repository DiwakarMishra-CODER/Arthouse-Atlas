import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { moviesAPI } from '../../services/api';

/**
 * How viewers described the film, as the response cards a preview screening hands its audience:
 * warm card stock, the question once over them all ("How did it feel?"), each card's word over a red rule, and the count kept
 * in real tally marks (57 viewers are 57 strokes, bundled in fives, one row; past 40, a "+N"), so "a lot of
 * people said this" can be seen, not just read. Under it, "57 viewers said so" and their own words.
 * Each card is a way into Explore ("See 105 more melancholic films →", always shown, not only on
 * hover). The cards rise in gently, one after another, and their tallies draw in; reduced motion
 * sets it all still. "Skip the opening" lands here (#viewers).
 * A film viewers said too little about shows no cards.
 *
 * `moods`: [{ mood, viewers, words }] from MovieLens viewers' tags (scripts/moods/fromTags.js)
 */

const MAX = 4;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const INK = '#1f3b75'; // a ballpoint's blue on the card

// how many films each mood has across the atlas, asked for once per visit
let countsAsked = null;
const useMoodCounts = () => {
    const [counts, setCounts] = useState(null);
    useEffect(() => {
        let gone = false;
        countsAsked ??= moviesAPI.explore({ limit: 1, facets: '1' })
            .then((r) => new Map((r.data.facets?.mood || []).map((m) => [m.value, m.n])))
            .catch(() => { countsAsked = null; return null; });
        countsAsked.then((m) => { if (!gone) setCounts(m); });
        return () => { gone = true; };
    }, []);
    return counts;
};

// a bundle of tally marks: four strokes and the fifth across them (one path, drawn stroke by stroke)
const bundlePath = (n) => {
    const xs = [4, 9, 14, 19];
    const down = xs.slice(0, Math.min(n, 4)).map((x, i) => `M${x} ${3 + (i % 2)}L${x + 0.6} ${21 - (i % 2)}`).join('');
    return n >= 5 ? `${down}M1 17.5L22.5 6` : down;
};

const MAX_STROKES = 40; // one row of strokes on a card; past this, the rest are a "+N"
const Tallies = ({ count, still, delay }) => {
    const drawn = Math.min(count, MAX_STROKES);
    const bundles = Array.from({ length: Math.ceil(drawn / 5) }, (_, i) => Math.min(5, drawn - i * 5));
    return (
        <div aria-hidden="true" className="flex flex-nowrap items-center gap-x-1">
            {bundles.map((n, i) => (
                <svg key={i} viewBox="0 0 24 24" width="24" height="24" className="shrink-0">
                    <motion.path
                        d={bundlePath(n)}
                        fill="none"
                        stroke={INK}
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        initial={still ? false : { pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: delay + i * 0.06, ease: 'easeInOut' }}
                    />
                </svg>
            ))}
            {count > drawn && <span className="pl-1 font-courier text-[14px] whitespace-nowrap" style={{ color: INK }}>+{count - drawn}</span>}
        </div>
    );
};

const Card = ({ m, i, total, still }) => {
    const words = (m.words || []).filter((w) => w !== m.mood);
    const more = total != null ? total - 1 : null; // the other films viewers called it
    return (
        <motion.li
            className="snap-center shrink-0 w-[84%] sm:w-[280px]"
            variants={{
                hidden: { opacity: 0, y: 16 },
                shown: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
            }}
        >
            <Link
                to={`/explore?mood=${encodeURIComponent(m.mood)}`}
                aria-label={`${cap(m.mood)}: ${m.viewers} viewers said so${words.length ? `, in their words: ${words.join(', ')}` : ''}. See ${more ?? 'more'} more ${m.mood} films`}
                className="group flex h-full flex-col overflow-hidden rounded-[8px] bg-[#efe6d3] text-[#1c1915] ring-1 ring-black/10 shadow-[0_18px_44px_rgba(0,0,0,0.6)] transition-[transform,box-shadow] duration-500 ease-out hover:-translate-y-1.5 hover:shadow-[0_0_0_2px_rgba(217,173,98,0.85),0_28px_64px_rgba(0,0,0,0.7)] active:scale-[0.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            >
                {/* the word, on the card's title line, its red rule under it */}
                <div className="border-b-2 border-[#b4372f] px-5 pt-5 pb-3 font-serif italic text-[34px] leading-none">{cap(m.mood)}</div>
                <div className="flex-1 px-5 pt-3.5 pb-4">
                    <Tallies count={m.viewers} still={still} delay={0.6 + i * 0.15} />
                    <div className="mt-2.5 font-courier text-[13px] text-[#2c2822]">
                        <b className="font-bold">{m.viewers} {m.viewers === 1 ? 'viewer' : 'viewers'}</b> said so
                    </div>
                    {words.length > 0 && <div className="mt-0.5 font-courier text-[12.5px] text-[#5e564b]">Their words: {words.join(', ')}</div>}
                </div>
                {/* the way in, always shown */}
                <div className="flex items-center justify-between gap-3 bg-[#1c1915] px-5 py-3.5 font-label uppercase text-[12.5px] tracking-[0.14em] text-gold-light transition-colors duration-300 group-hover:bg-gold group-hover:text-black">
                    <span>{more ? `See ${more} more ${m.mood} ${more === 1 ? 'film' : 'films'}` : `See more ${m.mood} films`}</span>
                    <span aria-hidden="true" className="text-[16px] transition-transform duration-300 group-hover:translate-x-1">→</span>
                </div>
            </Link>
        </motion.li>
    );
};

const ResponseCards = ({ moods = [], reducedMotion: still = false }) => {
    const counts = useMoodCounts();
    const shown = moods.slice(0, MAX);
    if (!shown.length) return null;
    const rest = moods.slice(MAX);
    return (
        <section id="viewers" aria-labelledby="viewers-said" className="pt-16 md:pt-24 scroll-mt-20">
            <div className="text-center">
                <div className="font-label uppercase text-[12px] md:text-[13px] tracking-[0.3em] text-gold">From the audience</div>
                <h2 id="viewers-said" className="mt-2 font-serif font-light text-[28px] md:text-[38px] leading-tight text-white">How did it feel?</h2>
                <p className="mt-2 mx-auto max-w-xl text-[14px] leading-relaxed text-gray-400">Each card is a word MovieLens viewers used for this film, with one stroke for every viewer who used it.</p>
            </div>
            <motion.ul
                className="mt-8 md:mt-10 -mx-4 px-4 pb-3 flex gap-4 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center sm:overflow-visible md:gap-5"
                initial={still ? false : 'hidden'}
                whileInView="shown"
                viewport={{ once: true, amount: 0.25 }}
                variants={{ shown: { transition: { staggerChildren: 0.15 } } }}
            >
                {shown.map((m, i) => <Card key={m.mood} m={m} i={i} total={counts?.get(m.mood) ?? null} still={still} />)}
            </motion.ul>
            {shown.length > 1 && <p aria-hidden="true" className="sm:hidden mt-1 text-center font-label uppercase text-[11px] tracking-[0.18em] text-gray-500">Swipe for more →</p>}
            {rest.length > 0 && (
                <p className="mt-6 text-center text-[14px] text-gray-400">
                    Also:{' '}
                    {rest.map((m, i) => (
                        <span key={m.mood}>
                            {i > 0 && ', '}
                            <Link to={`/explore?mood=${encodeURIComponent(m.mood)}`} className="text-gray-200 underline decoration-white/25 underline-offset-4 hover:text-white">{m.mood}</Link>
                            <span className="text-gray-500"> ({m.viewers})</span>
                        </span>
                    ))}
                </p>
            )}
        </section>
    );
};

export default ResponseCards;
