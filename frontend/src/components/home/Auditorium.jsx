import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useInView, useMotionValue } from 'framer-motion';
import { MdArrowOutward } from 'react-icons/md';
import api, { movementsAPI } from '../../services/api';
import { displayTitle, sized, treatmentFor } from '../movements/treatments';

/**
 * Three rooms of the atlas, played as trailers in an auditorium.
 *
 * A theatre: drapes drawn back and a valance framing the stage, the house
 * curtain flying up as you arrive. On the stage stand three screens, one per
 * room: the one playing centre stage in the projector's beam (which you see
 * over the seats, dust turning in it), the other two upstage in the wings,
 * unlit; when a trailer ends the stage turns and the next glides into the
 * beam. Behind, a cyclorama washed in the colour of what's playing, haze and
 * sweeping stage lights; in front, the boards reflecting the screen, the
 * footlights, the seats. The marquee
 * over the screen bills all three rooms, always; the one playing is lit, and
 * its trailer runs on the screen, quick: the room's name over a wall of its
 * pictures, then three shots that each say plainly what they are (a movement
 * and its years; a director's face and name; a studio and the films it puts
 * out), then the stage turns — about five seconds a room. Pick a room on the marquee to play its
 * trailer; click the screen to go in.
 */

const EASE = [0.22, 1, 0.36, 1];

const ROOMS = [
    { key: 'movements', to: '/movements', name: 'Movements', what: (n) => `${n || 26} movements`, line: 'The waves that changed what films could be.' },
    { key: 'directors', to: '/directors', name: 'Directors', what: (n) => `${n || 189} directors`, line: 'Each one a career across the century, and the filmmakers around them.' },
    { key: 'studios', to: '/studios', name: 'Studios', what: (n) => `${n || 10} studios`, line: 'The houses that make and release these films.' }
];
// the stage lights: coloured gels, each sweeping its own arc
const SPOTS = [
    { color: '#ff3d8b', left: '6%', from: -16, to: 10, secs: 9 },
    { color: '#ffb547', left: '35%', from: 12, to: -12, secs: 12 },
    { color: '#3fd0ff', left: '64%', from: -8, to: 16, secs: 10 }
];
// the back wall's colour for the rooms without one of their own
const WALL = { movements: '#d9ad62', directors: '#d08a3a', studios: '#6b4bd6' };
// a trailer is quick: the room's name for a beat, then three shots from inside it, then the stage turns
const EXAMPLES = 3;
const SHOT_MS = [1300, 1300, 1300, 1300]; // the name card, then each example
const SHOTS = SHOT_MS.length;
const ROOM_MS = SHOT_MS.reduce((a, b) => a + b, 0);
const shotAt = (t) => { let i = 0; while (i < SHOTS - 1 && t >= SHOT_MS[i]) t -= SHOT_MS[i++]; return i; };

