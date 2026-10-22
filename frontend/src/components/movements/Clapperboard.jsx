import { motion } from 'framer-motion';

/**
 * The movement's facts, chalked on a slate. The sticks are open when it comes
 * into view and clap shut once — the take begins.
 */

const STICKS = 'bg-[repeating-linear-gradient(-56deg,#f2f0ea_0_26px,#0b0b0b_26px_52px)]';

const Field = ({ label, children, className = '' }) => (
    <div className={`px-4 py-3 border-white/25 ${className}`}>
        <div className="font-label text-[12px] tracking-[0.14em] uppercase text-white/65">{label}</div>
        <div className="mt-1 font-courier text-[#f2f0ea] leading-tight">{children}</div>
    </div>
);

const Clapperboard = ({ title, era, region, takes, director, span, accent, reducedMotion = false }) => (
    <motion.div
        className="relative w-full max-w-[460px] select-none"
        initial="open"
        whileInView="shut"
        viewport={{ once: true, margin: '-120px' }}
    >
        {/* the sticks */}
        <motion.div
            className={`relative h-[38px] origin-[4px_100%] ${STICKS} ring-1 ring-black`}
            variants={{
                open: { rotate: reducedMotion ? 0 : -24 },
                shut: { rotate: 0, transition: { delay: 0.45, type: 'spring', stiffness: 700, damping: 22 } }
            }}
        >
            <span className="absolute left-[3px] bottom-[3px] w-[7px] h-[7px] rounded-full bg-[#777] ring-1 ring-black" />
        </motion.div>
        <div className={`h-[30px] ${STICKS} ring-1 ring-black [background-position:13px_0]`} />

        {/* the slate */}
        <motion.div
            className="relative bg-[#141414] ring-1 ring-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
            variants={{ open: {}, shut: { x: reducedMotion ? 0 : [0, -2, 1, 0], transition: { delay: 0.55, duration: 0.18 } } }}
        >
            <Field label="Production" className="border-b">
                <span className="text-2xl md:text-[1.7rem]">{title}</span>
            </Field>
            <div className="grid grid-cols-3 border-b border-white/25">
                <Field label="Roll" className="border-r">{era}</Field>
                <Field label="Scene" className="border-r text-sm">{region}</Field>
                <Field label="Take">
                    <span className="text-3xl" style={{ color: accent }}>{takes}</span>
                </Field>
            </div>
            <div className="grid grid-cols-3">
                <Field label="Director" className="col-span-2 border-r">{director}</Field>
                <Field label="Running">{span} yrs</Field>
            </div>
        </motion.div>
    </motion.div>
);

export default Clapperboard;
