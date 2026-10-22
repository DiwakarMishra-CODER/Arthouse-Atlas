import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdArrowBack, MdArrowOutward, MdTheaters, MdViewList, MdGridView } from 'react-icons/md';
import { movementsAPI } from '../services/api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import LoadingSkeleton from '../components/LoadingSkeleton';
import TreatmentTitle from '../components/movements/TreatmentTitle';
import MovementCard from '../components/movements/MovementCard';
import FilmIndexList from '../components/movements/FilmIndexList';
import FilmReel from '../components/movements/FilmReel';
import Clapperboard from '../components/movements/Clapperboard';
import LineageTimeline from '../components/movements/LineageTimeline';
import OpeningScene from '../components/movements/OpeningScene';
import ProjectionRoom from '../components/movements/ProjectionRoom';
import { treatmentFor, displayTitle, sized } from '../components/movements/treatments';
import { usePageTitle } from '../hooks/usePageTitle';
import NotFound from './NotFound';

/**
 * One movement, structured like a screening rather than an article:
 * lights down (the title card gives way to the screen) → the slate and the
 * manifesto → the rules as intertitles → the films on a running reel → the
 * people as a casting sheet → lineage on the century → the next reel.
 * Typography and grade come from the movement's treatment, so Soviet Montage
 * and Slow Cinema are different pages in the same projection room.
 */

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

// dark ink on a pale accent, light ink on a deep one
const inkOn = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum > 0.6 ? '#0a0a0a' : '#ffffff';
};

