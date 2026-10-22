import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MdExpandMore } from 'react-icons/md';
import Laurel from './Laurel';
import { ordinal as ordinalWord, citation } from './canonWords';
import { sized } from '../movements/treatments';

/**
 * Where the canon places a film, the way a cinema would announce it.
 *
 * A backlit marquee spells out its standing — its place in the atlas when
 * that's in the top hundred, otherwise its place among films of its decade —
 * letter by letter, with the bulbs chasing round the sign. Below it, every
 * list that places the film is a poster laurel, strongest first, in plain
 * words. Then the films ranked either side of it, so the number has company.
 */

// what kind of recognition, in words, for the breadth line
const FAMILY = {
    'all-time-poll': ['all-time poll', 'all-time polls'],
    'peer-poll': ["filmmakers' poll", "filmmakers' polls"],
    'year-end': ['year-end list', 'year-end lists'],
    prize: ['festival prize', 'festival prizes'],
    'regional-poll': ['regional poll', 'regional polls'],
    institution: ['collection', 'collections'],
    critic: ["critic's canon", "critics' canons"]
};

const LAUREL_INK = '#d8b46a';
const ordinal = (n) => ordinalWord(n).toUpperCase(); // the marquee is set in capitals
const SHOWN = 5;

export const Letters = ({ text, reducedMotion, delay = 0, className }) => (
    <span className={className} aria-label={text}>
        {[...text].map((ch, i) => (
            <motion.span
                key={i}
                aria-hidden="true"
                className="inline-block"
                initial={reducedMotion ? false : { y: -28, opacity: 0, rotateX: 70 }}
                whileInView={{ y: 0, opacity: 1, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 520, damping: 18, delay: delay + i * 0.045 }}
            >
                {ch === ' ' ? ' ' : ch}
            </motion.span>
        ))}
    </span>
);

const Bulbs = ({ count, vertical = false }) => (
    <div className={`flex ${vertical ? 'flex-col h-full' : 'w-full'} justify-between`} aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
            <span key={i} className="marquee-bulb w-2.5 h-2.5 rounded-full" style={{ '--b': i % 3 }} />
        ))}
    </div>
);

