import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionTemplate, useScroll, useSpring, useTransform } from 'framer-motion';
import { MdArrowOutward } from 'react-icons/md';
import { sized } from '../movements/treatments';

/**
 * What is arthouse cinema? Films whose makers didn't take the note.
 *
 * The section pins. It opens on the set-up: every film gets notes from the
 * people paying for it. Then four famous films get theirs, one after another,
 * as you scroll: the studio's memo to the director types itself out, centre
 * frame, over the film drained to grey; a red pencil goes through it; then it
 * burns through from the middle, as film melts in a projector's gate, and the
 * film breaks through in colour with the director's answer and what it does
 * to you.
 * It ends on the definition, the four films in a row to start with.
 *
 * A film the atlas can't find still has its beat, on the dark, without a still.
 * With reduced motion: the notes and answers, laid out still.
 */

const BEATS = [
    {
        title: 'Mulholland Drive',
        note: 'Explain the ending. Audiences hate being confused.',
        answer: 'Leave them a mystery to carry home.',
        feel: 'It makes sense the way a dream does, right up until you wake.'
    },
    {
        title: 'Tokyo Story',
        note: "It's too slow. Cut it down.",
        answer: 'Let the moment last until you feel it.',
        feel: 'An old couple visits their busy grown-up children. Nothing explodes, and it will still undo you.'
    },
    {
        title: 'In the Mood for Love',
        note: "Have them finally say 'I love you'.",
        answer: 'Say it with a look. Never out loud.',
        feel: 'Two neighbours, a narrow corridor, one song played again and again. They never say it. You feel all of it.'
    },
    {
        title: 'Persona',
        note: 'Just tell a simple story about a nurse and her patient.',
        answer: 'Let the film itself come apart.',
        feel: 'A nurse and an actress who has stopped speaking, alone by the sea, until their two faces seem to become one.'
    }
];
// the scroll, shared out: the set-up, the four films, the definition
const INTRO = 0.07;
const OUTRO = 0.16;
const SCROLL_VH = 400;

// where the note catches and burns from: points that each catch at their own moment and spread at their
// own pace, so the hole is ragged rather than a circle
const FLAMES = [
    { at: '47% 56%', from: 0, reach: 430 },
    { at: '33% 44%', from: 0.08, reach: 260 },
    { at: '64% 70%', from: 0.14, reach: 250 },
    { at: '22% 72%', from: 0.24, reach: 200 },
    { at: '80% 34%', from: 0.3, reach: 210 }
];

// scroll-linked opacity through a template, or framer hands it to a native timeline Chrome mistimes
const useOpacity = (p, input, output) => {
    const v = useTransform(p, input, output);
    return useMotionTemplate`${v}`;
};

const find = (films, title) => films.find((f) => f.title?.toLowerCase() === title.toLowerCase());
const stillOf = (film) => film && (film.stills?.[1] || film.stills?.[0] || film.backdropUrl);

// the studio's memo, its note typing itself out
const Memo = ({ beat, film, typed }) => (
    <div className="w-[min(36rem,88vw)] bg-[#f1ead9] text-[#2a241c] px-6 md:px-8 pt-5 pb-7 shadow-[0_30px_70px_rgba(0,0,0,0.7)] bg-[repeating-linear-gradient(to_bottom,transparent_0_27px,rgba(42,36,28,0.07)_27px_28px)]">
        <div className="flex justify-between gap-4 font-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase">
            <span className="font-bold">Studio notes</span>
            <span className="text-[#2a241c]/65 truncate">Re: {film?.title || beat.title}</span>
        </div>
        <div className="mt-1 font-mono text-[10px] md:text-[11px] tracking-[0.18em] uppercase text-[#2a241c]/65">
            From: the studio{film?.directors?.[0] ? ` · To: ${film.directors[0]}` : ''}
        </div>
        <div className="mt-3 h-px bg-[#2a241c]/30" />
        <p className="mt-4 min-h-[4.5rem] md:min-h-[5.5rem] font-mono text-xl md:text-[1.7rem] leading-snug">
            <motion.span>{typed}</motion.span>
            <span className="inline-block w-[0.55ch] h-[1.05em] align-[-0.15em] bg-[#2a241c] animate-pulse" />
        </p>
    </div>
);