// a row of seat backs in silhouette, the screen's light catching their tops
const Seats = ({ className, seat = 64, light = 0.1 }) => (
    <svg className={className} aria-hidden="true">
        <defs>
            {/* in pixels: a thin rim of light, then the dark of the seat */}
            <linearGradient id={`seat-${seat}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="60">
                <stop offset="0" stopColor={`rgba(255,226,180,${light})`} />
                <stop offset="0.12" stopColor="#110e0c" />
                <stop offset="1" stopColor="#060505" />
            </linearGradient>
            {/* taller than the row, so the seats never tile downwards */}
            <pattern id={`row-${seat}`} width={seat} height="2000" patternUnits="userSpaceOnUse">
                <rect x="2.5" y="0" width={seat - 5} height="2000" rx={seat * 0.3} fill={`url(#seat-${seat})`} />
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#row-${seat})`} />
    </svg>
);

// every picture a room has: its movements' stills, its directors' faces, its studios' posters
const picturesOf = (room, data) => {
    if (room.key === 'movements') return data.movements.map((m) => m.heroBackdrop);
    if (room.key === 'directors') return data.directors.map((d) => d.profileUrl);
    return data.studios.flatMap((s) => s.posters || []);
};

// the example a shot shows — a different set each time round
const exampleOf = (room, i, round, data) => {
    const list = data[room.key];
    return list[((round * EXAMPLES) + i - 1) % (list.length || 1)];
};

// the shot's main picture: what its light spills into the auditorium from
const lightOf = (room, i, round, data) => {
    const all = picturesOf(room, data);
    if (i === 0) return all[round % (all.length || 1)];
    const x = exampleOf(room, i, round, data);
    if (!x) return null;
    if (room.key === 'movements') return x.heroBackdrop;
    if (room.key === 'directors') return x.backdropUrl;
    return (x.featuredFilms || []).map((f) => f.movieId?.posterUrl).find(Boolean);
};

// the screen's light on the room: the picture drawn tiny (32 × 18) with its fall-off baked in, then
// stretched over the auditorium — the browser's smoothing does the blur, so nothing repaints per frame
const Spill = ({ src, strength = 0.32, className = 'absolute inset-0 w-full h-full' }) => {
    const canvas = useRef(null);
    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            const c = canvas.current;
            if (!c) return;
            const g = c.getContext('2d');
            g.filter = 'saturate(1.5)';
            g.drawImage(img, 0, 0, c.width, c.height);
            g.filter = 'none';
            // brightest round the screen, gone by the room's edges
            g.globalCompositeOperation = 'destination-in';
            const fall = g.createRadialGradient(16, 7.5, 2, 16, 7.5, 17);
            fall.addColorStop(0, '#000');
            fall.addColorStop(1, 'transparent');
            g.fillStyle = fall;
            g.fillRect(0, 0, c.width, c.height);
        };
        img.src = sized(src, 'w92');
    }, [src]);
    return (
        <motion.canvas
            ref={canvas}
            width={32}
            height={18}
            className={className}
            initial={{ opacity: 0 }}
            animate={{ opacity: strength }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
        />
    );
};

// the count, made literal: a wall of the room's pictures, drifting, behind the number
const Wall = ({ pictures, wide }) => (
    <motion.div
        className="absolute inset-y-0 left-0 grid grid-rows-4 grid-flow-col auto-cols-max gap-[3px] opacity-30 grayscale"
        initial={{ x: 0 }}
        animate={{ x: '-6%' }}
        transition={{ duration: SHOT_MS[0] / 1000 + 1, ease: 'linear' }}
    >
        {pictures.slice(0, wide ? 32 : 60).map((src, k) => (
            <img key={k} src={sized(src, 'w185')} alt="" className={`h-full max-w-none object-cover ${wide ? 'aspect-video' : 'aspect-[2/3]'}`} />
        ))}
    </motion.div>
);

// a card with white type, as trailers have between their shots; something of the room behind it
const Card = ({ small, big, back, children }) => (
    <div className="absolute inset-0 bg-[#080706] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {back}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,7,6,0.85)_25%,rgba(8,7,6,0.35)_80%)]" />
        {small && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="relative font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold">{small}</motion.div>}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: EASE }} className="relative mt-2 md:mt-3 font-serif text-3xl md:text-6xl text-white">
            {big}
        </motion.div>
        {children}
    </div>
);

// a label in the corner of a shot, saying what it is
const Label = ({ title, sub, color = '#f4dcae' }) => (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1, ease: EASE }} className="absolute left-[4%] bottom-[8%] max-w-[34%] md:max-w-[36%]">
        <div className="font-serif text-xl md:text-4xl leading-tight text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.9)]">{title}</div>
        {sub && <div className="mt-1 md:mt-2 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase [text-shadow:0_1px_8px_#000]" style={{ color }}>{sub}</div>}
    </motion.div>
);

