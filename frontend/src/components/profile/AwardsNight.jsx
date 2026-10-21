import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MdChevronLeft, MdChevronRight, MdStar } from 'react-icons/md';
import { pic } from '../directors/arrange';
import Laurel from './Laurel';

/**
 * Your awards night: every film you rate is a vote, and your ratings pick the winners. One award at a
 * time, said plainly ("Your favourite director: whose films you love most"). The nominees come up, each
 * with its evidence ("4 of your films"); a follow-spot sweeps from one to the next, slowing like a
 * drumroll, and stops on the winner; the winning frame flies up to fill the stage, the laurel blooms
 * round it, and one sentence says why. Then the next award. The rail names every award: tap one to go
 * straight to its winner, or swipe, or use the arrow keys; a hand on it holds the night a while.
 *
 * Before anything's rated, the nominees are well-known films and the spot never stops: the night says
 * how it opens.
 */

const ENTER = 700; // the nominees coming up
const SWEEP = 1900; // the drumroll
const LAND = 400; // the spot stopped, the others gone dark
const CROWN = 850; // the flight, before the laurel
const HOLD = 3600; // the winner, held
const TOTAL = ENTER + SWEEP + LAND + CROWN + HOLD;
const REST = 8000; // a hand on it holds the night this long
const GO = { film: 'See the film', gem: 'See the film', director: 'Their films', movement: 'Into the movement', country: 'Explore them', decade: 'Explore them' };
const year = new Date().getFullYear();
const hash = (s) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const src = (it, size = 'w780') => (it?.s ? pic(it.s, size) : it?.o ? pic(it.o, 'w780') : null);

// the order the nominees stand in: the winner somewhere among the first four (a phone shows four)
const lineUp = (award) => {
    const others = award.nominees.filter((x) => !x.win).sort((a, b) => hash(award.key + a.name) - hash(award.key + b.name));
    const w = award.nominees.find((x) => x.win);
    if (!w) return others;
    const at = hash(award.key + w.name) % Math.min(4, award.nominees.length);
    return [...others.slice(0, at), w, ...others.slice(at)];
};
// the drumroll: through every nominee, round again to the winner, each step a little slower
const drumroll = (n, to) => {
    const seq = [...Array.from({ length: n }, (_, i) => i), ...Array.from({ length: to + 1 }, (_, i) => i)];
    const raw = seq.map((_, i) => 1.22 ** i);
    const sum = raw.reduce((a, b) => a + b, 0);
    let t = 0;
    return seq.map((spot, i) => { const at = t; t += (raw[i] / sum) * SWEEP; return { spot, at }; });
};

