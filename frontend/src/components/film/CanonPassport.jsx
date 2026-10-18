import { motion } from 'framer-motion';

/**
 * The film's passport through the canon.
 *
 * Every public list that places the film is a rubber stamp on the page, each
 * list in its own ink and shape — the polls round, TSPDT a ruled box, a
 * Criterion spine, a festival laurel, a Cahiers seal. They land one after
 * another as the page comes into view. Beside them, the reading: how many of
 * the lists we read place it, and which don't.
 */

const SOURCES = [
    { id: 'ss2022-critics', name: 'Sight and Sound · critics' },
    { id: 'ss2022-directors', name: 'Sight and Sound · directors' },
    { id: 'tspdt-1000', name: 'TSPDT 1000' },
    { id: 'criterion', name: 'Criterion Collection' },
    { id: 'cahiers-top10', name: 'Cahiers top 10' },
    { id: 'festival-awards', name: 'Festival prizes' }
];

const INK = {
    'ss2022-critics': '#e0574b',
    'ss2022-directors': '#e0574b',
    'tspdt-1000': '#6b95e6',
    criterion: '#d4ad5f',
    'cahiers-top10': '#b08ae6',
    'festival-awards': '#74c08f'
};

const rankOf = (p) => p.rank || Number((p.detail || '').match(/#\s?(\d+)/)?.[1]) || null;
const yearOf = (p) => (p.detail || '').match(/(\d{4})/)?.[1] || null;

// a circle of text, for the round stamps
const Ring = ({ id, text, r = 62, size = 12 }) => (
    <>
        <defs><path id={id} d={`M 80 80 m -${r} 0 a ${r} ${r} 0 1 1 ${r * 2} 0 a ${r} ${r} 0 1 1 -${r * 2} 0`} /></defs>
        <text fontSize={size} letterSpacing="2.4" fontFamily="'Courier Prime', monospace" fill="currentColor">
            <textPath href={`#${id}`}>{text}</textPath>
        </text>
    </>
);

const PollStamp = ({ p, uid }) => (
    <svg viewBox="0 0 160 160" className="w-[184px] h-[184px]">
        <circle cx="80" cy="80" r="76" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="80" cy="80" r="47" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <Ring id={`ring-${uid}`} text="SIGHT AND SOUND · GREATEST FILMS · 2022 ·" r={57} size={10.5} />
        <text x="80" y="70" textAnchor="middle" fontSize="11" fontFamily="'Courier Prime', monospace" fill="currentColor">No.</text>
        <text x="80" y="101" textAnchor="middle" fontSize={rankOf(p) > 99 ? 30 : 36} fontWeight="700" fontFamily="'Playfair Display', serif" fill="currentColor">{rankOf(p) ?? '—'}</text>
        <text x="80" y="117" textAnchor="middle" fontSize="8.5" letterSpacing="1.5" fontFamily="'Courier Prime', monospace" fill="currentColor">
            {p.source === 'ss2022-directors' ? "DIRECTORS' POLL" : "CRITICS' POLL"}
        </text>
    </svg>
);

const TspdtStamp = ({ p }) => (
    <div className="w-[230px] px-3.5 py-3 border-[3px] border-current text-center font-courier">
        <div className="border border-current px-2 py-2">
            <div className="text-[9.5px] tracking-[0.22em]">THEY SHOOT PICTURES</div>
            <div className="my-1 h-px bg-current opacity-70" />
            <div className="font-serif font-bold text-[46px] leading-none">#{rankOf(p) ?? '—'}</div>
            <div className="mt-1 text-[10px] tracking-[0.2em]">OF THE 1000 · {yearOf(p) || '2025'}</div>
        </div>
    </div>
);

const CriterionStamp = ({ p }) => (
    <div className="w-[88px] h-[212px] border-[3px] border-current flex flex-col items-center justify-between py-2 font-courier">
        <div className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center font-serif font-bold text-sm">C</div>
        <div className="[writing-mode:vertical-rl] rotate-180 text-[9.5px] tracking-[0.3em]">THE CRITERION COLLECTION</div>
        <div className="text-center leading-none">
            <div className="text-[8px] tracking-[0.2em]">SPINE</div>
            <div className="font-serif font-bold text-[22px] mt-0.5">{(p.detail || '').match(/(\d+)/)?.[1] || '—'}</div>
        </div>
    </div>
);

const Laurel = ({ flip }) => (
    <g transform={flip ? 'translate(160 0) scale(-1 1)' : undefined}>
        <path d="M 52 128 C 22 108, 18 62, 40 30" fill="none" stroke="currentColor" strokeWidth="2" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const t = i / 6;
            const x = 52 - 30 * t + 14 * Math.sin(t * Math.PI) * -0.6;
            const y = 128 - 98 * t;
            return <ellipse key={i} cx={x - 8} cy={y} rx="9" ry="4" transform={`rotate(${-50 + t * 40} ${x - 8} ${y})`} fill="currentColor" />;
        })}
    </g>
);

