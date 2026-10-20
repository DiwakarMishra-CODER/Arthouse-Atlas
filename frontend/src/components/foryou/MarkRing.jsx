import { useRef } from 'react';
import { motion, useTransform } from 'framer-motion';

/**
 * The focus ring as the focus puller marks it for a whole scene: a strip of white camera tape for
 * every film picked for you, in order, each with its number, and fine engraving between them.
 * The ring turns with the playhead (`at`: 0 is the first pick, 1 the second, …, and the ring keeps
 * turning past the last back to the first), so the pick in focus sits under the gold witness
 * mark. Drag it and you turn it: the band moves with your hand, a fling carries on, and on letting
 * go it settles on the nearest mark. Arrow keys step a mark at a time.
 *
 * at: motion value; shot: the whole-number mark nearest (to draw the tapes around it); titles;
 * control: { label, valueNow, valueText, onGrab(), onTurn(steps), onLetGo(stepsPerSecond), onStep(±1) }
 */

const SPACING = 44; // % of the ring's width between two marks
const AROUND = 3; // marks drawn either side of the one in focus

const mod = (i, n) => ((i % n) + n) % n;

const MarkRing = ({ at, shot, titles, control }) => {
    const n = titles.length;
    const x = useTransform(at, (v) => `${-v * SPACING}%`);
    const grip = useRef(null);
    const marks = [];
    for (let i = shot - AROUND; i <= shot + AROUND; i++) marks.push(i);

    const hand = {
        role: 'slider',
        tabIndex: 0,
        'aria-label': control.label,
        'aria-valuemin': 1,
        'aria-valuemax': n,
        'aria-valuenow': control.valueNow,
        'aria-valuetext': control.valueText,
        onPointerDown: (e) => {
            if (e.button !== 0) return;
            const step = (e.currentTarget.offsetWidth * SPACING) / 100;
            grip.current = { x: e.clientX, step, trail: [[e.clientX, e.timeStamp]] };
            e.currentTarget.setPointerCapture(e.pointerId);
            control.onGrab();
        },
        onPointerMove: (e) => {
            const g = grip.current;
            if (!g) return;
            g.trail = [...g.trail.slice(-5), [e.clientX, e.timeStamp]];
            control.onTurn(-(e.clientX - g.x) / g.step);
        },
        onPointerUp: (e) => {
            const g = grip.current;
            if (!g) return;
            grip.current = null;
            // how fast the hand was moving as it let go, in marks a second
            const [x0, t0] = g.trail[0];
            const dt = (e.timeStamp - t0) / 1000;
            control.onLetGo(dt > 0 ? -((e.clientX - x0) / g.step) / dt : 0);
        },
        onPointerCancel: () => {
            if (!grip.current) return;
            grip.current = null;
            control.onLetGo(0);
        },
        onKeyDown: (e) => {
            const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
            if (!step) return;
            e.preventDefault();
            control.onStep(step);
        },
    };

    return (
        <div
            {...hand}
            className="relative h-[74px] md:h-[84px] overflow-hidden lens-ring rounded-[3px] select-none cursor-grab active:cursor-grabbing touch-pan-y focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light"
        >
            <motion.div className="absolute inset-0" style={{ x }}>
                {marks.map((i) => (
                    <span key={i}>
                        {/* fine engraving between the marks */}
                        {[0.25, 0.5, 0.75].map((f) => (
                            <span key={f} className={`absolute top-[14px] w-px bg-white/35 ${f === 0.5 ? 'h-3' : 'h-2'}`} style={{ left: `${50 + (i + f) * SPACING}%` }} />
                        ))}
                        <span className="absolute top-[12px] -translate-x-1/2 flex flex-col items-center" style={{ left: `${50 + i * SPACING}%` }}>
                            <span className="w-px h-3.5 bg-white/70" />
                            <span className="mt-0.5 font-label text-[11px] md:text-[12px] tracking-[0.06em] text-white/75 tabular-nums">{mod(i, n) + 1}</span>
                        </span>
                        <span className="absolute bottom-[12px] -translate-x-1/2" style={{ left: `${50 + i * SPACING}%` }}>
                            <span className="focus-tape block max-w-[9rem] sm:max-w-[13rem] md:max-w-[16rem] truncate px-2 py-[2px] font-label text-[11px] md:text-[12px] tracking-[0.08em] uppercase -rotate-1">{titles[mod(i, n)]}</span>
                        </span>
                    </span>
                ))}
            </motion.div>
            <span className="absolute inset-0 lens-ring-curve pointer-events-none" />
            {/* the witness mark */}
            <span className="absolute left-1/2 top-0 -translate-x-1/2 w-0 h-0 border-x-[7px] border-x-transparent border-t-[10px] border-t-gold" />
            <span className="absolute left-1/2 top-[10px] bottom-0 -translate-x-1/2 w-px bg-gold/50" />
        </div>
    );
};

export default MarkRing;
