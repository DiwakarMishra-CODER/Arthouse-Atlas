import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdArrowBack, MdPlayArrow, MdCheck, MdBookmarkBorder, MdBookmark, MdFavoriteBorder, MdFavorite, MdArrowOutward } from 'react-icons/md';
import { moviesAPI, movementsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMovie } from '../context/MovieContext';
import { useMotionPreference } from '../hooks/useMotionPreference';
import LoadingSkeleton from '../components/LoadingSkeleton';
import StarRating from '../components/StarRating';
import PosterCard from '../components/PosterCard';
import CanonPassport from '../components/film/CanonPassport';
import useFilmLight from '../components/film/useFilmLight';
import { treatmentFor, displayTitle, sized } from '../components/movements/treatments';

/**
 * A film, as a cinémathèque programme note.
 *
 * The page is lit by the film itself: its still, blurred, glows behind
 * everything like light thrown off the screen, and the accent is read from
 * the still's own colour, so no two films' pages are the same colour. Below
 * the screen: the programme note, the technical sheet, the canon passport
 * (every list that places the film, stamped), the movement it belongs to,
 * a contact sheet of stills, and a double bill to follow it with.
 */

const YEAR_MIN = 1918;
const YEAR_MAX = new Date().getFullYear() + 1;
const pct = (y) => `${((y - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100}%`;

// dark ink on a pale accent, light ink on a deep one
const inkOn = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum > 0.6 ? '#0a0a0a' : '#ffffff';
};

const MovieDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const reducedMotion = useMotionPreference();
    // { id, data } — loading is simply "the loaded film isn't this one yet"
    const [result, setResult] = useState({ id: null, data: null });
    const [providers, setProviders] = useState(null);
    const [similarMovies, setSimilarMovies] = useState([]);
    const [movements, setMovements] = useState([]);
    const { isFavorite, isInWatchlist, isWatched, toggleFavorite, toggleWatchlist, toggleWatched } = useMovie();
    const loading = result.id !== id;
    const movie = loading ? null : result.data;
    const light = useFilmLight(movie?.backdropUrl || movie?.posterUrl);

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

    if (loading) return <div className="min-h-screen pt-24"><LoadingSkeleton /></div>;
    if (!movie) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <p className="text-muted">Film not found</p>
            </div>
        );
    }

    const ed = movie.editorial || {};
    const note = ed.synopsis || movie.synopsis;
    const backdrop = movie.backdropUrl || movie.posterUrl;
    const ties = (movie.movements || []).map((t) => movements.find((m) => m.title === t)).filter(Boolean);
    // a contact sheet with no holes: six or three across three columns, four or two across two
    const allStills = (movie.stills || []).filter((s) => s && s !== movie.backdropUrl);
    const stills = allStills.slice(0, allStills.length >= 6 ? 6 : allStills.length >= 4 ? 4 : allStills.length);
    const tags = [...(movie.genres || []).map((g) => ({ label: g, to: `/explore?genre=${encodeURIComponent(g)}` })),
        ...(movie.derivedTags || []).map((t) => ({ label: t, to: `/explore?tags=${encodeURIComponent(t)}` }))];

    const reveal = (delay = 0) => (reducedMotion ? {} : {
        initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-80px' },
        transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }
    });
    const kicker = (text) => <h2 className="font-mono text-[10px] tracking-[0.35em] uppercase text-gray-500 mb-6">{text}</h2>;

    const handleTrailer = () => {
        window.open(movie.trailerUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.title} trailer`)}`, '_blank');
    };
    // signed out, the shelf buttons send you to sign in rather than doing nothing
    const shelf = (fn) => (e) => {
        e.preventDefault();
        if (!isAuthenticated) return navigate('/login');
        return fn(movie);
    };
    const shelfButtons = [
        { on: isWatched(movie._id), label: 'Watched', Icon: MdCheck, OnIcon: MdCheck, act: toggleWatched },
        { on: isInWatchlist(movie._id), label: 'Watchlist', Icon: MdBookmarkBorder, OnIcon: MdBookmark, act: toggleWatchlist },
        { on: isFavorite(movie._id), label: 'Favourite', Icon: MdFavoriteBorder, OnIcon: MdFavorite, act: toggleFavorite }
    ];

    // the technical sheet, as a programme prints it
    const people = (names, linkFirst) => names.map((n, i) => (
        <span key={n}>
            {i > 0 && ', '}
            {linkFirst && i === 0 && movie.directorId ? <Link to={`/directors/${movie.directorId}`} className="hover:underline underline-offset-4" style={{ textDecorationColor: light }}>{n}</Link> : n}
        </span>
    ));
    const fiche = [
        ['Director', movie.directors?.length && people(movie.directors, true)],
        ['Cinematography', movie.cinematographers?.length && people(movie.cinematographers)],
        ['Music', movie.composers?.length && people(movie.composers)],
        ['Production', movie.productionCompanies?.length && movie.productionCompanies.slice(0, 2).join(', ')],
        ['Country', (movie.countries?.length ? movie.countries : [movie.country]).filter(Boolean).join(', ')],
        ['Year', movie.year],
        ['Running time', movie.runtime && `${movie.runtime} min`],
        ['Original title', movie.originalTitle && movie.originalTitle !== movie.title && <i>{movie.originalTitle}</i>]
    ].filter(([, v]) => v);

    return (
        <div className="relative min-h-screen text-white overflow-x-clip selection:bg-primary selection:text-black">
            {/* the screen's glow: the film's own still, thrown soft across the whole page */}
            <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none">
                {backdrop && (
                    <img src={sized(backdrop, 'w780')} alt="" className="absolute inset-0 w-full h-full object-cover scale-125 blur-[80px] saturate-[1.4] opacity-[0.28]" />
                )}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_10%,rgba(5,5,5,0.2),rgba(5,5,5,0.75)_60%,#050505)]" />
            </div>

            <div className="relative">
                {/* ===== THE SCREEN ===== */}
                <section className="relative h-[88vh] min-h-[560px] overflow-hidden">
                    {backdrop && (
                        <motion.img
                            src={sized(backdrop, 'original')}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{ objectPosition: '50% 30%' }}
                            initial={reducedMotion ? false : { scale: 1.08, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/55 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 via-[#050505]/20 to-transparent" />

                    <button onClick={() => navigate(-1)} className="absolute top-24 left-4 md:left-10 z-20 flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-gray-300 hover:text-white transition-colors">
                        <MdArrowBack /> Back
                    </button>

                    <motion.div
                        className="absolute inset-x-0 bottom-0 max-w-7xl mx-auto px-4 md:px-10 pb-12 md:pb-16"
                        initial={reducedMotion ? false : { opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="font-mono text-[11px] tracking-[0.3em] uppercase" style={{ color: light }}>
                            {[(movie.directors || []).join(' & '), movie.year, movie.country, movie.runtime && `${movie.runtime} min`].filter(Boolean).join('  ·  ')}
                        </div>
                        <h1 className="mt-4 font-serif font-bold leading-[0.95] text-5xl sm:text-6xl md:text-7xl lg:text-[6.5rem] max-w-5xl [text-shadow:0_4px_40px_rgba(0,0,0,0.6)]">
                            {movie.title}
                        </h1>
                        {movie.originalTitle && movie.originalTitle !== movie.title && (
                            <div className="mt-3 font-serif italic text-xl md:text-2xl text-gray-300">{movie.originalTitle}</div>
                        )}
                        {ed.hook && (
                            <p className="mt-6 max-w-2xl font-serif italic text-xl md:text-2xl leading-snug text-gray-100">{ed.hook}</p>
                        )}

                        <div className="mt-9 flex flex-wrap items-center gap-3">
                            <button
                                onClick={handleTrailer}
                                className="group flex items-center gap-2 pl-4 pr-6 py-3.5 text-xs font-semibold tracking-[0.25em] uppercase transition-[filter,box-shadow] hover:brightness-110"
                                style={{ backgroundColor: light, color: inkOn(light), boxShadow: `0 10px 40px ${light}55` }}
                            >
                                <MdPlayArrow className="text-xl transition-transform group-hover:scale-125" /> Trailer
                            </button>
                            {shelfButtons.map(({ on, label, Icon, OnIcon, act }) => (
                                <button
                                    key={label}
                                    onClick={shelf(act)}
                                    aria-pressed={on}
                                    title={isAuthenticated ? label : 'Sign in to keep track'}
                                    className={`flex items-center gap-2 px-4 py-3.5 text-xs tracking-[0.2em] uppercase backdrop-blur-md ring-1 transition-colors ${on ? 'bg-white/10' : 'bg-black/30 ring-white/20 text-gray-200 hover:bg-white/10 hover:text-white'}`}
                                    style={on ? { color: light, '--tw-ring-color': light } : undefined}
                                >
                                    {on ? <OnIcon className="text-lg" /> : <Icon className="text-lg" />} {label}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </section>

                <div className="max-w-7xl mx-auto px-4 md:px-10">
                    {/* ===== THE PROGRAMME NOTE + TECHNICAL SHEET ===== */}
                    <section className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-16 pt-16 md:pt-20">
                        <motion.div {...reveal()} className="lg:col-span-7">
                            {kicker('Programme note')}
                            {note && (
                                <p className="text-gray-200 text-lg md:text-xl leading-relaxed first-letter:float-left first-letter:font-serif first-letter:text-[4.6rem] first-letter:leading-[0.8] first-letter:mr-3 first-letter:mt-1.5 first-letter:text-[var(--light)]" style={{ '--light': light }}>
                                    {note}
                                </p>
                            )}
                            {ed.whyItMatters && (
                                <blockquote className="mt-12 pl-6 border-l-2" style={{ borderColor: light }}>
                                    <div className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: light }}>Why it matters</div>
                                    <p className="font-serif text-2xl md:text-[1.7rem] leading-snug text-white">{ed.whyItMatters}</p>
                                </blockquote>
                            )}
                            {tags.length > 0 && (
                                <p className="mt-12 text-sm leading-loose text-gray-500">
                                    {tags.map((t, i) => (
                                        <span key={t.label}>
                                            {i > 0 && <span className="mx-2.5 text-gray-700">/</span>}
                                            <Link to={t.to} className="text-gray-400 hover:text-white transition-colors capitalize">{t.label}</Link>
                                        </span>
                                    ))}
                                </p>
                            )}
                        </motion.div>

                        <motion.aside {...reveal(0.12)} className="lg:col-span-5">
                            <div className="flex gap-6 items-start">
                                {movie.posterUrl && (
                                    <img
                                        src={sized(movie.posterUrl, 'w342')}
                                        alt={`${movie.title} poster`}
                                        className="w-32 md:w-40 shrink-0 ring-1 ring-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] -rotate-2"
                                    />
                                )}
                                <div className="pt-1">
                                    <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-gray-500 mb-2">Your rating</div>
                                    <StarRating movie={movie} />
                                </div>
                            </div>

                            <dl className="mt-10">
                                {fiche.map(([label, value]) => (
                                    <div key={label} className="flex items-baseline gap-3 py-2.5 text-[15px]">
                                        <dt className="shrink-0 font-mono text-[10px] tracking-[0.25em] uppercase text-gray-500">{label}</dt>
                                        <span aria-hidden="true" className="flex-1 border-b border-dotted border-white/15 translate-y-[-3px]" />
                                        <dd className="text-right text-gray-200 font-serif">{value}</dd>
                                    </div>
                                ))}
                            </dl>

                            {(providers === null || providers.length > 0) && (
                                <div className="mt-10">
                                    <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-gray-500 mb-4">Where to watch</div>
                                    {providers === null ? (
                                        <div className="animate-pulse h-9 w-40 bg-white/5" />
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {providers.map((p) => (
                                                <a
                                                    key={p.provider_id}
                                                    href={`https://www.google.com/search?q=Watch+${encodeURIComponent(movie.title)}+on+${encodeURIComponent(p.provider_name)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 pr-3 bg-white/[0.04] ring-1 ring-white/10 hover:ring-white/30 transition-colors"
                                                >
                                                    <img src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt="" className="w-8 h-8 object-cover" />
                                                    <span className="text-xs text-gray-300 whitespace-nowrap">{p.provider_name}</span>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.aside>
                    </section>

                    {/* ===== THE CANON PASSPORT ===== */}
                    <section className="pt-24 md:pt-32">
                        <div className="flex items-end justify-between gap-6 mb-8">
                            <h2 className="font-serif text-4xl md:text-5xl">Where the canon places it</h2>
                        </div>
                        <CanonPassport provenance={movie.provenance || []} score={movie.provenanceScore} accent={light} reducedMotion={reducedMotion} />
                    </section>

                    {/* ===== ITS MOVEMENT ===== */}
                    {ties.map((m) => {
                        const t = treatmentFor(m);
                        return (
                            <motion.section key={m._id} {...reveal()} className="pt-24 md:pt-32">
                                {kicker('Part of a movement')}
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
                                        <div className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: t.accent }}>{m.era} · {m.region}</div>
                                        <div className="mt-3 font-serif text-3xl md:text-4xl text-white">{displayTitle(m)}</div>
                                        {(m.tagline || m.vibe) && <div className="mt-2 font-serif italic text-gray-400">{m.tagline || m.vibe}</div>}

                                        {/* the movement on the century, with this film marked in it */}
                                        <div className="relative mt-8 h-8" aria-hidden="true">
                                            <span className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
                                            <span className="absolute top-1/2 -translate-y-1/2 h-[5px]" style={{ left: pct(m.startYear), right: `calc(100% - ${pct(m.endYear || YEAR_MAX)})`, backgroundColor: t.accent }} />
                                            <span className="absolute top-0 bottom-0 w-[2px] bg-white" style={{ left: pct(movie.year) }} />
                                            <span className="absolute -top-4 -translate-x-1/2 font-mono text-[10px] text-white" style={{ left: pct(movie.year) }}>{movie.year}</span>
                                            <span className="absolute -bottom-3 left-0 font-mono text-[9px] text-gray-600">1920</span>
                                            <span className="absolute -bottom-3 right-0 font-mono text-[9px] text-gray-600">now</span>
                                        </div>

                                        <div className="mt-auto pt-8 flex items-center justify-between text-[11px] tracking-[0.25em] uppercase text-gray-400">
                                            <span>{m.filmCount} films on the reel</span>
                                            <span className="flex items-center gap-1.5 text-gray-200 group-hover:text-white transition-colors">Open the movement <MdArrowOutward /></span>
                                        </div>
                                    </div>
                                </Link>
                            </motion.section>
                        );
                    })}

                    {/* ===== CONTACT SHEET ===== */}
                    {stills.length >= 2 && (
                        <section className="pt-24 md:pt-32">
                            {kicker('Contact sheet')}
                            <div className={`grid grid-cols-2 gap-2 p-2 bg-[#0d0d0d] ring-1 ring-white/[0.06] ${stills.length % 3 === 0 ? 'md:grid-cols-3' : ''}`}>
                                {stills.map((s, i) => (
                                    <motion.figure key={s} {...reveal(i * 0.06)} className="relative aspect-video overflow-hidden group">
                                        <img src={sized(s, 'w780')} alt="" loading="lazy" className="w-full h-full object-cover grayscale-[0.4] group-hover:grayscale-0 transition-[filter,transform] duration-700 group-hover:scale-[1.03]" />
                                        <figcaption className="absolute bottom-1.5 left-2 font-mono text-[9px] tracking-[0.2em] text-white/70">{String(i + 1).padStart(2, '0')}A</figcaption>
                                    </motion.figure>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ===== DOUBLE BILL ===== */}
                    {similarMovies.length > 0 && (
                        <section className="pt-24 md:pt-32 pb-28">
                            <div className="flex items-end justify-between gap-6 mb-8">
                                <h2 className="font-serif text-4xl md:text-5xl">Make it a double bill</h2>
                                <span className="hidden md:block font-mono text-[10px] tracking-[0.3em] uppercase text-gray-500 pb-2">after {movie.title}</span>
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
                                {similarMovies.slice(0, 6).map((m) => (
                                    <div key={m._id} className="relative z-0 hover:z-50">
                                        <PosterCard movie={m} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MovieDetail;
