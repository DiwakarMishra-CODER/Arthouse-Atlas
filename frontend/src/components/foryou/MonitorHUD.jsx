import { useEffect, useRef } from 'react';
import { motion, useTransform } from 'framer-motion';

/**
 * The focus puller's monitor, laid over the picture: the frame lines' corners, a small centre
 * cross, the camera and lens, the focus distance as it changes (read live from the ring), and
 * the timecode, running from hour one as a programme's picture does, frozen while the monitor
 * is paused. Thin white lines and small capitals on dark boxes, as on a real monitor, readable
 * over any picture.
 */
const Corner = ({ className }) => <span className={`absolute w-6 h-6 md:w-8 md:h-8 border-white/70 ${className}`} />;

const OSD = 'px-1.5 py-0.5 bg-black/55 font-label tracking-[0.14em] uppercase';
const FPS = 24;
const two = (n) => String(n).padStart(2, '0');
const timecode = (frames) => {
    const s = Math.floor(frames / FPS);
    return `TC ${two(1 + Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}:${two(frames % FPS)}`;
};

// the timecode writes its own text a frame at a time, so the page never re-renders for it
const Timecode = ({ running }) => {
    const el = useRef(null);
    const frames = useRef(0);
    useEffect(() => {
        if (!running) return undefined;
        const from = frames.current;
        const t0 = performance.now();
        let raf = 0;
        const tick = (now) => {
            const f = from + Math.floor(((now - t0) / 1000) * FPS);
            if (f !== frames.current) {
                frames.current = f;
                if (el.current) el.current.textContent = timecode(f);
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [running]);
    return <span ref={el} className={`absolute left-1/2 top-[7.5%] -translate-x-1/2 hidden md:block ${OSD} text-[12px] text-white/85 tabular-nums`}>{timecode(0)}</span>;
};

const MonitorHUD = ({ distance, running = true, top = 'A CAM · 50 MM · T2', right = null, bottomRight = null }) => {
    const reading = useTransform(distance, (d) => `FOCUS ${d === Infinity ? '∞' : `${d.toFixed(1)} M`}`);
    return (
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
            <Corner className="left-[3.5%] top-[6%] border-l-[1.5px] border-t-[1.5px]" />
            <Corner className="right-[3.5%] top-[6%] border-r-[1.5px] border-t-[1.5px]" />
            <Corner className="left-[3.5%] bottom-[6%] border-l-[1.5px] border-b-[1.5px]" />
            <Corner className="right-[3.5%] bottom-[6%] border-r-[1.5px] border-b-[1.5px]" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5">
                <span className="absolute left-1/2 top-0 bottom-0 w-px bg-white/45" />
                <span className="absolute top-1/2 left-0 right-0 h-px bg-white/45" />
            </span>
            <span className={`absolute left-[5.5%] top-[7.5%] ${OSD} text-[11px] md:text-[12px] text-white/85`}>{top}</span>
            <Timecode running={running} />
            {right && <span className="absolute right-[5.5%] top-[7.5%]">{right}</span>}
            <motion.span className={`absolute left-[5.5%] bottom-[7.5%] ${OSD} text-[12px] md:text-[13px] text-white/90 tabular-nums`}>{reading}</motion.span>
            {bottomRight && <span className="absolute right-[5.5%] bottom-[7.5%]">{bottomRight}</span>}
        </div>
    );
};

export default MonitorHUD;
