import { useEffect, useRef } from 'react';
import { pic } from '../directors/arrange';

/**
 * A house's films as a strip of frames you pull through a gate (the gold frame in the middle):
 * drag it (a hand, a finger, or the arrow keys), or tap a frame to bring it to the gate. The frame in
 * the gate is reported up (`onGate(film, fast)`), fast when the strip is racing past.
 */

const FrameStrip = ({ films, onGate }) => {
    const strip = useRef(null);
    const hand = useRef(null);

    useEffect(() => {
        const el = strip.current;
        if (!el) return undefined;
        let frame = 0;
        let last = -1;
        let lastAt = 0;
        const read = () => {
            frame = 0;
            const mid = el.scrollLeft + el.clientWidth / 2;
            let best = 0;
            let gap = Infinity;
            [...el.children].forEach((c, i) => {
                const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
                if (d < gap) { gap = d; best = i; }
            });
            if (best === last) return;
            const now = performance.now();
            onGate(films[best], now - lastAt < 200);
            last = best;
            lastAt = now;
        };
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(read); };
        el.addEventListener('scroll', onScroll, { passive: true });
        read();
        return () => { cancelAnimationFrame(frame); el.removeEventListener('scroll', onScroll); };
    }, [films, onGate]);

    const toGate = (i) => {
        const el = strip.current;
        const c = el?.children[i];
        if (c) el.scrollTo({ left: c.offsetLeft + c.offsetWidth / 2 - el.clientWidth / 2, behavior: 'smooth' });
    };
    const step = (dir) => {
        const el = strip.current;
        if (el) el.scrollBy({ left: dir * (el.children[0]?.offsetWidth || 160), behavior: 'smooth' });
    };

    return (
        <div className="relative">
            <ol
                ref={strip}
                tabIndex={0}
                aria-label="The films. Drag, or use the arrow keys, to bring one to the gate."
                className="relative flex gap-2 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] cursor-grab active:cursor-grabbing select-none py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-light [&_img]:[-webkit-user-drag:none]"
                style={{ paddingInline: 'calc(50% - 4.75rem)' }}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
                    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
                }}
                onPointerDown={(e) => {
                    if (e.pointerType !== 'mouse' || e.button !== 0) return;
                    hand.current = { x: e.clientX, left: strip.current.scrollLeft, moved: false };
                    strip.current.style.scrollSnapType = 'none';
                    strip.current.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                    const h = hand.current;
                    if (!h) return;
                    if (Math.abs(e.clientX - h.x) > 4) h.moved = true;
                    strip.current.scrollLeft = h.left - (e.clientX - h.x);
                }}
                onPointerUp={() => {
                    if (!hand.current) return;
                    setTimeout(() => { if (strip.current) strip.current.style.scrollSnapType = ''; }, 0);
                    setTimeout(() => { hand.current = null; }, 0);
                }}
                onDragStartCapture={(e) => e.preventDefault()}
            >
                {films.map((f, i) => (
                    <li key={f.id} className="snap-center shrink-0 w-[9.5rem] aspect-video overflow-hidden bg-black ring-1 ring-white/10">
                        <button type="button" onClick={() => { if (!hand.current?.moved) toGate(i); }} aria-label={`${f.t}${f.y ? `, ${f.y}` : ''}`} className="block w-full h-full">
                            {(f.s || f.o) && <img src={pic(f.s || f.o, 'w300')} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover max-w-none" />}
                        </button>
                    </li>
                ))}
            </ol>
            {/* the gate */}
            <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[9.5rem] ring-2 ring-gold shadow-[0_0_24px_rgba(217,173,98,0.35)]" />
        </div>
    );
};

export default FrameStrip;
