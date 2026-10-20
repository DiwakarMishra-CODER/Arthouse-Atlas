import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * The director's card from the cinémathèque's files.
 *
 * A cream index card, punched for the drawer, with the typed particulars and
 * a red archive stamp. The biography types itself onto the card when it comes
 * into view; under reduced motion it's simply there.
 */

const MAX_CHARS = 760;

// the first paragraphs of the biography, cut at a sentence near the length the card can hold
const excerpt = (bio = '') => {
    const text = bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).join('\n\n');
    if (text.length <= MAX_CHARS) return text;
    const cut = text.slice(0, MAX_CHARS);
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'));
    return `${cut.slice(0, end > 200 ? end + 1 : MAX_CHARS)} …`;
};

const Field = ({ label, children }) => (
    <div className="flex items-baseline gap-3 border-b border-[#2a2620]/25 py-1.5">
        <span className="shrink-0 w-24 font-label text-[12px] tracking-[0.14em] uppercase text-[#7a6f5c]">{label}</span>
        <span className="font-courier text-[15px] text-[#1d1a15]">{children}</span>
    </div>
);

const ArchiveCard = ({ director, filmsCount, movements, index, reducedMotion = false }) => {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-120px' });
    const text = excerpt(director.bio);
    const [typed, setTyped] = useState(0);

    useEffect(() => {
        if (!inView || reducedMotion) return undefined;
        // about three seconds for the whole excerpt, whatever its length
        const step = Math.max(2, Math.ceil(text.length / 180));
        const id = setInterval(() => setTyped((t) => {
            if (t + step >= text.length) { clearInterval(id); return text.length; }
            return t + step;
        }), 16);
        return () => clearInterval(id);
    }, [inView, reducedMotion, text.length]);

    const shown = reducedMotion ? text.length : typed;
    const done = shown >= text.length;
    const born = director.birthDate ? director.birthDate.slice(0, 10) : '—';
    const died = director.deathDate ? director.deathDate.slice(0, 10) : null;

    return (
        <motion.div
            ref={ref}
            className="relative mx-auto max-w-4xl"
            initial={reducedMotion ? false : { opacity: 0, y: 40, rotate: -2 }}
            whileInView={{ opacity: 1, y: 0, rotate: -0.6 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
            {/* the stamp's ink, speckled like a real impression */}
            <svg width="0" height="0" className="absolute" aria-hidden="true">
                <filter id="archive-ink">
                    <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n" />
                    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.7 0 0 0 1.75" result="speckle" />
                    <feComposite in="SourceGraphic" in2="speckle" operator="in" />
                </filter>
            </svg>
            <div
                className="relative pl-14 md:pl-20 pr-7 md:pr-12 py-9 md:py-11 text-[#1d1a15] shadow-[0_40px_90px_rgba(0,0,0,0.75)]"
                style={{
                    backgroundColor: '#ebe4d3',
                    // ruled like an index card, with a faint tooth to the paper
                    backgroundImage: 'linear-gradient(to bottom, transparent 0 3.2rem, rgba(176,48,40,0.35) 3.2rem 3.28rem, transparent 3.28rem), repeating-linear-gradient(to bottom, transparent 0 1.7rem, rgba(60,90,140,0.13) 1.7rem 1.76rem)'
                }}
            >
                {/* punched for the drawer */}
                <div className="absolute left-4 md:left-6 top-0 bottom-0 flex flex-col justify-center gap-24" aria-hidden="true">
                    <span className="w-5 h-5 rounded-full bg-[#050505] shadow-[inset_0_2px_3px_rgba(0,0,0,0.8)]" />
                    <span className="w-5 h-5 rounded-full bg-[#050505] shadow-[inset_0_2px_3px_rgba(0,0,0,0.8)]" />
                </div>

                <div className="flex items-start justify-between gap-6">
                    <div className="font-label text-[12px] tracking-[0.14em] uppercase text-[#7a6f5c]">Atlas archive · card {String(index).padStart(4, '0')}</div>
                    <div className="font-label text-[12px] tracking-[0.14em] uppercase text-[#7a6f5c] hidden sm:block">Filed under: Directors</div>
                </div>
                <div className="mt-5 font-courier text-3xl md:text-4xl font-bold tracking-tight uppercase">{director.name}</div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-10">
                    <Field label="Born">{born}{director.placeOfBirth ? `, ${director.placeOfBirth}` : ''}</Field>
                    <Field label="Died">{died || '—'}</Field>
                    <Field label="In the atlas">{filmsCount} {filmsCount === 1 ? 'film' : 'films'}</Field>
                    <Field label="Movements">{movements.map((m) => m.title).join(', ') || '—'}</Field>
                </div>

                {text && (
                    <div className="mt-8 font-courier text-[15px] md:text-base leading-[1.75rem] whitespace-pre-line min-h-[10rem]">
                        {text.slice(0, shown)}
                        <span className={`inline-block w-[0.55em] h-[1.1em] align-[-0.15em] bg-[#1d1a15] ${done ? 'animate-pulse motion-reduce:animate-none' : ''}`} aria-hidden="true" />
                        <span className="sr-only">{text}</span>
                    </div>
                )}
                <div className="mt-6 font-label text-[12px] tracking-[0.14em] uppercase text-[#7a6f5c]">Biography: TMDB</div>

                {/* the archive's stamp */}
                <motion.div
                    className="absolute right-6 md:right-10 bottom-6 md:bottom-8 px-4 py-2 border-[3px] border-[#b0302a] text-[#b0302a] font-label text-xs tracking-[0.14em] uppercase rotate-[-8deg] opacity-80 [filter:url(#archive-ink)]"
                    initial={reducedMotion ? false : { opacity: 0, scale: 1.8 }}
                    animate={inView ? { opacity: 0.8, scale: 1 } : undefined}
                    transition={{ type: 'spring', stiffness: 500, damping: 22, delay: reducedMotion ? 0 : 3.2 }}
                    aria-hidden="true"
                >
                    Arthouse Atlas<br />Archive
                </motion.div>
            </div>
        </motion.div>
    );
};

export default ArchiveCard;