const AwardsNight = ({ awards, reel = [], reducedMotion }) => {
    const open = awards.length > 0;
    // before the night opens: one award, its nominees the films everyone knows
    const list = useMemo(() => (open ? awards : reel.length >= 2 ? [{
        key: 'none', label: 'Your favourite film', question: 'Your awards appear once you’ve rated a few films',
        nominees: reel.slice(0, 4).map((f) => ({ name: f.title, sub: 'Not rated yet', s: f.s })),
    }] : []), [open, awards, reel]);
    const n = list.length;
    const [show, setShow] = useState({ at: 0, phase: reducedMotion ? 'crowned' : 'enter', spot: -1, direct: false, run: 0 });
    const rest = useRef(0);
    const stage = useRef(null);
    const frames = useRef([]);
    const railRef = useRef(null);
    const swipe = useRef(null);
    const [beam, setBeam] = useState(null);

    const award = list[show.at] || list[0];
    const order = useMemo(() => (award ? lineUp(award) : []), [award]);
    const winAt = order.findIndex((x) => x.win);
    const winner = order[winAt];

    const go = (i, direct = true) => {
        rest.current = Date.now() + REST;
        setShow((s) => ({ at: ((i % n) + n) % n, phase: direct ? 'winner' : 'enter', spot: -1, direct, run: s.run + 1 }));
    };

    // the night's clock: each award's moments on timeouts, from wherever it starts
    useEffect(() => {
        if (!n || !award) return undefined;
        const timers = [];
        const later = (ms, fn) => timers.push(setTimeout(fn, ms));
        const set = (patch) => setShow((s) => (s.run === show.run ? { ...s, ...patch } : s));
        const next = () => {
            if (Date.now() < rest.current || document.hidden) { later(600, next); return; }
            setShow((s) => (s.run === show.run ? { at: (s.at + 1) % n, phase: 'enter', spot: -1, direct: false, run: s.run + 1 } : s));
        };
        if (!open) {
            // the spot keeps looking: there's no winner yet
            let k = 0;
            const look = () => { set({ phase: 'sweep', spot: k % award.nominees.length }); k += 1; later(520, look); };
            later(reducedMotion ? 0 : ENTER, look);
        } else if (reducedMotion) {
            set({ phase: 'crowned' });
        } else if (show.direct) {
            later(60, () => set({ phase: 'crowned' }));
            if (n > 1) later(HOLD + 1600, next);
        } else {
            drumroll(order.length, winAt).forEach(({ spot, at }) => later(ENTER + at, () => set({ phase: 'sweep', spot })));
            later(ENTER + SWEEP, () => set({ phase: 'landed', spot: winAt }));
            later(ENTER + SWEEP + LAND, () => set({ phase: 'winner' }));
            later(ENTER + SWEEP + LAND + CROWN, () => set({ phase: 'crowned' }));
            if (n > 1) later(TOTAL, next);
        }
        return () => timers.forEach(clearTimeout);
        // (the clock restarts with each run; order and winAt belong to it)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show.run, n, open, reducedMotion]);

    // the follow-spot finds the frame it's on
    useEffect(() => {
        const el = frames.current[show.spot];
        const st = stage.current;
        if (!el || !st) { const t = setTimeout(() => setBeam(null), 0); return () => clearTimeout(t); }
        const r = el.getBoundingClientRect();
        const s = st.getBoundingClientRect();
        const t = setTimeout(() => setBeam({ x: r.left - s.left + r.width / 2, bottom: r.bottom - s.top, w: r.width }), 0);
        return () => clearTimeout(t);
    }, [show.spot, show.run]);

    // the winner's big picture, fetched while the spot sweeps; the next award's nominees while this one holds
    useEffect(() => {
        if (winner?.s) new Image().src = src(winner, 'w1280');
        (list[(show.at + 1) % Math.max(1, n)]?.nominees || []).forEach((x) => { if (src(x)) new Image().src = src(x); });
    }, [winner, list, show.at, n]);
    // the award playing, kept in view on a narrow rail
    useEffect(() => {
        const r = railRef.current;
        const b = r?.children[show.at];
        if (b) r.scrollTo({ left: b.offsetLeft - (r.clientWidth - b.offsetWidth) / 2, behavior: reducedMotion ? 'auto' : 'smooth' });
    }, [show.at, reducedMotion]);

    if (!award) return <div className="h-[60svh]" />;
    const { phase } = show;
    const flown = phase === 'winner' || phase === 'crowned';
    const settled = phase === 'landed' || flown;

    return (
        <section
            ref={stage}
            tabIndex={0}
            aria-label="Your awards"
            onKeyDown={(e) => {
                const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
                if (!d || !open) return;
                e.preventDefault();
                go(show.at + d);
            }}
            onPointerDown={(e) => { swipe.current = e.clientX; }}
            onPointerUp={(e) => {
                const dx = swipe.current == null ? 0 : e.clientX - swipe.current;
                swipe.current = null;
                if (open && Math.abs(dx) > 60) go(show.at + (dx < 0 ? 1 : -1));
            }}
            className="relative h-[90svh] min-h-[640px] md:min-h-[700px] overflow-hidden bg-[#050505] outline-none touch-pan-y"
        >
            {/* the stage floor, faintly lit */}
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_50%_100%,rgba(217,173,98,0.08),transparent_70%)]" />

            {/* the follow-spot */}
            {beam && !flown && (
                <motion.div
                    aria-hidden="true"
                    className="absolute top-0 left-0 pointer-events-none z-[1]"
                    initial={false}
                    animate={{ x: beam.x - beam.w * 0.75, opacity: phase === 'landed' ? 1 : 0.85 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.6 }}
                    style={{ width: beam.w * 1.5, height: beam.bottom + 24 }}
                >
                    <div className="absolute inset-0 [clip-path:polygon(44%_0,56%_0,100%_100%,0_100%)] bg-[linear-gradient(to_bottom,rgba(255,240,214,0),rgba(255,240,214,0.12)_55%,rgba(255,240,214,0.3))]" />
                    <div className="absolute inset-x-[-10%] bottom-0 h-20 bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,240,214,0.45),transparent_70%)]" />
                </motion.div>
            )}

            {/* the award, in plain words */}
            <div className="absolute inset-x-0 top-0 z-20 pt-7 md:pt-10 pointer-events-none">
                <div className="max-w-7xl mx-auto px-4 md:px-10">
                    <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">{open ? `Award ${show.at + 1} of ${n}` : 'Your awards'}</div>
                    <h3 key={`h-${show.at}`} className="title-rise mt-1.5 font-serif font-light text-[2.1rem] md:text-6xl leading-[1.05] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.7)]">{award.label}</h3>
                    <p key={`q-${show.at}`} className="title-rise mt-1.5 font-serif italic text-base md:text-2xl text-gray-200 [text-shadow:0_2px_18px_rgba(0,0,0,0.7)]">{award.question}</p>
                </div>
            </div>

            {/* the nominees */}
            <div className="absolute inset-x-0 top-[22%] md:top-[24%] bottom-[64px] z-[2] flex flex-col justify-center">
                <div className="w-full max-w-[1440px] mx-auto px-4 md:px-10">
                    <div className="mb-3 md:mb-4 font-label text-[12px] tracking-[0.3em] uppercase text-gray-400">The nominees</div>
                    <div
                        className="grid grid-cols-2 gap-x-3 gap-y-4 md:gap-5 md:[grid-template-columns:var(--cols)]"
                        style={{ '--cols': `repeat(${order.length}, minmax(0, 1fr))` }}
                    >
                        {order.map((nom, k) => {
                            const lit = show.spot === k;
                            const dark = settled ? k !== winAt : show.spot >= 0 && !lit;
                            return (
                                <motion.div
                                    key={`${show.at}-${nom.name}`}
                                    className={k >= 4 ? 'hidden md:block' : ''}
                                    initial={reducedMotion ? false : { opacity: 0, y: 28 }}
                                    animate={{ opacity: flown && k !== winAt ? 0 : dark ? 0.3 : 1, y: 0, scale: lit || (settled && k === winAt) ? 1.06 : 1 }}
                                    transition={{ duration: 0.4, delay: phase === 'enter' ? k * 0.08 : 0 }}
                                >
                                    <div ref={(el) => { frames.current[k] = el; }} className="relative aspect-video">
                                        {!(flown && k === winAt) && (
                                            <motion.div
                                                layoutId={k === winAt && open ? `winner-${show.run}` : undefined}
                                                className={`absolute inset-0 overflow-hidden bg-[#141210] ring-1 ${lit || (settled && k === winAt) ? 'ring-gold-light/80' : 'ring-white/10'}`}
                                            >
                                                {src(nom) && <img src={src(nom)} alt="" draggable={false} className="w-full h-full object-cover max-w-none" />}
                                                {nom.p && <img src={pic(nom.p, 'w185')} alt="" className="absolute left-2 bottom-2 h-[46%] aspect-[3/4] object-cover max-w-none grayscale ring-1 ring-white/30" />}
                                            </motion.div>
                                        )}
                                    </div>
                                    <div className="mt-2 font-serif text-[15px] md:text-[17px] leading-tight text-white line-clamp-2">{nom.name}</div>
                                    <div className="mt-0.5 flex items-center gap-1 font-label text-[11px] md:text-[12px] tracking-[0.12em] uppercase text-gray-400">
                                        {nom.fav && <MdStar aria-label="A favourite" className="text-gold" />}{nom.sub}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* the winner, up to fill the stage, crowned */}
            <AnimatePresence>
                {open && flown && winner && (
                    <motion.div key={`win-${show.run}`} className="absolute inset-0 z-10" exit={{ opacity: 0 }} transition={{ duration: 0.45 }}>
                        <motion.div
                            layoutId={`winner-${show.run}`}
                            initial={show.direct ? { opacity: 0 } : false}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.85, ease: [0.3, 0, 0.2, 1] }}
                            className="absolute inset-0 overflow-hidden"
                        >
                            {src(winner) && <img src={src(winner)} alt="" className="absolute inset-0 w-full h-full object-cover max-w-none" />}
                            {winner.s && phase === 'crowned' && <img src={src(winner, 'w1280')} alt="" className={`absolute inset-0 w-full h-full object-cover max-w-none ${reducedMotion ? '' : 'shot-up'}`} />}
                        </motion.div>
                        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,5,5,0.75),rgba(5,5,5,0.1)_32%,rgba(5,5,5,0.15)_50%,rgba(5,5,5,0.92)_88%)]" />
                        {phase === 'crowned' && (
                            <div className="absolute inset-x-0 bottom-[78px] md:bottom-[88px]" aria-live="polite">
                                <div className="max-w-7xl mx-auto px-4 md:px-10">
                                    <div className="flex items-end gap-4 md:gap-6">
                                        <Laurel grow={!reducedMotion} className="w-[150px] md:w-[250px] shrink-0">
                                            <span className="font-label text-[12px] tracking-[0.2em] uppercase text-gold">Winner</span>
                                            <span className="mt-0.5 font-label text-[12px] md:text-[15px] leading-tight tracking-[0.14em] uppercase text-white">{award.label.replace(/^Your /, '')}</span>
                                            <span className="mt-0.5 font-label text-[12px] tracking-[0.2em] text-gold">{year}</span>
                                        </Laurel>
                                        {winner.p && <img src={pic(winner.p, 'w185')} alt="" className="title-rise w-[60px] md:w-[84px] aspect-[3/4] object-cover max-w-none grayscale ring-1 ring-white/25" />}
                                    </div>
                                    <div className="title-rise mt-3 md:mt-4 max-w-4xl font-serif font-light text-[2.4rem] md:text-7xl leading-[1.02] text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.5)]">{winner.name}</div>
                                    <p className="title-rise mt-2 md:mt-3 max-w-3xl font-serif italic text-base md:text-2xl leading-snug text-gray-200">{award.why}</p>
                                    <Link to={award.to} className="title-rise mt-2 inline-flex items-center min-h-11 font-label text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">{GO[award.key] || 'Open'} ›</Link>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* before the night opens: how it opens */}
            {!open && (
                <div className="absolute inset-x-0 bottom-8 md:bottom-12 z-20">
                    <div className="max-w-7xl mx-auto px-4 md:px-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                        <p className="font-serif italic text-lg md:text-2xl text-gray-200">Every film you rate is a vote. Rate a few, and your ratings pick the winners.</p>
                        <Link to="/recommendations" className="shrink-0 inline-flex items-center justify-center px-5 py-3 min-h-11 bg-gold text-black font-label text-[13px] tracking-[0.14em] uppercase hover:bg-gold-light">Rate films ›</Link>
                    </div>
                </div>
            )}

            {/* the rail: every award, the one playing lit, the time left on it in gold */}
            {open && (
                <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#050505]/60">
                    <div className="max-w-7xl mx-auto px-2 md:px-8 flex items-center">
                        <div ref={railRef} className="relative flex-1 flex overflow-x-auto [scrollbar-width:none] [mask-image:linear-gradient(90deg,black_85%,transparent)] md:[mask-image:none]">
                            {list.map((a, i) => (
                                <button
                                    key={a.key}
                                    type="button"
                                    aria-current={i === show.at}
                                    onClick={() => go(i)}
                                    className={`relative shrink-0 min-h-[60px] px-3 md:px-4 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase transition-colors ${i === show.at ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                >
                                    {a.label.replace(/^Your /, '')}
                                    <span aria-hidden="true" className="absolute left-3 right-3 md:left-4 md:right-4 bottom-3 h-px bg-white/15" />
                                    {i === show.at && (
                                        <span
                                            key={show.run}
                                            aria-hidden="true"
                                            className={`absolute left-3 right-3 md:left-4 md:right-4 bottom-3 h-px bg-gold ${reducedMotion || n < 2 ? '' : 'prize-clock'}`}
                                            style={{ '--hold': `${show.direct ? HOLD + 1600 : TOTAL}ms` }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="shrink-0 flex">
                            <button type="button" aria-label="Previous award" onClick={() => go(show.at - 1)} className="w-11 h-11 flex items-center justify-center text-gray-300 hover:text-white"><MdChevronLeft size={24} /></button>
                            <button type="button" aria-label="Next award" onClick={() => go(show.at + 1)} className="w-11 h-11 flex items-center justify-center text-gray-300 hover:text-white"><MdChevronRight size={24} /></button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default AwardsNight;
