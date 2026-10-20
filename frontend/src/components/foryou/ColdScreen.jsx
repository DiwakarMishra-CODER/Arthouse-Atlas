import { useEffect, useMemo, useState } from 'react';
import { animate, useMotionValue } from 'framer-motion';
import { defocus } from './defocus';
import { sized } from '../movements/treatments';
import MonitorHUD from './MonitorHUD';
import FocusRing from './FocusRing';

/**
 * For someone it knows nothing about yet: the monitor shows a deep shot with nothing in focus,
 * and the focus ring has three blank strips of tape. Each film you loved is written on a strip,
 * the ring turns to it, and the shot sharpens a step; at the third, focus racks onto the first
 * film picked for you (TheScreen takes over).
 */

const MARKS = [0.8, 1.6, 3.2]; // metres: where the three tape marks go
const DEPTHS = ['translate3d(-14%, -4%, -200px)', 'translate3d(18%, 6%, -700px)', 'translate3d(-6%, 10%, -1250px)'];

const ColdScreen = ({ loved, stills, lovedStill }) => {
    const distance = useMotionValue(MARKS[0]);
    const [soft, setSoft] = useState({ key: null, urls: [] });
    const key = stills.join('|');
    useEffect(() => {
        let gone = false;
        const list = key ? key.split('|') : [];
        Promise.all(list.map((s) => defocus(sized(s, 'w300')))).then((urls) => { if (!gone) setSoft({ key, urls }); });
        return () => { gone = true; };
    }, [key]);
    // the ring turns to the mark just written
    const at = MARKS[Math.min(Math.max(loved.length - 1, 0), 2)];
    useEffect(() => {
        const controls = animate(distance, at, { duration: 1.1, ease: [0.45, 0, 0.25, 1] });
        return () => controls.stop();
    }, [at, distance]);
    const marks = useMemo(() => MARKS.map((m, i) => ({ at: m, label: loved[i] || `Film ${i + 1}`, blank: !loved[i] })), [loved]);
    const sharpness = Math.min(loved.length, 3) / 3;

    return (
        <section aria-label="Tell it films you loved" className="relative">
            <div className="iris-in">
                <div className="relative overflow-hidden aspect-[4/5] sm:aspect-video lg:aspect-[2.39/1] ring-1 ring-white/10 bg-[#070606] [perspective:1100px] shadow-[0_50px_100px_-40px_rgba(0,0,0,0.95)]">
                    <div className="absolute inset-0 [transform-style:preserve-3d] cold-drift">
                        {soft.key === key && soft.urls.map((url, i) => url && (
                            <img key={i} src={url} alt="" className="absolute inset-[6%] w-[88%] h-[88%] object-cover max-w-none opacity-70" style={{ transform: DEPTHS[i] }} />
                        ))}
                    </div>
                    {lovedStill && <img src={sized(lovedStill, 'w1280')} alt="" className="absolute inset-0 w-full h-full object-cover max-w-none transition-opacity duration-[1400ms]" style={{ opacity: sharpness * 0.5 }} />}
                    <span aria-hidden="true" className="absolute inset-0 still-grain opacity-70" />
                    <span aria-hidden="true" className="absolute inset-0 shadow-[inset_0_0_140px_rgba(0,0,0,0.75)]" />
                    <MonitorHUD distance={distance} top={`A CAM · 50 MM · ${loved.length ? `${loved.length} OF 3 MARKS` : 'NO MARKS YET'}`} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                        <p className="font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold-light [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">Nothing in focus yet</p>
                        <h2 className="mt-3 font-serif font-light text-[2.4rem] md:text-6xl leading-[1.05] text-white [text-shadow:0_4px_30px_rgba(0,0,0,0.85)]">
                            {loved.length === 0 ? 'Tell it three films you loved' : loved.length === 1 ? 'Two more marks' : 'One more mark'}
                        </h2>
                        <p className="mt-3 max-w-xl text-[17px] text-gray-200 [text-shadow:0_2px_16px_rgba(0,0,0,0.9)]">Each one is a mark on the lens. With three, it can pull focus onto films that are yours.</p>
                    </div>
                </div>
            </div>
            <div className="mt-3"><FocusRing distance={distance} marks={marks} /></div>
        </section>
    );
};

export default ColdScreen;
