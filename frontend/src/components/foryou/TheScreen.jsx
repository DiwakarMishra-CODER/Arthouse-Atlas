import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion';
import DepthStage from './DepthStage';
import MonitorHUD from './MonitorHUD';
import MarkRing from './MarkRing';
import RackText from './RackText';
import Actions from './Actions';
import { defocus, defocusNow } from './defocus';
import { sized } from '../movements/treatments';
import { OUT_SHARE, metresAt, shotAt } from './shot';
import { becauseWords, evidenceWords, alsoWords, factWords } from './whyWords';

/**
 * The focus puller's monitor, running through your picks. One playhead (`at`, see shot.js)
 * plays every shot: a whole number is a pick landed; between two, focus racks off the last pick
 * and the next pick's shot plays (its seed sharp near the lens, focus racks to the pick far
 * behind, the camera dollies in). The lens ring carries a tape mark for every pick and turns
 * with the playhead.
 *
 * It turns by itself, a pick every few seconds (a gold line runs out under "Next" while a pick
 * holds), and you can take it: turn the ring through all your picks (a fling carries on, letting
 * go settles on the nearest), swipe the picture, or step with the buttons or arrow keys. A tap on
 * the picture (one that doesn't move) opens the film on it. A hand on it rests the turning for a
 * few seconds; so do reading the words, focus inside, being off screen or in a hidden tab, and Pause.
 *
 * The film's name is on its picture, a lower third that racks into focus as the pick lands, so the
 * two never come apart. The page's scroll only moves the page: nothing on the monitor changes under
 * someone scrolling to read it.
 */

const COUNTRY = { 'United States of America': 'United States' };
const STEP = 2; // seconds from one landed pick to the next
const HOLD = 2.6; // seconds a landed pick stays before the ring turns on
const REST = 5; // seconds the ring waits after a hand has been on it
const LANDED = 0.04; // this close to a pick, it has landed
const KNOWS_THE_RING = 'foryou:turned';
const LAST_SEEN = 'foryou:shot';

const stillOf = (p) => p?.stills?.[0] || p?.backdropUrl || p?.posterUrl;
const mod = (i, n) => ((i % n) + n) % n;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
// into the browser's cache before the shot needs it
const warm = (src) => {
    if (!src) return;
    const img = new Image();
    img.src = sized(src, 'w1280');
};
const later = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 400 }) : setTimeout(fn, 40));
const notLater = (id) => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : clearTimeout(id));