const Beat = ({ p, i, n, beat, film }) => {
    const len = (1 - INTRO - OUTRO) / n;
    const a = INTRO + i * len;
    const b = a + len;
    const at = (t) => a + len * t; // a moment within this film's stretch of the scroll
    const last = i === n - 1;

    // the beat as a whole: in, held, out (the last stays, under the definition)
    const op = useOpacity(p, last ? [a - 0.025, a] : [a - 0.025, a, b - 0.025, b], last ? [0, 1] : [0, 1, 1, 0]);
    // the note types itself out (quickly: the answer gets the longest share of the beat)
    const typed = useTransform(p, [at(0.02), at(0.2)], [0, beat.note.length], { clamp: true });
    const text = useTransform(typed, (v) => beat.note.slice(0, Math.round(v)));
    // the red pencil through it
    const strike = useTransform(p, [at(0.22), at(0.3)], [0, 1]);
    // then the note burns through, as film melts in a projector's gate: holes that spread, edges glowing
    const burn = useTransform(p, [at(0.33), at(0.5)], [0, 1]);
    const grow = (f) => (v) => (Math.max(0, (v - f.from) / (1 - f.from)) ** 1.6) * f.reach; // slow to catch, then quick
    const r0 = useTransform(burn, grow(FLAMES[0]));
    const r1 = useTransform(burn, grow(FLAMES[1]));
    const r2 = useTransform(burn, grow(FLAMES[2]));
    const r3 = useTransform(burn, grow(FLAMES[3]));
    const r4 = useTransform(burn, grow(FLAMES[4]));
    const holes = (vs) => vs.map((v, k) => `radial-gradient(circle at ${FLAMES[k].at}, transparent ${v}px, #000 ${v + 1}px)`).join(', ');
    // the burning edge: a glowing line, then the brown char, on the paper still left
    const ring = (k, v) => `radial-gradient(circle at ${FLAMES[k].at}, transparent ${v}px, rgba(255,170,60,0.95) calc(${v}px + 1px), rgba(120,40,8,0.9) calc(${v}px + 4px), rgba(70,40,20,0.55) calc(${v}px + 12px), transparent calc(${v}px + 26px))`;
    const mask = useTransform([r0, r1, r2, r3, r4], holes);
    const char = useTransform([r0, r1, r2, r3, r4], (vs) => vs.map((v, k) => (v > 0 ? ring(k, v) : null)).filter(Boolean).join(', ') || 'none');
    const memoOp = useOpacity(p, [at(0.48), at(0.52)], [1, 0]);
    // the film breaks through in colour
    const colour = useOpacity(p, [at(0.36), at(0.5)], [0, 1]);
    const zoom = useTransform(p, [a, b], [1.12, 1]);
    const grey = useOpacity(p, [at(0.36), at(0.5)], [1, 0.4]);
    const answerOp = useOpacity(p, [at(0.45), at(0.54)], [0, 1]);
    const answerY = useTransform(p, [at(0.45), at(0.56)], [40, 0]);
    const feelOp = useOpacity(p, [at(0.52), at(0.6)], [0, 1]);

    const still = stillOf(film);
    const director = film?.directors?.[0];

    return (
        <motion.div className="absolute inset-0" style={{ opacity: op }}>
            {still && (
                <motion.div className="absolute inset-0" style={{ scale: zoom }}>
                    {/* the grey of the note, and the colour of the film, as two layers so only an opacity changes */}
                    <motion.img src={sized(still, 'w1280')} alt="" className="absolute inset-0 w-full h-full object-cover max-w-none grayscale brightness-[0.55] contrast-[0.9]" style={{ opacity: grey }} />
                    <motion.img src={sized(still, 'w1280')} alt="" className="absolute inset-0 w-full h-full object-cover max-w-none" style={{ opacity: colour }} />
                </motion.div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/25 to-[#050505]/55" />

            {/* the memo, centre frame; it burns through from the middle, the film showing in the holes */}
            <motion.div className="absolute inset-0 flex items-center justify-center" style={{ opacity: memoOp }}>
                <motion.div
                    className="relative -translate-y-[6%] rotate-[-1.5deg]"
                    style={{ WebkitMaskImage: mask, maskImage: mask, WebkitMaskComposite: 'source-in', maskComposite: 'intersect' }}
                >
                    <Memo beat={beat} film={film} typed={text} />
                    <Pencil strike={strike} />
                    <motion.div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: char }} />
                </motion.div>
            </motion.div>

            {/* the answer, once the film is through */}
            <div className="absolute inset-0 flex items-end">
                <div className="w-full max-w-7xl mx-auto px-6 md:px-14 pb-[11vh] md:pb-[13vh]">
                    <motion.div style={{ opacity: answerOp, y: answerY }}>
                        <div className="font-mono text-[11px] md:text-xs tracking-[0.3em] uppercase text-[#ff8a80]">{director ? `${director}'s answer` : "The director's answer"}</div>
                        <p className="mt-3 max-w-4xl font-serif text-[2.6rem] md:text-7xl leading-[1.02] text-white [text-shadow:0_2px_40px_rgba(0,0,0,0.6)]">{beat.answer}</p>
                    </motion.div>
                    <motion.div style={{ opacity: feelOp }} className="mt-5 md:mt-6 flex flex-col md:flex-row md:items-end gap-4 md:gap-10">
                        <p className="max-w-xl text-base md:text-xl leading-relaxed text-gray-100">{beat.feel}</p>
                        {film && (
                            <Link to={`/movie/${film._id}`} className="group shrink-0 inline-flex items-center gap-2 self-start md:self-auto px-4 py-2.5 bg-white/10 ring-1 ring-white/25 hover:bg-white hover:text-[#141110] font-mono text-[11px] tracking-[0.2em] uppercase text-white transition-colors">
                                Watch {film.title} <MdArrowOutward />
                            </Link>
                        )}
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

// the red pencil through the note: two strokes, as an editor's hand makes them
const Pencil = ({ strike }) => (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" aria-hidden="true">
        <motion.path d="M6,58 C28,50 46,66 64,56 S88,48 96,54" fill="none" stroke="#c62828" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ pathLength: strike }} />
        <motion.path d="M8,72 C34,64 60,76 94,66" fill="none" stroke="#c62828" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ pathLength: strike }} />
    </svg>
);