const FestivalStamp = ({ p }) => {
    const [prize, where] = (p.detail || p.label || '').split(' · ');
    return (
        <svg viewBox="0 0 160 160" className="w-[196px] h-[196px]">
            <Laurel />
            <Laurel flip />
            <text x="80" y="70" textAnchor="middle" fontSize="9" letterSpacing="2" fontFamily="'Courier Prime', monospace" fill="currentColor">AWARDED</text>
            <text x="80" y="92" textAnchor="middle" fontSize={prize && prize.length > 14 ? 13 : 17} fontStyle="italic" fontFamily="'Playfair Display', serif" fill="currentColor">{prize}</text>
            <line x1="56" y1="102" x2="104" y2="102" stroke="currentColor" strokeWidth="1" />
            <text x="80" y="116" textAnchor="middle" fontSize="9.5" letterSpacing="1.4" fontFamily="'Courier Prime', monospace" fill="currentColor">{(where || '').toUpperCase()}</text>
        </svg>
    );
};

const CahiersStamp = ({ p }) => (
    <svg viewBox="0 0 160 160" className="w-[180px] h-[180px]">
        <polygon points="80,4 146,42 146,118 80,156 14,118 14,42" fill="none" stroke="currentColor" strokeWidth="3" />
        <polygon points="80,13 138,47 138,113 80,147 22,113 22,47" fill="none" stroke="currentColor" strokeWidth="1" />
        <text x="80" y="50" textAnchor="middle" fontSize="9" letterSpacing="1.6" fontFamily="'Courier Prime', monospace" fill="currentColor">CAHIERS DU CINÉMA</text>
        <text x="80" y="66" textAnchor="middle" fontSize="9" letterSpacing="2" fontFamily="'Courier Prime', monospace" fill="currentColor">TOP DIX</text>
        <text x="80" y="102" textAnchor="middle" fontSize="36" fontWeight="700" fontFamily="'Playfair Display', serif" fill="currentColor">{rankOf(p) ?? '—'}</text>
        <text x="80" y="124" textAnchor="middle" fontSize="11" letterSpacing="3" fontFamily="'Courier Prime', monospace" fill="currentColor">{yearOf(p) || ''}</text>
    </svg>
);

const STAMP = {
    'ss2022-critics': PollStamp,
    'ss2022-directors': PollStamp,
    'tspdt-1000': TspdtStamp,
    criterion: CriterionStamp,
    'cahiers-top10': CahiersStamp,
    'festival-awards': FestivalStamp
};

// fixed, per-position tilts — a stamp is never put down straight
const TILT = [-7, 5, -3, 8, -10, 4, -5, 9];