// shot `i` of a room's trailer: its name card (on a wall of its pictures), then examples from inside it
const Shot = ({ room, i, round, data, count }) => {
    if (i === 0) {
        return (
            <Card small={room.what(count)} big={room.name} back={<Wall pictures={picturesOf(room, data)} wide={room.key === 'movements'} />}>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.3 }} className="relative mt-2 md:mt-3 max-w-xl font-serif italic text-sm md:text-xl text-white/80">{room.line}</motion.p>
            </Card>
        );
    }
    if (room.key === 'movements') {
        const m = exampleOf(room, i, round, data);
        if (!m) return null;
        const t = treatmentFor(m);
        return (
            <>
                <motion.img src={sized(m.heroBackdrop, 'w1280')} alt="" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: SHOT_MS[0] / 1000 + 1, ease: 'linear' }} className="absolute inset-0 w-full h-full object-cover max-w-none" style={{ objectPosition: m.heroFocus || '50% 35%', filter: t.screenFilter }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <Label title={displayTitle(m)} sub={`${m.era}${m.region ? ` · ${m.region}` : ''}`} />
            </>
        );
    }
    if (room.key === 'directors') {
        const d = exampleOf(room, i, round, data);
        if (!d) return null;
        return (
            <>
                <img src={sized(d.backdropUrl, 'w1280')} alt="" className="absolute inset-0 w-full h-full object-cover max-w-none grayscale brightness-[0.4]" />
                {/* their face, on the right of the frame */}
                <motion.img src={sized(d.profileUrl, 'h632')} alt="" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE }} className="absolute right-[6%] top-[8%] h-[70%] aspect-[2/3] object-cover max-w-none grayscale contrast-[1.1] shadow-[0_20px_60px_rgba(0,0,0,0.8)]" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
                <Label title={d.name} sub={[d.eras?.[0], d.placeOfBirth?.split(',').pop()?.trim()].filter(Boolean).join(' · ') || 'Director'} />
            </>
        );
    }
    const s = exampleOf(room, i, round, data);
    if (!s) return null;
    const films = (s.featuredFilms || []).map((f) => f.movieId).filter((f) => f?.posterUrl).slice(0, 3);
    return (
        <>
            <div className="absolute inset-0 bg-[#0b0a09]" />
            {/* the films it puts out, side by side, leaving the left for its name (two on a phone) */}
            <div className="absolute right-[4%] top-[14%] h-[72%] flex gap-3 justify-end">
                {films.map((f, k) => (
                    <motion.img key={f._id} src={sized(f.posterUrl, 'w342')} alt="" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 + k * 0.08, ease: EASE }} className={`h-full aspect-[2/3] object-cover max-w-none shadow-[0_14px_40px_rgba(0,0,0,0.7)] ${k === 2 ? 'hidden md:block' : ''}`} />
                ))}
            </div>
            <Label title={s.name} sub={s.tagline || 'A studio in the atlas'} />
        </>
    );
};

// the velvet, as an SVG fill: vertical folds, darker where the cloth turns away
const Velvet = ({ id }) => (
    <defs>
        <linearGradient id={`${id}-fold`} x1="0" x2="1">
            <stop offset="0" stopColor="#1c0709" />
            <stop offset="0.45" stopColor="#5a1a1e" />
            <stop offset="0.6" stopColor="#6e2328" />
            <stop offset="1" stopColor="#1c0709" />
        </linearGradient>
        <pattern id={`${id}-folds`} width="7" height="100" patternUnits="userSpaceOnUse">
            <rect width="7" height="100" fill={`url(#${id}-fold)`} />
        </pattern>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.55" />
            <stop offset="0.3" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.5" />
        </linearGradient>
    </defs>
);

// a side drape, drawn back and tied with a gold rope (mirrored for the right)
const Drape = ({ side, className }) => {
    const id = `drape-${side}`;
    const edge = 'M0,0 L100,0 C100,26 30,48 38,62 C46,76 92,90 96,100 L0,100 Z';
    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} style={side > 0 ? { transform: 'scaleX(-1)' } : undefined} aria-hidden="true">
            <Velvet id={id} />
            <path d={edge} fill={`url(#${id}-folds)`} />
            <path d={edge} fill={`url(#${id}-shade)`} />
            {/* the tie-back */}
            <path d="M0,60 C14,58 30,60 40,62" stroke="#d9b877" strokeWidth="2.2" fill="none" vectorEffect="non-scaling-stroke" />
            <ellipse cx="40" cy="63" rx="3" ry="2.2" fill="#d9ad62" />
        </svg>
    );
};

