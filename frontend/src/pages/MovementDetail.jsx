import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdArrowBack, MdArrowOutward } from 'react-icons/md';
import { movementsAPI } from '../services/api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import LoadingSkeleton from '../components/LoadingSkeleton';
import TreatmentTitle from '../components/movements/TreatmentTitle';
import MovementCard from '../components/movements/MovementCard';
import FilmIndexList from '../components/movements/FilmIndexList';
import { treatmentFor, displayTitle } from '../components/movements/treatments';

/**
 * One movement, structured like a film rather than an article:
 * opening title card → the screen → manifesto → the films → the people →
 * lineage → next reel. Typography and grade come from the movement's
 * treatment, so Soviet Montage and Slow Cinema are different pages.
 */

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

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
                    <div className="absolute top-[18%] inset-x-[12%] h-px bg-[#c5a059]/30" />
                    <div className="absolute top-[18%] mt-1.5 inset-x-[12%] h-px bg-[#c5a059]/15" />
                    <div className="absolute bottom-[18%] inset-x-[12%] h-px bg-[#c5a059]/30" />
                    <div className="absolute bottom-[18%] mb-1.5 inset-x-[12%] h-px bg-[#c5a059]/15" />
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
                    <div className="absolute top-3 right-4 flex items-center gap-2 font-mono text-xs text-white/60 tracking-widest">
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

    if (loading) return <div className="min-h-screen pt-24 bg-black"><LoadingSkeleton /></div>;
    if (!movement) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center bg-black">
                <div className="text-xl text-gray-400">Movement not found</div>
            </div>
        );
    }

    const t = treatmentFor(movement);
    const ed = movement.editorial || {};
    const essay = (ed.essay || '').split(/\n\s*\n/).filter(Boolean);
    const startWith = (movement.startWith || []).filter((s) => s.title);
    const rules = movement.visualSignatures || [];
    const lineage = movement.lineage || { grewFrom: [], fed: [] };
    const reveal = (delay = 0) => (reducedMotion ? {} : {
        initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-80px' },
        transition: { duration: 0.9, delay, ease: [0.25, 0.1, 0.25, 1] }
    });
    const span = movement.endYear ? `${movement.endYear - movement.startYear}` : `${new Date().getFullYear() - movement.startYear}+`;

    return (
        <div className="min-h-screen bg-black text-white overflow-x-clip selection:bg-primary selection:text-black">

            <Link to="/movements" className="absolute top-24 left-4 md:left-10 z-20 flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-gray-500 hover:text-white transition-colors">
                <MdArrowBack /> Movements
            </Link>

            {/* ===== 1 · TITLE CARD ===== */}
            <section className="relative min-h-[88vh] flex flex-col items-center justify-center text-center px-6 pt-24 pb-16">
                <TitleCardBackdrop t={t} />
                <motion.div
                    initial={reducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.4 }}
                    className="relative z-10 w-full max-w-5xl"
                >
                    <div className="text-[11px] tracking-[0.4em] uppercase mb-10 md:mb-14" style={{ color: t.accent }}>
                        {movement.era} <span className="text-gray-400 mx-3">/</span> {movement.region}
                    </div>
                    <TreatmentTitle movement={movement} size="display" as="h1" center />
                    {(movement.tagline || movement.vibe) && (
                        <p className={`mt-12 md:mt-16 font-serif italic text-gray-400 ${t.key === 'contemplative' ? 'text-base' : 'text-xl md:text-2xl'}`}>
                            {movement.tagline || movement.vibe}
                        </p>
                    )}
                </motion.div>
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[11px] tracking-[0.3em] text-gray-400 uppercase">
                    {movement.filmCount} films <span className="mx-2">·</span> scroll
                </div>
            </section>

            {/* ===== 2 · THE SCREEN ===== */}
            {movement.heroBackdrop && (
                <motion.figure {...reveal()} className="relative max-w-6xl mx-auto px-4 md:px-8">
                    {/* the light from the booth */}
                    <div className="absolute -inset-x-10 -inset-y-16 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_65%)] pointer-events-none" />
                    <div className="relative aspect-video overflow-hidden bg-[#0a0a0a] ring-1 ring-white/[0.06] shadow-[0_40px_120px_rgba(0,0,0,0.9)]">
                        <img
                            src={movement.heroBackdrop}
                            alt={movement.heroCredit ? `Still from ${movement.heroCredit.title}` : ''}
                            className="w-full h-full object-cover"
                            style={{ objectPosition: movement.heroFocus || '50% 35%', filter: t.screenFilter }}
                        />
                    </div>
                    {movement.heroCredit && (
                        <figcaption className="relative mt-4 flex justify-between font-mono text-[11px] tracking-[0.25em] uppercase text-gray-400">
                            <span>
                                Still ·{' '}
                                {movement.heroCredit._id ? (
                                    <Link to={`/movie/${movement.heroCredit._id}`} className="text-gray-400 hover:text-white transition-colors">
                                        {movement.heroCredit.title} ({movement.heroCredit.year})
                                    </Link>
                                ) : `${movement.heroCredit.title} (${movement.heroCredit.year})`}
                            </span>
                            <span className="hidden md:inline">{displayTitle(movement)}</span>
                        </figcaption>
                    )}
                </motion.figure>
            )}

            <div className="max-w-6xl mx-auto px-4 md:px-8">

                {/* ===== 3 · MANIFESTO ===== */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 pt-28 md:pt-36">
                    <motion.div {...reveal()} className="lg:col-span-7">
                        {essay.length > 0 ? (
                            essay.map((p, i) => <p key={i} className="text-gray-200 text-lg leading-relaxed mb-6">{p}</p>)
                        ) : (
                            <>
                                <p className="font-serif text-3xl md:text-[2.6rem] leading-[1.2] text-white">
                                    <span className="font-serif text-6xl leading-none align-[-0.35em] mr-1" style={{ color: t.accent }}>“</span>
                                    {movement.vibe}
                                </p>
                                <p className="mt-10 text-gray-300 text-lg leading-relaxed">{movement.description}</p>
                                <p className="mt-6 text-gray-500 leading-relaxed">{movement.philosophy}</p>
                            </>
                        )}
                    </motion.div>

                    <motion.aside {...reveal(0.15)} className="lg:col-span-5">
                        {/* the numbers */}
                        <dl className="grid grid-cols-3 border-y border-white/[0.08] mb-12">
                            {[[movement.filmCount, 'films here'], [span, 'years'], [(movement.keyDirectors || []).length, 'key figures']].map(([n, label]) => (
                                <div key={label} className="py-5 pr-3">
                                    <dt className="sr-only">{label}</dt>
                                    <dd className="font-serif text-4xl md:text-5xl leading-none" style={{ color: t.accent }}>{n}</dd>
                                    <div className="mt-2 text-[11px] tracking-[0.25em] uppercase text-gray-400">{label}</div>
                                </div>
                            ))}
                        </dl>

                        {rules.length > 0 && (
                            <>
                                <h2 className="text-[11px] tracking-[0.35em] uppercase text-gray-500 mb-5">The rules</h2>
                                <ol>
                                    {rules.map((r, i) => (
                                        <li key={i} className="flex gap-5 py-3.5 border-b border-white/[0.06]">
                                            <span className="font-mono text-xs pt-1 w-8 flex-shrink-0" style={{ color: t.accent }}>{ROMAN[i]}.</span>
                                            <span className="text-gray-200 first-letter:uppercase">{r}</span>
                                        </li>
                                    ))}
                                </ol>
                            </>
                        )}
                    </motion.aside>
                </section>

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
                                    <div className="font-mono text-xs mb-2" style={{ color: t.accent }}>{String(i + 1).padStart(2, '0')}</div>
                                    <h3 className="font-serif text-2xl mb-2">{s.title}</h3>
                                    <p className="text-gray-400 leading-relaxed">{s.why}</p>
                                </motion.li>
                            ))}
                        </ol>
                    </section>
                )}

                {/* ===== 5 · THE FILMS ===== */}
                <section className="pt-28 md:pt-36">
                    <div className="flex items-end justify-between mb-8">
                        <h2 className="font-serif text-4xl md:text-6xl">The films</h2>
                        <span className="text-xs tracking-[0.2em] uppercase text-gray-400 pb-2">{movement.filmCount} in the atlas · by year</span>
                    </div>
                    <FilmIndexList films={movement.films || []} treatment={t} />
                </section>

                {/* ===== 6 · THE PEOPLE ===== */}
                {(movement.keyDirectors || []).length > 0 && (
                    <section className="pt-28 md:pt-36">
                        <h2 className="text-[11px] tracking-[0.35em] uppercase text-gray-500 mb-8">The people</h2>
                        <p className="font-serif text-3xl md:text-5xl leading-[1.25]">
                            {movement.keyDirectors.map((d, i) => (
                                <span key={d.name}>
                                    {d.directorId ? (
                                        <Link to={`/directors/${d.directorId}`} className="text-white hover:opacity-70 transition-opacity border-b border-white/20">{d.name}</Link>
                                    ) : (
                                        <span className="text-gray-300">{d.name}</span>
                                    )}
                                    {i < movement.keyDirectors.length - 1 && <span className="mx-3 md:mx-4" style={{ color: t.accent }}>/</span>}
                                </span>
                            ))}
                        </p>
                    </section>
                )}

                {/* ===== 7 · LINEAGE ===== */}
                {(lineage.grewFrom.length > 0 || lineage.fed.length > 0) && (
                    <section className="pt-28 md:pt-36">
                        <h2 className="text-[11px] tracking-[0.35em] uppercase text-gray-500 mb-10">Lineage</h2>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-10">
                            <LineageColumn label="Grew from" items={lineage.grewFrom} align="right" />
                            <div className="flex items-center justify-center gap-4 md:gap-6">
                                <span className="hidden md:block h-px w-12 bg-white/20" />
                                <div className="px-6 py-5 border text-center font-serif text-xl md:text-2xl" style={{ borderColor: `${t.accent}66`, color: t.accent }}>
                                    {displayTitle(movement)}
                                </div>
                                <span className="hidden md:block h-px w-12 bg-white/20" />
                            </div>
                            <LineageColumn label="Fed into" items={lineage.fed} align="left" />
                        </div>
                    </section>
                )}

                {/* ===== 8 · NEXT REEL ===== */}
                {movement.next && (
                    <section className="pt-32 md:pt-44 pb-28">
                        <div className="flex items-center gap-4 mb-8 text-[11px] tracking-[0.35em] uppercase text-gray-500">
                            Next reel <MdArrowOutward />
                            <span className="flex-1 h-px bg-white/[0.08]" />
                        </div>
                        <MovementCard movement={movement.next} size="teaser" aspect="aspect-video" reducedMotion={reducedMotion} />
                    </section>
                )}
            </div>
        </div>
    );
};

const LineageColumn = ({ label, items, align }) => (
    <div className={align === 'right' ? 'md:text-right' : ''}>
        <div className="text-[11px] tracking-[0.3em] uppercase text-gray-400 mb-3">{label}</div>
        {items.length ? (
            <ul className="space-y-2">
                {items.map((x) => (
                    <li key={x.title}>
                        {x.tag ? (
                            <Link to={`/movements/${x.tag}`} className="font-serif text-xl md:text-2xl text-gray-200 hover:text-white transition-colors">
                                {x.title}
                            </Link>
                        ) : <span className="font-serif text-xl text-gray-500">{x.title}</span>}
                        {x.era && <div className="text-[11px] tracking-[0.2em] uppercase text-gray-400 mt-0.5">{x.era}</div>}
                    </li>
                ))}
            </ul>
        ) : (
            <p className="font-serif italic text-gray-400">—</p>
        )}
    </div>
);

export default MovementDetail;
