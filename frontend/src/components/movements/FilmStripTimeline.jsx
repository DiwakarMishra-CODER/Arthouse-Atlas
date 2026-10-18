import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sized } from './treatments';

/**
 * The century as a strip of 35mm film.
 *
 * The strip is the time axis — sprocket holes, decade years printed along it
 * like edge codes. Each movement is a frame of its hero still, standing above
 * or below the strip at the year it began, tied to it by a thin line. Hover a
 * frame and its whole lifespan lights up along the strip; the caption beneath
 * names it. Click to open the movement.
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

const FilmStripTimeline = ({ movements, isVisible = () => true, accentFor }) => {
    const ref = useRef(null);
    const [w, setW] = useState(1100);
    const [hover, setHover] = useState(null);
    const navigate = useNavigate();
    const yearMax = new Date().getFullYear() + 1;

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

    const stripTop = above * LANE_H;
    const stripBottom = stripTop + STRIP_H;
    const height = stripBottom + below * LANE_H;
    const decades = [];
    for (let d = 1920; d < yearMax; d += 10) decades.push(d);

    const topOf = (lane) => (lane < 0 ? stripTop - (-lane) * LANE_H : stripBottom + (lane - 1) * LANE_H + (LANE_H - THUMB_H));
    const hovered = hover && placed.find((p) => p.m._id === hover);

    return (
        <div className="mb-14 md:mb-20">
            <div ref={ref} className="overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:thin]">
                <div className="relative" style={{ width: w, height }}>

                    {/* the strip */}
                    <div className="absolute left-0 bg-[#121212] border-y border-white/10" style={{ top: stripTop, height: STRIP_H, width: w }}>
                        <div className="absolute top-[4px] inset-x-0 h-[5px] bg-[repeating-linear-gradient(90deg,transparent_0_10px,#000_10px_17px)]" />
                        <div className="absolute bottom-[4px] inset-x-0 h-[5px] bg-[repeating-linear-gradient(90deg,transparent_0_10px,#000_10px_17px)]" />

                        {/* lifespan of the hovered movement */}
                        {hovered && (
                            <div
                                className="absolute top-1/2 -translate-y-1/2 h-[12px] transition-all duration-300"
                                style={{
                                    left: x(hovered.m.startYear),
                                    width: Math.max(4, x(hovered.m.endYear || yearMax) - x(hovered.m.startYear)),
                                    backgroundColor: `${accentFor(hovered.m)}55`,
                                    borderLeft: `2px solid ${accentFor(hovered.m)}`
                                }}
                            />
                        )}

                        {/* edge codes */}
                        {decades.map((d) => (
                            <div key={d} className="absolute top-0 bottom-0" style={{ left: x(d) }}>
                                <span className="absolute top-0 bottom-0 w-px bg-white/[0.07]" />
                                <span className="absolute top-1/2 -translate-y-1/2 left-1.5 font-mono text-[11px] text-[#c5a059]/80 tracking-wider">
                                    {d}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* frames */}
                    {placed.map(({ m, left, lane }) => {
                        const top = topOf(lane);
                        const isHover = hover === m._id;
                        const visible = isVisible(m);
                        const connectorTop = lane < 0 ? top + THUMB_H : stripBottom;
                        const connectorH = lane < 0 ? stripTop - (top + THUMB_H) : top - stripBottom;
                        return (
                            <div key={m._id} className={`transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-20'}`}>
                                <span
                                    className="absolute w-px transition-colors"
                                    style={{ left, top: connectorTop, height: connectorH, backgroundColor: isHover ? accentFor(m) : 'rgba(255,255,255,0.18)' }}
                                />
                                <button
                                    onClick={() => navigate(`/movements/${m.tag || m._id}`)}
                                    onMouseEnter={() => setHover(m._id)}
                                    onMouseLeave={() => setHover(null)}
                                    onFocus={() => setHover(m._id)}
                                    onBlur={() => setHover(null)}
                                    aria-label={`${m.title}, ${m.era}`}
                                    className={`absolute overflow-hidden bg-[#0d0d0e] transition-all duration-300 focus:outline-none ${isHover ? 'z-20 scale-[1.18] ring-2' : 'ring-1 ring-white/15'}`}
                                    style={{ left, top, width: THUMB_W, height: THUMB_H, '--tw-ring-color': isHover ? accentFor(m) : undefined, transformOrigin: lane < 0 ? 'bottom left' : 'top left' }}
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
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* caption */}
            <div className="mt-5 min-h-[3.25rem] border-l-2 pl-4 transition-colors" style={{ borderColor: hovered ? accentFor(hovered.m) : 'rgba(255,255,255,0.12)' }}>
                {hovered ? (
                    <>
                        <div className="font-serif text-xl text-white">
                            {hovered.m.title}
                            <span className="ml-3 font-sans text-xs tracking-[0.2em] uppercase text-gray-400">{hovered.m.era} · {hovered.m.filmCount} films</span>
                        </div>
                        <div className="font-serif italic text-gray-400">{hovered.m.tagline || hovered.m.vibe}</div>
                    </>
                ) : (
                    <div className="text-sm text-gray-400 pt-1">
                        Each frame stands at the year its movement began. Hover to see how long it lasted; click to open it.
                    </div>
                )}
            </div>
        </div>
    );
};

export default FilmStripTimeline;
