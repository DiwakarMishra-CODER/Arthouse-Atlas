import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sized, treatmentFor } from '../movements/treatments';

/**
 * The circle a director ran with, drawn as a constellation.
 *
 * The director sits at the centre; around them, the other directors named in
 * the same movements, grouped by movement and joined to the centre by lines in
 * that movement's colour. Each group is named like a constellation. Lines draw
 * in and stars settle as it comes into view; every star links to its page.
 */

const W = 1000;
const H = 620;
const CX = W / 2;
const CY = H / 2;
const EASE = [0.22, 1, 0.36, 1];

const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('');

const Constellation = ({ director, movements, peers, reducedMotion = false }) => {
    // each movement takes an arc of the circle, sized by how many it brings
    const groups = movements
        .map((m) => ({ m, members: peers.filter((p) => (p.movementIds || []).includes(m._id)) }))
        .filter((g) => g.members.length);
    const total = groups.reduce((n, g) => n + g.members.length, 0);
    if (!total) return null;

    // a small circle sits close; a large one spreads to the edges of the sky
    const R = Math.min(230, 120 + total * 18);
    let cursor = -Math.PI / 2 - (Math.PI * 2 * (groups[0].members.length / total)) / 2;
    const stars = [];
    const labels = [];
    groups.forEach((g) => {
        const arc = (Math.PI * 2 * g.members.length) / total;
        const accent = treatmentFor(g.m).accent;
        g.members.forEach((p, i) => {
            const a = cursor + (arc * (i + 0.5)) / g.members.length;
            // alternate the radius a little so a crowded arc doesn't read as a ring of beads
            const r = R + (i % 2 ? 46 : -6);
            stars.push({ p, accent, x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r * 0.82 });
        });
        const mid = cursor + arc / 2;
        labels.push({ m: g.m, accent, x: CX + Math.cos(mid) * (R + 120), y: CY + Math.sin(mid) * (R + 95) * 0.82 });
        cursor += arc;
    });

    return (
        <div className="relative w-full overflow-x-auto [scrollbar-width:thin]">
            <div className="relative mx-auto min-w-[760px]" style={{ maxWidth: W, aspectRatio: `${W} / ${H}` }}>
                <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" aria-hidden="true">
                    {/* faint sky */}
                    {Array.from({ length: 70 }, (_, i) => (
                        <circle key={i} cx={(i * 137.5) % W} cy={(i * 89.3) % H} r={i % 9 === 0 ? 1.4 : 0.7} fill="white" opacity={0.08 + (i % 5) * 0.05} className={i % 7 === 0 ? 'motion-safe:animate-pulse' : ''} />
                    ))}
                    {stars.map((s, i) => (
                        <motion.line
                            key={s.p._id}
                            x1={CX} y1={CY} x2={s.x} y2={s.y}
                            stroke={s.accent}
                            strokeOpacity={0.5}
                            strokeWidth={1.2}
                            initial={reducedMotion ? false : { pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.3 + i * 0.07, ease: EASE }}
                        />
                    ))}
                </svg>

                {/* the director, at the centre */}
                <div className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${(CX / W) * 100}%`, top: `${(CY / H) * 100}%` }}>
                    <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden ring-2 ring-white/70 shadow-[0_0_60px_rgba(255,255,255,0.18)] mx-auto bg-[#111]">
                        {director.profileUrl
                            ? <img src={sized(director.profileUrl, 'w185')} alt="" className="w-full h-full object-cover grayscale" />
                            : <div className="w-full h-full flex items-center justify-center font-serif text-3xl text-gray-500">{initials(director.name)}</div>}
                    </div>
                    <div className="mt-2 font-serif text-lg text-white whitespace-nowrap">{director.name}</div>
                </div>

                {/* the circle */}
                {stars.map((s, i) => (
                    <motion.div
                        key={s.p._id}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${(s.x / W) * 100}%`, top: `${(s.y / H) * 100}%` }}
                        initial={reducedMotion ? false : { opacity: 0, scale: 0.4 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.9 + i * 0.07, ease: EASE }}
                    >
                        <Link to={`/directors/${s.p._id}`} className="group flex flex-col items-center">
                            <span className="relative block w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden bg-[#111] transition-transform duration-300 group-hover:scale-110" style={{ boxShadow: `0 0 0 1.5px ${s.accent}, 0 0 24px ${s.accent}55` }}>
                                {s.p.profileUrl
                                    ? <img src={sized(s.p.profileUrl, 'w185')} alt="" loading="lazy" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-[filter] duration-500" />
                                    : <span className="w-full h-full flex items-center justify-center font-serif text-sm text-gray-500">{initials(s.p.name)}</span>}
                            </span>
                            <span className="mt-1.5 max-w-[8rem] text-center font-courier text-[12px] leading-tight text-gray-300 group-hover:text-white transition-colors">{s.p.name}</span>
                        </Link>
                    </motion.div>
                ))}

                {/* the constellations' names */}
                {labels.map((l) => (
                    <Link
                        key={l.m._id}
                        to={`/movements/${l.m.tag || l.m._id}`}
                        className="absolute -translate-x-1/2 -translate-y-1/2 font-serif italic text-sm md:text-base whitespace-nowrap hover:underline underline-offset-4"
                        style={{ left: `${(l.x / W) * 100}%`, top: `${(l.y / H) * 100}%`, color: l.accent }}
                    >
                        {l.m.title}
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Constellation;
