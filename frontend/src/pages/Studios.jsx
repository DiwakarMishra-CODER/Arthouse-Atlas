import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdClose } from 'react-icons/md';
import BackButton from '../components/BackButton';
import { studiosAPI } from '../services/api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import LightScreen from '../components/studios/LightScreen';
import { layout } from '../components/studios/lotLayout';
import { createLotRenderer } from '../components/studios/lotRenderer';
import { usePageTitle } from '../hooks/usePageTitle';

/**
 * Studios: the Lot. A studio backlot at night, seen from the air, built out of the films
 * themselves: every house a soundstage made of its own films' stills, its name on the roof, the
 * stages standing in districts by country with streets between. The room opens close on one stage
 * and the crane pulls up and back over the whole lot; then the camera drifts. Drag to look around,
 * scroll (or pinch) to come closer, and tap a stage: the crane comes down onto it, the house's name
 * stands in the projector's white beside it, and its film comes up out of the light. Tap any of its
 * films to bring that one up; its page is one more tap away.
 */

let cachedHouses = null; // kept for this visit to the site
const details = new Map();
const COUNTRY = { 'United States of America': 'United States' };
const yearsOf = (s) => (s.years ? (s.years[0] === s.years[1] ? `${s.years[0]}` : `${s.years[0]}–${s.years[1]}`) : '');
const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => img.decode().catch(() => {}).then(() => resolve(img));
    img.onerror = reject;
    img.src = src;
});

