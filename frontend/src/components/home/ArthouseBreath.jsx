import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { easeInOut, motion, useMotionTemplate, useScroll, useSpring, useTransform } from 'framer-motion';
import { MdArrowOutward } from 'react-icons/md';
import { sized } from '../movements/treatments';
import { createNoteBurn } from './noteBurn';

/**
 * What is arthouse cinema? Films whose makers didn't take the note.
 *
 * The section pins. It opens on a film playing on a screen masked to widescreen,
 * as its director framed it. Then — if a studio had its way — three notes, each
 * acted out by the frame itself: "too wide" (the masks close in to a television's
 * 4:3 and the camera pans across, hunting for something to look at), "too empty"
 * (it punches in, and the landscape is gone), "too slow" (jump cuts). Then it
 * stops: the masks pull away and the whole still frame is back. Every film gets
 * notes. The masking slides open, and four famous films get theirs, one after
 * another,
 * as you scroll: the studio's memo to the director types itself out, centre
 * frame, over the film drained to grey, weaving slightly like film in a gate.
 * A splicer's blade cuts it in two. The gate stops, and the note burns through
 * as film does when it stalls in a projector (noteBurn.js); the film breaks
 * through in colour on a flare of burnt light, with the director's answer and
 * what it does to you.
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
const INTRO = 0.17;
const OUTRO = 0.16;
const SCROLL_VH = 478;
// the set-up: the film as its director framed it, then three notes the frame acts out, then the
// whole frame again. Moments are shares of the set-up's stretch of scroll.
// L'Avventura's split frame: statues in a dark room on the left, a woman alone on a terrace, and the
// empty land behind her, on the right. `focus` is where she stands, as a share of the frame's width.
const OPENER = { title: "L'Avventura", still: 'xrlfjMkyvsRQsnPcCAou9l9AO53', focus: 0.7 };
const NOTES = [
    { text: 'Too wide.', from: 0.1, to: 0.35 },
    { text: 'Too empty.', from: 0.36, to: 0.49 },
    { text: 'Too slow.', from: 0.5, to: 0.67 }
];
const BOXED = [0.13, 0.19]; // the masks close in to 4:3…
const PAN = [0.19, 0.33]; // …and the camera pans from the statues across to her
const PUNCH = [0.39, 0.45]; // "too empty": in on her, until the land is gone
const JUMP = [0.53, 0.66]; // "too slow": cut, cut, cut
const RESTORE = 0.68; // and it stops: the whole frame, still
const LINES = ['Every film gets notes.', "Here's what four directors did with theirs."];
const OPEN = [0.9, 1]; // the masking slides away onto the first film
const inIntro = (share) => share * INTRO;

// within a film's stretch of the scroll: typed, cut, burnt
const TYPE = [0.02, 0.2];
const CUT = [0.215, 0.31];
const BURN = [0.32, 0.5];

// scroll-linked opacity through a template, or framer hands it to a native timeline Chrome mistimes
const useOpacity = (p, input, output) => {
    const v = useTransform(p, input, output);
    return useMotionTemplate`${v}`;
};

const find = (films, title) => films.find((f) => f.title?.toLowerCase() === title.toLowerCase());
const stillOf = (film) => film && (film.stills?.[1] || film.stills?.[0] || film.backdropUrl);

const clamp01 = (x) => Math.max(0, Math.min(1, x));

// the studio's memo, on a canvas: drawn on scroll, and on its own only while it burns (the fire
// flickers, 30 times a second) or, slowly, while its caret blinks
const BurningNote = ({ p, a, len, beat, film, seed }) => {
    const gate = useRef(null);
    const canvas = useRef(null);
    useEffect(() => {
        const note = createNoteBurn(canvas.current, { note: beat.note, title: film?.title || beat.title, director: film?.directors?.[0], seed });
        const span = ([from, to]) => [a + len * from, a + len * to];
        const typeAt = span(TYPE), cutAt = span(CUT), burnAt = span(BURN);
        const progress = (v, [from, to]) => clamp01((v - from) / (to - from));
        let raf = 0, timer = 0, gone = false, lastV = -1, lastDraw = 0;

        const frame = (now) => {
            raf = 0;
            const v = p.get();
            if (v < a - 0.03 || v > a + len + 0.005) { // off screen
                gate.current.style.animationPlayState = 'paused';
                return;
            }
            const s = { typed: progress(v, typeAt), cut: progress(v, cutAt), burn: progress(v, burnAt), time: now / 1000 };
            const burning = s.burn > 0 && s.burn < 1;
            // held still mid-burn, the flicker only needs 30 frames a second
            if (v === lastV && burning && now - lastDraw < 30) { raf = requestAnimationFrame(frame); return; }
            lastV = v;
            lastDraw = now;
            note.draw(s);
            // film weaves in the gate until it stops, and burns
            gate.current.style.animationPlayState = s.cut > 0 ? 'paused' : 'running';
            if (burning) raf = requestAnimationFrame(frame);
            else if (s.cut === 0) timer = setTimeout(schedule, 260);
        };
        const schedule = () => {
            if (raf || gone) return;
            clearTimeout(timer);
            raf = requestAnimationFrame(frame);
        };
        const fit = () => { note.resize(Math.min(576, window.innerWidth * 0.88)); schedule(); };

        fit();
        Promise.all([document.fonts.load('400 27px "Courier Prime"'), document.fonts.load('700 11px "Courier Prime"')])
            .then(() => { if (!gone) fit(); })
            .catch(() => {});
        const unsubscribe = p.on('change', schedule);
        window.addEventListener('resize', fit);
        return () => {
            gone = true;
            cancelAnimationFrame(raf);
            clearTimeout(timer);
            unsubscribe();
            window.removeEventListener('resize', fit);
        };
    }, [p, a, len, beat, film, seed]);

    return (
        <div ref={gate} className="relative -translate-y-[6%] rotate-[-1.5deg]" style={{ animation: 'gate-weave 0.42s steps(1, end) infinite paused' }}>
            <canvas ref={canvas} className="block" aria-hidden="true" />
            <p className="sr-only">Studio note: {beat.note}</p>
        </div>
    );
};

const Beat = ({ p, i, n, beat, film }) => {
    const len = (1 - INTRO - OUTRO) / n;
    const a = INTRO + i * len;
    const b = a + len;
    const at = (t) => a + len * t; // a moment within this film's stretch of the scroll
    const last = i === n - 1;

    // the beat as a whole: in, held, out (the last stays, under the definition). The first comes up
    // out of the set-up's dip to black, so later and quicker.
    const inAt = i === 0 ? a - 0.012 : a - 0.025;
    const op = useOpacity(p, last ? [inAt, a] : [inAt, a, b - 0.025, b], last ? [0, 1] : [0, 1, 1, 0]);
    // the note's last scraps go as the film takes the frame
    const memoOp = useOpacity(p, [at(0.465), at(0.505)], [1, 0]);
    // the film breaks through in colour, on a flare of burnt light, as a film burn does in an edit
    const colour = useOpacity(p, [at(0.36), at(0.5)], [0, 1]);
    const flare = useOpacity(p, [at(0.36), at(0.43), at(0.53)], [0, 0.8, 0]);
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
            {/* plain transparency, not a blend mode: blending a full-screen layer costs a laptop every frame */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ opacity: flare, background: 'radial-gradient(55% 75% at 90% 28%, rgba(255,140,50,0.62), rgba(255,70,16,0.26) 45%, transparent 72%), radial-gradient(40% 55% at 6% 88%, rgba(255,178,80,0.4), transparent 70%)' }}
            />

            {/* the memo, centre frame: cut in two, then burnt through, the film showing in the gap and the holes */}
            <motion.div className="absolute inset-0 flex items-center justify-center" style={{ opacity: memoOp }}>
                <BurningNote p={p} a={a} len={len} beat={beat} film={film} seed={i + 1} />
            </motion.div>

            {/* the answer, once the film is through */}
            <div className="absolute inset-0 flex items-end">
                <div className="w-full max-w-7xl mx-auto px-6 md:px-14 pb-[11vh] md:pb-[13vh]">
                    <motion.div style={{ opacity: answerOp, y: answerY }}>
                        <div className="font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-[#ff8a80]">{director ? `${director}'s answer` : "The director's answer"}</div>
                        <p className="mt-3 max-w-4xl font-serif text-[2.6rem] md:text-7xl leading-[1.02] text-white [text-shadow:0_2px_40px_rgba(0,0,0,0.6)]">{beat.answer}</p>
                    </motion.div>
                    <motion.div style={{ opacity: feelOp }} className="mt-5 md:mt-6 flex flex-col md:flex-row md:items-end gap-4 md:gap-10">
                        <p className="max-w-xl text-base md:text-xl leading-relaxed text-gray-100">{beat.feel}</p>
                        {film && (
                            <Link to={`/movie/${film._id}`} className="group shrink-0 inline-flex items-center gap-2 self-start md:self-auto px-4 py-2.5 bg-white/10 ring-1 ring-white/25 hover:bg-white hover:text-[#141110] font-label text-[12px] tracking-[0.14em] uppercase text-white transition-colors">
                                Watch {film.title} <MdArrowOutward />
                            </Link>
                        )}
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

