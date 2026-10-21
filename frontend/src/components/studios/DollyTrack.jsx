import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { animate, motion, useMotionTemplate, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion';
import { pic } from '../directors/arrange';

/**
 * On the stage: every film a house made here, in order, as big stills standing along a track. The one
 * in the middle is lit, full size and in full colour; the others stand back, dimmer and a touch
 * smaller, so a drag reads as a camera dollying past sets. Drag or swipe it through every film, or use
 * the arrow keys; left alone it dollies on by itself, a film every few seconds. The decades are marked
 * where they turn. Only the stills near the middle are drawn, so a house of 476 costs what one of 14 does.
 *
 * decades: mark the decades (for films in the order they were made) · note(film): one more line under
 * the film in the middle (a member's mark, on their profile)
 */

const STEP = 3000; // ms between films while it dollies by itself
const REST = 5000; // ms it waits after a hand has been on it
const AROUND = 4; // stills drawn either side of the middle
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const decadeOf = (f) => (f?.y ? Math.floor(f.y / 10) * 10 : null);

const Frame = ({ f, i, prev, pos, unit, width, decades }) => {
    const d = useTransform(pos, (p) => Math.abs(i - p));
    const scale = useTransform(d, [0, 1], [1, 0.84], { clamp: true });
    const fade = useTransform(d, [0, 1, 3], [1, 0.42, 0.18], { clamp: true });
    const opacity = useMotionTemplate`${fade}`;
    const src = f.s ? pic(f.s, 'w780') : f.o ? pic(f.o, 'w500') : null;
    const turn = decades && decadeOf(f) !== decadeOf(prev);
    return (
        <div className="absolute top-0 left-0" style={{ transform: `translateX(${i * unit}px)`, width }}>
            {/* the decade, where it turns */}
            <div className="h-7 font-label text-[12px] md:text-[13px] tracking-[0.3em] uppercase text-gold">{turn && decadeOf(f) ? `${decadeOf(f)}s` : ''}</div>
            <motion.div className="relative aspect-video overflow-hidden bg-[#0d0c0b] ring-1 ring-white/10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]" style={{ scale, opacity }}>
                {src && <img src={src} alt="" decoding="async" draggable={false} className="w-full h-full object-cover max-w-none select-none" />}
            </motion.div>
        </div>
    );
};

const DollyTrack = ({ films, reducedMotion, decades = true, note }) => {
    const box = useRef(null);
    const pos = useMotionValue(0);
    const [w, setW] = useState(1200);
    const [at, setAt] = useState(0);
    const hand = useRef(null);
    const resting = useRef(0);
    const seen = useRef(true);
    const n = films.length;
    const phone = w < 700;
    const width = Math.round(w * (phone ? 0.72 : 0.44)); // (the films either side peek in)
    const unit = width + Math.round(w * 0.03);
    const x = useTransform(pos, (p) => (w - width) / 2 - p * unit);

    useEffect(() => {
        const el = box.current;
        if (!el) return undefined;
        const ro = new ResizeObserver(() => setW(el.clientWidth));
        ro.observe(el);
        const io = new IntersectionObserver(([e]) => { seen.current = e.isIntersecting; }, { threshold: 0.3 });
        io.observe(el);
        return () => { ro.disconnect(); io.disconnect(); };
    }, []);
    useMotionValueEvent(pos, 'change', (p) => {
        const i = clamp(Math.round(p), 0, n - 1);
        if (i !== at) setAt(i);
    });

    const go = useCallback((to) => {
        const target = clamp(to, 0, n - 1);
        if (reducedMotion) { pos.set(target); return; }
        animate(pos, target, { type: 'spring', stiffness: 170, damping: 28 });
    }, [n, reducedMotion, pos]);
    // left alone (and on screen), it dollies on, and comes back round to the first
    useEffect(() => {
        if (reducedMotion || n < 2) return undefined;
        const t = setInterval(() => {
            if (!seen.current || document.hidden || Date.now() < resting.current || hand.current) return;
            const next = Math.round(pos.get()) + 1;
            go(next >= n ? 0 : next);
        }, STEP);
        return () => clearInterval(t);
    }, [n, reducedMotion, go, pos]);
    const touched = () => { resting.current = Date.now() + REST; };

    const visible = useMemo(() => {
        const out = [];
        for (let i = Math.max(0, at - AROUND); i <= Math.min(n - 1, at + AROUND); i++) out.push(i);
        return out;
    }, [at, n]);
    const lit = films[at];

    return (
        <div>
            <div
                ref={box}
                role="slider"
                tabIndex={0}
                aria-label="The films, in order. Drag, or use the arrow keys."
                aria-valuemin={1}
                aria-valuemax={n}
                aria-valuenow={at + 1}
                aria-valuetext={lit ? `${lit.t}${lit.y ? `, ${lit.y}` : ''}` : ''}
                className="relative overflow-hidden touch-pan-y cursor-grab active:cursor-grabbing select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-light"
                style={{ height: Math.round((width * 9) / 16) + 28 + 8 }}
                onKeyDown={(e) => {
                    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
                    if (!d) return;
                    e.preventDefault();
                    touched();
                    go(Math.round(pos.get()) + d);
                }}
                onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    pos.stop();
                    hand.current = { x: e.clientX, from: pos.get(), trail: [[e.clientX, e.timeStamp]] };
                    e.currentTarget.setPointerCapture(e.pointerId);
                    touched();
                }}
                onPointerMove={(e) => {
                    const h = hand.current;
                    if (!h) return;
                    h.trail = [...h.trail.slice(-5), [e.clientX, e.timeStamp]];
                    pos.set(clamp(h.from - (e.clientX - h.x) / unit, -0.4, n - 0.6));
                }}
                onPointerUp={(e) => {
                    const h = hand.current;
                    hand.current = null;
                    if (!h) return;
                    const [x0, t0] = h.trail[0];
                    const dt = Math.max(1, e.timeStamp - t0);
                    const speed = -((e.clientX - x0) / unit) / (dt / 1000); // films a second
                    const moved = Math.abs(e.clientX - h.x) > 6;
                    touched();
                    // a tap on a still at the side brings it to the middle
                    if (!moved) {
                        const r = e.currentTarget.getBoundingClientRect();
                        const i = Math.round(pos.get() + (e.clientX - r.left - w / 2) / unit);
                        go(i);
                        return;
                    }
                    go(Math.round(pos.get() + clamp(speed, -8, 8) * 0.25));
                }}
                onPointerCancel={() => { hand.current = null; go(Math.round(pos.get())); }}
            >
                <motion.div className="absolute inset-y-0 left-0" style={{ x }}>
                    {visible.map((i) => <Frame key={films[i].id} f={films[i]} i={i} prev={films[i - 1]} pos={pos} unit={unit} width={width} decades={decades} />)}
                </motion.div>
            </div>
            {/* the film in the middle, named */}
            {lit && (
                <div className="mt-4 md:mt-5 text-center px-4">
                    <div key={lit.id} className="title-rise">
                        <div className="font-serif italic text-[1.6rem] md:text-[2.2rem] leading-tight text-white">{lit.t}</div>
                        <div className="mt-1.5 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gray-400">
                            {[lit.d?.join(' & '), lit.y, lit.r && `${lit.r} min`].filter(Boolean).join(' · ')}
                        </div>
                        {note?.(lit) && <div className="mt-1.5 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold">{note(lit)}</div>}
                        <Link to={`/movie/${lit.id}`} className="mt-3 inline-flex items-center gap-1.5 min-h-11 px-4 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">
                            Open ›
                        </Link>
                    </div>
                    <div className="mt-1 font-label text-[11px] tracking-[0.14em] uppercase text-gray-600">{at + 1} of {n}</div>
                </div>
            )}
        </div>
    );
};

export default DollyTrack;
