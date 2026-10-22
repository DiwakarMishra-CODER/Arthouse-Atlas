import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sized } from '../movements/treatments';
import { useDecoded } from '../about/frames';

/**
 * Their retrospective: the film's director, introduced the way silent films introduced someone, with
 * an iris. As you reach it a circle opens from black on their face; then their other films in the
 * atlas cut through the same circle one after another (a frame of black between), each named under
 * it, so the invitation shows what their page holds. Beside it, plainly: who, how many films, which
 * years, and the way in. The circle is a way in too. Co-directors stand side by side.
 * The same for every director with a page; a director without one gets no section.
 */

const EVERY = 1900; // ms each picture holds in the iris
const EASE = [0.22, 1, 0.36, 1];

// phase: the second of a pair starts halfway through their films, so two directors who share their
// films (the Coens, the Dardennes) never show the same one at once
const Iris = ({ who, light, reducedMotion, small, phase = 0 }) => {
    const shots = useMemo(() => {
        const turn = phase ? Math.floor(who.others.length / 2) : 0;
        const films = [...who.others.slice(turn), ...who.others.slice(0, turn)];
        return [
            ...(who.portrait ? [{ key: 'face', src: sized(who.portrait, 'h632'), caption: who.name }] : []),
            ...films.map((f) => ({ key: f._id, src: sized(f.still, 'w780'), caption: [f.title, f.year].filter(Boolean).join(', ') })),
        ];
    }, [who, phase]);
    const [ready, want] = useDecoded();
    const [k, setK] = useState(0);
    const [seen, setSeen] = useState(false); // on screen now: the pictures cut
    const [opened, setOpened] = useState(false); // reached once: the iris opens, and stays open
    // (watched on the frame around the circle: a circle clipped to nothing never counts as on screen)
    const box = useRef(null);
    const srcs = shots.map((x) => x.src).join('|');
    useEffect(() => { want(srcs.split('|').filter(Boolean)); }, [srcs, want]);
    // it cuts only while it can be seen, and not at all for someone who'd rather things kept still
    useEffect(() => {
        const el = box.current;
        if (!el) return undefined;
        const io = new IntersectionObserver(([e]) => {
            setSeen(e.isIntersecting);
            if (e.intersectionRatio >= 0.4) setOpened(true);
        }, { threshold: [0, 0.3, 0.4] });
        io.observe(el);
        return () => io.disconnect();
    }, []);
    useEffect(() => {
        if (!seen || reducedMotion || shots.length < 2) return undefined;
        const t = setInterval(() => setK((x) => {
            for (let step = 1; step <= shots.length; step++) {
                const next = (x + step) % shots.length;
                if (ready.has(shots[next].src)) return next;
            }
            return x;
        }), EVERY);
        return () => clearInterval(t);
    }, [seen, reducedMotion, shots, ready]);

    const size = small ? 'w-48 h-48 md:w-56 md:h-56' : 'w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80';
    const shown = shots[k] || shots[0];
    return (
        <div className={`flex flex-col items-center ${small ? '' : 'md:items-start'}`}>
            <Link ref={box} to={`/directors/${who.id}`} aria-label={`Open ${who.name}'s retrospective`} className={`group relative block ${size} rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold`}>
                <motion.span
                    className="absolute inset-0 rounded-full overflow-hidden bg-black"
                    initial={reducedMotion ? false : { clipPath: 'circle(0% at 50% 50%)' }}
                    animate={opened || reducedMotion ? { clipPath: 'circle(50% at 50% 50%)' } : undefined}
                    transition={{ duration: 1.1, ease: EASE }}
                >
                    {shots.map((x, i) => (
                        <img
                            key={x.key}
                            src={x.src}
                            alt=""
                            loading="lazy"
                            className={`absolute inset-0 w-full h-full object-cover max-w-none ${i === 0 && who.portrait ? 'grayscale' : ''} ${i === k ? 'opacity-100' : 'opacity-0'}`}
                        />
                    ))}
                    {/* one frame of black between two pictures, as the projector's shutter gives */}
                    {shots.length > 1 && <span key={k} aria-hidden="true" className="shutter absolute inset-0 bg-black" />}
                    <span aria-hidden="true" className="absolute inset-0 still-grain opacity-60" />
                    <span aria-hidden="true" className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_45%,transparent_55%,rgba(0,0,0,0.55))]" />
                </motion.span>
                {/* the iris's edge, lit by the film */}
                <span aria-hidden="true" className="absolute -inset-1.5 rounded-full transition-transform duration-500 group-hover:scale-[1.03]" style={{ boxShadow: `0 0 0 1px ${light}88, 0 0 70px ${light}2e` }} />
            </Link>
            <div aria-hidden="true" className="mt-4 min-h-5 font-label text-[12px] tracking-[0.14em] uppercase text-gray-300 text-center">{shown?.caption}</div>
        </div>
    );
};

const Facts = ({ who, light, center }) => {
    const years = who.from && who.to ? (who.from === who.to ? `${who.from}` : `${who.from}–${who.to}`) : null;
    return (
        <div className={center ? 'text-center' : 'text-center md:text-left'}>
            <div className="font-serif font-light text-4xl md:text-6xl leading-[1.02] text-white">{who.name}</div>
            <div className="mt-3 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gray-300">
                {[`${who.films} ${who.films === 1 ? 'film' : 'films'} in the atlas`, years].filter(Boolean).join('  ·  ')}
            </div>
            <p className="mt-4 max-w-md mx-auto md:mx-0 font-serif italic text-lg text-gray-400">{center ? 'Their films, their life, and the people they worked with.' : 'Every film of theirs in the atlas, their life, and the people they worked with.'}</p>
            <Link
                to={`/directors/${who.id}`}
                className="mt-6 inline-flex items-center min-h-11 px-5 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold ring-1 ring-gold/50 hover:bg-gold hover:text-black transition-colors"
                style={{ boxShadow: `0 0 30px ${light}22` }}
            >
                Open their retrospective ›
            </Link>
        </div>
    );
};

const Retrospective = ({ movie, light, reducedMotion = false }) => {
    const people = movie.retrospectives || [];
    if (!people.length) return null;
    const pair = people.length > 1;
    return (
        <section className="pt-24 md:pt-32">
            <h2 className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-400 mb-10">{pair ? 'Their retrospectives' : 'Their retrospective'}</h2>
            {pair ? (
                <div className="grid gap-16 md:grid-cols-2">
                    {people.map((who, i) => (
                        <div key={who.id} className="flex flex-col items-center gap-8">
                            <Iris who={who} light={light} reducedMotion={reducedMotion} small phase={i} />
                            <Facts who={who} light={light} center />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid gap-10 md:gap-16 md:grid-cols-[auto_1fr] items-center">
                    <Iris who={people[0]} light={light} reducedMotion={reducedMotion} />
                    <Facts who={people[0]} light={light} />
                </div>
            )}
        </section>
    );
};

export default Retrospective;
