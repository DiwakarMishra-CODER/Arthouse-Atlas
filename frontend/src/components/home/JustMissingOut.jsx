import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useScroll, useSpring, useTransform, useVelocity } from 'framer-motion';
import { sized } from '../movements/treatments';

/**
 * The ten just behind the countdown, under the same rule (one film per
 * director), hung like trims in an editing room's bin: short strips of each
 * film clipped to a rail, labelled on tape. On a desktop, scrolling past sets them swinging on
 * their clips, each with its own weight. On a phone they hang still: a thumb's flick reports a
 * jagged speed, which shook them. The bin keeps its own transitions, so the site's blanket rule
 * doesn't drag each frame's swing 150 ms behind.
 *
 * A trim holds two or three of the film's stills, repeating one when that's all
 * there is, or its poster; with none, the tape alone names it.
 */

const FRAMES = [3, 2, 3, 2, 3, 3, 2, 3, 2, 3]; // trims of different lengths, so the bin isn't a grid
const SPROCKETS = 'bg-[repeating-linear-gradient(180deg,transparent_0_5px,#050505_5px_10px)]';
const DESKTOP = '(min-width: 768px) and (hover: hover) and (pointer: fine)';

// a desktop: a wide screen with a mouse or a trackpad
const useDesktop = () => {
    const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP).matches);
    useEffect(() => {
        const q = window.matchMedia(DESKTOP);
        const on = () => setDesktop(q.matches);
        q.addEventListener('change', on);
        return () => q.removeEventListener('change', on);
    }, []);
    return desktop;
};

const Trim = ({ film, place, i, swing, sway }) => {
    // each trim takes the swing a little differently: its own weight, its own lag
    const push = useTransform(swing, (v) => Math.max(-9, Math.min(9, (v / 260) * (0.7 + (i % 4) * 0.15))));
    const rotate = useSpring(push, { stiffness: 50 + (i % 3) * 18, damping: 5 + (i % 2) * 2, mass: 0.8 });

    const stills = (film.stills || []).slice(0, 3);
    const pool = stills.length ? stills : [film.backdropUrl || film.posterUrl].filter(Boolean);
    const frames = pool.length ? Array.from({ length: FRAMES[i % FRAMES.length] }, (_, k) => pool[k % pool.length]) : [];

    return (
        <motion.li style={sway ? { rotate, originY: 0 } : undefined} className="shrink-0 w-28 md:w-auto snap-start flex flex-col items-center">
            {/* the clip on the rail */}
            <span className="relative z-10 -mt-[7px] h-[14px] w-7 rounded-[2px] bg-gradient-to-b from-[#bdbdbd] to-[#6d6d6d] shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
            <Link to={`/movie/${film._id}`} className="group -mt-[3px] block w-full transition-transform duration-300 hover:-translate-y-1.5">
                {frames.length > 0 && (
                    <div className="relative bg-[#141414] px-[9px] py-[6px] shadow-[0_10px_24px_rgba(0,0,0,0.55)]">
                        <span className={`absolute left-[2px] inset-y-0 w-[5px] ${SPROCKETS} bg-[#2a2a2a]`} />
                        <span className={`absolute right-[2px] inset-y-0 w-[5px] ${SPROCKETS} bg-[#2a2a2a]`} />
                        <div className="flex flex-col gap-[5px]">
                            {frames.map((src, k) => (
                                <img
                                    key={k}
                                    src={sized(src, 'w300')}
                                    alt=""
                                    loading="lazy"
                                    // one still repeated reads as successive frames when each is framed a little further along
                                    style={pool.length < frames.length ? { objectPosition: `${15 + k * 35}% 50%` } : undefined}
                                    className="block w-full aspect-[4/3] object-cover max-w-none [filter:sepia(0.35)_brightness(0.72)] group-hover:[filter:none] transition-[filter] duration-500"
                                />
                            ))}
                        </div>
                    </div>
                )}
                {/* the tape */}
                <div className="relative mx-auto -mt-2 w-[94%] bg-[#f4ecd8] px-2 pt-1.5 pb-2 text-[#141110] shadow-[0_3px_10px_rgba(0,0,0,0.5)]" style={{ rotate: `${((i * 37) % 5) - 2}deg` }}>
                    <div className="flex items-baseline justify-between gap-1">
                        <span className="font-oswald font-bold text-lg leading-none">{place}</span>
                        <span className="font-label text-[12px] tracking-[0.14em] text-[#5a5046]">{film.year}</span>
                    </div>
                    <div className="mt-1 font-oswald uppercase text-[11px] leading-tight tracking-[0.06em] line-clamp-2">{film.title}</div>
                </div>
            </Link>
        </motion.li>
    );
};

const JustMissingOut = ({ films, from = 11, reducedMotion = false }) => {
    const { scrollY } = useScroll();
    const speed = useVelocity(scrollY);
    const still = useMotionValue(0);
    const sway = useDesktop() && !reducedMotion;
    // (hanging still, the trims follow a value that never moves, so their springs never run)
    const swing = sway ? speed : still;

    return (
        <section className="own-transitions max-w-7xl mx-auto px-6 md:px-14 pt-14 md:pt-20">
            <div className="flex items-baseline gap-4">
                <h3 className="font-serif text-2xl md:text-3xl text-white">Just missing out</h3>
                <span className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">{from} to {from + films.length - 1}</span>
            </div>

            <div className="mt-8 -mx-6 px-6 md:mx-0 md:px-0 overflow-x-auto md:overflow-visible pt-3 pb-10">
                <div className="relative min-w-max md:min-w-0">
                    {/* the rail (beside the list, not in it: a list holds only its films) */}
                    <span aria-hidden="true" className="absolute -left-2 -right-2 top-0 h-[3px] rounded-full bg-gradient-to-b from-[#8a8a8a] to-[#3a3a3a]" />
                    <ol className="relative flex md:grid md:grid-cols-10 gap-4 md:gap-5 items-start snap-x">
                        {films.map((f, i) => (
                            <Trim key={`${f._id}${sway ? '' : ':still'}`} film={f} place={from + i} i={i} swing={swing} sway={sway} />
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );
};

export default JustMissingOut;
