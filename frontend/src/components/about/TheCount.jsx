import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { aboutAPI } from '../../services/api';
import { pic } from '../directors/arrange';
import { citation, ordinal } from '../film/canonWords';
import { LISTS, groupName } from './listNotes';

/**
 * How a film earns its place: one real film's count, replayed as you scroll, in four steps, with the
 * real numbers from the ranking itself (the same sums, step by step). Its votes arrive as gold bars,
 * one per list, longer the higher the list places it; they gather into their kinds, each kind filling
 * to its ceiling and the rest falling away; the decades it has stayed in the great polls light up;
 * and it all adds up to its place, among the films either side of it. Another film can be counted
 * instead (the first in the atlas, a recent one, a quiet one), to see how differently each is made.
 */

const STEPS = [
    { label: 'Its votes', words: 'Every list that places a film is a vote for it. A vote counts for more the higher the list ranks it.' },
    { label: 'Grouped', words: 'Lists that measure the same thing count once, with a little extra when they agree, and each kind has a ceiling. All-time polls count most; lists of the year and prizes, the first verdict, count for less.' },
    { label: 'Staying power', words: 'A film earns more for every decade the great polls have kept it.' },
    { label: 'Its place', words: 'Added up, that’s its place in the atlas.' },
];
const DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
const EASE = [0.2, 0.7, 0.2, 1];
const weightWords = (w) => (w >= 1 ? 'counts in full' : w >= 0.85 ? 'counts nearly in full' : w >= 0.7 ? 'counts for most' : 'counts for about half');
const nameOf = (v) => LISTS[v.source]?.name || citation(v).name;

const Bar = ({ to, delay = 0, className = 'bg-gold', reducedMotion }) => (
    <motion.span
        className={`absolute inset-y-0 left-0 w-full origin-left ${className}`}
        initial={reducedMotion ? false : { scaleX: 0 }}
        animate={{ scaleX: Math.max(0, Math.min(1, to)) }}
        transition={{ duration: 0.7, delay, ease: EASE }}
    />
);