const BeatMark = ({ p, i, n }) => {
    const len = (1 - INTRO - OUTRO) / n;
    const a = INTRO + i * len;
    const op = useOpacity(p, [a - 0.01, a + 0.01, a + len - 0.01, a + len + 0.01], [0.25, 1, 1, 0.25]);
    return <motion.span className="block w-px h-8 bg-white" style={{ opacity: op }} />;
};

const ArthouseBreath = ({ films = [], reducedMotion = false }) => {
    const section = useRef(null);
    const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
    const p = useSpring(scrollYProgress, { stiffness: 260, damping: 40, mass: 0.5, restDelta: 0.0001 });
    const n = BEATS.length;
    const found = BEATS.map((beat) => find(films, beat.title));

    // the set-up, before the first note
    const introOp = useOpacity(p, [0, INTRO * 0.6, INTRO], [1, 1, 0]);
    const introY = useTransform(p, [0, INTRO], [0, -40]);
    // the definition, once the last film has had its answer
    const end = 1 - OUTRO;
    const endOp = useOpacity(p, [end + 0.02, end + 0.08], [0, 1]);
    const endY = useTransform(p, [end + 0.02, end + 0.1], [30, 0]);
    const dim = useOpacity(p, [end, end + 0.06], [0, 0.94]);

    const definition = (
        <>
            <div className="font-mono text-[11px] tracking-[0.35em] uppercase text-[#c5a059]">That's arthouse cinema</div>
            <p className="mt-4 font-serif text-4xl md:text-7xl leading-[1.02] text-white">Films whose makers<br className="hidden md:block" /> didn't take the note.</p>
        </>
    );

    if (reducedMotion) {
        return (
            <section className="max-w-7xl mx-auto px-6 md:px-14 py-24">
                <div className="font-mono text-[11px] tracking-[0.35em] uppercase text-[#c5a059]">What is arthouse cinema?</div>
                <p className="mt-4 font-serif text-3xl md:text-5xl text-white">Every film gets notes from the people paying for it.</p>
                <div className="mt-12 grid md:grid-cols-2 gap-10">
                    {BEATS.map((beat, i) => (
                        <div key={beat.title}>
                            <div className="font-mono text-sm text-gray-400 line-through decoration-[#c62828] decoration-2">Studio note: {beat.note}</div>
                            <p className="mt-3 font-serif text-3xl text-white">{beat.answer}</p>
                            <p className="mt-2 text-gray-300">{beat.feel}</p>
                            {found[i] && <Link to={`/movie/${found[i]._id}`} className="mt-2 inline-block font-mono text-[11px] tracking-[0.2em] uppercase text-gray-300 hover:text-white">Watch {found[i].title} →</Link>}
                        </div>
                    ))}
                </div>
                <div className="mt-16">{definition}</div>
            </section>
        );
    }

    return (
        // its height is pure CSS, so the page is full height on its first paint (Back lands exactly)
        <section ref={section} className="relative" style={{ height: `calc(100vh + ${SCROLL_VH}vh)` }}>
            <div className="sticky top-0 h-screen overflow-hidden">
                {BEATS.map((beat, i) => <Beat key={beat.title} p={p} i={i} n={n} beat={beat} film={found[i]} />)}

                {/* the set-up */}
                <motion.div className="absolute inset-0 flex items-center pointer-events-none" style={{ opacity: introOp, y: introY }}>
                    <div className="w-full max-w-7xl mx-auto px-6 md:px-14">
                        <div className="font-mono text-[11px] tracking-[0.35em] uppercase text-[#c5a059]">What is arthouse cinema?</div>
                        <p className="mt-5 max-w-4xl font-serif text-[2.6rem] md:text-7xl leading-[1.02] text-white">Every film gets notes from the people paying for it.</p>
                        <p className="mt-6 text-lg md:text-2xl text-gray-300">Here's what four directors did with theirs.</p>
                        <div className="mt-10 font-mono text-[10px] tracking-[0.3em] uppercase text-gray-500">Scroll ↓</div>
                    </div>
                </motion.div>

                {/* where you are in the four */}
                <div className="absolute right-6 md:right-14 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10" aria-hidden="true">
                    {BEATS.map((beat, i) => <BeatMark key={beat.title} p={p} i={i} n={n} />)}
                </div>

                {/* the definition, the four films in a row to start with */}
                <motion.div className="absolute inset-0 bg-[#050505] pointer-events-none" style={{ opacity: dim }} />
                <motion.div className="absolute inset-0 flex items-center z-10" style={{ opacity: endOp, y: endY }}>
                    <div className="w-full max-w-7xl mx-auto px-6 md:px-14">
                        {definition}
                        <div className="mt-10 grid grid-cols-4 gap-3 md:gap-5 max-w-3xl">
                            {BEATS.map((beat, i) => {
                                const f = found[i];
                                const poster = f?.posterUrl || stillOf(f);
                                return (
                                    <Link key={beat.title} to={f ? `/movie/${f._id}` : '/explore'} className="group block">
                                        <div className="aspect-[2/3] overflow-hidden bg-[#141414] ring-1 ring-white/10 group-hover:ring-white/50 transition-colors">
                                            {poster && <img src={sized(poster, 'w342')} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                                        </div>
                                        <div className="mt-2 font-serif text-xs md:text-base leading-tight text-gray-200 group-hover:text-white line-clamp-2">{f?.title || beat.title}</div>
                                    </Link>
                                );
                            })}
                        </div>
                        <Link to="/explore" className="mt-8 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] uppercase text-gray-300 hover:text-white transition-colors">
                            Find more like these <MdArrowOutward />
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default ArthouseBreath;
