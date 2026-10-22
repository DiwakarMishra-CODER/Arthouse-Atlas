import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { aboutAPI, recsAPI } from '../../services/api';
import { pic } from '../directors/arrange';
import { evidenceWords } from '../foryou/whyWords';

/**
 * How For You picks films, shown working: say you loved one film, and here's what it would pick, with
 * its own reasons. The real engine, asked live (the same request For You makes for anyone signed out).
 */

const SEEDS = ['Persona', 'In the Mood for Love', 'Mulholland Drive'];

const ForYouExample = ({ reducedMotion }) => {
    const [seeds, setSeeds] = useState({});
    const [seed, setSeed] = useState(SEEDS[0]);
    const [picks, setPicks] = useState({}); // seed -> its picks

    useEffect(() => {
        let gone = false;
        aboutAPI.films(SEEDS).then((r) => { if (!gone) setSeeds(r.data); }).catch(() => {});
        return () => { gone = true; };
    }, []);
    useEffect(() => {
        const id = seeds[seed]?.id;
        if (!id || picks[seed]) return undefined;
        let gone = false;
        recsAPI.preview({ ratings: [{ id, value: 5 }], notFor: [] })
            .then((r) => { if (!gone) setPicks((p) => ({ ...p, [seed]: (r.data.recommendations || []).slice(0, 3) })); })
            .catch(() => { if (!gone) setPicks((p) => ({ ...p, [seed]: [] })); });
        return () => { gone = true; };
    }, [seed, seeds, picks]);

    const these = picks[seed];
    return (
        <section aria-labelledby="foryou-how" className="pt-24 md:pt-32">
            <div className="max-w-7xl mx-auto px-4 md:px-10">
                <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">How For You works</div>
                <h2 id="foryou-how" className="scroll-mt-24 mt-1 font-serif font-light text-3xl md:text-5xl leading-tight text-white">How For You picks your films</h2>
                <p className="mt-2 max-w-3xl font-serif italic text-lg text-gray-300">It learns from 32 million ratings by real viewers (MovieLens): the films loved by the people who loved yours. Here it is, working.</p>

                <div className="mt-8 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                    <span className="font-serif text-xl md:text-2xl text-gray-100">Say you loved</span>
                    {SEEDS.map((t) => (
                        <button key={t} type="button" onClick={() => setSeed(t)} className={`min-h-11 font-serif italic text-xl md:text-2xl transition-colors ${t === seed ? 'text-gold-light underline decoration-gold underline-offset-[7px]' : 'text-gray-300 hover:text-white'}`}>
                            {t}
                        </button>
                    ))}
                </div>
                <p className="mt-1 font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">For You would pick:</p>

                <ol className="mt-5 grid md:grid-cols-3 gap-6 md:gap-8">
                    {(these || [0, 1, 2]).map((r, i) => (
                        <li key={r?._id || i} className={r ? 'title-rise' : ''} style={r && !reducedMotion ? { animationDelay: `${i * 120}ms` } : undefined}>
                            {r ? (
                                <Link to={`/movie/${r._id}`} className="group block">
                                    <span className="block aspect-video overflow-hidden bg-[#0d0c0b] ring-1 ring-white/10 group-hover:ring-gold/60">
                                        {r.stills?.[0] && <img src={pic(r.stills[0], 'w780')} alt="" loading="lazy" className="w-full h-full object-cover max-w-none" />}
                                    </span>
                                    <span className="mt-3 block font-serif italic text-xl md:text-2xl text-white group-hover:text-gold-light leading-tight">{r.title}</span>
                                    <span className="block font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">{[r.directors?.join(' & '), r.year].filter(Boolean).join(' · ')}</span>
                                    <span className="mt-2 block font-serif text-[1.02rem] leading-snug text-gray-200">{evidenceWords(r.because)}</span>
                                </Link>
                            ) : <span className="block aspect-video bg-white/[0.03] ring-1 ring-white/[0.06]" />}
                        </li>
                    ))}
                </ol>
                <Link to="/recommendations" className="mt-8 inline-flex items-center min-h-11 font-label text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">Try it with your own films ›</Link>
            </div>
        </section>
    );
};

export default ForYouExample;
