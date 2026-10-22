import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Laurel from './Laurel';
import { ordinal as ordinalWord, citation } from './canonWords';
import { fractionWords } from '../foryou/whyWords';

/**
 * Where the canon places a film, the way a cinema would announce it.
 *
 * A backlit marquee spells out its standing — its place in the atlas when
 * that's in the top hundred, otherwise its place among films of its decade —
 * letter by letter, with the bulbs chasing round the sign. Below it, the
 * strongest five lists that place the film, each a poster laurel in plain
 * words (every list, by when it named the film, follows in ListYears). Then
 * what viewers made of it: how many MovieLens viewers loved it, and what share
 * of those who rated it.
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
    <span className={className}>
        <span className="sr-only">{text}</span>
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

// a standing's list: a gold-ringed button, as Sign in is
const STANDING = 'inline-flex items-center min-h-11 px-5 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold ring-1 ring-gold/50 hover:bg-gold hover:text-black transition-colors';

const CanonMarquee = ({ film, accent, reducedMotion = false }) => {
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
    const viewers = film.audience;
    const [aboutMovieLens, setAboutMovieLens] = useState(false); // the note saying what MovieLens is
    const share = viewers && fractionWords(viewers.loved, viewers.rated);

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
            {/* each standing opens its own list, in its order, the one the sign leads with first */}
            {canon && (
                <div className={`mt-6 flex flex-wrap justify-center gap-3 ${canon.lead === 'atlas' ? 'flex-row-reverse' : ''}`}>
                    <Link to={`/explore?decade=${canon.decade}`} className={STANDING}>See the {canon.decade}s, ranked ›</Link>
                    <Link to="/explore" className={STANDING}>See the whole atlas ›</Link>
                </div>
            )}
            <p className="mt-4 text-center text-sm text-gray-500">
                {canon
                    ? 'Its place among all the films in the atlas, and among the films of its decade.'
                    : 'None of the 20 polls, lists and prizes we read place this film. It is in the atlas on the curator’s judgement.'}
                {' '}<Link to="/about#count" className="text-gold underline decoration-gold/50 underline-offset-4 hover:text-gold-light whitespace-nowrap">How it’s counted ›</Link>
                {' '}<Link to="/about#lists" className="text-gold underline decoration-gold/50 underline-offset-4 hover:text-gold-light whitespace-nowrap">See all 20 lists ›</Link>
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
                </>
            )}

            {/* what viewers made of it */}
            {viewers && (
                <p className="mt-10 mx-auto max-w-2xl text-center font-serif text-lg md:text-xl leading-snug text-gray-200">
                    And viewers: on MovieLens, <span className="text-gold-light">{viewers.loved.toLocaleString()}</span> people loved it (4 stars or more){share ? `, ${share} of the ${viewers.rated.toLocaleString()} who rated it` : ''}.
                    {' '}
                    <button type="button" aria-expanded={aboutMovieLens} aria-controls="movielens-note" onClick={() => setAboutMovieLens((open) => !open)} className="py-2 font-label text-[12px] tracking-[0.14em] uppercase text-gold hover:text-gold-light whitespace-nowrap">
                        What’s MovieLens <span aria-hidden="true" className={`inline-block transition-transform ${aboutMovieLens ? 'rotate-90' : ''}`}>›</span>
                    </button>
                </p>
            )}
            {/* what MovieLens is, said where the question is asked */}
            {viewers && (
                <div id="movielens-note" hidden={!aboutMovieLens}>
                    {aboutMovieLens && (
                        <motion.div
                            initial={reducedMotion ? false : { opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className="mt-3 mx-auto max-w-2xl px-5 py-4 ring-1 ring-white/10 bg-white/[0.03]"
                        >
                            <p className="font-serif text-[15px] md:text-base leading-relaxed text-gray-300">
                                <span className="text-white">MovieLens</span> is a free film-rating website run by GroupLens, a research lab at the University of Minnesota. Its members rate films to get suggestions, and the lab shares those ratings, without names, for research. The atlas uses that public set: 32 million ratings from about 200,000 people. That’s where these counts come from, and what For You learns from.
                            </p>
                            <Link to="/about#foryou-how" className="mt-1 inline-block py-2 font-label text-[12px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">How For You uses them ›</Link>
                        </motion.div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CanonMarquee;
