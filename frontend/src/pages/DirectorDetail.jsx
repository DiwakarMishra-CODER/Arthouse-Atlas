import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdArrowBack } from 'react-icons/md';
import api from '../services/api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import LoadingSkeleton from '../components/LoadingSkeleton';
import LifeScreen from '../components/director/LifeScreen';
import StillDrift from '../components/director/StillDrift';
import ArchiveCard from '../components/director/ArchiveCard';
import PosterWall from '../components/director/PosterWall';
import Constellation from '../components/director/Constellation';
import useFilmLight from '../components/film/useFilmLight';
import { sized } from '../components/movements/treatments';

/**
 * A director, presented as a cinémathèque retrospective.
 *
 * Their own stills drift past behind the portrait and name, and the page is
 * lit by their most canonical film. Then the life, run through a projector
 * (a screen playing through the career, the strip of films, the life they came
 * from); the poster wall, a dark papered wall with one wandering light; their
 * card from the archive, typing out the biography; and the circle they ran
 * with, drawn as a constellation.
 */

const yearOf = (d) => (d ? parseInt(String(d).slice(0, 4), 10) || null : null);
const strongest = (f) => [...(f.provenance || [])].sort((a, b) => (b.weight || 0) - (a.weight || 0))[0];

const DirectorDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const reducedMotion = useMotionPreference();
    // { id, data } — loading is simply "the loaded director isn't this one yet"
    const [result, setResult] = useState({ id: null, data: null });

    useEffect(() => {
        let cancelled = false;
        window.scrollTo(0, 0);
        api.get(`/directors/${id}`)
            .then((res) => { if (!cancelled) setResult({ id, data: res.data.data }); })
            .catch((error) => { console.error('Failed to fetch director:', error); if (!cancelled) setResult({ id, data: null }); });
        return () => { cancelled = true; };
    }, [id]);

    const loading = result.id !== id;
    const director = loading ? null : result.data;
    const films = director?.films || [];
    // their most canonical film lights the page
    const signature = [...films].sort((a, b) => (strongest(b)?.weight || 0) - (strongest(a)?.weight || 0))[0];
    const glow = signature?.backdropUrl || director?.backdropUrl;
    const light = useFilmLight(glow);

    if (loading) return <div className="min-h-screen pt-24"><LoadingSkeleton /></div>;
    if (!director) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <p className="text-gray-400">Director not found</p>
            </div>
        );
    }

    const born = yearOf(director.birthDate);
    const died = yearOf(director.deathDate);
    const span = films.length ? `${films[0].year}–${films[films.length - 1].year}` : null;
    // stills for the drift behind the opening: every still and backdrop they have here
    const drift = [...new Set(films.flatMap((f) => [...(f.stills || []), f.backdropUrl]).filter(Boolean))].slice(0, 24);
    const reveal = (delay = 0) => (reducedMotion ? {} : {
        initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-80px' },
        transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }
    });
    const kicker = (text) => <h2 className="font-mono text-[10px] tracking-[0.35em] uppercase text-gray-500 mb-6">{text}</h2>;

    return (
        <div className="relative min-h-screen text-white overflow-x-clip selection:bg-primary selection:text-black">
            {/* lit by their most canonical film */}
            <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none">
                {glow && <img src={sized(glow, 'w780')} alt="" className="absolute inset-0 w-full h-full object-cover scale-125 blur-[90px] saturate-[1.3] opacity-[0.2]" />}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_15%,rgba(5,5,5,0.25),rgba(5,5,5,0.8)_60%,#050505)]" />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 md:px-10">
                <button onClick={() => navigate(-1)} className="absolute top-24 left-4 md:left-10 z-20 flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-gray-400 hover:text-white transition-colors">
                    <MdArrowBack /> Back
                </button>

                {/* ===== THE RETROSPECTIVE OPENS ===== */}
                <div className="absolute inset-x-[-50vw] top-0 h-[100vh] -z-0">
                    {!reducedMotion && <StillDrift images={drift} />}
                </div>
                <section className="relative grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14 items-end min-h-[92vh] pt-36 md:pt-40 pb-16 md:pb-24">
                    <motion.div
                        className="md:col-span-4"
                        initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="relative aspect-[3/4] max-w-[22rem] overflow-hidden bg-[#0d0d0d] ring-1 ring-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.7)]">
                            {director.profileUrl ? (
                                <img src={sized(director.profileUrl, 'h632')} alt={director.name} className="w-full h-full object-cover grayscale contrast-[1.08]" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-serif text-7xl text-gray-600">
                                    {director.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                                </div>
                            )}
                            <span className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: light }} />
                        </div>
                    </motion.div>

                    <motion.div
                        className="md:col-span-8"
                        initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="font-mono text-[11px] tracking-[0.35em] uppercase" style={{ color: light }}>A retrospective</div>
                        <h1 className="mt-4 font-serif font-bold leading-[0.92] text-5xl sm:text-6xl md:text-7xl lg:text-[6.5rem]">{director.name}</h1>
                        <div className="mt-5 font-mono text-xs tracking-[0.2em] uppercase text-gray-400">
                            {[born && `${born}–${died || ''}`, director.placeOfBirth].filter(Boolean).join('  ·  ')}
                        </div>
                        <dl className="mt-10 grid grid-cols-3 max-w-xl border-y border-white/10">
                            {[
                                [films.length, films.length === 1 ? 'film in the atlas' : 'films in the atlas'],
                                [span || '—', 'the years'],
                                // a movement count of nought says nothing; how much of the work the canon holds says something
                                director.movements?.length
                                    ? [director.movements.length, director.movements.length === 1 ? 'movement' : 'movements']
                                    : [films.filter((f) => f.provenanceCount > 0).length, 'on the canon lists']
                            ].map(([n, label]) => (
                                <div key={label} className="py-4 pr-3">
                                    <dd className="font-serif text-3xl md:text-4xl leading-none text-white">{n}</dd>
                                    <dt className="mt-2 text-[10px] tracking-[0.25em] uppercase text-gray-500">{label}</dt>
                                </div>
                            ))}
                        </dl>
                    </motion.div>
                </section>

                {/* ===== THE LIFE, RUN THROUGH A PROJECTOR ===== */}
                {films.length > 0 && (
                    <motion.section {...reveal()} className="pt-10">
                        {kicker('The life, in films')}
                        <LifeScreen director={director} films={films} movements={director.movements || []} accent={light} reducedMotion={reducedMotion} />
                    </motion.section>
                )}

                {/* ===== THE POSTER WALL ===== */}
                {films.some((f) => f.posterUrl) && (
                    <section className="pt-28 md:pt-36">
                        <div className="flex items-end justify-between gap-6 mb-8">
                            <h2 className="font-serif text-4xl md:text-5xl">Posters</h2>
                            <span className="hidden sm:block font-mono text-[10px] tracking-[0.3em] uppercase text-gray-500 pb-2">hover a poster to turn its lamp up</span>
                        </div>
                        <PosterWall films={films} accent={light} reducedMotion={reducedMotion} />
                    </section>
                )}

                {/* ===== THE ARCHIVE CARD ===== */}
                {director.bio && (
                    <section className="pt-28 md:pt-36">
                        {kicker('From the archive')}
                        <ArchiveCard director={director} filmsCount={films.length} movements={director.movements || []} index={parseInt(director._id.slice(-4), 16) % 10000} reducedMotion={reducedMotion} />
                    </section>
                )}

                {/* ===== THEIR CIRCLE ===== */}
                {director.peers?.length > 0 ? (
                    <section className="pt-28 md:pt-36 pb-28">
                        <div className="flex items-end justify-between gap-6 mb-4">
                            <h2 className="font-serif text-4xl md:text-5xl">Their circle</h2>
                            <span className="hidden sm:block font-mono text-[10px] tracking-[0.3em] uppercase text-gray-500 pb-2">the directors they shared a movement with</span>
                        </div>
                        <Constellation director={director} movements={director.movements || []} peers={director.peers} reducedMotion={reducedMotion} />
                    </section>
                ) : <div className="pb-28" />}
            </div>
        </div>
    );
};

export default DirectorDetail;