const TheScreen = ({ picks, start = 0, act, reducedMotion, iris = true }) => {
    const n = picks.length;
    const first = mod(start, n || 1);
    // the playhead opens on the first pick's shot, soft
    const at = useMotionValue(reducedMotion ? first : first - (1 - OUT_SHARE));
    const focus = useTransform(at, (v) => shotAt(v).focus);
    const camera = useTransform(at, (v) => shotAt(v).camera);
    const distance = useTransform(focus, metresAt);
    const hold = useMotionValue(0);
    const nudge = useMotionValue(0);
    const [shot, setShot] = useState(first); // the shot on screen (counts on past the last pick)
    const [landedAt, setLandedAt] = useState(reducedMotion ? first : null);
    const [ghost, setGhost] = useState(null); // the last shot's light, dissolving into this one
    const [started, setStarted] = useState(false);
    const [playing, setPlaying] = useState(true);
    const [resting, setResting] = useState(false); // a hand was just on it
    const [onScreen, setOnScreen] = useState(true);
    const [hidden, setHidden] = useState(false);
    const [reading, setReading] = useState(false);
    const [knowsRing, setKnowsRing] = useState(() => {
        try { return localStorage.getItem(KNOWS_THE_RING) === '1'; } catch { return false; }
    });
    const root = useRef(null);
    const shotRef = useRef(first);
    const turning = useRef(null); // the playhead's animation, so a hand can stop it
    const grip = useRef(null);
    const swipe = useRef(null);
    const swiped = useRef(false); // the press that just ended was a swipe, not a tap
    const navigate = useNavigate();
    const restTimer = useRef(0);
    const paused = !playing || resting || !onScreen || hidden || reading;

    const index = mod(shot, n || 1);
    const pick = picks[index];
    const landed = landedAt !== null && mod(landedAt, n || 1) === index;

    // the shot on screen and whether it has landed, as the playhead moves (state changes only at
    // a cut or a landing, never per frame)
    useMotionValueEvent(at, 'change', (v) => {
        const k = shotAt(v).k;
        if (k !== shotRef.current) {
            const left = picks[mod(shotRef.current, n)];
            shotRef.current = k;
            setGhost({ key: k, src: defocusNow(sized(stillOf(left), 'w300')) });
            setShot(k);
        }
        const near = Math.round(v);
        setLandedAt(Math.abs(v - near) < LANDED ? near : null);
    });

    // each visit starts one pick on from where the last one left off
    useEffect(() => {
        if (landedAt === null || !n) return;
        try { localStorage.setItem(LAST_SEEN, String(mod(landedAt, n))); } catch { /* private window */ }
    }, [landedAt, n]);

    const run = useCallback((to, options) => {
        turning.current?.stop();
        turning.current = animate(at, to, options);
        return turning.current;
    }, [at]);

    // the opening shot, once its pictures are ready
    const onReady = useCallback(() => setStarted(true), []);
    useEffect(() => {
        if (!started || reducedMotion) return;
        run(first, { duration: STEP * (1 - OUT_SHARE), ease: [0.35, 0, 0.25, 1] });
    }, [started, reducedMotion, run, first]);

    // on to the next pick (or back to the last), the focus puller's way: a hair past the mark and back
    const step = useCallback((dir) => {
        if (n < 2) return;
        const now = at.get();
        const to = dir > 0 ? Math.floor(now + 0.001) + 1 : Math.ceil(now - 0.001) - 1;
        hold.set(0);
        if (reducedMotion) {
            at.set(to);
            return;
        }
        run([now, to + 0.035 * dir, to], { duration: STEP * Math.min(1, Math.abs(to - now)) + 0.25, times: [0, 0.87, 1], ease: [[0.42, 0, 0.3, 1], 'easeInOut'] });
    }, [n, at, hold, reducedMotion, run]);

    // a landed pick holds while the line runs out, then the ring turns on (waiting whenever it's paused)
    useEffect(() => {
        if (!started || reducedMotion || paused || landedAt === null || n < 2) return undefined;
        const left = Math.max(0.05, HOLD * (1 - hold.get()));
        const line = animate(hold, 1, { duration: left, ease: 'linear', onComplete: () => step(1) });
        return () => line.stop();
    }, [started, reducedMotion, paused, landedAt, n, hold, step]);

    // a hand on it rests the turning for a few seconds
    const touched = useCallback(() => {
        setResting(true);
        clearTimeout(restTimer.current);
        restTimer.current = setTimeout(() => setResting(false), REST * 1000);
    }, []);
    useEffect(() => () => clearTimeout(restTimer.current), []);

    // every pick's soft pictures are drawn while nothing else is happening, so a turn of the ring
    // finds them ready; the sharp pictures of the shots either side are fetched ahead
    useEffect(() => {
        const todo = [...new Set(picks.flatMap((p) => [stillOf(p), p.because?.film?.still]).filter(Boolean))];
        let i = 0;
        let id = 0;
        let gone = false;
        const next = () => {
            if (gone || i >= todo.length) return;
            defocus(sized(todo[i++], 'w300')).finally(() => { if (!gone) id = later(next); });
        };
        id = later(next);
        return () => { gone = true; notLater(id); };
    }, [picks]);
    useEffect(() => {
        if (!n) return;
        [shot + 1, shot + 2, shot - 1].forEach((k) => {
            const p = picks[mod(k, n)];
            warm(stillOf(p));
            warm(p?.because?.film?.still);
        });
    }, [shot, picks, n]);

    // rest while off screen or in a hidden tab
    useEffect(() => {
        const el = root.current;
        if (!el) return undefined;
        const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.35 });
        io.observe(el);
        const onVisibility = () => setHidden(document.hidden);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            io.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    // a hand on the ring turns the playhead with it; a fling carries on; letting go settles on the nearest pick
    const turnable = !reducedMotion && n > 1;
    const ring = !turnable ? null : {
        label: `Your ${n} picks. Turn the ring to move through them.`,
        valueNow: index + 1,
        valueText: pick?.title,
        onGrab: () => {
            turning.current?.stop();
            hold.set(0);
            touched();
            if (!knowsRing) {
                setKnowsRing(true);
                try { localStorage.setItem(KNOWS_THE_RING, '1'); } catch { /* it'll show again next time */ }
            }
            grip.current = at.get();
        },
        onTurn: (steps) => {
            if (grip.current === null) return;
            at.set(grip.current + steps);
            touched();
        },
        onLetGo: (speed) => {
            grip.current = null;
            const now = at.get();
            const to = Math.round(now + clamp(speed, -10, 10) * 0.2);
            run(to, { duration: clamp(0.35 + 0.16 * Math.abs(to - now), 0.35, 1.6), ease: [0.2, 0.7, 0.3, 1] });
            touched();
        },
        onStep: (dir) => {
            step(dir);
            touched();
        },
    };

    // a swipe across the picture: the next pick, or the last one
    const stage = !turnable ? {} : {
        onPointerDown: (e) => {
            if (e.button !== 0) return;
            swipe.current = { x: e.clientX, moved: false };
            swiped.current = false;
        },
        onPointerMove: (e) => {
            const s = swipe.current;
            if (!s) return;
            const dx = e.clientX - s.x;
            if (!s.moved && Math.abs(dx) > 8) {
                s.moved = true;
                e.currentTarget.setPointerCapture(e.pointerId);
            }
            if (s.moved) nudge.set(dx * 0.25);
        },
        onPointerUp: (e) => {
            const s = swipe.current;
            swipe.current = null;
            swiped.current = !!s?.moved;
            if (!s?.moved) return;
            const dx = e.clientX - s.x;
            animate(nudge, 0, { type: 'spring', stiffness: 380, damping: 36 });
            if (Math.abs(dx) > 60) {
                step(dx < 0 ? 1 : -1);
                touched();
            }
        },
        onPointerCancel: () => {
            swipe.current = null;
            animate(nudge, 0, { type: 'spring', stiffness: 380, damping: 36 });
        },
    };

    // furthest back in the shot, the next pick's light
    const deep = useMemo(() => (n > 1 ? [stillOf(picks[mod(shot + 1, n)])].filter(Boolean) : []), [picks, shot, n]);
    const titles = useMemo(() => picks.map((p) => p.title), [picks]);
    // the mark the monitor names: your film's while the shot is on it, the pick's from the rack on
    // (and while the pick racks out)
    const nearMark = useTransform(at, (v) => {
        const u = v - Math.floor(v);
        if (u < OUT_SHARE) return 0;
        const into = (u - OUT_SHARE) / (1 - OUT_SHARE);
        return Math.min(1, Math.max(0, (0.6 - into) / 0.08));
    });
    const farMark = useTransform(nearMark, (o) => 1 - o);
    if (!pick) return null;

    const seed = pick.because?.film;
    const facts = [pick.year, COUNTRY[pick.country] || pick.country, pick.runtime && `${pick.runtime} min`, pick.directors?.length && `by ${pick.directors.join(' & ')}`].filter(Boolean);
    const fact = factWords(pick.because?.shared);
    const also = alsoWords(pick.also);
    // (a long title ends in an ellipsis in its corner, leaving the foot's middle to "Open the film")
    const markTag = 'max-w-full overflow-hidden text-ellipsis px-1.5 py-0.5 bg-black/55 font-label text-[11px] md:text-[12px] tracking-[0.14em] uppercase text-white/90';
    const control = 'font-label text-[13px] tracking-[0.14em] uppercase text-gray-200 hover:text-white transition-colors';
    const holdStill = { onPointerEnter: (e) => e.pointerType === 'mouse' && setReading(true), onPointerLeave: () => setReading(false) };

    const screen = (
        <section
            ref={root}
            aria-label="Picked for you"
            className="relative"
            onFocus={(e) => { if (e.target.getAttribute('role') !== 'slider') setReading(true); }}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setReading(false); }}
        >
            <div className={iris && !reducedMotion ? 'iris-in' : ''}>
                {/* (a still pressed and moved would start the browser's own image drag, so that's off) */}
                {/* (a tap on the picture opens the film on it; a swipe turns to the next) */}
                <motion.div
                    style={{ x: nudge }}
                    className={turnable ? 'touch-pan-y cursor-grab active:cursor-grabbing select-none [&_img]:[-webkit-user-drag:none]' : 'cursor-pointer'}
                    onDragStartCapture={(e) => e.preventDefault()}
                    onClick={() => { if (swiped.current) { swiped.current = false; return; } navigate(`/movie/${pick._id}`); }}
                    {...stage}
                >
                    <DepthStage key={shot} seed={seed?.still} pick={stillOf(pick)} deep={deep} focus={focus} camera={camera} distance={distance} drift={hold} onReady={onReady} className="aspect-[4/5] sm:aspect-video lg:aspect-[2.39/1] ring-1 ring-white/10 shadow-[0_50px_100px_-40px_rgba(0,0,0,0.95)]">
                        {ghost?.key === shot && ghost.src && (
                            <img src={ghost.src} alt="" aria-hidden="true" className="shot-ghost absolute left-[-13%] top-[-13%] w-[126%] h-[126%] object-cover max-w-none pointer-events-none [mask-image:radial-gradient(closest-side,#000_60%,transparent)]" />
                        )}
                        {/* the film's name on its picture: a lower third, racked into focus as the pick lands */}
                        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                        <div className="absolute left-[5.5%] right-[5.5%] bottom-[15%] md:bottom-[17%] [text-shadow:0_2px_18px_rgba(0,0,0,0.85)]">
                            <h2 className={`max-w-4xl font-serif font-light leading-[1.02] text-white ${pick.title.length > 40 ? 'text-[1.5rem] sm:text-4xl lg:text-5xl' : 'text-[2rem] sm:text-5xl lg:text-6xl'}`}>
                                <Link to={`/movie/${pick._id}`} onClick={(e) => { e.stopPropagation(); if (swiped.current) { e.preventDefault(); swiped.current = false; } }} className="hover:text-gold-light">
                                    <RackText key={shot} play={landed} out={!landed}>{pick.title}</RackText>
                                </Link>
                            </h2>
                            <div className={`mt-2 md:mt-3 font-label text-[11px] md:text-[13px] tracking-[0.14em] uppercase text-gray-200 transition-opacity ${landed ? 'duration-500 opacity-100' : 'duration-200 opacity-0'}`}>
                                {facts.join(' · ')}<span className="text-gold">{facts.length ? ' · ' : ''}Open the film ›</span>
                            </div>
                        </div>
                        <MonitorHUD
                            distance={distance}
                            running={!paused && !reducedMotion}
                            right={<span className="px-2.5 py-1 bg-gold text-black font-label text-[11px] md:text-[12px] tracking-[0.14em] uppercase">For you · {index + 1} of {n}</span>}
                            bottomRight={(
                                <span className="relative block text-right">
                                    <motion.span style={{ opacity: nearMark }} className={`absolute right-0 bottom-0 whitespace-nowrap ${markTag}`}>Mark · {seed?.title || 'your films'}</motion.span>
                                    <motion.span style={{ opacity: farMark }} className={`block whitespace-nowrap ${markTag}`}>Mark · {pick.title}</motion.span>
                                </span>
                            )}
                        />
                    </DepthStage>
                </motion.div>
            </div>
            {turnable && (
                <>
                    <div className="mt-2"><MarkRing at={at} shot={shot} titles={titles} control={ring} /></div>
                    {!knowsRing && <p className="mt-1 text-right font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">‹ Turn the ring to go through all {n} ›</p>}
                </>
            )}

            <div className="mt-3 md:mt-2 grid md:grid-cols-[1fr_auto] gap-x-10 gap-y-6 items-end">
                <div className="min-w-0" {...holdStill}>
                    {seed && <p className="font-serif italic text-[1.2rem] md:text-[1.45rem] text-gray-200">{becauseWords(pick.because.how, seed.title)}</p>}
                    <div className={`transition-[opacity,transform] ${landed ? 'duration-500 delay-100 opacity-100 translate-y-0' : 'duration-200 opacity-0 translate-y-2'}`}>
                        <p className="mt-2 max-w-2xl text-[17px] md:text-[19px] leading-relaxed text-gray-200">
                            {evidenceWords(pick.because, { turn: index })}{also && <span className="text-gray-400"> {also}</span>}
                        </p>
                        {fact && <span className="mt-3 inline-block px-2.5 py-1 ring-1 ring-gold/40 font-label text-[11px] tracking-[0.14em] uppercase text-gold">{fact}</span>}
                    </div>
                </div>
                <div className="flex flex-col items-start md:items-end gap-4" {...holdStill}>
                    <div className={`transition-opacity duration-300 ${landed ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <Actions film={pick} act={act} large />
                    </div>
                    {n > 1 && (
                        <div className="flex items-center gap-6">
                            <button type="button" onClick={() => step(-1)} className={control}>‹ Previous</button>
                            {!reducedMotion && (
                                <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing} className={control}>
                                    {playing ? 'Pause' : 'Play'}
                                </button>
                            )}
                            <button type="button" onClick={() => step(1)} className={`relative pb-1.5 ${control}`}>
                                Next ›
                                {/* the time left on this pick */}
                                {!reducedMotion && <motion.span aria-hidden="true" className="absolute left-0 right-0 bottom-0 h-[2px] bg-gold origin-left" style={{ scaleX: hold }} />}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
    return screen;
};

export default TheScreen;
