import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdArrowOutward } from 'react-icons/md';
import { moviesAPI, movementsAPI } from '../services/api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import LoadingSkeleton from '../components/LoadingSkeleton';
import CanonMarquee from '../components/film/CanonMarquee';
import TheScreen from '../components/film/TheScreen';
import ListYears from '../components/film/ListYears';
import DoubleBill from '../components/film/DoubleBill';
import Retrospective from '../components/film/Retrospective';
import useFilmLight from '../components/film/useFilmLight';
import { treatmentFor, displayTitle, sized } from '../components/movements/treatments';
import { usePageTitle } from '../hooks/usePageTitle';
import NotFound from './NotFound';

/**
 * A film, as one evening with it, top to bottom the way a screening runs.
 *
 * The page is lit by the film itself: its still, blurred, glows behind everything like light thrown
 * off the screen, and the accent is read from the still's own colour, so no two films' pages are the
 * same colour. Its opening (the title card over its frames, then its opening titles, its programme
 * note as subtitles, and where to watch it; the trailer plays right there), where the canon places
 * it (the marquee, the laurels, what viewers made of it) and when the lists placed it, the movement
 * it belongs to, and a double bill to follow it with.
 */

const YEAR_MIN = 1918;
const YEAR_MAX = new Date().getFullYear() + 1;
const pct = (y) => `${((y - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100}%`;