const CanonPassport = ({ provenance = [], score, accent, reducedMotion = false }) => {
    const placed = new Set(provenance.map((p) => p.source));
    const stamps = provenance.filter((p) => STAMP[p.source]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 ring-1 ring-white/[0.08] overflow-hidden">
            {/* ink texture for every stamp: speckled, never a clean print */}
            <svg width="0" height="0" className="absolute" aria-hidden="true">
                <filter id="stamp-ink">
                    <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n" />
                    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.7 0 0 0 1.75" result="speckle" />
                    <feComposite in="SourceGraphic" in2="speckle" operator="in" />
                </filter>
            </svg>

            {/* the reading */}
            <div className="lg:col-span-4 p-7 md:p-9 bg-[#0c0c0c] border-b lg:border-b-0 lg:border-r border-white/[0.08]">
                <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-gray-500">Canon reading</div>
                <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-serif text-7xl leading-none text-white">{score != null && placed.size > 0 ? score.toFixed(1) : '—'}</span>
                    <span className="font-mono text-sm text-gray-500">/ 10</span>
                </div>
                <p className="mt-4 text-sm text-gray-400 leading-relaxed">
                    Placed on <span className="text-white">{placed.size}</span> of the {SOURCES.length} lists the atlas reads.
                </p>
                <ul className="mt-6 space-y-2">
                    {SOURCES.map((s) => {
                        const on = placed.has(s.id);
                        return (
                            <li key={s.id} className={`flex items-center gap-3 text-[13px] ${on ? 'text-gray-200' : 'text-gray-600'}`}>
                                <span className="w-2 h-2 rotate-45 shrink-0" style={{ backgroundColor: on ? INK[s.id] : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 1px rgb(75 85 99)' }} />
                                {s.name}
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* the passport page */}
            <div
                className="relative lg:col-span-8 min-h-[22rem] px-8 md:px-12 py-10 bg-[#100f0c]"
                style={{
                    backgroundImage: 'repeating-radial-gradient(circle at 18% 30%, transparent 0 13px, rgba(255,255,255,0.022) 13px 14px), repeating-radial-gradient(circle at 82% 72%, transparent 0 17px, rgba(255,255,255,0.018) 17px 18px)'
                }}
            >
                {/* the binding */}
                <div className="absolute left-0 inset-y-0 w-3 bg-[radial-gradient(circle,#050505_2px,transparent_2.5px)] [background-size:12px_18px] opacity-80" aria-hidden="true" />
                <div className="absolute top-4 right-5 font-mono text-[10px] tracking-[0.3em] text-gray-600" aria-hidden="true">ENTRIES · {String(stamps.length).padStart(2, '0')}</div>

                {stamps.length ? (
                    <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-8 pt-4">
                        {stamps.map((p, i) => {
                            const Stamp = STAMP[p.source];
                            return (
                                <motion.li
                                    key={p._id || `${p.source}-${i}`}
                                    title={`${p.label} · ${p.detail}`}
                                    className="relative"
                                    style={{ color: INK[p.source], filter: 'url(#stamp-ink)' }}
                                    initial={reducedMotion ? false : { opacity: 0, scale: 1.8, rotate: TILT[i % TILT.length] + 14 }}
                                    whileInView={{ opacity: 1, scale: 1, rotate: TILT[i % TILT.length] }}
                                    viewport={{ once: true, margin: '-80px' }}
                                    transition={{ type: 'spring', stiffness: 520, damping: 24, delay: 0.15 + i * 0.22 }}
                                >
                                    <Stamp p={p} uid={i} />
                                    <span className="sr-only">{p.label}: {p.detail}</span>
                                </motion.li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="h-full min-h-[16rem] flex items-center justify-center">
                        <div className="max-w-sm text-center border border-dashed border-white/15 px-8 py-10">
                            <div className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: accent }}>No entries yet</div>
                            <p className="mt-3 font-serif italic text-lg text-gray-300 leading-snug">
                                None of the lists we read place this film. It is in the atlas on the curator's judgement.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CanonPassport;