const Studios = () => {
    const reducedMotion = useMotionPreference();
    usePageTitle('Studios', 'The houses behind the films (studios, producers and labels), as a backlot seen from a crane.');
    const [houses, setHouses] = useState(cachedHouses);
    const [index, setIndex] = useState(null);
    const [sheet, setSheet] = useState(null);
    const [failed, setFailed] = useState(false);
    const [focus, setFocus] = useState(null); // the house the crane came down onto
    const [phone, setPhone] = useState(() => window.innerWidth < 768);
    const [cameBack] = useState(() => new URLSearchParams(window.location.search).get('focus')); // back from a house's stage
    const canvas = useRef(null);
    const lot = useRef(null);
    const screen = useRef(null);
    const hand = useRef({ pointers: new Map(), moved: false, pinch: 0 });
    const focusRef = useRef(null);
    const landed = useRef(0);

    useEffect(() => {
        let gone = false;
        if (!cachedHouses) {
            studiosAPI.getIndex().then((r) => { cachedHouses = r.data; if (!gone) setHouses(r.data); }).catch(() => { if (!gone) setFailed(true); });
        }
        fetch('/mosaic/mosaic.json').then((r) => r.json()).then((j) => { if (!gone) setIndex(j); }).catch(() => { if (!gone) setFailed(true); });
        loadImage('/mosaic/mosaic-1x.webp').then((img) => { if (!gone) setSheet(img); }).catch(() => { if (!gone) setFailed(true); });
        const onResize = () => setPhone(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => { gone = true; window.removeEventListener('resize', onResize); };
    }, []);

    const plan = useMemo(() => (houses ? layout(houses) : null), [houses]);
    const stageOf = useMemo(() => new Map((plan?.stages || []).map((st) => [st.house.slug, st])), [plan]);
    const films = houses ? new Set(houses.flatMap((h) => h.ids)).size : 0; // a film two houses share counts once

    // the lot, drawn; the crane pulls up off the biggest stage over the whole lot
    useEffect(() => {
        if (!plan || !index || !sheet || !canvas.current) return undefined;
        const r = createLotRenderer(canvas.current, { plan, index, sheet });
        lot.current = r;
        r.resize();
        // (back from a house's stage, the camera starts over its roof and settles straight onto it)
        const from = plan.stages.find((s) => s.house.slug === cameBack) || plan.stages.find((s) => s.house.slug === 'criterion') || plan.stages[0];
        r.arrive(from, { still: reducedMotion });
        let gone = false;
        document.fonts?.load('500 10px Oswald').then(() => { if (!gone) r.resize(); }).catch(() => {});
        // (the small sheet only: close up, each film's own still is fetched, and the big sheet's upload
        // to the screen stalls a frame)
        const onResize = () => r.resize();
        window.addEventListener('resize', onResize);
        // scroll to come closer (the page itself never scrolls: the lot is the whole room)
        const el = canvas.current;
        const onWheel = (e) => {
            e.preventDefault();
            r.zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0016));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            gone = true;
            r.destroy();
            lot.current = null;
            window.removeEventListener('resize', onResize);
            el.removeEventListener('wheel', onWheel);
        };
    }, [plan, index, sheet, reducedMotion, cameBack]);

    // the crane comes down onto a house: its name in the light, then its film comes up out of it
    const frame = useMemo(() => (phone ? { x: 0.04, y: 0.13, w: 0.92, h: 0.36 } : { x: 0.03, y: 0.12, w: 0.56, h: 0.8 }), [phone]);
    const open = useCallback((house, film) => {
        focusRef.current = house;
        setFocus(house);
        landed.current = performance.now();
        lot.current?.focus(stageOf.get(house.slug), frame);
        const show = (detail) => {
            const pick = film ? detail?.films.find((f) => f.id === film) : null;
            const first = pick || detail?.films.find((f) => f.id === house.run?.[0]?.id) || detail?.films[0] || house.run?.[0];
            const wait = Math.max(0, 1000 - (performance.now() - landed.current));
            setTimeout(() => { if (focusRef.current === house) screen.current?.film(first); }, wait);
        };
        if (details.has(house.slug)) show(details.get(house.slug));
        else studiosAPI.getOne(house.slug).then((r) => { details.set(house.slug, r.data); show(r.data); }).catch(() => show(null));
    }, [stageOf, frame]);
    const cameDown = useRef(false);
    useEffect(() => {
        const stage = cameBack && lot.current && stageOf.get(cameBack);
        if (!stage || cameDown.current) return undefined;
        const t = setTimeout(() => { cameDown.current = true; open(stage.house); }, 120);
        return () => clearTimeout(t);
    }, [cameBack, stageOf, open, index, sheet]);
    // (its name goes up in the light as soon as the panel is there to hold it)
    useEffect(() => { if (focus) screen.current?.credit(focus); }, [focus]);
    const close = useCallback(() => {
        focusRef.current = null;
        setFocus(null);
        lot.current?.release();
    }, []);
    useEffect(() => {
        if (!focus) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [focus, close]);

    // a hand on the lot: drag to look around, two fingers to come closer, a tap to choose
    const down = (e) => {
        const h = hand.current;
        h.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        h.moved = false;
        h.pinch = 0;
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const move = (e) => {
        const h = hand.current;
        const r = lot.current;
        if (!r) return;
        if (!h.pointers.has(e.pointerId)) {
            // a pointer passing over: light the stage under it
            if (e.pointerType === 'mouse') {
                const hit = r.pick(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                r.hover(hit?.stage || null);
                e.currentTarget.style.cursor = hit ? 'pointer' : 'grab';
            }
            return;
        }
        const was = h.pointers.get(e.pointerId);
        h.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (h.pointers.size === 2) {
            const [a, b] = [...h.pointers.values()];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (h.pinch) r.zoomAt(e.nativeEvent.offsetX, e.nativeEvent.offsetY, d / h.pinch);
            h.pinch = d;
            h.moved = true;
            return;
        }
        const dx = e.clientX - was.x;
        const dy = e.clientY - was.y;
        if (!h.moved && Math.hypot(dx, dy) < 3) return;
        h.moved = true;
        r.panBy(dx, dy);
    };
    const up = (e) => {
        const h = hand.current;
        h.pointers.delete(e.pointerId);
        if (h.moved || h.pointers.size) return;
        const hit = lot.current?.pick(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        if (!hit) { if (focusRef.current) close(); return; }
        const { stage, tile } = hit;
        if (focusRef.current?.slug === stage.house.slug) {
            // already down on it: the film tapped comes up
            const f = tile && (details.get(stage.house.slug)?.films.find((x) => x.id === tile.id));
            if (f) screen.current?.film(f);
            return;
        }
        open(stage.house, tile?.id);
    };

    const tilt = focus || reducedMotion ? 0 : 20;
    return (
        <div className="own-transitions relative h-[100svh] overflow-hidden select-none">
            <h1 className="sr-only">Studios: every house, as a backlot of its films</h1>
            <BackButton className="absolute top-24 left-4 md:left-10 z-30" />
            {/* the lot, seen from a crane: tilted away into the night, flat under the camera once it comes down */}
            <canvas
                ref={canvas}
                aria-hidden="true"
                className="absolute inset-0 w-full h-full touch-none cursor-grab"
                style={{ transform: `perspective(1600px) rotateX(${tilt}deg)`, transformOrigin: '50% 100%', transition: 'transform 1000ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={(e) => hand.current.pointers.delete(e.pointerId)}
                onPointerLeave={() => lot.current?.hover(null)}
            />
            {/* the far side of the lot fades into the night */}
            <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 h-[38%] bg-gradient-to-b from-[#050505] via-[#050505]/70 to-transparent transition-opacity duration-700 ${focus ? 'opacity-40' : 'opacity-100'}`} />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(5,5,5,0.75))]" />

            {/* the room's title, over the night sky */}
            <header className={`pointer-events-none absolute left-4 md:left-10 top-[9.25rem] md:top-[10.5rem] transition-opacity duration-500 ${focus ? 'opacity-0' : 'opacity-100'}`}>
                <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">{houses ? `${houses.length} houses · ${films} films` : 'The houses'}</div>
                <div className="mt-1 font-serif font-light text-[2.4rem] md:text-6xl leading-[1.02] text-white">Presented by</div>
            </header>
            {!focus && !failed && (
                <p className="pointer-events-none absolute inset-x-0 bottom-5 text-center font-label text-[12px] tracking-[0.2em] uppercase text-gray-300">
                    {phone ? 'Drag · pinch · tap a stage' : 'Drag to look around · scroll to come closer · tap a stage'}
                </p>
            )}
            {failed && !plan && <p className="absolute inset-x-0 top-1/2 text-center font-serif text-2xl text-gray-200">The lot’s lights wouldn’t come on just now.</p>}
            {!plan && !failed && <p className="absolute inset-x-0 top-1/2 text-center font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">The lights are coming up…</p>}

            {/* down on a stage: the house's light, and the way into its page */}
            {focus && (
                <aside className={`band-open absolute z-10 ${phone ? 'inset-x-0 bottom-0 px-4 pb-5 pt-4 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-[#050505]/70' : 'right-6 lg:right-10 top-28 bottom-10 w-[37%] flex flex-col justify-center'}`}>
                    <button type="button" onClick={close} aria-label="Back to the whole lot" className="self-end mb-3 inline-flex items-center gap-1.5 font-label text-[12px] tracking-[0.14em] uppercase text-gray-300 hover:text-white">
                        <MdClose aria-hidden="true" /> The whole lot
                    </button>
                    <LightScreen ref={screen} reducedMotion={reducedMotion} className="w-full aspect-video shadow-[0_30px_100px_-30px_rgba(241,236,226,0.3)]" />
                    <div className="mt-4 md:mt-6">
                        <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">{[COUNTRY[focus.country] || focus.country, focus.kind === 'label' ? 'Label' : null].filter(Boolean).join(' · ')}</div>
                        <div className="mt-1 font-serif font-light text-[2rem] md:text-5xl leading-[1.02] text-white">{focus.name}</div>
                        <div className="mt-2 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gray-400">{focus.count} {focus.count === 1 ? 'film' : 'films'} · {yearsOf(focus)} · tap one</div>
                        <Link to={`/studios/${focus.slug}`} className="mt-4 md:mt-6 inline-flex items-center gap-2 px-5 py-3 min-h-11 bg-gold text-black font-label text-[13px] tracking-[0.14em] uppercase hover:bg-gold-light transition-colors">
                            Enter {focus.name} ›
                        </Link>
                    </div>
                </aside>
            )}

            {/* every house, for the keyboard and screen readers */}
            <ul className="sr-only">
                {(houses || []).map((h) => <li key={h.slug}><Link to={`/studios/${h.slug}`}>{h.name}, {h.count} films</Link></li>)}
            </ul>
        </div>
    );
};

export default Studios;