const MovieDetail = () => {
    const { id } = useParams();
    const reducedMotion = useMotionPreference();
    // { id, data } — loading is simply "the loaded film isn't this one yet"
    const [result, setResult] = useState({ id: null, data: null });
    const [providers, setProviders] = useState(null);
    const [similarMovies, setSimilarMovies] = useState([]);
    const [movements, setMovements] = useState([]);
    const loading = result.id !== id;
    const movie = loading ? null : result.data;
    const light = useFilmLight(movie?.backdropUrl || movie?.posterUrl);
    usePageTitle(
        movie ? `${movie.title}${movie.year ? ` (${movie.year})` : ''}` : loading ? null : 'Film not found',
        movie ? movie.editorial?.hook || (movie.synopsis || '').split(/(?<=[.!?])\s/)[0] || undefined : undefined,
    );

    useEffect(() => {
        let cancelled = false;
        window.scrollTo(0, 0);
        moviesAPI.getMovieById(id)
            .then((res) => { if (!cancelled) setResult({ id, data: res.data }); })
            .catch((error) => { console.error('Failed to fetch movie:', error); if (!cancelled) setResult({ id, data: null }); });
        moviesAPI.getSimilarMovies(id)
            .then((res) => setSimilarMovies(res.data))
            .catch((error) => console.error('Failed to fetch similar movies:', error));
        return () => { cancelled = true; };
    }, [id]);

    // the movements index, to tie the film to its movement page
    useEffect(() => {
        movementsAPI.getAll().then((res) => setMovements(res.data)).catch(() => setMovements([]));
    }, []);

    useEffect(() => {
        if (!movie?._id) return;
        moviesAPI.getMovieProviders(movie._id)
            .then((response) => {
                // India and US only; one entry per provider across stream / rent / buy / free
                const unique = new Map();
                ['IN', 'US'].forEach((cc) => {
                    const country = response.data?.[cc];
                    if (!country) return;
                    ['flatrate', 'rent', 'buy', 'free'].forEach((cat) => {
                        (country[cat] || []).forEach((p) => { if (!unique.has(p.provider_id)) unique.set(p.provider_id, p); });
                    });
                });
                setProviders([...unique.values()]);
            })
            .catch((error) => { console.error('Failed to fetch providers:', error); setProviders([]); });
    }, [movie]);

    if (loading) return <div className="min-h-screen pt-24"><LoadingSkeleton label="Threading the film" /></div>;
    if (!movie) {
        return <NotFound kicker="Not in the atlas" title="This film isn’t on our reels." line="The link may be wrong, or the film may have left the atlas." links={[{ to: '/explore', label: 'Explore the films' }, { to: '/', label: 'The home page' }]} />;
    }

    const backdrop = movie.backdropUrl || movie.posterUrl;
    const ties = (movie.movements || []).map((t) => movements.find((m) => m.title === t)).filter(Boolean);
    const tags = [...(movie.genres || []).map((g) => ({ label: g, to: `/explore?genre=${encodeURIComponent(g)}` })),
        ...(movie.derivedTags || []).map((t) => ({ label: t, to: `/explore?tags=${encodeURIComponent(t)}` }))];

    const reveal = (delay = 0) => (reducedMotion ? {} : {
        initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-80px' },
        transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }
    });
    const kicker = (text) => <h2 className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-500 mb-6">{text}</h2>;

    return (
        <div className="relative min-h-screen pb-16 md:pb-0 text-white overflow-x-clip selection:bg-gold selection:text-black">
            {/* the screen's glow: the film's own still, thrown soft across the whole page */}
            <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none">
                {backdrop && (
                    <img src={sized(backdrop, 'w780')} alt="" className="absolute inset-0 w-full h-full object-cover scale-125 blur-[80px] saturate-[1.4] opacity-[0.28]" />
                )}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_10%,rgba(5,5,5,0.2),rgba(5,5,5,0.75)_60%,#050505)]" />
            </div>

            <div className="relative">
                {/* ===== THE SCREEN ===== */}
                <TheScreen movie={movie} light={light} reducedMotion={reducedMotion} providers={providers} tags={tags} />

                <div className="max-w-7xl mx-auto px-4 md:px-10">
                    {/* ===== WHERE THE CANON PLACES IT ===== */}
                    <section id="critics" className="pt-24 md:pt-32 scroll-mt-4">
                        <h2 className="font-serif text-4xl md:text-5xl text-center">How the critics rank it</h2>
                        <p className="mt-3 mb-10 text-center font-serif italic text-lg text-gray-400">From 20 critics’ polls, year-end lists and festival prizes, and for how long they’ve placed it.</p>
                        <CanonMarquee film={movie} accent={light} reducedMotion={reducedMotion} />
                        <ListYears film={movie} />
                    </section>

                    {/* ===== ITS MOVEMENT ===== */}
                    {ties.map((m) => {
                        const t = treatmentFor(m);
                        return (
                            <motion.section key={m._id} {...reveal()} className="pt-24 md:pt-32">
                                {kicker('The movement it belongs to')}
                                <Link to={`/movements/${m.tag || m._id}`} className="group grid grid-cols-1 md:grid-cols-12 gap-0 ring-1 ring-white/[0.08] hover:ring-white/20 transition-colors overflow-hidden bg-[#0b0b0b]">
                                    <div className="md:col-span-5 relative aspect-video md:aspect-auto md:min-h-[15rem] overflow-hidden">
                                        {m.heroBackdrop && (
                                            <img
                                                src={sized(m.heroBackdrop, 'w780')}
                                                alt=""
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                                                style={{ objectPosition: m.heroFocus || '50% 35%', filter: t.screenFilter }}
                                            />
                                        )}
                                    </div>
                                    <div className="md:col-span-7 p-7 md:p-10 flex flex-col">
                                        <div className="font-label text-[12px] tracking-[0.14em] uppercase" style={{ color: t.accent }}>{m.era} · {m.region}</div>
                                        <div className="mt-3 font-serif text-3xl md:text-4xl text-white">{displayTitle(m)}</div>
                                        {(m.tagline || m.vibe) && <div className="mt-2 font-serif italic text-gray-400">{m.tagline || m.vibe}</div>}

                                        {/* the movement on the century, with this film marked in it */}
                                        <div className="relative mt-8 h-8" aria-hidden="true">
                                            <span className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
                                            <span className="absolute top-1/2 -translate-y-1/2 h-[5px]" style={{ left: pct(m.startYear), right: `calc(100% - ${pct(m.endYear || YEAR_MAX)})`, backgroundColor: t.accent }} />
                                            <span className="absolute top-0 bottom-0 w-[2px] bg-white" style={{ left: pct(movie.year) }} />
                                            <span className="absolute -top-4 -translate-x-1/2 font-label text-[12px] text-white" style={{ left: pct(movie.year) }}>{movie.year}</span>
                                            <span className="absolute -bottom-3 left-0 font-label text-[12px] text-gray-600">1920</span>
                                            <span className="absolute -bottom-3 right-0 font-label text-[12px] text-gray-600">now</span>
                                        </div>

                                        <div className="font-label mt-auto pt-8 flex items-center justify-between text-[12px] tracking-[0.14em] uppercase text-gray-400">
                                            <span>{m.filmCount} films on the reel</span>
                                            <span className="flex items-center gap-1.5 text-gray-200 group-hover:text-white transition-colors">Open the movement <MdArrowOutward /></span>
                                        </div>
                                    </div>
                                </Link>
                            </motion.section>
                        );
                    })}

                    {/* ===== THEIR RETROSPECTIVE: the director, irised in, and the way to their page ===== */}
                    <Retrospective movie={movie} light={light} reducedMotion={reducedMotion} />

                    {/* ===== DOUBLE BILL ===== */}
                    {similarMovies.length > 0 ? <DoubleBill film={movie} picks={similarMovies} light={light} reducedMotion={reducedMotion} /> : <div className="pb-28" />}
                </div>
            </div>
        </div>
    );
};

export default MovieDetail;
