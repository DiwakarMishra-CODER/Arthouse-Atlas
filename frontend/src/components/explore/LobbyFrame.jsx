import { memo, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { sized } from '../movements/treatments';
import { ordinal } from '../film/canonWords';

/**
 * A lobby card in the foyer's display case: the film's still in black lacquer with a gilt
 * fillet, lit from behind through the glass; the case's tubes strike on as it comes into
 * view (the wall marks it lit). Beneath it, a wall label: the title and original title, who made it (tap
 * the name to follow them), when, where and how long, its movement, and one line about it.
 *
 * The still runs. Hover a frame (on a phone: bring it to the middle of the screen) and the
 * projector advances through the film's own frames, one frame of black between each. A film
 * with a single frame breathes instead: a slow push-in, the picture weaving in the gate.
 * Never another film's picture.
 *
 * Its corner badge is its place in the atlas's canon; on a wall of one decade in canon order
 * (decadeRanked), its place among that decade's films, as its own page counts it.
 */

const COUNTRY = { 'United States of America': 'United States' };
const STEP = 1100; // how long each frame holds while the still runs

// one observer for every frame on a touch screen: the frame crossing the middle of the screen runs
const watchCentre = (() => {
    let io = null;
    const callbacks = new Map();
    return (el, cb) => {
        if (!io) io = new IntersectionObserver((entries) => entries.forEach((e) => callbacks.get(e.target)?.(e.isIntersecting)), { rootMargin: '-40% 0px -40% 0px' });
        callbacks.set(el, cb);
        io.observe(el);
        return () => { callbacks.delete(el); io.unobserve(el); };
    };
})();
const touchOnly = () => typeof window !== 'undefined' && !!window.matchMedia?.('(hover: none)').matches;

const Plaque = ({ film, large, compact, to, onDirector, onMovement }) => {
    const facts = [film.year, COUNTRY[film.country] || film.country, film.runtime && `${film.runtime} min`].filter(Boolean);
    const line = film.hook
        || (film.provenanceCount ? `Cited by ${film.provenanceCount} ${film.provenanceCount === 1 ? 'poll or prize' : 'polls and prizes'}` : 'Chosen by the atlas');
    return (
        <div className={large ? 'mt-5' : 'mt-4'}>
            <Link to={to} className={`font-serif leading-[1.1] text-white hover:text-gold-light transition-colors ${large ? 'text-[1.75rem] md:text-[2.3rem]' : 'text-[1.35rem]'}`}>{film.title}</Link>
            {film.originalTitle && <div className="mt-0.5 italic text-[15px] text-gray-400 truncate">{film.originalTitle}</div>}
            {film.directors?.length > 0 && (
                <div className="mt-1 text-[15px] text-gray-300">
                    by{' '}
                    {film.directors.map((d, i) => (
                        <span key={d}>
                            {i > 0 && (i === film.directors.length - 1 ? ' & ' : ', ')}
                            <button type="button" onClick={() => onDirector(d)} className="text-gray-100 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white transition-colors">{d}</button>
                        </span>
                    ))}
                </div>
            )}
            <div className="mt-2 font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">{facts.join(' · ')}</div>
            {(film.movements?.[0] || film.why) && (
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-label text-[12px] tracking-[0.14em] uppercase">
                    {film.movements?.[0] && <button type="button" onClick={() => onMovement(film.movements[0])} className="text-left text-gold hover:text-gold-light transition-colors">{film.movements[0]}</button>}
                    {film.why && <span className="text-gray-300">{film.why}</span>}
                </div>
            )}
            {/* the two cases beside a large one (on a wide screen) keep to the essentials */}
            <p className={`mt-2 leading-relaxed text-gray-400 ${large ? 'text-[17px] max-w-2xl' : 'text-[15px] line-clamp-2'} ${compact ? 'lg:hidden' : ''}`}>{line}</p>
        </div>
    );
};

const LobbyFrame = memo(function LobbyFrame({ film, size = 'small', compact = false, index = 0, decadeRanked = false, onDirector, onMovement, picked = false, reducedMotion = false, className = '' }) {
    const frames = film.stills?.length ? film.stills : film.still ? [film.still] : [];
    const [running, setRunning] = useState(false);
    const [shown, setShown] = useState(0);
    const [armed, setArmed] = useState(false); // the other frames load once you've shown interest
    const [loaded, setLoaded] = useState(() => new Set([0])); // frames ready to show (never a half-loaded one)
    const ref = useRef(null);
    const large = size === 'large';
    const to = `/movie/${film._id}`;

    // on a phone, a frame runs while it crosses the middle of the screen: once through its frames
    // (anything that moves by itself stops by itself), again the next time it comes by
    const [once, setOnce] = useState(false);
    useEffect(() => {
        if (reducedMotion || !touchOnly() || !ref.current) return undefined;
        return watchCentre(ref.current, (inMiddle) => {
            setRunning(inMiddle);
            setOnce(inMiddle);
            if (inMiddle) setArmed(true);
        });
    }, [reducedMotion]);

    // the projector advances to the next frame that's ready, with a frame of black between
    useEffect(() => {
        if (!running || frames.length < 2) return undefined;
        let steps = 0;
        const t = setInterval(() => {
            steps++;
            setShown((s) => {
                for (let k = 1; k <= frames.length; k++) {
                    const next = (s + k) % frames.length;
                    if (loaded.has(next)) return next;
                }
                return s;
            });
            if (once && steps >= frames.length) { clearInterval(t); setRunning(false); }
        }, STEP);
        return () => clearInterval(t);
    }, [running, once, frames.length, loaded]);

    const start = () => { if (!reducedMotion) { setArmed(true); setOnce(false); setRunning(true); } };
    const stop = () => setRunning(false);
    const width = large ? 'w1280' : 'w780';

    return (
        <article ref={ref} data-film={film._id} className={`lobby relative flex flex-col ${picked ? 'lobby-picked' : ''} ${className}`} style={{ '--i': index }}>
            {/* the case's light spilling onto the wall around it */}
            <span aria-hidden="true" className="case-glow pointer-events-none absolute -inset-3 bg-[radial-gradient(ellipse_at_center,rgba(255,236,205,0.10),transparent_70%)]" />
            <Link
                to={to}
                aria-label={`${film.title}${film.year ? ` (${film.year})` : ''}`}
                onMouseEnter={start}
                onMouseLeave={stop}
                onFocus={start}
                onBlur={stop}
                className="lobby-frame block"
            >
                <span className={`lobby-mat relative block overflow-hidden bg-[#0c0b0a] ${large ? 'aspect-video lg:aspect-[3/2]' : 'aspect-[16/10]'}`}>
                    {frames.length > 0 ? (
                        <span className={`absolute inset-0 transition-transform ease-out ${running ? 'scale-[1.06] duration-[8000ms]' : 'scale-100 duration-[1200ms]'}`}>
                            {frames.map((src, i) => (i === 0 || armed) && (
                                <img
                                    key={src}
                                    src={sized(src, width)}
                                    alt=""
                                    loading={i === 0 ? 'lazy' : 'eager'}
                                    decoding="async"
                                    onLoad={i ? () => setLoaded((l) => new Set(l).add(i)) : undefined}
                                    className={`absolute inset-0 w-full h-full object-cover max-w-none ${i === shown ? 'opacity-100' : 'opacity-0'} ${running && frames.length === 1 ? 'breath-weave' : ''}`}
                                />
                            ))}
                        </span>
                    ) : film.posterUrl ? (
                        <>
                            <img src={sized(film.posterUrl, 'w342')} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover max-w-none blur-xl opacity-40 scale-110" />
                            <img src={sized(film.posterUrl, 'w342')} alt="" loading="lazy" decoding="async" className="absolute inset-y-0 left-1/2 -translate-x-1/2 h-full w-auto max-w-none" />
                        </>
                    ) : (
                        <span className="absolute inset-0 flex items-center justify-center p-6 text-center font-serif text-2xl text-gray-300">{film.title}</span>
                    )}
                    {running && frames.length > 1 && <span key={shown} aria-hidden="true" className="shutter absolute inset-0 bg-black" />}
                    <span aria-hidden="true" className="absolute inset-0 still-grain opacity-70 pointer-events-none" />
                    {/* until its tubes strike on, the picture waits in the dark; then it glows from behind, under glass */}
                    <span aria-hidden="true" className="case-shade absolute inset-0 bg-black/65 pointer-events-none" />
                    <span aria-hidden="true" className="case-light absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,244,225,0.10),transparent_75%)]" />
                    <span aria-hidden="true" className="absolute inset-0 pointer-events-none bg-[linear-gradient(118deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.02)_28%,transparent_42%)]" />
                    {decadeRanked && film.canonDecadeRank && film.decade ? (
                        <span className="absolute left-3 top-3 px-2 py-1 bg-black/70 font-label text-[12px] tracking-[0.14em] uppercase text-gold">
                            {ordinal(film.canonDecadeRank)} of the {film.decade}s
                        </span>
                    ) : film.canonRank && (
                        <span className="absolute left-3 top-3 px-2 py-1 bg-black/70 font-label text-[12px] tracking-[0.14em] text-gold" title={`Number ${film.canonRank} in the atlas's canon`}>
                            № {film.canonRank}
                        </span>
                    )}
                    {picked && (
                        <span className="absolute right-3 bottom-3 px-3 py-1.5 bg-gold text-black font-label text-[12px] tracking-[0.14em] uppercase">This one →</span>
                    )}
                </span>
            </Link>
            <Plaque film={film} large={large} compact={compact} to={to} onDirector={onDirector} onMovement={onMovement} />
        </article>
    );
});

export default LobbyFrame;
