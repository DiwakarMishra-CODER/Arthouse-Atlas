import { motion } from 'framer-motion';

/**
 * A poster laurel — the wreath films wear for a festival selection — around
 * one citation: which list, and where it places the film. The two branches
 * grow from the stem when it comes into view, leaf by leaf.
 */

const LEAVES = 8;

const Branch = ({ flip, color, delay, reducedMotion }) => (
    <g transform={flip ? 'translate(220 0) scale(-1 1)' : undefined}>
        <motion.path
            d="M 70 128 C 34 112, 22 70, 40 22"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            initial={reducedMotion ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay, ease: 'easeOut' }}
        />
        {Array.from({ length: LEAVES }, (_, i) => {
            const t = (i + 0.5) / LEAVES;
            // points along the stem's curve, leaves angled up and outward
            const x = 70 - 50 * t + 22 * Math.sin(t * Math.PI) * -0.9;
            const y = 128 - 104 * t;
            // the angle sits on a group: an animated scale on the leaf itself would replace its rotate
            return (
                <g key={i} transform={`rotate(${-55 + t * 50} ${x - 9} ${y})`}>
                    <motion.ellipse
                        cx={x - 9}
                        cy={y}
                        rx="11"
                        ry="4.2"
                        fill={color}
                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                        initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35, delay: delay + 0.15 + i * 0.06, ease: 'backOut' }}
                    />
                </g>
            );
        })}
    </g>
);

const Laurel = ({ name, place, color = '#d4b26a', href, delay = 0, reducedMotion = false }) => {
    const body = (
        <div className="relative w-[220px] h-[140px] shrink-0 group">
            <svg viewBox="0 0 220 140" className="absolute inset-0 w-full h-full" aria-hidden="true">
                <Branch color={color} delay={delay} reducedMotion={reducedMotion} />
                <Branch flip color={color} delay={delay} reducedMotion={reducedMotion} />
            </svg>
            <motion.div
                className="absolute inset-x-[52px] top-[30px] bottom-[22px] flex flex-col items-center justify-center text-center"
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: delay + 0.45 }}
            >
                <span className="font-mono text-[9.5px] leading-[1.35] tracking-[0.14em] uppercase" style={{ color }}>{name}</span>
                <span className="mt-1.5 font-serif text-[15px] leading-tight text-white">{place}</span>
            </motion.div>
        </div>
    );
    return href
        ? <a href={href} target="_blank" rel="noopener noreferrer" className="hover:brightness-125 transition-[filter]" title="Read the essay">{body}</a>
        : body;
};

export default Laurel;
