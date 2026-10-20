import { motion, useTransform } from 'framer-motion';
import { posOf } from './shot';

/**
 * The lens's focus ring, seen from the focus puller's side: a barrel of black metal with the
 * distances engraved on it and strips of white camera tape where the marks are, each named for
 * a film. As focus pulls, the ring turns under the gold witness mark, from one film's tape to
 * the other's. (A real focus scale is close to even in 1/distance, which is why the far
 * distances crowd together towards infinity.) The screen that runs through your picks uses
 * MarkRing instead, a ring marked for every pick.
 *
 * distance: a motion value in metres; marks: [{ at: metres, label, blank? }]
 */

const ENGRAVED = [0.45, 0.5, 0.6, 0.7, 0.8, 1, 1.2, 1.5, 2, 3, 5, 10, Infinity];
const BAND = 3; // the band is three windows wide

const FocusRing = ({ distance, marks = [] }) => {
    // turn the band so the current distance sits under the witness mark (the window's centre)
    const x = useTransform(distance, (d) => `${(100 / (2 * BAND)) - posOf(d) * 100}%`);
    return (
        <div aria-hidden="true" className="relative h-[74px] md:h-[84px] overflow-hidden lens-ring rounded-[3px] select-none">
            <motion.div className="absolute inset-y-0 left-0" style={{ width: `${BAND * 100}%`, x }}>
                {ENGRAVED.map((m) => (
                    <span key={m} className="absolute top-[14px] -translate-x-1/2 flex flex-col items-center" style={{ left: `${posOf(m) * 100}%` }}>
                        <span className="w-px h-2.5 bg-white/60" />
                        <span className="mt-1 font-label text-[11px] md:text-[12px] tracking-[0.06em] text-white/75">{m === Infinity ? '∞' : m}</span>
                    </span>
                ))}
                {marks.map((mark) => (
                    <span key={`${mark.label || 'blank'}-${mark.at}`} className="absolute bottom-[12px] -translate-x-1/2 flex flex-col items-center" style={{ left: `${posOf(mark.at) * 100}%` }}>
                        <span className={`focus-tape ${mark.blank ? 'is-blank' : ''} max-w-[11rem] md:max-w-[15rem] truncate px-2 py-[2px] font-label text-[11px] md:text-[12px] tracking-[0.08em] uppercase -rotate-1`}>{mark.label}</span>
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

export default FocusRing;