const Votes = ({ count, phone, reducedMotion }) => {
    const votes = count.families.flatMap((f) => f.votes).sort((a, b) => b.strength - a.strength);
    const max = votes[0]?.strength || 1;
    const shown = votes.slice(0, phone ? 5 : 9);
    return (
        <div>
            {shown.map((v, i) => (
                <div key={`${v.source}-${i}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4 md:gap-x-6 items-center py-1.5 md:py-2 border-b border-white/[0.05]">
                    <div className="min-w-0">
                        <div className="font-serif text-[14px] md:text-[16px] leading-tight text-gray-100 truncate">{nameOf(v)}</div>
                        <div className="font-label text-[11px] md:text-[12px] tracking-[0.12em] uppercase text-gray-400 truncate">{citation(v).place}</div>
                    </div>
                    <span className="relative block h-2.5 md:h-3 bg-white/[0.06]"><Bar to={v.strength / max} delay={0.1 + i * 0.07} reducedMotion={reducedMotion} /></span>
                </div>
            ))}
            {votes.length > shown.length && <div className="pt-2 font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">And {votes.length - shown.length} more {votes.length - shown.length === 1 ? 'list' : 'lists'}</div>}
        </div>
    );
};

const Groups = ({ count, reducedMotion }) => {
    const scale = Math.max(...count.families.map((f) => Math.max(f.cap, f.uncapped) * f.weight), 0.01);
    return (
        <div className="grid gap-4 md:gap-5">
            {count.families.map((f, i) => {
                const over = f.uncapped > f.credited + 0.01;
                return (
                    <div key={f.family}>
                        <div className="flex items-baseline justify-between gap-4">
                            <span className="font-serif text-[15px] md:text-[17px] text-gray-100">{groupName(f.family)} <span className="font-label text-[11px] md:text-[12px] tracking-[0.12em] uppercase text-gray-500">· {f.votes.length} {f.votes.length === 1 ? 'list' : 'lists'}</span></span>
                            <span className="font-label text-[11px] md:text-[12px] tracking-[0.12em] uppercase text-gray-400 whitespace-nowrap">{weightWords(f.weight)}</span>
                        </div>
                        <span className="relative mt-1.5 block h-3 md:h-3.5 bg-white/[0.05]">
                            {over && <Bar to={(f.uncapped * f.weight) / scale} delay={0.1 + i * 0.1} className="bg-[repeating-linear-gradient(135deg,rgba(217,173,98,0.28)_0_4px,transparent_4px_8px)]" reducedMotion={reducedMotion} />}
                            <Bar to={(f.credited * f.weight) / scale} delay={0.1 + i * 0.1} reducedMotion={reducedMotion} />
                            {/* its ceiling */}
                            <span className="absolute -top-1 -bottom-1 w-px bg-white/60" style={{ left: `${Math.min(100, ((f.cap * f.weight) / scale) * 100)}%` }} />
                        </span>
                        {over && <div className="mt-1 font-serif italic text-[13px] md:text-[14px] text-gray-500">Past its ceiling: the striped part doesn’t count.</div>}
                    </div>
                );
            })}
        </div>
    );
};

const Staying = ({ count, reducedMotion }) => {
    const d = count.endurance.decades;
    return (
        <div>
            <div className="grid grid-cols-8 gap-1.5 md:gap-2">
                {DECADES.map((y, i) => {
                    const on = d.includes(y);
                    return (
                        <div key={y} className="text-center">
                            <motion.div
                                className={`h-14 md:h-20 ${on ? 'bg-gold' : 'bg-white/[0.06]'}`}
                                initial={reducedMotion ? false : { opacity: 0, scaleY: 0.3 }}
                                animate={{ opacity: on ? 1 : 0.6, scaleY: 1 }}
                                transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: EASE }}
                            />
                            <div className={`mt-2 font-label text-[11px] md:text-[12px] tracking-[0.08em] ${on ? 'text-gold-light' : 'text-gray-500'}`}>{y}s</div>
                        </div>
                    );
                })}
            </div>
            <p className="mt-5 font-serif text-[1.05rem] md:text-[1.25rem] text-gray-200">
                {d.length > 1
                    ? <>The great polls have placed it in {d.length} decades, from the {d[0]}s to the {d.at(-1)}s{count.endurance.bonus > 0 ? ', and every one after the first adds to its place.' : '.'}</>
                    : d.length === 1 ? <>The great polls have placed it in one decade so far, the {d[0]}s: staying power comes with time.</>
                        : <>The great polls haven’t placed it yet, so it has no staying power to add.</>}
            </p>
        </div>
    );
};

const Place = ({ count, reducedMotion }) => {
    const parts = [...count.families.map((f) => ({ key: f.family, name: groupName(f.family), v: f.counts })), ...(count.endurance.bonus > 0 ? [{ key: 'staying', name: 'Staying power', v: count.endurance.bonus }] : [])].filter((p) => p.v > 0);
    const total = parts.reduce((s, p) => s + p.v, 0) || 1;
    const rank = count.film.rank;
    return (
        <div>
            <div className="flex h-4 md:h-5 w-full overflow-hidden">
                {parts.map((p, i) => (
                    <motion.span
                        key={p.key}
                        className="h-full border-r border-[#050505] last:border-r-0"
                        style={{ width: `${(p.v / total) * 100}%`, backgroundColor: p.key === 'staying' ? 'var(--color-gold-light)' : `rgba(217,173,98,${1 - i * 0.13})` }}
                        initial={reducedMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.1 + i * 0.12 }}
                    />
                ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-label text-[11px] md:text-[12px] tracking-[0.12em] uppercase text-gray-400">
                {parts.map((p) => <span key={p.key}>{p.name}</span>)}
            </div>
            <div className="mt-6 md:mt-8 flex items-baseline gap-4 flex-wrap">
                <span className="font-serif font-light text-6xl md:text-8xl leading-none text-gold-light [font-variant-numeric:lining-nums]">{rank ? ordinal(rank) : '—'}</span>
                <span className="font-serif text-xl md:text-2xl text-gray-100">{rank ? <>in the atlas, of {count.of} ranked films</> : 'Not ranked: no list places it yet.'}</span>
            </div>
            {count.neighbours.length > 1 && (
                <ol className="mt-5 md:mt-6 flex gap-2 md:gap-3">
                    {count.neighbours.map((n) => (
                        <li key={n.id} className="flex-1 min-w-0">
                            <Link to={`/movie/${n.id}`} className="group block">
                                <span className={`block aspect-video overflow-hidden ${n.self ? 'ring-2 ring-gold' : 'ring-1 ring-white/10 opacity-70 group-hover:opacity-100'}`}>
                                    {(n.s || n.o) && <img src={pic(n.s || n.o, 'w300')} alt="" loading="lazy" className="w-full h-full object-cover max-w-none" />}
                                </span>
                                <span className={`block mt-1 font-label text-[11px] md:text-[12px] tracking-[0.1em] ${n.self ? 'text-gold-light' : 'text-gray-400'}`}>{ordinal(n.rank)}</span>
                                <span className="block font-serif text-[12px] md:text-[14px] leading-tight text-gray-200 truncate">{n.t}</span>
                            </Link>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
};

const TheCount = ({ reducedMotion }) => {
    const section = useRef(null);
    const [examples, setExamples] = useState([]);
    const [filmId, setFilmId] = useState(null);
    const [counts, setCounts] = useState({});
    const [step, setStep] = useState(0);
    const [phone] = useState(() => window.innerWidth < 768);
    const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
    useMotionValueEvent(scrollYProgress, 'change', (p) => {
        const s = Math.min(3, Math.max(0, Math.floor(p * 4.0001)));
        if (s !== step) setStep(s);
    });

    useEffect(() => {
        let gone = false;
        aboutAPI.examples().then((r) => { if (!gone) { setExamples(r.data); setFilmId((id) => id || r.data[0]?.id); } }).catch(() => {});
        return () => { gone = true; };
    }, []);
    useEffect(() => {
        if (!filmId || counts[filmId]) return undefined;
        let gone = false;
        aboutAPI.count(filmId).then((r) => {
            if (gone) return;
            if (r.data.film.s) new Image().src = pic(r.data.film.s, 'w1280');
            setCounts((c) => ({ ...c, [filmId]: r.data }));
        }).catch(() => {});
        return () => { gone = true; };
    }, [filmId, counts]);

    const count = counts[filmId];
    // a step's place on the page: its quarter of the scroll
    const toStep = (i) => {
        const el = section.current;
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + ((el.offsetHeight - window.innerHeight) * (i + 0.5)) / 4, behavior: reducedMotion ? 'auto' : 'smooth' });
    };

    return (
        <section ref={section} aria-labelledby="count" className="relative h-[360vh]">
            <div className="sticky top-0 h-[100svh] overflow-hidden flex flex-col pt-20 md:pt-24 pb-6">
                <div className="max-w-7xl w-full mx-auto px-4 md:px-10 flex flex-col min-h-0 flex-1">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                        <div>
                            <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">How the ranking works</div>
                            <h2 id="count" className="scroll-mt-24 mt-1 font-serif font-light text-3xl md:text-5xl leading-tight text-white">How a film earns its place</h2>
                        </div>
                        {examples.length > 1 && (
                            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0">
                                <span className="hidden sm:inline font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">Count another film:</span>
                                {examples.map((e) => (
                                    <button key={e.id} type="button" onClick={() => setFilmId(e.id)} className={`min-h-11 font-serif text-[15px] md:text-[17px] transition-colors ${e.id === filmId ? 'text-gold-light underline decoration-gold underline-offset-[6px]' : 'text-gray-300 hover:text-white'}`}>
                                        {e.t}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* the four steps, named; the one playing lit */}
                    <ol className="mt-2 md:mt-6 grid grid-cols-4 border-b border-white/[0.08]">
                        {STEPS.map((s, i) => (
                            <li key={s.label}>
                                <button type="button" onClick={() => toStep(i)} className={`relative w-full text-left pb-2.5 md:pb-3 min-h-11 font-label text-[11px] md:text-[13px] tracking-[0.12em] uppercase transition-colors ${i === step ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                                    <span className={`mr-1.5 ${i === step ? 'text-gold' : ''}`}>{i + 1}</span>{s.label}
                                    {i === step && <motion.span layoutId="count-step" className="absolute left-0 right-3 -bottom-px h-[2px] bg-gold" />}
                                </button>
                            </li>
                        ))}
                    </ol>

                    <div className="mt-4 md:mt-8 flex-1 min-h-0 grid md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-4 md:gap-12">
                        {/* the film being counted */}
                        <div className="min-h-0">
                            {count && (
                                <Link to={`/movie/${count.film.id}`} className="group flex md:block items-center gap-3">
                                    {/* (on a phone, a small picture beside its name, so the count has the room) */}
                                    <span className="relative block aspect-[16/9] w-28 md:w-full shrink-0 overflow-hidden bg-[#0d0c0b] ring-1 ring-white/10">
                                        {(count.film.s || count.film.o) && <img key={count.film.id} src={pic(count.film.s || count.film.o, 'w1280')} alt="" className={`absolute inset-0 w-full h-full object-cover max-w-none ${reducedMotion ? '' : 'shot-up'}`} />}
                                    </span>
                                    <span className="block min-w-0">
                                        <span className="md:mt-3 block font-serif italic text-xl md:text-3xl text-white group-hover:text-gold-light leading-tight">{count.film.t}</span>
                                        <span className="block font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">{[count.film.d?.join(' & '), count.film.y].filter(Boolean).join(' · ')}</span>
                                    </span>
                                </Link>
                            )}
                        </div>

                        {/* the step */}
                        <div className="min-h-0">
                            <AnimatePresence mode="wait">
                                {count && (
                                    <motion.div
                                        key={`${filmId}-${step}`}
                                        initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10, transition: { duration: 0.18 } }}
                                        transition={{ duration: 0.35, ease: EASE }}
                                    >
                                        <p className="mb-4 md:mb-6 font-serif italic text-[1.05rem] md:text-[1.35rem] leading-snug text-gray-200">{STEPS[step].words}</p>
                                        {step === 0 && <Votes count={count} phone={phone} reducedMotion={reducedMotion} />}
                                        {step === 1 && <Groups count={count} reducedMotion={reducedMotion} />}
                                        {step === 2 && <Staying count={count} reducedMotion={reducedMotion} />}
                                        {step === 3 && <Place count={count} reducedMotion={reducedMotion} />}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                    <div className="pt-3 font-label text-[11px] md:text-[12px] tracking-[0.14em] uppercase text-gray-500">{step < 3 ? 'Keep scrolling: the count goes on' : 'That’s the whole count'}</div>
                </div>
            </div>
        </section>
    );
};

export default TheCount;
