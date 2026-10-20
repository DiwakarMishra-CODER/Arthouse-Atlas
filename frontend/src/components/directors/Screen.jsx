import { useImperativeHandle, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import TreatmentTitle from '../movements/TreatmentTitle';
import { pic } from './arrange';

/**
 * The Directors room's screen. One projector screen, fixed over the room: full-bleed for the
 * opening titles, then dollied back into its place beside the credits (`box`, a transform the page
 * drives from the scroll). Each director's film rolls into the gate the way a frame does when the
 * projector slips: the old frame runs down out of the gate, the black frame line passes, the new
 * frame comes down and settles, then the camera pushes in slowly while it's held. Then "Directed by"
 * and the name, set in their movement's title type.
 *
 * Two layers swap roles, moved with element.animate, so nothing re-renders while a frame rolls; the
 * only state is the title card (once per director).
 * ref: { show(place, { roll, quick }) -> Promise (the frame is up), img() } · props: box (the screen's transform), size {w, h},
 * openCard / dockCard (their opacities), dock {x, y, w, h} (where the docked card sits), phone
 */

const ROLL = 560;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const sourceOf = (place) => {
    const f = place?.film;
    if (f?.s) return pic(f.s, 'w1280');
    if (f?.o) return pic(f.o, 'w780');
    return null;
};
const name = (place, size) => {
    const { d } = place;
    if (!d.mv.length) return <h2 className={`font-serif font-light leading-[0.95] text-white ${size === 'display' ? 'text-[2.6rem] sm:text-6xl md:text-7xl lg:text-[5.6rem]' : 'text-[1.7rem] md:text-[2.2rem]'}`}>{d.n}</h2>;
    return <TreatmentTitle movement={{ tag: d.mv[0], title: d.n }} size={size === 'display' ? 'teaser' : 'card'} as="h2" />;
};
const filmLine = (place) => {
    const f = place.ranked || place.film;
    if (!f) return null;
    return [f.t, f.y].filter(Boolean).join(', ') + (place.rank ? `  ·  No. ${place.rank}` : '');
};

const Screen = ({ ref, box, size, openCard, dockCard, dock, phone, reducedMotion }) => {
    const layerA = useRef(null);
    const layerB = useRef(null);
    const imgA = useRef(null);
    const imgB = useRef(null);
    const front = useRef(0);
    const shown = useRef(null);
    const gen = useRef(0);
    const [card, setCard] = useState(null);

    useImperativeHandle(ref, () => ({
        img: () => (front.current === 0 ? imgA.current : imgB.current),
        show: (place, { roll = true, quick = false } = {}) => {
            if (!place) return Promise.resolve();
            const key = `${place.d.id}|${place.film?.id || ''}`;
            if (shown.current === key) return Promise.resolve();
            shown.current = key;
            const g = ++gen.current;
            const back = 1 - front.current;
            const into = back === 0 ? layerA.current : layerB.current;
            const out = back === 0 ? layerB.current : layerA.current;
            const img = back === 0 ? imgA.current : imgB.current;
            if (!into || !out || !img) return Promise.resolve();
            [into, out, img].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
            const src = sourceOf(place);
            if (src) img.src = src;
            else img.removeAttribute('src');
            const go = () => {
                if (g !== gen.current) return;
                front.current = back;
                into.style.zIndex = '2';
                out.style.zIndex = '1';
                setCard({ key, place });
                const settle = () => {
                    into.style.transform = '';
                    out.style.transform = 'translateY(106%)';
                    // held on the screen, the camera creeps in
                    if (!reducedMotion) img.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }], { duration: 7000, easing: 'linear', fill: 'forwards' });
                };
                if (!roll || reducedMotion) { settle(); return; }
                const timing = { duration: ROLL, easing: 'cubic-bezier(0.55, 0, 0.15, 1)', fill: 'forwards' };
                out.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(106%)' }], timing);
                into.animate([
                    { transform: 'translateY(-106%)' },
                    { transform: 'translateY(1.8%)', offset: 0.8 },
                    { transform: 'translateY(-0.6%)', offset: 0.92 },
                    { transform: 'translateY(0)' },
                ], timing).finished.then(() => { if (g === gen.current) settle(); }).catch(() => {});
            };
            // a frame goes up only once it's decoded (one still decoding mid-frame stalls the screen);
            // the opening titles, preloaded, may go up a moment early rather than keep anyone waiting
            const ready = src && img.decode ? img.decode().catch(() => {}) : Promise.resolve();
            return (quick ? Promise.race([ready, wait(260)]) : ready).then(go);
        },
    }), [reducedMotion]);

    const layer = (layerRef, imgRef, z) => (
        <div ref={layerRef} className="absolute inset-0" style={{ zIndex: z, transform: z === 1 ? 'translateY(106%)' : undefined }}>
            <img ref={imgRef} alt="" decoding="async" className="absolute inset-0 w-full h-full object-cover max-w-none" />
            {/* the frame line: the black between two frames on the strip */}
            <div className="absolute inset-x-0 top-full h-[6%] bg-black" />
            <div className="absolute inset-x-0 bottom-full h-[6%] bg-black" />
        </div>
    );

    return (
        <div aria-hidden="true" className="fixed inset-0 z-30 pointer-events-none">
            <motion.div className="absolute left-0 top-0 origin-top-left overflow-hidden bg-black" style={{ width: size.w, height: size.h, transform: box }}>
                {layer(layerA, imgA, 2)}
                {layer(layerB, imgB, 1)}
                {/* the projector's light and the room's dark at the edges */}
                <div className="projector-flicker absolute inset-0 z-[3] bg-[radial-gradient(ellipse_70%_80%_at_50%_45%,rgba(255,244,225,0.07),transparent_75%)]" />
                <div className="absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]" />
                {!phone && <motion.div className="absolute inset-x-0 bottom-0 h-1/2 z-[3] bg-gradient-to-t from-black/85 via-black/35 to-transparent" style={{ opacity: openCard }} />}
            </motion.div>

            {/* the opening title card: over the picture's foot on a desktop, under the screen on a phone */}
            {card && (
                <motion.div
                    className={phone ? 'absolute inset-x-0 px-5' : 'absolute left-0 bottom-0 px-10 lg:px-16 pb-[9vh] max-w-[70vw]'}
                    style={{ opacity: openCard, top: phone ? `calc(50% + ${Math.round(size.h / 2) - 20}px)` : undefined }}
                >
                    <div key={card.key} className="title-rise">
                        <div className="font-label text-[12px] md:text-[13px] tracking-[0.3em] uppercase text-gold">Directed by</div>
                        <div className="mt-3 md:mt-4">{name(card.place, 'display')}</div>
                        <div className="mt-4 md:mt-5 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gray-300">{filmLine(card.place)}</div>
                    </div>
                </motion.div>
            )}

            {/* docked: the name under the screen (over its foot on a phone) */}
            {card && (
                <motion.div
                    className="absolute"
                    style={{ opacity: dockCard, left: dock.x, top: phone ? dock.y + dock.h - 54 : dock.y + dock.h + 18, width: dock.w }}
                >
                    <div key={card.key} className={`title-rise ${phone ? 'px-4 py-2 bg-gradient-to-t from-black/90 to-transparent' : ''}`}>
                        {!phone && <div className="font-label text-[11px] tracking-[0.3em] uppercase text-gold">Directed by</div>}
                        <div className={phone ? 'font-serif text-[1.25rem] leading-tight text-white truncate' : 'mt-2'}>{phone ? card.place.d.n : name(card.place, 'card')}</div>
                        {!phone && <div className="mt-2 font-label text-[12px] tracking-[0.14em] uppercase text-gray-400 truncate">{filmLine(card.place)}</div>}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default Screen;
