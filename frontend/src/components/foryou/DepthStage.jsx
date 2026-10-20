import { useEffect, useState } from 'react';
import { motion, useMotionTemplate, useTransform } from 'framer-motion';
import { defocus, defocusNow } from './defocus';
import { sized } from '../movements/treatments';
import { CAMERA_OUT, CLOSE, NEAR, FAR } from './shot';

/**
 * One shot of the focus puller's monitor, a rack focus in depth. It opens soft and finds the
 * film you loved, standing near the lens (focus runs a hair past its mark and settles back, as
 * a hand on the ring does); the film picked for you waits far behind it, out of focus; further
 * back still, filling the shot, the next pick's light. Focus racks from near to far (the
 * foreground melts into its own bokeh as the pick comes sharp, again a hair past and back),
 * then the camera dollies in: the foreground sweeps past the lens and the pick fills the
 * screen. To leave, focus racks out and the pick melts into its light.
 *
 * Opacity and 3D transforms on stacked pictures, driven by two motion values (see shot.js):
 * `focus` (-1 close up, 0 your film, 1 the pick) and `camera` (0 wide, 1 pushed in on the pick).
 * Nothing is blurred while it moves. The whole picture breathes a little with `distance`, as a
 * lens's framing shifts when it focuses, and while a landed shot holds, the camera creeps on
 * (`drift`, 0 to 1). `deep` must keep its identity between renders (the caller memoises it).
 */

const LAYER = 'absolute inset-0 w-full h-full object-cover max-w-none';
// out of focus, a picture's light spreads past its edges, and the edges melt away
const SPREAD = 'absolute left-[-9%] top-[-9%] w-[118%] h-[118%] object-cover max-w-none [mask-image:radial-gradient(closest-side,#000_60%,transparent)]';

const softNow = (src) => (src ? defocusNow(sized(src, 'w300')) : null);
// a sharp picture decoded before the shot needs it, or given a second to try
const decoded = (src) => {
    if (!src) return null;
    const img = new Image();
    img.src = sized(src, 'w1280');
    return Promise.race([img.decode().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 1200))]);
};

const DepthStage = ({ seed, pick, deep, focus, camera, distance, drift, onReady, children, className = '' }) => {
    const key = [seed, pick, ...deep].join('|');
    // a shot whose soft pictures were drawn while the last one held opens on them at once
    const [soft, setSoft] = useState(() => {
        const all = [seed, pick, ...deep].map(softNow);
        return all.every((url, i) => url || ![seed, pick, ...deep][i]) ? { key, seed: all[0], pick: all[1], deep: all.slice(2) } : { key: null };
    });

    // the shot starts once every picture's soft version is drawn and the sharp ones are decoded
    useEffect(() => {
        let gone = false;
        const shot = [seed, pick, ...deep].join('|');
        const softs = Promise.all([seed, pick, ...deep].map((src) => defocus(src && sized(src, 'w300'))));
        Promise.all([softs, decoded(seed), decoded(pick)]).then(([[s, p, ...d]]) => {
            if (gone) return;
            setSoft((now) => (now.key === shot ? now : { key: shot, seed: s, pick: p, deep: d }));
            onReady?.();
        });
        return () => { gone = true; };
    }, [seed, pick, deep, onReady]);
    const ready = soft.key === key;

    // the camera dollies in (and creeps on a little as the shot racks out)
    const pickZ = useTransform(camera, [0, 1, CAMERA_OUT], [-660, 0, 80]);
    const pickX = useTransform(camera, [0, 1], [15, 0]);
    const creep = useTransform(drift, [0, 1], [0, 45]);
    const pickMove = useMotionTemplate`translate3d(${pickX}%, 0, calc(${pickZ}px + ${creep}px))`;
    const seedZ = useTransform(camera, [0, 1], [170, 980]);
    const seedX = useTransform(camera, [0, 1], [0, -42]);
    const seedMove = useMotionTemplate`translate3d(${seedX}%, 0, ${seedZ}px)`;
    const seedThere = useTransform(camera, [0.2, 0.56], [1, 0]);
    const deepZ = useTransform(camera, [0, 1], [-1350, -760]); // 2.24× the stage, so it just fills it at the start
    const deepMove = useMotionTemplate`translate3d(0, 0, ${deepZ}px)`;
    // each film is sharp only near its own mark (and a little soft just past it); each sharp
    // picture holds until its soft one mostly covers it
    const seedSoft = useTransform(focus, [-1, 0, 0.12, 0.7], [1, 0, 0.2, 1]);
    const seedSharp = useTransform(seedSoft, [0.6, 1], [1, 0]);
    const pickSharp = useTransform(focus, [0.3, 0.92, 1, 1.12], [0, 0.95, 1, 0.72]);
    const pickSoft = useTransform(pickSharp, [0.6, 1], [1, 0]);
    // the lens breathes: focused nearer, it frames a touch tighter
    const breath = useTransform(distance, [CLOSE, NEAR, FAR], [1.035, 1.02, 1]);

    return (
        <div className={`relative overflow-hidden bg-[#070606] [perspective:1100px] ${className}`}>
            <motion.div className="absolute inset-0 [transform-style:preserve-3d]" style={{ scale: breath }}>
                {/* furthest back: the next pick, just its light */}
                {ready && soft.deep[0] && (
                    <motion.img src={soft.deep[0]} alt="" className="absolute left-[-62%] top-[-62%] w-[224%] h-[224%] object-cover max-w-none opacity-20" style={{ transform: deepMove }} />
                )}
                {/* the film picked for you, far behind */}
                <motion.div className="absolute inset-0" style={{ transform: pickMove }}>
                    {ready && soft.pick && <motion.img src={soft.pick} alt="" className={SPREAD} style={{ opacity: pickSoft }} />}
                    {pick && <motion.img src={sized(pick, 'w1280')} alt="" className={`${LAYER} shadow-[0_40px_90px_rgba(0,0,0,0.8)]`} style={{ opacity: pickSharp }} />}
                </motion.div>
                {/* the film you loved, near the lens */}
                {seed && (
                    <motion.div className="absolute left-[-3%] top-[9%] w-[54%] h-[82%]" style={{ transform: seedMove, opacity: seedThere }}>
                        <motion.img src={sized(seed, 'w1280')} alt="" className={`${LAYER} shadow-[0_50px_100px_rgba(0,0,0,0.9)] ring-1 ring-white/10`} style={{ opacity: seedSharp }} />
                        {ready && soft.seed && <motion.img src={soft.seed} alt="" className={SPREAD} style={{ opacity: seedSoft }} />}
                    </motion.div>
                )}
            </motion.div>
            <span aria-hidden="true" className="absolute inset-0 still-grain opacity-70 pointer-events-none" />
            <span aria-hidden="true" className="absolute inset-0 pointer-events-none shadow-[inset_0_0_140px_rgba(0,0,0,0.7)]" />
            {children}
        </div>
    );
};

export default DepthStage;
