import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sized } from './treatments';

/**
 * Lineage as a family tree laid on the century.
 *
 * What the movement grew from stands above it, what it fed stands below; each
 * relative is a frame of its own still at the year it began, with its lifespan
 * running beneath as a strip. This movement's own years run through the whole
 * tree as a lit band, so you can see at a glance who overlapped whom, and
 * branches draw from parents into it and out into its heirs.
 */

const ROW = 70;
const SELF_ROW = 96;
const GAP = 34; // between the generations
const AXIS = 30; // room for the first heading; the decades sit along the bottom
const THUMB = { w: 64, h: 36 };
const SELF_THUMB = { w: 104, h: 58 };
const LABEL_ROOM = 240; // past this, a name sits before its frame instead of after
const EASE = [0.22, 1, 0.36, 1];

const LineageTimeline = ({ movement, grewFrom, fed, accent }) => {
    const ref = useRef(null);
    const [w, setW] = useState(900);
    const [hover, setHover] = useState(null);
    const now = new Date().getFullYear();

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const parents = grewFrom.filter((n) => n.startYear);
    const heirs = fed.filter((n) => n.startYear);
    const all = [...parents, movement, ...heirs];
    const y0 = Math.floor((Math.min(...all.map((n) => n.startYear)) - 3) / 10) * 10;
    const y1 = Math.min(now + 1, Math.ceil((Math.max(...all.map((n) => n.endYear || now)) + 3) / 10) * 10);
    const x = (y) => ((y - y0) / (y1 - y0)) * (w - 12);

    const pTop = (i) => AXIS + i * ROW;
    const selfTop = AXIS + parents.length * ROW + (parents.length ? GAP : 0);
    const hTop = (i) => selfTop + SELF_ROW + GAP + i * ROW;
    const height = heirs.length ? hTop(heirs.length - 1) + ROW : selfTop + SELF_ROW;
    const decades = [];
    for (let d = y0; d <= y1; d += 10) decades.push(d);

    const sx = x(movement.startYear);
    const ex = x(movement.endYear || now);
    const stripY = (top, self) => top + (self ? SELF_ROW : ROW) - 15; // the lifespan strip under a node
    const trunkX = Math.max(2, Math.min(...heirs.map((h) => x(h.startYear))) - 18);
    const curve = (fx, fy, tx, ty) => {
        const mid = (fy + ty) / 2;
        return `M ${fx} ${fy} C ${fx} ${mid}, ${tx} ${mid}, ${tx} ${ty}`;
    };

    // a plain render function, not a component — a component defined here would remount on every hover
    const node = (n, top, { self = false, i = 0 } = {}) => {
        const left = x(n.startYear);
        const right = x(n.endYear || now);
        const lit = self || hover === n.title;
        const thumb = self ? SELF_THUMB : THUMB;
        const flip = left > w - LABEL_ROOM;
        const content = (
            <motion.div
                key={n.title}
                className="absolute inset-x-0"
                style={{ top, height: self ? SELF_ROW : ROW }}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: self ? 0.25 : 0.1 + i * 0.07, ease: EASE }}
            >
                {/* the frame, at the year it began */}
                <span
                    className="absolute top-2 overflow-hidden bg-[#111] transition-[box-shadow,transform] duration-300"
                    style={{
                        left,
                        width: thumb.w,
                        height: thumb.h,
                        boxShadow: self ? `0 0 0 2px ${accent}, 0 0 40px ${accent}55` : lit ? `0 0 0 1px ${accent}` : '0 0 0 1px rgba(255,255,255,0.14)',
                        transform: lit && !self ? 'translateY(-2px)' : undefined
                    }}
                >
                    {n.heroBackdrop && (
                        <img
                            src={sized(n.heroBackdrop, 'w300')}
                            alt=""
                            loading="lazy"
                            className={`w-full h-full object-cover transition-[filter] duration-500 ${lit ? '' : 'grayscale brightness-75'}`}
                            style={{ objectPosition: n.heroFocus || '50% 35%' }}
                        />
                    )}
                </span>

                {/* its name */}
                <span
                    className={`absolute top-2 whitespace-nowrap ${flip ? 'text-right' : ''}`}
                    style={flip ? { right: w - left + 12 } : { left: left + thumb.w + 12 }}
                >
                    <span className={`block font-serif leading-tight transition-colors ${self ? 'text-2xl md:text-[1.7rem] text-white' : `text-[15px] md:text-base ${lit ? 'text-white' : 'text-gray-300'}`}`}>
                        {n.title}
                    </span>
                    <span className="block mt-1 font-label text-[12px] tracking-[0.14em] transition-colors" style={{ color: lit ? accent : 'rgb(107 114 128)' }}>
                        {n.era || `${n.startYear}–${n.endYear || 'now'}`}
                    </span>
                </span>

                {/* its lifespan, as a strip */}
                <span
                    className="absolute h-[6px] transition-colors duration-300"
                    style={{
                        left,
                        top: stripY(0, self),
                        width: Math.max(6, right - left),
                        backgroundColor: self ? accent : lit ? `${accent}bb` : 'rgba(255,255,255,0.22)',
                        backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 5px, rgba(0,0,0,0.55) 5px 7px)',
                        boxShadow: self ? `0 0 18px ${accent}88` : undefined
                    }}
                />
                {!n.endYear && (
                    <span className="absolute w-[7px] h-[7px] rounded-full -translate-x-1/2" style={{ left: right, top: stripY(0, self) - 0.5, backgroundColor: self ? accent : 'rgba(255,255,255,0.5)' }} />
                )}
            </motion.div>
        );
        if (self || !n.tag) return content;
        return (
            <Link
                key={n.title}
                to={`/movements/${n.tag}`}
                onMouseEnter={() => setHover(n.title)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(n.title)}
                onBlur={() => setHover(null)}
                className="contents"
            >
                {content}
            </Link>
        );
    };

    const heading = (text, count, top) => (
        <div className="absolute left-0 flex items-center gap-2 font-label text-[12px] tracking-[0.14em] uppercase text-gray-500" style={{ top: top - 22 }}>
            {text} <span style={{ color: accent }}>{count}</span>
        </div>
    );

    const branch = (name, d, delay, base) => (
        <motion.path
            d={d}
            fill="none"
            stroke={hover === name ? accent : base}
            strokeWidth={hover === name ? 2.5 : 1.5}
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay, ease: EASE }}
            style={{ transition: 'stroke 0.3s' }}
        />
    );

    return (
        <div className="overflow-x-auto [scrollbar-width:thin] -mx-4 px-4 md:mx-0 md:px-0">
            <div ref={ref} className="relative min-w-[760px]" style={{ height: height + 30 }}>
                {/* the decades */}
                {decades.map((d) => (
                    <div key={d} className="absolute w-px bg-white/[0.05]" style={{ left: x(d), top: 0, height: height + 6 }}>
                        <span className="absolute -bottom-5 -translate-x-1/2 font-label text-[12px] text-gray-500">{d}</span>
                    </div>
                ))}

                {/* this movement's years, lit through the whole tree */}
                <motion.div
                    className="absolute"
                    style={{ left: sx, width: Math.max(6, ex - sx), top: 0, height: height + 6, background: `linear-gradient(to bottom, ${accent}00, ${accent}16 25%, ${accent}16 75%, ${accent}00)` }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1 }}
                >
                    <span className="absolute inset-y-0 left-0 border-l border-dashed" style={{ borderColor: `${accent}66` }} />
                    <span className="absolute inset-y-0 right-0 border-r border-dashed" style={{ borderColor: `${accent}66` }} />
                </motion.div>

                {/* branches */}
                <svg className="absolute inset-0 overflow-visible pointer-events-none" width={w} height={height} aria-hidden="true">
                    {parents.map((p, i) => {
                        // leave the parent where its years come nearest this movement's start, and land on this movement's frame
                        const fx = Math.min(Math.max(x(p.startYear) + 3, sx), x(p.endYear || now));
                        const fy = stripY(pTop(i)) + 3;
                        return (
                            <g key={p.title}>
                                {branch(p.title, curve(fx, fy, sx + 14, selfTop + 8), 0.2 + i * 0.1, 'rgba(255,255,255,0.4)')}
                                <circle cx={fx} cy={fy} r={3} fill={hover === p.title ? accent : 'rgba(255,255,255,0.6)'} />
                            </g>
                        );
                    })}
                    {/* heirs hang off one trunk that runs down their left side, so no branch crosses a frame */}
                    {heirs.map((h, i) => {
                        const sy = stripY(selfTop, true) + 3;
                        const fx = Math.min(Math.max(trunkX, sx + 3), ex - 3);
                        const ty = hTop(i) + 8 + THUMB.h / 2;
                        const r = 8;
                        const d = `M ${fx} ${sy} V ${sy + 14} H ${trunkX} V ${ty - r} Q ${trunkX} ${ty} ${trunkX + r} ${ty} H ${x(h.startYear) - 1}`;
                        return <g key={h.title}>{branch(h.title, d, 0.55 + i * 0.1, `${accent}aa`)}</g>;
                    })}
                    {heirs.length > 0 && <circle cx={Math.min(Math.max(trunkX, sx + 3), ex - 3)} cy={stripY(selfTop, true) + 3} r={3.5} fill={accent} />}
                </svg>

                {parents.length > 0 && heading('Grew from', parents.length, pTop(0))}
                {parents.map((p, i) => node(p, pTop(i), { i }))}
                {node(movement, selfTop, { self: true })}
                {heirs.length > 0 && heading('Fed into', heirs.length, hTop(0))}
                {heirs.map((h, i) => node(h, hTop(i), { i }))}
            </div>
        </div>
    );
};

export default LineageTimeline;
