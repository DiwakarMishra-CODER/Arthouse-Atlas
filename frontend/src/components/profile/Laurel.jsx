/**
 * The festival laurel, as on a film's poster: two gold branches arching up around a prize's words.
 * Its leaves grow in from the stem, one after another, each time it's shown (only their scale and
 * opacity move). children: the words inside it.
 */

const W = 200;
const H = 132;
const C = { x: 100, y: 70, rx: 84, ry: 58 };
const FROM = 104; // where a branch starts (degrees round the ellipse; 90 is the foot)
const TO = 222; // where it ends, up beside the words
const LEAVES = 9;
const at = (deg) => {
    const t = (deg * Math.PI) / 180;
    return { x: C.x + C.rx * Math.cos(t), y: C.y + C.ry * Math.sin(t), dx: -C.rx * Math.sin(t), dy: C.ry * Math.cos(t) };
};
// one branch's leaves (the left; the right is its mirror): in pairs, outside and inside, smaller towards the tip
const leaves = Array.from({ length: LEAVES }, (_, i) => {
    const p = at(FROM + ((TO - FROM) * (i + 0.6)) / LEAVES);
    const along = (Math.atan2(p.dy, p.dx) * 180) / Math.PI;
    return { x: p.x, y: p.y, turn: along + (i % 2 ? 38 : -38), size: 1 - (i / LEAVES) * 0.35 };
});
const a = at(FROM);
const b = at(TO);
const STEM = `M${a.x.toFixed(1)},${a.y.toFixed(1)} A${C.rx},${C.ry} 0 0 1 ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
const LEAF = 'M0,0 C4,-4.2 11,-4.6 16,0 C11,4.6 4,4.2 0,0 Z';

const Branch = ({ grow, flip = false }) => (
    <g transform={flip ? `translate(${W},0) scale(-1,1)` : undefined}>
        <path d={STEM} fill="none" className={`stroke-gold ${grow ? 'laurel-stem' : ''}`} strokeWidth="1.3" strokeLinecap="round" />
        {leaves.map((l, i) => (
            <g key={i} transform={`translate(${l.x.toFixed(1)},${l.y.toFixed(1)}) rotate(${l.turn.toFixed(1)}) scale(${l.size.toFixed(2)})`}>
                <path d={LEAF} className={`fill-gold ${grow ? 'laurel-leaf' : ''}`} style={grow ? { animationDelay: `${120 + i * 55}ms` } : undefined} />
            </g>
        ))}
    </g>
);

const Laurel = ({ children, grow = true, className = '' }) => (
    <div className={`relative ${className}`} style={{ aspectRatio: `${W} / ${H}` }}>
        <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full overflow-visible">
            <Branch grow={grow} />
            <Branch grow={grow} flip />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-[17%] pt-[6%]">{children}</div>
    </div>
);

export default Laurel;
