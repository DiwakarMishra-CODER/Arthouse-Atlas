import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { sized } from './treatments';

/**
 * The century as a strip of 35mm film.
 *
 * The strip is the time axis — sprocket holes, decade years printed along it
 * like edge codes. Each movement is a frame of its hero still, standing above
 * or below the strip at the year it began, tied to it by a thin line.
 *
 * Hover a frame and the reel runs: the movement's lifespan is exposed along
 * the strip frame by frame, and a title card is projected on the far side of
 * the strip, tied to the year it began. Click either to open the movement.
 */

const YEAR_MIN = 1918;
const THUMB_W = 84;
const THUMB_H = 47;
const LANE_H = THUMB_H + 16; // frame + connector room
const STRIP_H = 36;
const GAP = 6;
const MIN_W = 960;
// fill near lanes first, alternating above / below the strip
const LANES = [-1, 1, -2, 2, -3, 3, -4, 4];

const CARD_W = 470;
const CARD_IMG_W = 192;
const CARD_H = 128; // 16:9 still + padding
const CARD_GAP = 14; // strip → card
const EASE = [0.22, 1, 0.36, 1];

const SPROCKETS = 'bg-[repeating-linear-gradient(90deg,transparent_0_10px,#000_10px_17px)]';

const FilmStripTimeline = ({ movements, isVisible = () => true, accentFor, onHover = () => {} }) => {
    const ref = useRef(null);
    const leaveTimer = useRef(null);
    const [w, setW] = useState(1100);
    const [hover, setHoverId] = useState(null);
    const navigate = useNavigate();
    const yearMax = new Date().getFullYear() + 1;

    // a short grace period on leave, so moving between neighbouring frames or onto the card doesn't flicker
    const enter = (id) => {
        clearTimeout(leaveTimer.current);
        setHoverId(id);
        onHover(movements.find((m) => m._id === id));
    };
    const leave = () => {
        clearTimeout(leaveTimer.current);
        leaveTimer.current = setTimeout(() => { setHoverId(null); onHover(null); }, 140);
    };
    useEffect(() => () => clearTimeout(leaveTimer.current), []);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const ro = new ResizeObserver(([entry]) => setW(Math.max(MIN_W, Math.floor(entry.contentRect.width))));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // year → px; the last frame must still fit inside the strip
    const x = (year) => ((year - YEAR_MIN) / (yearMax - YEAR_MIN)) * (w - THUMB_W);

    const { placed, above, below } = useMemo(() => {
        const lastRight = {};
        const out = [...movements]
            .sort((a, b) => (a.startYear - b.startYear) || (b.filmCount - a.filmCount))
            .map((m) => {
                const left = x(m.startYear || YEAR_MIN);
                let lane = LANES.find((l) => (lastRight[l] ?? -Infinity) + GAP <= left);
                if (lane === undefined) lane = LANES[LANES.length - 1];
                lastRight[lane] = left + THUMB_W;
                return { m, left, lane };
            });
        return {
            placed: out,
            above: Math.max(1, ...out.filter((p) => p.lane < 0).map((p) => -p.lane)),
            below: Math.max(1, ...out.filter((p) => p.lane > 0).map((p) => p.lane))
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [movements, w]);

    // each side must be tall enough to hold the title card
    const stripTop = Math.max(above * LANE_H, CARD_H + CARD_GAP);
    const stripBottom = stripTop + STRIP_H;
    const height = stripBottom + Math.max(below * LANE_H, CARD_H + CARD_GAP);
    const decades = [];
    for (let d = 1920; d < yearMax; d += 10) decades.push(d);

    const topOf = (lane) => (lane < 0 ? stripTop - (-lane) * LANE_H : stripBottom + (lane - 1) * LANE_H + (LANE_H - THUMB_H));
    const hovered = hover && placed.find((p) => p.m._id === hover);

    // the hovered movement's lifespan and title card
    let track = null;
    if (hovered) {
        const { m, lane } = hovered;
        const start = x(m.startYear);
        const end = Math.max(start + 6, x(m.endYear || yearMax));
        const cardBelow = lane < 0; // project the card on the far side of the strip from the frame
        track = {
            m,
            start,
            end,
            accent: accentFor(m),
            cardBelow,
            cardLeft: Math.min(Math.max(0, start - 24), w - CARD_W),
            cardTop: cardBelow ? stripBottom + CARD_GAP : stripTop - CARD_GAP - CARD_H
        };
    }

    return (
        <div className="mb-14 md:mb-20">
            <div ref={ref} className="overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:thin]">
                <div className="relative" style={{ width: w, height }}>

                    {/* the strip */}
                    <div className="absolute left-0 overflow-hidden bg-[#121212] border-y border-white/10" style={{ top: stripTop, height: STRIP_H, width: w }}>
                        {/* sprockets — they run while a movement is being shown */}
                        <div className={`absolute top-[4px] inset-x-0 h-[5px] ${SPROCKETS} ${track ? 'reel-run' : ''}`} />
                        <div className={`absolute bottom-[4px] inset-x-0 h-[5px] ${SPROCKETS} ${track ? 'reel-run' : ''}`} />

                        {/* edge codes */}
                        {decades.map((d) => (
                            <div key={d} className="absolute top-0 bottom-0" style={{ left: x(d) }}>
                                <span className="absolute top-0 bottom-0 w-px bg-white/[0.07]" />
                                <span className={`absolute top-1/2 -translate-y-1/2 left-1.5 font-label text-[12px] tracking-[0.14em] transition-opacity duration-300 text-gold/80 ${track ? 'opacity-0' : 'opacity-100'}`}>
                                    {d}
                                </span>
                            </div>
                        ))}
                        <span className={`absolute top-1/2 -translate-y-1/2 pl-2 font-label text-[12px] tracking-[0.14em] text-gray-500 transition-opacity duration-300 ${track ? 'opacity-0' : 'opacity-100'}`} style={{ left: x(yearMax) }}>
                            now
                        </span>

                        {/* a notch where each movement begins, on the side its frame stands */}
                        {placed.map(({ m, left, lane }) => (
                            <span
                                key={m._id}
                                className="absolute w-px h-[4px]"
                                style={{ left, [lane < 0 ? 'top' : 'bottom']: 0, backgroundColor: hover === m._id ? accentFor(m) : 'rgba(255,255,255,0.3)' }}
                            />
                        ))}

                        {/* the lifespan, exposed frame by frame from the year it began */}
                        <AnimatePresence>
                            {track && (
                                <motion.div
                                    key={track.m._id}
                                    className="absolute top-[10px] bottom-[10px] overflow-hidden"
                                    style={{ left: track.start, width: track.end - track.start, transformOrigin: 'left center' }}
                                    initial={{ scaleX: 0, opacity: 1 }}
                                    animate={{ scaleX: 1, opacity: 1 }}
                                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                                    transition={{ duration: Math.min(0.9, 0.3 + (track.end - track.start) / 1400), ease: EASE }}
                                >
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            backgroundColor: `${track.accent}59`,
                                            backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 11px, rgba(0,0,0,0.5) 11px 12px)'
                                        }}
                                    />
                                    <span className="absolute inset-y-0 left-0 w-[2px]" style={{ backgroundColor: track.accent }} />
                                    {track.m.endYear && <span className="absolute inset-y-0 right-0 w-[2px]" style={{ backgroundColor: track.accent }} />}
                                    {/* a glint runs the length of it once it's exposed */}
                                    <motion.span
                                        className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                                        initial={{ x: -40 }}
                                        animate={{ x: track.end - track.start }}
                                        transition={{ delay: 0.35, duration: 0.9, ease: 'easeInOut' }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* its dates, either side like an edge code */}
                        <AnimatePresence>
                            {track && (
                                <motion.div key={track.m._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
                                    <span className="absolute top-1/2 -translate-y-1/2 px-1.5 font-label text-[12px] tracking-[0.14em] text-white" style={{ right: w - track.start + 3 }}>
                                        {track.m.startYear}
                                    </span>
                                    <span className="absolute top-1/2 -translate-y-1/2 px-1.5 font-label text-[12px] tracking-[0.14em] text-white" style={{ left: track.end + 3 }}>
                                        {track.m.endYear || 'now'}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* connectors run behind the frames; the hovered one is lifted above them */}
                    {placed.map(({ m, left, lane }) => {
                        const top = topOf(lane);
                        const isHover = hover === m._id;
                        return (
                            <span
                                key={m._id}
                                className={`absolute transition-opacity duration-300 ${isHover ? 'z-30 w-[2px]' : 'w-px'} ${isVisible(m) ? 'opacity-100' : 'opacity-20'}`}
                                style={{
                                    left,
                                    top: lane < 0 ? top + THUMB_H : stripBottom,
                                    height: lane < 0 ? stripTop - (top + THUMB_H) : top - stripBottom,
                                    backgroundColor: isHover ? accentFor(m) : 'rgba(255,255,255,0.18)'
                                }}
                            />
                        );
                    })}

                    {/* frames */}
                    {placed.map(({ m, left, lane }) => {
                        const top = topOf(lane);
                        const isHover = hover === m._id;
                        const dim = !isVisible(m) ? 'opacity-20' : hover && !isHover ? 'opacity-60' : 'opacity-100';
                        return (
                            <button
                                key={m._id}
                                onClick={() => navigate(`/movements/${m.tag || m._id}`)}
                                onMouseEnter={() => enter(m._id)}
                                onMouseLeave={leave}
                                onFocus={() => enter(m._id)}
                                onBlur={leave}
                                aria-label={`${m.title}, ${m.era}`}
                                className={`absolute overflow-hidden bg-[#0d0d0e] transition-all duration-300 focus:outline-none ${dim} ${isHover ? 'z-20 scale-[1.18] ring-2' : 'z-10 ring-1 ring-white/15'}`}
                                style={{
                                    left, top, width: THUMB_W, height: THUMB_H,
                                    '--tw-ring-color': isHover ? accentFor(m) : undefined,
                                    boxShadow: isHover ? `0 0 28px ${accentFor(m)}66` : undefined,
                                    transformOrigin: lane < 0 ? 'bottom left' : 'top left'
                                }}
                            >
                                {m.heroBackdrop && (
                                    <img
                                        src={sized(m.heroBackdrop, 'w300')}
                                        alt=""
                                        loading="lazy"
                                        className={`w-full h-full object-cover transition-[filter] duration-300 ${isHover ? 'grayscale-0' : 'grayscale'}`}
                                        style={{ objectPosition: m.heroFocus || '50% 35%' }}
                                    />
                                )}
                            </button>
                        );
                    })}

                    {/* the title card, projected out from the strip at the year the movement began */}
                    <AnimatePresence>
                        {track && (
                            <motion.div key={track.m._id} className="absolute inset-0 z-40 pointer-events-none" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                                <motion.span
                                    className="absolute w-[2px]"
                                    style={{
                                        left: track.start,
                                        top: track.cardBelow ? stripBottom : track.cardTop + CARD_H,
                                        height: CARD_GAP,
                                        backgroundColor: track.accent,
                                        transformOrigin: track.cardBelow ? 'top' : 'bottom'
                                    }}
                                    initial={{ scaleY: 0 }}
                                    animate={{ scaleY: 1 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                />
                                <motion.button
                                    onClick={() => navigate(`/movements/${track.m.tag || track.m._id}`)}
                                    onMouseEnter={() => enter(track.m._id)}
                                    onMouseLeave={leave}
                                    tabIndex={-1}
                                    className="pointer-events-auto absolute flex text-left overflow-hidden bg-[#0b0b0c]/95 backdrop-blur-md shadow-[0_24px_60px_rgba(0,0,0,0.75)]"
                                    style={{
                                        left: track.cardLeft,
                                        top: track.cardTop,
                                        width: CARD_W,
                                        height: CARD_H,
                                        boxShadow: `inset 0 0 0 1px ${track.accent}40, 0 24px 60px rgba(0,0,0,0.75)`
                                    }}
                                    initial={{ clipPath: track.cardBelow ? 'inset(0 0 100% 0)' : 'inset(100% 0 0 0)', y: track.cardBelow ? -6 : 6 }}
                                    animate={{ clipPath: 'inset(0 0 0% 0)', y: 0 }}
                                    transition={{ duration: 0.42, ease: EASE, delay: 0.08 }}
                                >
                                    <div className="relative shrink-0 m-[10px] overflow-hidden" style={{ width: CARD_IMG_W, height: CARD_H - 20 }}>
                                        {track.m.heroBackdrop && (
                                            <motion.img
                                                src={sized(track.m.heroBackdrop, 'w780')}
                                                alt=""
                                                className="w-full h-full object-cover"
                                                style={{ objectPosition: track.m.heroFocus || '50% 35%' }}
                                                initial={{ scale: 1.15 }}
                                                animate={{ scale: 1 }}
                                                transition={{ duration: 1.1, ease: EASE }}
                                            />
                                        )}
                                        <span className="absolute inset-0 ring-1 ring-inset ring-white/10" />
                                    </div>
                                    <motion.div
                                        className="flex-1 min-w-0 py-[11px] pr-4 flex flex-col"
                                        initial="hidden"
                                        animate="shown"
                                        variants={{ shown: { transition: { staggerChildren: 0.05, delayChildren: 0.2 } } }}
                                    >
                                        {[
                                            <div key="k" className="font-label text-[12px] tracking-[0.14em] uppercase" style={{ color: track.accent }}>
                                                {track.m.region || 'Cinema'}
                                            </div>,
                                            <div key="t" className="font-serif text-[19px] leading-tight text-white mt-1 line-clamp-2">{track.m.title}</div>,
                                            <div key="g" className={`font-serif italic text-[13px] leading-snug text-gray-400 mt-1 ${track.m.title.length > 26 ? 'line-clamp-1' : 'line-clamp-2'}`}>{track.m.tagline || track.m.vibe}</div>,
                                            <div key="f" className="font-label mt-auto flex items-center justify-between text-[12px] tracking-[0.14em] uppercase text-gray-500">
                                                <span>{track.m.filmCount} films</span>
                                                <span className="text-gray-300">Open →</span>
                                            </div>
                                        ].map((el) => (
                                            <motion.div
                                                key={el.key}
                                                className={el.key === 'f' ? 'mt-auto' : ''}
                                                variants={{ hidden: { opacity: 0, x: -8 }, shown: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE } } }}
                                            >
                                                {el}
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <p className="mt-5 border-l-2 border-white/10 pl-4 text-sm text-gray-400">
                Each frame stands at the year its movement began. Hover one to run the reel; click to open it.
            </p>
        </div>
    );
};

export default FilmStripTimeline;