// Each title card gets one quiet gesture from its cinema behind the type
const TitleCardBackdrop = ({ t }) => {
    switch (t.key) {
        case 'expressionist':
            return <div className="absolute inset-0 bg-[linear-gradient(118deg,transparent_38%,rgba(255,255,255,0.055)_38%,rgba(255,255,255,0.055)_52%,transparent_52%)]" />;
        case 'constructivist':
            // "Beat the Whites with the Red Wedge"
            return (
                <svg className="absolute inset-0 w-full h-full opacity-[0.22]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <polygon points="0,100 62,46 70,58" fill="#d0201f" />
                    <circle cx="80" cy="30" r="14" fill="none" stroke="#d0201f" strokeWidth="0.4" />
                </svg>
            );
        case 'classical':
            return (
                <>
                    <div className="absolute top-[18%] inset-x-[12%] h-px bg-gold/30" />
                    <div className="absolute top-[18%] mt-1.5 inset-x-[12%] h-px bg-gold/15" />
                    <div className="absolute bottom-[18%] inset-x-[12%] h-px bg-gold/30" />
                    <div className="absolute bottom-[18%] mb-1.5 inset-x-[12%] h-px bg-gold/15" />
                </>
            );
        case 'nouvelle':
            return (
                <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 flex w-40 md:w-56 h-1.5">
                    <span className="flex-1 bg-[#0046ad]" /><span className="flex-1 bg-white" /><span className="flex-1 bg-[#e10600]" />
                </div>
            );
        case 'neorealist':
            return <div className="absolute inset-0 film-grain-overlay animated opacity-80" />;
        case 'neon':
            return <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 55%, ${t.accent}22, transparent 60%)` }} />;
        case 'raw':
            return (
                <div className="absolute inset-[8%] md:inset-[10%]">
                    {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((c) => (
                        <span key={c} className={`absolute w-8 h-8 md:w-12 md:h-12 border-white/40 ${c}`} />
                    ))}
                    <div className="absolute top-3 right-4 flex items-center gap-2 font-label text-xs text-white/60 tracking-[0.14em]">
                        <span className="w-2 h-2 rounded-full bg-[#ff3b30] animate-pulse motion-reduce:animate-none" /> REC
                    </div>
                </div>
            );
        case 'collage':
            return (
                <>
                    <div className="absolute left-[12%] top-[22%] w-40 h-24 bg-[#f1ead8]/[0.06] rotate-6" />
                    <div className="absolute right-[14%] bottom-[24%] w-56 h-28 bg-[#e8d44d]/[0.05] -rotate-3" />
                </>
            );
        default:
            return null; // contemplative: the emptiness is the gesture
    }
};

const MovementDetail = () => {
    const { slug } = useParams();
    // { slug, data } — loading is simply "the loaded slug isn't this one yet"
    const [result, setResult] = useState({ slug: null, data: null });
    const [filmView, setFilmView] = useState('reel');
    const reducedMotion = useMotionPreference();

    useEffect(() => {
        let cancelled = false;
        movementsAPI.getOne(slug)
            .then((res) => { if (!cancelled) setResult({ slug, data: res.data }); })
            .catch((err) => { console.error('Failed to fetch movement:', err); if (!cancelled) setResult({ slug, data: null }); });
        window.scrollTo(0, 0);
        return () => { cancelled = true; };
    }, [slug]);

    const loading = result.slug !== slug;
    const movement = result.data;
    usePageTitle(movement ? displayTitle(movement) : loading ? null : 'Movement not found', movement?.tagline || undefined);

    if (loading) return <div className="min-h-screen pt-24"><LoadingSkeleton label="Threading the movement" /></div>;
    if (!movement) {
        return <NotFound kicker="Not in the atlas" title="There’s no movement here by that name." line="The link may be wrong, or the movement may have been renamed." links={[{ to: '/movements', label: 'All the movements' }, { to: '/', label: 'The home page' }]} />;
    }

    const t = treatmentFor(movement);
    const ed = movement.editorial || {};
    const essay = (ed.essay || '').split(/\n\s*\n/).filter(Boolean);
    const startWith = (movement.startWith || []).filter((s) => s.title);
    const rules = movement.visualSignatures || [];
    const lineage = movement.lineage || { grewFrom: [], fed: [] };
    const people = movement.keyDirectors || [];
    const films = movement.films || [];
    const reveal = (delay = 0) => (reducedMotion ? {} : {
        initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-80px' },
        transition: { duration: 0.9, delay, ease: [0.25, 0.1, 0.25, 1] }
    });
    const span = movement.endYear ? `${movement.endYear - movement.startYear}` : `${new Date().getFullYear() - movement.startYear}+`;
    const kicker = (h) => <h2 className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-500 mb-8">{h}</h2>;

    return (
        <div className="relative min-h-screen text-white overflow-x-clip selection:bg-gold selection:text-black">
            {/* the same projection room as the index, lit for this movement alone */}
            <ProjectionRoom tint={t.accent} reducedMotion={reducedMotion} />

            <Link to="/movements" className="font-label absolute top-24 left-4 md:left-10 z-30 flex items-center gap-2 text-xs tracking-[0.14em] uppercase text-gray-500 hover:text-white transition-colors">
                <MdArrowBack /> Movements
            </Link>

            <div className="relative">
                {/* ===== 1 · LIGHTS DOWN — the title card gives way to the screen ===== */}
                <OpeningScene
                    movement={movement}
                    treatment={t}
                    reducedMotion={reducedMotion}
                    backdrop={movement.heroBackdrop}
                    gesture={<TitleCardBackdrop t={t} />}
                    kicker={
                        <div className="font-label text-[12px] tracking-[0.14em] uppercase mb-10 md:mb-12" style={{ color: t.accent }}>
                            {movement.era} <span className="text-gray-400 mx-3">/</span> {movement.region}
                        </div>
                    }
                    title={<TreatmentTitle movement={movement} size="display" as="h1" center />}
                    tagline={(movement.tagline || movement.vibe) && (
                        <p className={`mt-10 md:mt-12 font-serif italic text-gray-300 ${t.key === 'contemplative' ? 'text-base' : 'text-xl md:text-2xl'}`}>
                            {movement.tagline || movement.vibe}
                        </p>
                    )}
                />

                <div className="max-w-6xl mx-auto px-4 md:px-8">
                    {/* ===== 2 · THE SLATE + MANIFESTO ===== */}
                    <section className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-16 items-start pt-24 md:pt-32">
                        <div className="lg:col-span-5">
                            <Clapperboard
                                title={displayTitle(movement)}
                                era={movement.era}
                                region={movement.region}
                                takes={movement.filmCount}
                                director={people.slice(0, 2).map((d) => d.name).join(', ') || '—'}
                                span={span}
                                accent={t.accent}
                                reducedMotion={reducedMotion}
                            />
                        </div>
                        <motion.div {...reveal(0.1)} className="lg:col-span-7">
                            {essay.length > 0 ? (
                                essay.map((p, i) => <p key={i} className="text-gray-200 text-lg leading-relaxed mb-6">{p}</p>)
                            ) : (
                                <>
                                    <p className="font-serif text-3xl md:text-[2.6rem] leading-[1.2] text-white">
                                        <span className="font-serif text-6xl leading-none align-[-0.35em] mr-1" style={{ color: t.accent }}>“</span>
                                        {movement.vibe}
                                    </p>
                                    <p className="mt-10 text-gray-300 text-lg leading-relaxed">{movement.description}</p>
                                    {movement.philosophy && (
                                        <p className="mt-6 pl-5 border-l-2 text-gray-400 leading-relaxed" style={{ borderColor: `${t.accent}88` }}>{movement.philosophy}</p>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </section>

                    {/* ===== 3 · THE RULES, as intertitles ===== */}
                    {rules.length > 0 && (
                        <section className="pt-28 md:pt-36">
                            {kicker('The rules')}
                            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                                {rules.map((r, i) => (
                                    <motion.li
                                        key={i}
                                        initial={reducedMotion ? false : { opacity: 0 }}
                                        whileInView={{ opacity: [0, 1, 0.25, 1, 0.6, 1] }}
                                        viewport={{ once: true, margin: '-60px' }}
                                        transition={{ duration: 0.7, delay: i * 0.18, times: [0, 0.2, 0.3, 0.5, 0.6, 1] }}
                                        className={`relative overflow-hidden min-h-[13rem] md:min-h-[15rem] flex items-center justify-center text-center px-10 md:px-16 py-12 ring-1 ring-white/[0.06] bg-[radial-gradient(ellipse_at_50%_45%,#1b1813_0%,#0c0b09_58%,#050505_100%)] ${rules.length % 2 === 1 && i === rules.length - 1 ? 'sm:col-span-2' : ''}`}
                                    >
                                        {/* the print: grain, a couple of scratches, a big numeral pressed into the card */}
                                        <span aria-hidden="true" className="absolute inset-0 opacity-60"><span className="block w-full h-full film-grain-overlay animated" /></span>
                                        <span aria-hidden="true" className="absolute inset-y-0 left-[22%] w-px bg-white/[0.07] intertitle-scratch" />
                                        <span aria-hidden="true" className="absolute inset-y-0 left-[74%] w-px bg-white/[0.05] intertitle-scratch [animation-delay:1.7s]" />
                                        <span aria-hidden="true" className="absolute -right-3 -bottom-12 font-serif italic leading-none text-[10rem] md:text-[12rem] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.07)] select-none">
                                            {ROMAN[i]}
                                        </span>

                                        {/* the art-deco frame */}
                                        <span aria-hidden="true" className="absolute inset-4 md:inset-5 border pointer-events-none" style={{ borderColor: `${t.accent}26` }} />
                                        {['top-3 left-3 border-t-2 border-l-2', 'top-3 right-3 border-t-2 border-r-2', 'bottom-3 left-3 border-b-2 border-l-2', 'bottom-3 right-3 border-b-2 border-r-2'].map((c) => (
                                            <span key={c} aria-hidden="true" className={`absolute w-6 h-6 md:w-8 md:h-8 ${c}`} style={{ borderColor: `${t.accent}99` }} />
                                        ))}
                                        {['top-[9px] left-1/2', 'bottom-[9px] left-1/2'].map((c) => (
                                            <span key={c} aria-hidden="true" className={`absolute ${c} -translate-x-1/2 w-2 h-2 rotate-45`} style={{ backgroundColor: t.accent }} />
                                        ))}

                                        <div className={`relative ${reducedMotion ? '' : 'projector-flicker'}`}>
                                            <div className="flex items-center justify-center gap-3 font-label text-[12px] tracking-[0.14em] uppercase" style={{ color: t.accent }}>
                                                <span className="h-px w-8 bg-current opacity-60" />
                                                Rule {ROMAN[i]}
                                                <span className="h-px w-8 bg-current opacity-60" />
                                            </div>
                                            <p className="mt-5 font-serif italic text-[2rem] md:text-[2.6rem] leading-[1.08] text-[#f1ead8] [text-shadow:0_0_28px_rgba(255,236,200,0.16)] first-letter:uppercase">
                                                {r}
                                            </p>
                                        </div>
                                    </motion.li>
                                ))}
                            </ol>
                        </section>
                    )}

                    {/* ===== 4 · WHERE TO START (once written) ===== */}
                    {startWith.length > 0 && (
                        <section className="pt-28">
                            <h2 className="font-serif text-4xl mb-10">Where to start</h2>
                            <ol className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {startWith.map((s, i) => (
                                    <motion.li key={i} {...reveal(i * 0.1)}>
                                        {s.film?.backdropUrl && (
                                            <Link to={`/movie/${s.film._id}`} className="block aspect-video overflow-hidden mb-4 ring-1 ring-white/10">
                                                <img src={s.film.backdropUrl} alt="" className="w-full h-full object-cover" style={{ filter: t.screenFilter }} loading="lazy" />
                                            </Link>
                                        )}
                                        <div className="font-label text-xs mb-2" style={{ color: t.accent }}>{String(i + 1).padStart(2, '0')}</div>
                                        <h3 className="font-serif text-2xl mb-2">{s.title}</h3>
                                        <p className="text-gray-400 leading-relaxed">{s.why}</p>
                                    </motion.li>
                                ))}
                            </ol>
                        </section>
                    )}

                    {/* ===== 5 · THE FILMS — heading and view ===== */}
                    <section className="pt-28 md:pt-36">
                        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                            <h2 className="font-serif text-4xl md:text-6xl">The films</h2>
                            {/* a switch, not a row of labels: the chosen view is a lit block that slides between them */}
                            <div role="tablist" aria-label="View the films as" className="relative flex p-1 bg-[#0d0d0d] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                {[['reel', MdTheaters], ['index', MdViewList], ['posters', MdGridView]].map(([v, Icon]) => {
                                    const on = filmView === v;
                                    return (
                                        <button
                                            key={v}
                                            role="tab"
                                            aria-selected={on}
                                            onClick={() => setFilmView(v)}
                                            className={`font-label group relative flex items-center gap-2 px-4 md:px-5 py-2.5 text-[12px] tracking-[0.14em] uppercase transition-colors duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${on ? '' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}`}
                                            style={on ? { color: inkOn(t.accent) } : undefined}
                                        >
                                            {on && (
                                                <motion.span
                                                    layoutId="film-view"
                                                    className="absolute inset-0"
                                                    style={{ backgroundColor: t.accent, boxShadow: `0 0 24px ${t.accent}55` }}
                                                    transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38 }}
                                                />
                                            )}
                                            <Icon className={`relative text-base transition-transform duration-300 ${on ? '' : 'group-hover:scale-110'}`} />
                                            <span className="relative">{v}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {filmView !== 'reel' && <FilmIndexList films={films} treatment={t} view={filmView} />}
                    </section>
                </div>

                {/* the reel runs full width, outside the page's measure */}
                {filmView === 'reel' && films.length > 0 && <FilmReel films={films} treatment={t} />}

                <div className="max-w-6xl mx-auto px-4 md:px-8">
                    {/* ===== 6 · THE PEOPLE — a casting sheet ===== */}
                    {people.length > 0 && (
                        <section className="pt-28 md:pt-36">
                            {kicker('The people')}
                            <ol className={`grid gap-x-4 md:gap-x-6 gap-y-8 ${people.length <= 4 ? 'grid-cols-2 sm:grid-cols-4 max-w-4xl' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'}`}>
                                {people.map((d, i) => {
                                    const inner = (
                                        <>
                                            <div className="relative aspect-[3/4] overflow-hidden bg-[#0d0d0d] ring-1 ring-white/10 transition-shadow duration-500 group-hover:ring-[var(--accent)]">
                                                {d.profileUrl ? (
                                                    <img
                                                        src={sized(d.profileUrl, 'w342')}
                                                        alt=""
                                                        loading="lazy"
                                                        className="w-full h-full object-cover grayscale contrast-[1.1] brightness-90 transition-[filter,transform] duration-700 group-hover:grayscale-0 group-hover:brightness-100 group-hover:scale-[1.04]"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-serif text-4xl text-gray-600">
                                                        {d.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                                                    </div>
                                                )}
                                                <span className="absolute top-2 left-2 font-label text-[12px] text-white/80 bg-black/60 px-1.5 py-0.5">{String(i + 1).padStart(2, '0')}</span>
                                            </div>
                                            <div className="mt-3 font-courier text-[15px] leading-tight text-gray-200 group-hover:text-white transition-colors">{d.name}</div>
                                        </>
                                    );
                                    return (
                                        <motion.li key={d.name} {...reveal(Math.min(i, 6) * 0.06)} style={{ '--accent': t.accent }}>
                                            {d.directorId ? (
                                                <Link to={`/directors/${d.directorId}`} className="group block">{inner}</Link>
                                            ) : <div className="group">{inner}</div>}
                                        </motion.li>
                                    );
                                })}
                            </ol>
                        </section>
                    )}

                    {/* ===== 7 · LINEAGE — a family tree laid on the century ===== */}
                    {(lineage.grewFrom.length > 0 || lineage.fed.length > 0) && (
                        <section className="pt-28 md:pt-36">
                            {kicker('Lineage')}
                            <LineageTimeline movement={movement} grewFrom={lineage.grewFrom} fed={lineage.fed} accent={t.accent} />
                        </section>
                    )}

                    {/* ===== 8 · NEXT REEL — with the changeover cue in the corner ===== */}
                    {movement.next && (
                        <section className="pt-32 md:pt-44 pb-28">
                            <div className="font-label flex items-center gap-4 mb-8 text-[12px] tracking-[0.14em] uppercase text-gray-500">
                                Next reel <MdArrowOutward />
                                <span className="flex-1 h-px bg-white/[0.08]" />
                            </div>
                            <div className="relative">
                                <MovementCard movement={movement.next} size="teaser" aspect="aspect-video" reducedMotion={reducedMotion} />
                                {!reducedMotion && (
                                    <motion.span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute top-[5%] right-[4%] w-7 h-7 md:w-9 md:h-9 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.95)_0_45%,rgba(255,255,255,0)_72%)] mix-blend-screen"
                                        initial={{ opacity: 0 }}
                                        whileInView={{ opacity: [0, 0, 1, 0, 0, 1, 0] }}
                                        viewport={{ margin: '-120px' }}
                                        transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3.5, times: [0, 0.2, 0.26, 0.34, 0.6, 0.66, 0.74] }}
                                    />
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MovementDetail;
