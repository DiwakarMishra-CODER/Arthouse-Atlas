import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useNavigationType, useSearchParams } from 'react-router-dom';
import { motion, useMotionTemplate, useMotionValue, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import { MdSearch } from 'react-icons/md';
import { directorsAPI } from '../services/api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import Screen from '../components/directors/Screen';
import Credits from '../components/directors/Credits';
import { ARRANGEMENTS, arrange, narrow, pic } from '../components/directors/arrange';
import { usePageTitle } from '../hooks/usePageTitle';

/**
 * Directors: "Directed by". The scroll is the projector. The room opens on one screen, full-bleed,
 * already playing the first director: their best film rolls into the gate the way a frame does when
 * the projector slips, and "Directed by" and the name land in their movement's title type. Every
 * notch of the scroll rolls in the next of the first ten, so scrolling past is watching; left alone,
 * it steps on by itself. Then the screen dollies back into its place beside the credits: every
 * director as a film's end credits, the film on the left and the director on the right, so someone
 * who knows a film finds the person, and whoever's line passes the gate plays on the screen.
 *
 * Four ways in (acclaim, country, decade, movement) and a search that also knows their films. A line
 * opens the retrospective: the film on the screen grows into it. The arrangement and the search live
 * in the address, and Back lands where you were.
 */

let cached = null; // the index, kept for this visit to the site, so Back finds the page full height
const NOTE = 'directors:place';
const OPENING = 10; // directors in the opening titles
const NOTCH = 35; // vh of scroll for each of them
const DOLLY = 60; // vh of scroll for the dolly back
const IDLE = 3000; // ms between steps when nobody scrolls

const readNote = () => {
    try { return JSON.parse(sessionStorage.getItem(NOTE) || 'null'); } catch { return null; }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// where the screen stands: full-bleed (or a wide band, on a phone) for the opening; docked beside
// the credits (at the top, on a phone) after the dolly back. It's laid out at its opening size and
// only ever scaled down, so it stays sharp.
const geometry = (vw, vh) => {
    if (vw < 768) {
        const h = Math.round((vw * 9) / 16);
        return { phone: true, w: vw, h, open: { x: 0, y: Math.round((vh - h) / 2) - 70, s: 1 }, dock: { x: 0, y: 76, w: vw, h, s: 1 }, column: vw };
    }
    const w = Math.max(vw, Math.round((vh * 16) / 9));
    const h = Math.round((w * 9) / 16);
    const dw = Math.min(Math.round(vw * 0.5), Math.round(((vh - 84 - 150) * 16) / 9));
    const dh = Math.round((dw * 9) / 16);
    const dock = { x: vw - dw - 48, y: 84 + Math.round((vh - 84 - dh) / 2) - 50, w: dw, h: dh, s: dw / w };
    return { phone: false, w, h, open: { x: Math.round((vw - w) / 2), y: Math.round((vh - h) / 2), s: 1 }, dock, column: vw - dw - 48 };
};

const Directors = () => {
    const navigate = useNavigate();
    const navigation = useNavigationType();
    const reducedMotion = useMotionPreference();
    usePageTitle('Directors', 'Every director in the atlas, their films rolling through the projector’s gate.');
    const [params, setParams] = useSearchParams();
    const by = ARRANGEMENTS.some((a) => a.key === params.get('by')) ? params.get('by') : 'acclaim';
    const q = params.get('q') || '';
    const [index, setIndex] = useState(cached);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [geom, setGeom] = useState(() => geometry(window.innerWidth, window.innerHeight));
    const geo = useMotionValue(geom);
    const screen = useRef(null);
    const opening = useRef(null);
    const iris = useRef(null);
    const placesRef = useRef(new Map());
    const at = useRef(-1); // which of the opening titles the screen shows (-1: the credits have it)
    const gate = useRef({ el: null, t: 0 });
    const restored = useRef(false);
    const restoring = navigation === 'POP';

    useEffect(() => {
        if (cached) return undefined;
        let gone = false;
        directorsAPI.getIndex()
            .then((r) => { cached = r.data; if (!gone) { setIndex(r.data); setFailed(false); } })
            .catch(() => { if (!gone) setFailed(true); });
        return () => { gone = true; };
    }, [attempt]);

    useEffect(() => {
        const onResize = () => {
            const g = geometry(window.innerWidth, window.innerHeight);
            setGeom(g);
            geo.set(g);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [geo]);

    const arranged = useMemo(() => (index ? arrange(index, by) : []), [index, by]);
    const sections = useMemo(() => narrow(arranged, q), [arranged, q]);
    const places = useMemo(() => new Map(sections.flatMap((s) => s.places.map((p) => [`${s.key}|${p.d.id}`, p]))), [sections]);
    // the opening plays the arrangement's first ten, whatever the search: its length is scroll above
    // the search box, so if typing changed it, the page would jump under the reader's hands
    const titles = useMemo(() => (reducedMotion ? [] : arranged.flatMap((s) => s.places).slice(0, OPENING)), [arranged, reducedMotion]);
    const shown = sections.reduce((n, s) => n + s.places.length, 0);
    useEffect(() => { placesRef.current = places; }, [places]);

    // ---- the opening titles and the dolly back, both driven by the scroll ----
    const n = titles.length;
    const span = n * NOTCH + DOLLY;
    const seg = n ? (n * NOTCH) / span : 0;
    const { scrollYProgress: p } = useScroll({ target: opening, offset: ['start start', 'end end'] });
    const dolly = useTransform(p, (v) => (!n ? 1 : v <= seg ? 0 : Math.min(1, (v - seg) / (1 - seg))));
    const box = useTransform([dolly, geo], ([d, g]) => {
        const t = ease(d);
        const x = g.open.x + (g.dock.x - g.open.x) * t;
        const y = g.open.y + (g.dock.y - g.open.y) * t;
        const s = 1 + (g.dock.s - 1) * t;
        return `translate3d(${x}px, ${y}px, 0) scale(${s})`;
    });
    const openOp = useTransform(dolly, [0, 0.3], [1, 0]);
    const dockOp = useTransform(dolly, [0.8, 1], [0, 1]);
    const openCard = useMotionTemplate`${openOp}`;
    const dockCard = useMotionTemplate`${dockOp}`;
    // the opening card's button takes a tap or a key only while the card can be seen
    const [openLive, setOpenLive] = useState(true);
    useMotionValueEvent(openOp, 'change', (v) => setOpenLive(v > 0.5));

    const titleAt = useCallback((v) => (v >= seg ? n - 1 : Math.min(n - 1, Math.floor((v / seg) * n))), [n, seg]);
    useMotionValueEvent(p, 'change', (v) => {
        if (!n || v > seg + 0.02) return;
        const i = titleAt(v);
        if (i !== at.current) {
            at.current = i;
            screen.current?.show(titles[i], { quick: true });
        }
    });
    // the first director is on the screen as soon as the room opens (and the titles follow a new
    // arrangement)
    useEffect(() => {
        if (!n) return;
        const v = p.get();
        if (v > seg + 0.02) return;
        at.current = titleAt(v);
        screen.current?.show(titles[at.current], { quick: true });
        // the opening's stills, decoded ahead, so every notch of the scroll finds its frame ready
        titles.map((t) => pic(t.film?.s, 'w1280')).filter(Boolean).forEach((src) => {
            const img = new Image();
            img.src = src;
            img.decode?.().catch(() => {});
        });
    }, [titles, n, seg, p, titleAt]);
    // left alone at the top, it steps on by itself
    useEffect(() => {
        if (!n || reducedMotion) return undefined;
        let k = 0;
        const t = setInterval(() => {
            if (window.scrollY > 8 || document.hidden) return;
            k = (k + 1) % n;
            at.current = -1;
            screen.current?.show(titles[k], { quick: true });
        }, IDLE);
        return () => clearInterval(t);
    }, [titles, n, reducedMotion]);

    // ---- the credits' gate: whoever's line passes it plays on the screen ----
    const onGate = useCallback((k, el) => {
        const place = placesRef.current.get(k);
        if (!place) return;
        const now = performance.now();
        const fast = now - gate.current.t < 250;
        gate.current.el?.removeAttribute('data-at');
        el.setAttribute('data-at', '');
        gate.current = { el, t: now };
        at.current = -1;
        screen.current?.show(place, { roll: !fast });
        const img = iris.current;
        if (!img) return;
        img.getAnimations().forEach((a) => a.cancel());
        if (place.d.p) {
            img.src = pic(place.d.p, 'w185');
            img.dataset.on = '1';
            if (!reducedMotion) img.animate([{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(50% at 50% 50%)' }], { duration: 300, easing: 'ease-out' });
        } else {
            img.dataset.on = '';
        }
    }, [reducedMotion]);

    // ---- coming back: the page puts you back itself, where you were ----
    useEffect(() => {
        const previous = window.history.scrollRestoration;
        window.history.scrollRestoration = 'manual';
        return () => { window.history.scrollRestoration = previous; };
    }, []);
    useEffect(() => {
        let t = 0;
        const onScroll = () => {
            clearTimeout(t);
            t = setTimeout(() => {
                try { sessionStorage.setItem(NOTE, JSON.stringify({ at: `${by}|${q}`, y: Math.round(window.scrollY) })); } catch { /* storage blocked */ }
            }, 150);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); };
    }, [by, q]);
    useLayoutEffect(() => {
        if (!index || restored.current) return;
        restored.current = true;
        if (!restoring) return;
        const note = readNote();
        if (note && note.at === `${by}|${q}`) window.scrollTo(0, note.y);
    }, [index, restoring, by, q]);

    const change = (key, value) => {
        const next = new URLSearchParams(params);
        if (!value || (key === 'by' && value === 'acclaim')) next.delete(key);
        else next.set(key, value);
        setParams(next, { replace: true });
    };

    // ---- into the retrospective: the film on the screen grows into it ----
    // (from a line of the credits, by its key, or from the opening's own title card)
    const openPlace = useCallback((e, place) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        try { sessionStorage.setItem(NOTE, JSON.stringify({ at: `${by}|${q}`, y: Math.round(window.scrollY) })); } catch { /* storage blocked */ }
        if (!place) return;
        const go = () => navigate(`/directors/${place.d.id}`, {
            state: { from: 'index', name: place.d.n, portrait: place.d.p ? pic(place.d.p, 'h632') : null, still: screen.current?.img()?.currentSrc || null },
        });
        if (reducedMotion || !document.startViewTransition || !screen.current) { go(); return; }
        at.current = -1;
        screen.current.show(place, { roll: false }).then(() => {
            const img = screen.current?.img();
            if (img) img.style.viewTransitionName = 'director-shot';
            // the router commits a navigation in a transition, so wait for the retrospective's light
            document.startViewTransition(async () => {
                go();
                const t0 = performance.now();
                while (!document.querySelector('[data-room-light]') && performance.now() - t0 < 500) await wait(16);
                window.scrollTo(0, 0);
            });
        });
    }, [by, q, navigate, reducedMotion]);
    const onOpen = useCallback((e, k) => openPlace(e, placesRef.current.get(k)), [openPlace]);

    return (
        <div className="own-transitions relative min-h-screen pb-[60vh]">
            <Screen ref={screen} box={box} size={{ w: geom.w, h: geom.h }} openCard={openCard} dockCard={dockCard} dock={geom.dock} phone={geom.phone} openLive={openLive && n > 0} onOpen={openPlace} reducedMotion={reducedMotion} />

            {/* the opening titles: scroll that the screen plays through, full-bleed */}
            <div ref={opening} aria-hidden="true" style={{ height: n ? `calc(100vh + ${span}vh)` : (geom.phone ? `${geom.dock.y + geom.h + 16}px` : '84px') }}>
                {n > 0 && (
                    <motion.div className="sticky top-[calc(100svh-3.25rem)] z-40 text-center font-label text-[12px] tracking-[0.3em] uppercase text-gray-300" style={{ opacity: openCard }}>
                        Scroll for the next ↓
                    </motion.div>
                )}
            </div>

            {/* the credits, beside the docked screen (under it, on a phone) */}
            <div className="relative z-20 px-4 md:pl-24 md:pr-10" style={{ width: geom.phone ? '100%' : geom.column }}>
                <div className="max-w-3xl md:ml-auto md:mr-12 lg:mr-20">
                    <header className="pt-10">
                        <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">{index ? `${index.directors.length} in the atlas` : 'In the atlas'}</div>
                        <h1 className="mt-2 font-serif font-light text-[2.7rem] md:text-6xl lg:text-7xl leading-[1.02] text-white">Directed by</h1>
                        <label className="mt-7 flex items-center gap-3 pb-2 border-b border-white/25 focus-within:border-gold transition-colors">
                            <MdSearch aria-hidden="true" className="shrink-0 text-xl text-gray-400" />
                            <input
                                type="search"
                                value={q}
                                onChange={(e) => change('q', e.target.value)}
                                placeholder="A director, or a film they made"
                                aria-label="Find a director, or a film they made"
                                className="w-full min-w-0 bg-transparent font-courier text-[15px] sm:text-[17px] md:text-[19px] text-white placeholder:text-gray-500 outline-none"
                            />
                        </label>
                        <div role="group" aria-label="Arrange by" className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                            {ARRANGEMENTS.map((a) => (
                                <button
                                    key={a.key}
                                    type="button"
                                    aria-pressed={by === a.key}
                                    onClick={() => change('by', a.key)}
                                    className={`font-label text-[13px] tracking-[0.14em] uppercase pb-1.5 border-b-2 ${by === a.key ? 'text-gold border-gold' : 'text-gray-300 border-transparent hover:text-white'}`}
                                >
                                    {a.word}
                                </button>
                            ))}
                        </div>
                    </header>

                    {failed && !index ? (
                        <div className="py-20">
                            <p className="font-serif text-3xl text-gray-100">The directors couldn’t be reached just now.</p>
                            <button type="button" onClick={() => setAttempt((a) => a + 1)} className="mt-6 px-5 py-2.5 ring-1 ring-gold/60 text-gold-light font-label text-[13px] tracking-[0.14em] uppercase hover:bg-gold hover:text-black transition-colors">Try again</button>
                        </div>
                    ) : (
                        <div className="relative mt-6">
                            {/* the iris portrait, held at the gate in the margin as the credits run past */}
                            <div aria-hidden="true" className="hidden md:block sticky top-[46vh] h-0 z-10">
                                <img ref={iris} alt="" className="credit-iris absolute -left-[4.5rem] -translate-y-1/2 w-12 h-12 rounded-full object-cover max-w-none grayscale contrast-[1.08] ring-1 ring-gold/60" />
                            </div>
                            {!index && <p className="py-16 font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">The credits are coming up…</p>}
                            {index && !sections.length && (
                                <div className="py-14">
                                    <p className="font-serif text-2xl md:text-3xl text-gray-100">No director or film here by that name.</p>
                                    <button type="button" onClick={() => change('q', '')} className="mt-5 font-label text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">Clear the search</button>
                                </div>
                            )}
                            <p className="sr-only" aria-live="polite">{index && q ? `${shown} found` : ''}</p>
                            <Credits sections={sections} by={by} onGate={onGate} onOpen={onOpen} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Directors;
