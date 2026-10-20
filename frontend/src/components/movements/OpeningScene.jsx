import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionTemplate, useScroll, useTransform } from 'framer-motion';

/**
 * The house lights go down. A movement opens on its title card, with the
 * screen still small and far off beneath it; scroll and the projector throws
 * the still out until it fills the frame, and the title gives way to it.
 * With reduced motion, the title card and the screen simply follow each other.
 */
const OpeningScene = ({ movement, treatment: t, backdrop, gesture, title, kicker, tagline, reducedMotion = false }) => {
    const ref = useRef(null);
    const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });

    const scale = useTransform(p, [0, 0.7], [0.34, 1]);
    const y = useTransform(p, [0, 0.7], ['24vh', '0vh']);
    const bright = useTransform(p, [0, 0.6], [0.4, 1]);
    const base = t.screenFilter && t.screenFilter !== 'none' ? t.screenFilter : '';
    const filter = useMotionTemplate`${base} brightness(${bright})`;
    const titleOpacity = useTransform(p, [0, 0.22], [1, 0]);
    const titleY = useTransform(p, [0, 0.32], [0, -90]);
    const beam = useTransform(p, [0, 0.5], [1, 0]);
    const credit = useTransform(p, [0.72, 0.9], [0, 1]);
    const hint = useTransform(p, [0, 0.08], [1, 0]);
    // framer hands a raw scroll-linked opacity to a native scroll timeline, which Chrome times against the
    // whole page rather than this section; a template keeps each one on the JS path, tied to this section
    const titleOp = useMotionTemplate`${titleOpacity}`;
    const beamOp = useMotionTemplate`${beam}`;
    const creditOp = useMotionTemplate`${credit}`;
    const hintOp = useMotionTemplate`${hint}`;

    const still = backdrop && (
        <img
            src={backdrop}
            alt={movement.heroCredit ? `Still from ${movement.heroCredit.title}` : ''}
            className="w-full h-full object-cover"
            style={{ objectPosition: movement.heroFocus || '50% 35%' }}
        />
    );
    const creditLine = movement.heroCredit && (
        <span>
            Still ·{' '}
            {movement.heroCredit._id ? (
                <Link to={`/movie/${movement.heroCredit._id}`} className="hover:text-white transition-colors">
                    {movement.heroCredit.title} ({movement.heroCredit.year})
                </Link>
            ) : `${movement.heroCredit.title} (${movement.heroCredit.year})`}
        </span>
    );

    if (reducedMotion || !backdrop) {
        return (
            <>
                <section className="relative min-h-[88vh] flex flex-col items-center justify-center text-center px-6 pt-24 pb-16">
                    {gesture}
                    <div className="relative z-10 w-full max-w-5xl">{kicker}{title}{tagline}</div>
                </section>
                {backdrop && (
                    <figure className="max-w-6xl mx-auto px-4 md:px-8">
                        <div className="aspect-video overflow-hidden ring-1 ring-white/[0.06]" style={{ filter: t.screenFilter }}>{still}</div>
                        <figcaption className="mt-4 font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">{creditLine}</figcaption>
                    </figure>
                )}
            </>
        );
    }

    return (
        <section ref={ref} className="relative h-[240vh]">
            <div className="sticky top-0 h-screen overflow-hidden">
                {/* the beam, from the booth to the far-off screen */}
                <motion.div
                    aria-hidden="true"
                    className="absolute left-1/2 -top-[10vh] h-[90vh] w-[70vw] -translate-x-1/2 blur-[50px] pointer-events-none"
                    style={{
                        opacity: beamOp,
                        clipPath: 'polygon(48% 0, 52% 0, 84% 100%, 16% 100%)',
                        background: `linear-gradient(to bottom, ${t.accent}10, ${t.accent}24 70%, transparent)`
                    }}
                />

                {/* the screen */}
                <motion.div className="absolute inset-0 origin-center" style={{ scale, y }}>
                    <motion.div className="absolute inset-0 overflow-hidden ring-1 ring-white/10" style={{ filter }}>
                        {still}
                    </motion.div>
                    {/* the frame settles into the page below */}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.5)_100%)] pointer-events-none" />
                </motion.div>

                {/* the title card */}
                <motion.div
                    className="absolute inset-x-0 top-0 h-[62vh] flex flex-col items-center justify-center text-center px-6 pt-20"
                    style={{ opacity: titleOp, y: titleY }}
                >
                    {gesture}
                    <div className="relative z-10 w-full max-w-5xl">{kicker}{title}{tagline}</div>
                </motion.div>

                <motion.div style={{ opacity: creditOp }} className="absolute bottom-8 inset-x-0 px-4 md:px-10 flex justify-between font-label text-[12px] tracking-[0.14em] uppercase text-gray-300">
                    {creditLine}
                    <span className="hidden md:inline">{movement.era}</span>
                </motion.div>
                <motion.div style={{ opacity: hintOp }} className="absolute bottom-6 left-1/2 -translate-x-1/2 font-label text-[12px] tracking-[0.14em] text-gray-400 uppercase">
                    {movement.filmCount} films <span className="mx-2">·</span> scroll
                </motion.div>
            </div>
        </section>
    );
};

export default OpeningScene;