// the valance across the top: velvet swags with a gold fringe
const Valance = ({ className, swags = 9 }) => {
    const w = 100 / swags;
    const scallops = Array.from({ length: swags }, (_, k) => `Q${(k + 0.5) * w},100 ${(k + 1) * w},62`).join(' ');
    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} aria-hidden="true">
            <Velvet id="valance" />
            <path d={`M0,0 H100 V62 H100 M0,62 ${scallops} V0 H0 Z`} fill="url(#valance-folds)" />
            <path d={`M0,62 ${scallops}`} stroke="#d9b877" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
            <path d="M0,10 H100" stroke="#d9ad62" strokeOpacity="0.6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
    );
};

const Auditorium = ({ reducedMotion = false }) => {
    const stage = useRef(null);
    const inView = useInView(stage, { amount: 0.3 });
    const opened = useInView(stage, { amount: 0.3, once: true });
    const [data, setData] = useState({ movements: [], directors: [], studios: [], directorCount: 0 });
    const [at, setAt] = useState({ room: 0, shot: 0, round: 0 });
    const elapsed = useRef(0);
    const fill = useMotionValue(0); // how far the playing trailer has run, for the marquee
    // the curtains part to just beside the screen: further on a phone, where the screen is wider
    const [wide] = useState(() => window.matchMedia('(min-width: 768px)').matches);

    useEffect(() => {
        movementsAPI.getAll().then((r) => setData((d) => ({ ...d, movements: r.data.filter((m) => m.heroBackdrop) }))).catch(() => {});
        // on screen, the directors with a face and a picture to show; counted, all of them
        api.get('/directors').then((r) => {
            const all = r.data.data || [];
            setData((d) => ({ ...d, directors: all.filter((x) => x.backdropUrl && x.profileUrl), directorCount: all.length }));
        }).catch(() => {});
        api.get('/studios/index').then((r) => setData((d) => ({ ...d, studios: (Array.isArray(r.data) ? r.data : []).filter((s) => s.posters?.length) }))).catch(() => {});
    }, []);

    // the reel: runs whenever the auditorium is on screen, trailer after trailer (a resting pointer doesn't stop it)
    useEffect(() => {
        if (reducedMotion || !inView) return undefined;
        let raf = 0;
        let last = performance.now();
        const tick = (now) => {
            raf = requestAnimationFrame(tick);
            // a frame's timestamp can come from just before the effect ran: never run the reel backwards,
            // or the first frame lands on room -1
            const dt = Math.max(0, now - last);
            last = now;
            elapsed.current += dt;
            const total = elapsed.current;
            const inRoom = total % ROOM_MS;
            fill.set(inRoom / ROOM_MS);
            const next = { room: Math.floor(total / ROOM_MS) % ROOMS.length, shot: shotAt(inRoom), round: Math.floor(total / (ROOM_MS * ROOMS.length)) };
            setAt((a) => (a.room === next.room && a.shot === next.shot && a.round === next.round ? a : next));
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [inView, reducedMotion, fill]);

    const play = (k) => {
        const round = Math.floor(elapsed.current / (ROOM_MS * ROOMS.length));
        elapsed.current = (round * ROOMS.length + k) * ROOM_MS;
        fill.set(0);
        setAt({ room: k, shot: 0, round });
    };

    const room = ROOMS[at.room];
    const counts = { movements: data.movements.length, directors: data.directorCount, studios: data.studios.length };
    const shot = reducedMotion ? 0 : at.shot;
    const light = lightOf(room, shot, at.round, data);
    // the back wall takes the colour of what's playing: a movement's own, the directors' amber, the studios' violet
    const example = room.key === 'movements' && shot > 0 ? exampleOf(room, shot, at.round, data) : null;
    const wall = example ? treatmentFor(example).accent : WALL[room.key];

    // where things stand on the stage (percent of the stage box). The screen stands on the floor;
    // its height follows from its width and the shapes of the stage and the screen.
    const L = wide
        ? { drape: 12, valance: 10, sl: 25, sw: 50, st: 29, ratio: (16 / 8.4) / 2.39 }
        : { drape: 7, valance: 7, sl: 6, sw: 88, st: 25, ratio: (4 / 3.9) / (16 / 9) };
    const sh = L.sw * L.ratio;            // the screen's height
    const floor = L.st + sh;              // where the stage floor begins
    const edge = floor + (wide ? 13 : 10); // the front of the stage, where the footlights are
    // the projector's beam, from the booth behind you over the seats onto the screen
    const beam = `polygon(49.4% 106%, 50.6% 106%, ${L.sl + L.sw}% ${floor}%, ${L.sl + L.sw}% ${L.st}%, ${L.sl}% ${L.st}%, ${L.sl}% ${floor}%)`;

    return (
        <div
            ref={stage}
            // as large as fits under the heading in one screen
            style={{ width: 'min(100%, calc((100svh - 15rem) * 1.9))' }}
            className="relative mx-auto aspect-[4/3.9] md:aspect-[16/8.4] overflow-hidden bg-[#07060a] [perspective:1400px]"
        >
            {/* the backdrop: a cyclorama washed from below in the colour of what's playing, haze drifting across it */}
            <div className="absolute inset-0 transition-[background-color] duration-[1500ms]" style={{ backgroundColor: `${wall}66` }} />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,transparent_18%,rgba(7,6,12,0.7)_55%,#07060c_88%)]" />
            <span className="auditorium-haze absolute left-[-20%] top-[30%] w-[80%] h-[40%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.07),transparent_70%)]" />
            <span className="auditorium-haze absolute right-[-20%] top-[45%] w-[70%] h-[35%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_70%)] [animation-delay:-9s]" />
            {SPOTS.map((p) => (
                // the swing on the outer box, the soft-edged beam drawn once inside it: turning it never redraws it
                <div
                    key={p.color}
                    className="auditorium-spot absolute top-[-6%] h-[90%] w-[30%] origin-top will-change-transform pointer-events-none"
                    style={{ left: p.left, '--from': `${p.from}deg`, '--to': `${p.to}deg`, animationDuration: `${p.secs}s`, rotate: `${p.from}deg` }}
                >
                    <div className="absolute inset-0 blur-[6px]" style={{ background: `linear-gradient(to bottom, ${p.color}66, ${p.color}22 60%, transparent 95%)`, clipPath: 'polygon(46% 0, 54% 0, 100% 100%, 0 100%)' }} />
                </div>
            ))}
            {/* what's playing, lighting the backdrop in its colours */}
            <div className="absolute inset-0 pointer-events-none">
                <AnimatePresence initial={false}>
                    {light && <Spill key={light} src={light} strength={0.3} />}
                </AnimatePresence>
            </div>

            {/* the stage floor, boards running away from you, the screen reflected in it */}
            <div className="absolute inset-x-0 overflow-hidden" style={{ top: `${floor}%`, height: `${edge - floor}%` }}>
                <div className="absolute inset-0 bg-gradient-to-b from-[#1c120e] to-[#2d1d15]" />
                <div className="absolute inset-x-[-30%] inset-y-0 origin-bottom [transform:perspective(300px)_rotateX(58deg)] bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.45)_0_1px,transparent_1px_3.2%)]" />
                <div className="absolute inset-y-0 [transform:scaleY(-1)] opacity-80" style={{ left: `${L.sl}%`, width: `${L.sw}%` }}>
                    <AnimatePresence initial={false}>
                        {light && <Spill key={light} src={light} strength={0.55} />}
                    </AnimatePresence>
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
            </div>

            {/* the revolving stage: all three rooms on it, the one playing centre stage in the beam, the others upstage in the wings */}
            {ROOMS.map((r, k) => {
                const pos = (k - at.room + ROOMS.length) % ROOMS.length; // 0 centre, 1 the wing it comes from next, 2 the wing it's gone to
                const front = pos === 0;
                const side = pos === 1 ? 1 : -1;
                const away = wide ? '74%' : '76%';
                return (
                    <motion.div
                        key={r.key}
                        className="absolute"
                        style={{ left: `${L.sl}%`, width: `${L.sw}%`, top: `${L.st}%`, height: `${sh}%`, zIndex: front ? 5 : pos === 2 ? 3 : 2, transformOrigin: '50% 100%' }}
                        initial={false}
                        animate={front
                            ? { x: '0%', y: '0%', scale: 1, rotateY: 0 }
                            // the one crossing to the far wing passes small, behind the others
                            : { x: side > 0 ? away : `-${away}`, y: '-6%', scale: pos === 1 ? [null, 0.3, 0.44] : 0.44, rotateY: side * -30 }}
                        transition={{ duration: reducedMotion ? 0 : 1.1, ease: [0.65, 0, 0.35, 1] }}
                    >
                        {front ? (
                            <Link to={r.to} aria-label={`Enter ${r.name}`} className="group absolute inset-0 overflow-hidden bg-[#141312] shadow-[0_0_70px_rgba(255,236,200,0.28),0_0_0_1px_rgba(255,240,215,0.25)]">
                                <AnimatePresence initial={false}>
                                    <motion.div key={`${at.room}-${at.round}-${shot}`} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: 'easeInOut' }}>
                                        <Shot room={r} i={shot} round={at.round} data={data} count={counts[r.key]} />
                                    </motion.div>
                                </AnimatePresence>
                                {/* projected light: the lamp's faint flicker, brighter at the centre */}
                                <div className="projector-flicker absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,248,230,0.10),transparent_65%)]" />
                                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_60px_rgba(0,0,0,0.55)]" />
                                <span className="absolute right-[2.5%] bottom-[6%] inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f4ecd8] font-label text-[12px] tracking-[0.14em] uppercase text-[#141110] shadow-[0_6px_20px_rgba(0,0,0,0.5)] group-hover:bg-white transition-colors">
                                    Enter {r.name} <MdArrowOutward />
                                </span>
                            </Link>
                        ) : (
                            // upstage in the wings, out of the beam: its picture, unlit, and its name; click to bring it on
                            <button type="button" onClick={() => play(k)} aria-label={`Play the ${r.name} trailer`} className="group absolute inset-0 overflow-hidden bg-[#141312] shadow-[0_30px_60px_rgba(0,0,0,0.7)]">
                                {lightOf(r, 0, at.round, data) && <img src={sized(lightOf(r, 0, at.round, data), 'w780')} alt="" className="absolute inset-0 w-full h-full object-cover max-w-none" />}
                                <span className="absolute inset-0 bg-black/65 group-hover:bg-black/40 transition-colors" />
                                {/* its name on the side facing the house, clear of the drape */}
                                <span className={`absolute inset-0 flex items-center px-[7%] font-serif text-4xl md:text-6xl text-white/90 [text-shadow:0_2px_20px_rgba(0,0,0,0.8)] ${side > 0 ? 'justify-start' : 'justify-end'}`}>{r.name}</span>
                            </button>
                        )}
                    </motion.div>
                );
            })}
            {/* a change of reel between trailers: a flicker of the stage lights */}
            {!reducedMotion && <motion.div key={`flash-${at.room}-${at.round}`} className="absolute inset-0 z-[6] bg-[#fff6e4] pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.1, 0, 0.04, 0] }} transition={{ duration: 0.55 }} />}

            {/* the marquee, flown in over the stage: all three rooms billed, the one playing lit */}
            <div className="absolute z-[6] left-1/2 -translate-x-1/2 w-[86%] md:w-auto bg-[#0f0d0b] ring-1 ring-gold/50 shadow-[0_10px_30px_rgba(0,0,0,0.8)] px-3 md:px-6 pt-2 pb-2.5" style={{ top: `${L.valance + 2}%` }}>
                <div className="absolute inset-x-2 top-1 flex justify-between" aria-hidden="true">
                    {Array.from({ length: 18 }, (_, k) => <span key={k} className="marquee-bulb w-1.5 h-1.5 rounded-full" style={{ '--b': k % 3 }} />)}
                </div>
                <div className="mt-2 flex items-baseline justify-center gap-3 md:gap-6">
                    <span className="hidden md:inline font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">Now showing</span>
                    {ROOMS.map((r, k) => {
                        const on = k === at.room;
                        return (
                            <button key={r.key} type="button" onClick={() => play(k)} aria-pressed={on} className="relative pb-1.5 font-oswald font-bold uppercase tracking-[0.12em] text-base md:text-2xl leading-none transition-colors after:absolute after:-inset-x-1.5 after:-inset-y-3">
                                <span className={on ? 'text-[#fff1c9] [text-shadow:0_0_12px_rgba(255,214,140,0.85),0_0_2px_#fff]' : 'text-white/45 hover:text-white/80'}>{r.name}</span>
                                {on && !reducedMotion && <motion.span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#f4dcae] origin-left" style={{ scaleX: fill }} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* the house curtain: down when you arrive, then it flies up and the show begins */}
            <motion.div
                className="absolute z-[7] inset-x-0 top-0 auditorium-velvet shadow-[0_20px_40px_rgba(0,0,0,0.7)]"
                style={{ height: `${edge}%` }}
                initial={reducedMotion ? false : { y: '0%' }}
                animate={{ y: opened || reducedMotion ? '-102%' : '0%' }}
                transition={{ duration: 2.4, ease: [0.65, 0, 0.35, 1], delay: 0.3 }}
            />

            {/* the proscenium: drapes drawn back at the sides, the valance across the top */}
            <div className="absolute z-[8] left-0 top-0" style={{ width: `${L.drape}%`, height: `${edge}%` }}><Drape side={-1} className="w-full h-full" /></div>
            <div className="absolute z-[8] right-0 top-0" style={{ width: `${L.drape}%`, height: `${edge}%` }}><Drape side={1} className="w-full h-full" /></div>
            <div className="absolute z-[8] inset-x-0 top-0" style={{ height: `${L.valance}%` }}><Valance className="w-full h-full" swags={wide ? 11 : 6} /></div>

            {/* the footlights along the front of the stage, throwing their warmth up onto it */}
            <div className="absolute z-[9] inset-x-0 pointer-events-none bg-[linear-gradient(to_top,rgba(255,196,120,0.22),transparent)]" style={{ top: `${edge - 12}%`, height: '12%' }} />
            <div className="absolute z-[9] inset-x-[8%] flex justify-between pointer-events-none" style={{ top: `${edge - 0.8}%` }} aria-hidden="true">
                {Array.from({ length: wide ? 26 : 12 }, (_, k) => <span key={k} className="w-2 h-1.5 rounded-t-full bg-[#ffe2b0] shadow-[0_0_10px_3px_rgba(255,196,120,0.55)]" />)}
            </div>

            {/* the seats in front of you, two rows */}
            <Seats className="absolute z-[10] inset-x-0 bottom-[6%] h-[11%] w-full" seat={50} light={0.12} />
            <Seats className="absolute z-[10] left-[-2%] bottom-0 h-[8%] w-[104%]" seat={74} light={0.18} />

            {/* the projector's beam over your head, dust turning in it */}
            <div className="projector-beam absolute z-[11] inset-0 pointer-events-none" style={{ clipPath: beam, background: 'linear-gradient(to top, rgba(255,244,225,0.06), rgba(255,244,225,0.09) 30%, rgba(255,244,225,0.05) 60%, rgba(255,244,225,0.02))' }}>
                {!reducedMotion && Array.from({ length: 12 }, (_, k) => (
                    <span key={k} className="auditorium-mote absolute w-[3px] h-[3px] rounded-full bg-white/50" style={{ left: `${30 + ((k * 37) % 40)}%`, top: `${40 + ((k * 23) % 55)}%`, animationDelay: `${-k * 1.7}s`, animationDuration: `${12 + (k % 5) * 3}s` }} />
                ))}
            </div>
        </div>
    );
};

export default Auditorium;