const CanonMarquee = ({ film, accent, reducedMotion = false }) => {
    const [open, setOpen] = useState(false);
    const cites = film.provenance || [];
    const canon = film.canon;

    let headline = "A CURATOR'S CHOICE";
    let subline = 'NOT YET ON THE LISTS WE READ';
    if (canon) {
        const decade = `${canon.decade}S`;
        if (canon.lead === 'atlas') {
            headline = `${ordinal(canon.rank)} IN THE ATLAS`;
            subline = `${ordinal(canon.decadeRank)} OF THE ${decade}  ·  ON ${cites.length} ${cites.length === 1 ? 'LIST' : 'LISTS'}`;
        } else {
            headline = `${ordinal(canon.decadeRank)} OF THE ${decade}`;
            subline = `${ordinal(canon.rank)} OF ${canon.of} IN THE ATLAS  ·  ON ${cites.length} ${cites.length === 1 ? 'LIST' : 'LISTS'}`;
        }
    }

    const families = {};
    cites.forEach((p) => { families[p.family || 'institution'] = (families[p.family || 'institution'] || 0) + 1; });
    const breadth = Object.entries(families)
        .sort((a, b) => b[1] - a[1])
        .map(([f, k]) => `${k} ${(FAMILY[f] || [f, `${f}s`])[k === 1 ? 0 : 1]}`);

    const shown = cites.slice(0, SHOWN);
    const rest = cites.slice(SHOWN);
    const company = film.company || [];

    return (
        <div>
            {/* the marquee */}
            <div className="relative mx-auto max-w-3xl p-3 md:p-4 bg-[#16110c] ring-1 ring-black shadow-[0_30px_80px_rgba(0,0,0,0.7)]" style={{ '--glow': accent }}>
                <div className="absolute inset-x-3 md:inset-x-4 top-1.5 md:top-2"><Bulbs count={22} /></div>
                <div className="absolute inset-x-3 md:inset-x-4 bottom-1.5 md:bottom-2"><Bulbs count={22} /></div>
                <div className="absolute inset-y-6 left-1.5 md:left-2"><Bulbs count={5} vertical /></div>
                <div className="absolute inset-y-6 right-1.5 md:right-2"><Bulbs count={5} vertical /></div>

                <div className="relative mx-3 md:mx-4 my-3 md:my-4 px-4 py-5 md:py-7 text-center bg-[#f4ecd8] shadow-[inset_0_0_40px_rgba(255,214,150,0.65),0_0_50px_rgba(255,214,150,0.25)] [perspective:600px]">
                    <Letters text={headline} reducedMotion={reducedMotion} className="block font-oswald font-bold text-[1.9rem] sm:text-5xl md:text-6xl leading-none tracking-[0.06em] text-[#141110]" />
                    <div className="mt-3 md:mt-4 mx-auto h-px w-2/3 bg-[#141110]/25" />
                    <Letters text={subline} reducedMotion={reducedMotion} delay={0.5} className="mt-3 block font-oswald text-[11px] sm:text-sm md:text-base tracking-[0.18em] text-[#3a332b]" />
                </div>
            </div>
            <p className="mt-4 text-center text-sm text-gray-500">
                {canon
                    ? 'Its place among all the films in the atlas, and among the films of its decade.'
                    : 'None of the 20 polls, lists and prizes we read place this film. It is in the atlas on the curator’s judgement.'}
                {' '}<Link to="/about#count" className="text-gold hover:text-gold-light whitespace-nowrap">How it’s counted ›</Link>
                {' '}<Link to="/about#lists" className="text-gold hover:text-gold-light whitespace-nowrap">See all 20 lists ›</Link>
            </p>

            {/* the laurels */}
            {shown.length > 0 && (
                <>
                    <ul className="mt-12 flex flex-wrap justify-center gap-x-4 gap-y-6">
                        {shown.map((p, i) => {
                            const c = citation(p);
                            return (
                                <li key={p._id || `${p.source}-${i}`}>
                                    <Laurel name={c.name} place={c.place} color={LAUREL_INK} to={`/about?list=${p.source}`} delay={0.2 + i * 0.18} reducedMotion={reducedMotion} />
                                </li>
                            );
                        })}
                    </ul>
                    {breadth.length > 0 && (
                        <p className="mt-6 text-center font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">
                            Placed by {breadth.join('  ·  ')}
                        </p>
                    )}
                    {rest.length > 0 && (
                        <div className="mt-6 max-w-2xl mx-auto">
                            <button
                                onClick={() => setOpen((o) => !o)}
                                aria-expanded={open}
                                className="font-label mx-auto flex items-center gap-2 px-5 py-2.5 text-xs tracking-[0.14em] uppercase text-gray-200 ring-1 ring-white/15 hover:ring-white/40 hover:text-white transition-colors"
                            >
                                {open ? 'Show fewer' : `And ${rest.length} more ${rest.length === 1 ? 'list' : 'lists'}`}
                                <MdExpandMore className={`text-lg transition-transform ${open ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence initial={false}>
                                {open && (
                                    <motion.ul
                                        className="mt-4 overflow-hidden border-t border-white/[0.08]"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.35 }}
                                    >
                                        {rest.map((p, i) => {
                                            const c = citation(p);
                                            const row = (
                                                <>
                                                    <span className="text-gray-400 text-sm">{c.name}</span>
                                                    <span className="font-serif text-gray-100">{c.place}</span>
                                                </>
                                            );
                                            return (
                                                <li key={p._id || `${p.source}-r${i}`} className="border-b border-white/[0.08]">
                                                    {p.url
                                                        ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-baseline justify-between gap-4 py-3 hover:bg-white/[0.03]">{row}</a>
                                                        : <div className="flex items-baseline justify-between gap-4 py-3">{row}</div>}
                                                </li>
                                            );
                                        })}
                                    </motion.ul>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </>
            )}

            {/* in its company */}
            {company.length > 1 && (
                <div className="mt-16">
                    <div className="text-center font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">
                        {canon.lead === 'atlas' ? 'Ranked either side of it · in the atlas' : `Ranked either side of it · the ${canon.decade}s`}
                    </div>
                    <ol className="mt-6 flex justify-center items-end gap-3 md:gap-5">
                        {company.map((c) => {
                            const self = c._id === film._id;
                            const r = canon.lead === 'atlas' ? c.canonRank : c.canonDecadeRank;
                            const poster = (
                                <>
                                    <span className={`block aspect-[2/3] overflow-hidden bg-[#111] transition-transform duration-300 ${self ? '' : 'group-hover:-translate-y-1.5'}`}
                                        style={{ boxShadow: self ? `0 0 0 2px ${accent}, 0 18px 50px ${accent}55` : '0 0 0 1px rgba(255,255,255,0.12)' }}>
                                        {c.posterUrl && <img src={sized(c.posterUrl, 'w342')} alt="" loading="lazy" className={`w-full h-full object-cover ${self ? '' : 'grayscale-[0.5] group-hover:grayscale-0 transition-[filter]'}`} />}
                                    </span>
                                    <span className="block mt-2 text-center font-oswald text-lg leading-none" style={{ color: self ? accent : 'rgb(156 163 175)' }}>{ordinal(r).toLowerCase()}</span>
                                    <span className={`block mt-1 text-center text-[12px] leading-tight line-clamp-2 ${self ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>{c.title}</span>
                                </>
                            );
                            return (
                                <li key={c._id} className={self ? 'w-28 md:w-36' : 'w-20 md:w-28'}>
                                    {self ? <div>{poster}</div> : <Link to={`/movie/${c._id}`} className="group block">{poster}</Link>}
                                </li>
                            );
                        })}
                    </ol>
                </div>
            )}
        </div>
    );
};

export default CanonMarquee;