// a studio note, typed out under the frame as you scroll, there only while it's being acted out
const TypedNote = ({ p, text, from, to }) => {
    const op = useOpacity(p, [inIntro(from), inIntro(from) + 0.0008, inIntro(to) - 0.0008, inIntro(to)], [0, 1, 1, 0]);
    const typed = useTransform(p, [inIntro(from), inIntro(from + 0.03)], [0, text.length], { clamp: true });
    const shown = useTransform(typed, (v) => text.slice(0, Math.round(v)));
    return (
        <motion.div className="absolute inset-x-0 top-0 font-courier normal-case tracking-normal text-[#f1ead9] text-[clamp(1.15rem,1.9vw,1.7rem)] leading-none" style={{ opacity: op }}>
            <motion.span>{shown}</motion.span>
            <span className="inline-block w-[0.55ch] h-[0.95em] align-[-0.1em] ml-[0.05em] bg-[#f1ead9]/80" />
        </motion.div>
    );
};

// the screen masked to widescreen (flat on a phone), velvet black above and below, the film on it as
// its director framed it. If a studio had its way, three notes, each acted out by the frame: the masks
// close in to a television's 4:3 and the camera pans across; it punches in until the land is gone; it
// jump-cuts. Then it stops, and the whole frame is back. Then the masks slide away and the first of the
// four films has the whole screen.
const MaskedScreen = ({ p, opener }) => {
    const topY = useTransform(p, OPEN.map(inIntro), ['0%', '-100%'], { ease: easeInOut });
    const bottomY = useTransform(p, OPEN.map(inIntro), ['0%', '100%'], { ease: easeInOut });
    // the film dips to black before the masks open, so the first of the four comes up clean
    const screenOp = useOpacity(p, [inIntro(0.88), inIntro(0.92)], [1, 0]);
    const kickerOp = useOpacity(p, [inIntro(0.86), inIntro(0.9)], [1, 0]);

    const first = inIntro(NOTES[0].from);
    const restore = inIntro(RESTORE);
    const hard = (from, to) => [from, from + 0.0008, to - 0.0005, to]; // in and out like cuts

    // "too wide": a television's 4:3, closing in from the sides; gone at once when it stops
    const boxed = useTransform(p, [inIntro(BOXED[0]), inIntro(BOXED[1]), restore - 0.0005, restore], [0, 1, 1, 0], { ease: easeInOut });
    const leftX = useTransform(boxed, (k) => `${-100 + 100 * k}%`);
    const rightX = useTransform(boxed, (k) => `${100 - 100 * k}%`);
    // where the camera is: x in % of the screen's width, s its scale
    const focus = opener?.focus ?? 0.5;
    const onHer = (s) => -100 * (focus - 0.5) * s; // the shift that puts her in the middle at scale s
    const shot = useTransform(p, (v) => {
        const share = (a, b) => clamp01((v - inIntro(a)) / (inIntro(b) - inIntro(a)));
        if (v >= restore) return { x: 0, s: 1 + 0.02 * share(RESTORE, 1) };
        if (v >= inIntro(JUMP[0])) {
            // cut, cut, cut: five framings of her, each a different size and place
            const cuts = [{ s: 1.35, d: 0 }, { s: 1.9, d: -6 }, { s: 1.25, d: 10 }, { s: 2.1, d: -3 }, { s: 1.5, d: 6 }];
            const c = cuts[Math.min(cuts.length - 1, Math.floor(share(JUMP[0], JUMP[1]) * cuts.length))];
            return { x: onHer(c.s) + c.d, s: c.s };
        }
        // as the box closes, to the statues; then across the room to her; then in, until the land is gone
        const pan = 12 * easeInOut(share(BOXED[0], BOXED[1])) + (onHer(1) - 12) * easeInOut(share(...PAN));
        const s = 1 + 0.65 * easeInOut(share(...PUNCH)) + 0.02 * share(0, BOXED[0]);
        return { x: pan + (onHer(s) - onHer(1)) * easeInOut(share(...PUNCH)), s };
    });
    const shotX = useTransform(shot, (f) => `${f.x}%`);
    const shotScale = useTransform(shot, (f) => f.s);

    // under the screen: whose framing you're watching, and the note being acted out
    const madeOp = useOpacity(p, [...hard(first, restore), inIntro(0.88), inIntro(0.92)], [1, 0, 0, 1, 1, 0]);
    const studioOp = useOpacity(p, hard(first, restore), [0, 1, 1, 0]);
    const creditOp = useOpacity(p, [...hard(first, restore), inIntro(0.88), inIntro(0.92)], [1, 0, 0, 1, 1, 0]);
    const hintOp = useOpacity(p, [0, first], [1, 0]);

    // after it stops, the point, once
    const lineOp = useOpacity(p, [inIntro(0.7), inIntro(0.73), inIntro(0.86), inIntro(0.89)], [0, 1, 1, 0]);
    const subOp = useOpacity(p, [inIntro(0.76), inIntro(0.79), inIntro(0.86), inIntro(0.89)], [0, 1, 1, 0]);

    const film = opener?.film;
    const still = opener && sized(opener.still, 'w1280');
    const surname = film?.directors?.[0]?.split(' ').at(-1);
    const credit = film && [film.title, film.year].filter(Boolean).join('  ·  ');

    return (
        <div className="absolute inset-0 flex flex-col pointer-events-none" aria-hidden="true">
            <motion.div className="relative flex-1 bg-black" style={{ y: topY }}>
                <motion.div className="absolute inset-x-0 bottom-0 max-w-7xl mx-auto px-6 md:px-14 pb-4 md:pb-5 font-label text-[12px] tracking-[0.14em] uppercase text-gold" style={{ opacity: kickerOp }}>What is arthouse cinema?</motion.div>
            </motion.div>
            <motion.div className="relative w-full max-h-[80vh] aspect-[1.85/1] md:aspect-[2.39/1] bg-black overflow-hidden" style={{ opacity: screenOp }}>
                {still && (
                    <motion.div className="absolute inset-0 will-change-transform" style={{ x: shotX, scale: shotScale }}>
                        <img src={still} alt="" className="absolute inset-0 w-full h-full object-cover max-w-none" />
                    </motion.div>
                )}
                <div className="absolute inset-0 bg-grain" />
                <div className="projector-flicker absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_45%,rgba(255,244,225,0.06),transparent_75%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.5))]" />
                {/* a television's 4:3, cut out of the wide frame: true black, over the picture's grain and light */}
                <motion.div className="absolute inset-y-0 -left-px w-[calc(14%+1px)] md:w-[calc(22.1%+1px)] bg-black" style={{ x: leftX }} />
                <motion.div className="absolute inset-y-0 -right-px w-[calc(14%+1px)] md:w-[calc(22.1%+1px)] bg-black" style={{ x: rightX }} />

                {/* stopped: the point, once, over a little dark so it reads */}
                <motion.div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_52%,rgba(0,0,0,0.55),transparent_75%)]" style={{ opacity: lineOp }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                    <motion.p style={{ opacity: lineOp }} className="font-serif text-white leading-[1.02] text-[clamp(1.6rem,4.6vw,4.6rem)] [text-shadow:0_2px_30px_rgba(0,0,0,0.6)]">{LINES[0]}</motion.p>
                    <motion.p style={{ opacity: subOp }} className="mt-2 md:mt-4 text-gray-200 text-[clamp(0.85rem,1.5vw,1.35rem)] [text-shadow:0_1px_10px_rgba(0,0,0,0.8)]">{LINES[1]}</motion.p>
                </div>
            </motion.div>
            <motion.div className="relative flex-1 bg-black" style={{ y: bottomY }}>
                <div className="relative pt-4 md:pt-5 px-6 text-center font-label uppercase">
                    <div className="relative h-4 text-[10px] md:text-[11px] tracking-[0.3em]">
                        <motion.span className="absolute inset-x-0 text-gray-300" style={{ opacity: madeOp }}>{surname ? `As ${surname} framed it` : 'As its director framed it'}</motion.span>
                        <motion.span className="absolute inset-x-0 text-[#e0a64a]" style={{ opacity: studioOp }}>If a studio had its way</motion.span>
                    </div>
                    <div className="relative mt-2 md:mt-3 h-8">
                        {credit && <motion.div className="absolute inset-x-0 top-0 text-[10px] tracking-[0.25em] text-gray-500" style={{ opacity: creditOp }}>{credit}</motion.div>}
                        {NOTES.map((note) => <TypedNote key={note.text} p={p} {...note} />)}
                    </div>
                    <motion.div className="text-[10px] tracking-[0.3em] text-gray-600" style={{ opacity: hintOp }}>Scroll ↓</motion.div>
                </div>
            </motion.div>
        </div>
    );
};

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
    // the set-up's film: L'Avventura's split frame, or, if the atlas lacks it, the first film with a still
    const opener = (() => {
        const film = find(films, OPENER.title);
        const still = film?.stills?.find((s) => s.includes(OPENER.still)) || stillOf(film);
        if (film && still) return { film, still, focus: OPENER.focus };
        const other = films.find((f) => !BEATS.some((b) => b.title.toLowerCase() === f.title?.toLowerCase()) && stillOf(f));
        return other ? { film: other, still: stillOf(other) } : null;
    })();

    // black under the first film until it's fully up, so the stars don't show through it as it fades in
    const underOp = useOpacity(p, [INTRO, INTRO + 0.006], [1, 0]);
    // the definition, once the last film has had its answer
    const end = 1 - OUTRO;
    const endOp = useOpacity(p, [end + 0.02, end + 0.08], [0, 1]);
    const endY = useTransform(p, [end + 0.02, end + 0.1], [30, 0]);
    const dim = useOpacity(p, [end, end + 0.06], [0, 0.94]);

    const definition = (
        <>
            <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">That's arthouse cinema</div>
            <p className="mt-4 font-serif text-4xl md:text-7xl leading-[1.02] text-white">Films whose makers<br className="hidden md:block" /> didn't take the note.</p>
        </>
    );

    if (reducedMotion) {
        return (
            <section className="max-w-7xl mx-auto px-6 md:px-14 py-24">
                <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">What is arthouse cinema?</div>
                <p className="mt-4 font-serif text-3xl md:text-5xl text-white">Every film gets notes from the people paying for it.</p>
                <div className="mt-12 grid md:grid-cols-2 gap-10">
                    {BEATS.map((beat, i) => (
                        <div key={beat.title}>
                            <div className="font-courier text-sm text-gray-400 line-through decoration-[#c62828] decoration-2">Studio note: {beat.note}</div>
                            <p className="mt-3 font-serif text-3xl text-white">{beat.answer}</p>
                            <p className="mt-2 text-gray-300">{beat.feel}</p>
                            {found[i] && <Link to={`/movie/${found[i]._id}`} className="mt-2 inline-block font-label text-[12px] tracking-[0.14em] uppercase text-gray-300 hover:text-white">Watch {found[i].title} →</Link>}
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
                <motion.div className="absolute inset-0 bg-black" style={{ opacity: underOp }} />
                {BEATS.map((beat, i) => <Beat key={beat.title} p={p} i={i} n={n} beat={beat} film={found[i]} />)}

                {/* the set-up: a film the studio "fixes" in subtitles, then the masking opens onto the first film */}
                <MaskedScreen p={p} opener={opener} />
                <p className="sr-only">What is arthouse cinema? {LINES.join(' ')}</p>

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
                        <Link to="/explore" className="mt-8 inline-flex items-center gap-2 font-label text-[12px] tracking-[0.14em] uppercase text-gray-300 hover:text-white transition-colors">
                            Find more like these <MdArrowOutward />
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default ArthouseBreath;
