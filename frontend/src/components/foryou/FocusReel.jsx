import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { defocus } from './defocus';
import { sized } from '../movements/treatments';
import RackText from './RackText';
import Actions from './Actions';
import { evidenceWords, alsoWords, factWords } from './whyWords';

/**
 * The picks one of your films led to, as a reel shot with a shallow depth of field: the frame
 * at the centre is in focus, its neighbours go softer the further they are from it, and focus
 * follows as the reel moves (one scroll listener, writing two CSS variables per frame; no React
 * render per frame). While it's on screen and nobody has taken hold of it, the reel moves on by
 * itself every few seconds, and the frame in focus slowly pushes in; step it, swipe it, drag it
 * with the mouse or tap a frame and it's yours. Scrolling down to it, the whole reel comes up out of focus and racks in
 * (a scroll-driven animation in index.css). Under the reel, the frame in focus: its title racking
 * in, why it was picked, and what you can do with it. Behind it all, your film's own light.
 */

const HEADS = { loved: 'Because you loved', watched: 'Because you watched', watchlist: 'Because it’s on your watchlist' };
const STEP = 3.8; // seconds a frame stays in focus while the reel moves by itself

const ReelFrame = ({ pick, setRef, onPick, focused }) => {
    const still = pick.stills?.[0] || pick.backdropUrl || pick.posterUrl;
    const [soft, setSoft] = useState(null);
    useEffect(() => {
        let gone = false;
        defocus(still && sized(still, 'w300'), { width: 480, height: 300 }).then((url) => { if (!gone) setSoft(url); });
        return () => { gone = true; };
    }, [still]);
    return (
        <li ref={setRef} className={`reel-card snap-center flex-shrink-0 w-[78cqw] sm:w-[52cqw] lg:w-[38cqw] ${focused ? 'is-live' : ''}`}>
            <button type="button" onClick={onPick} aria-label={focused ? `${pick.title}: in focus` : `Focus on ${pick.title}`} className={`relative block w-full aspect-[16/10] overflow-hidden bg-[#0d0c0b] ring-1 transition-shadow ${focused ? 'ring-gold/70 shadow-[0_0_40px_rgba(217,173,98,0.18)]' : 'ring-white/10'}`}>
                <span className="reel-push absolute inset-0">
                    {soft && <img src={soft} alt="" className="absolute inset-0 w-full h-full object-cover max-w-none" />}
                    {still && <img src={sized(still, 'w780')} alt="" loading="lazy" decoding="async" className="reel-sharp absolute inset-0 w-full h-full object-cover max-w-none" />}
                </span>
                <span aria-hidden="true" className="absolute inset-0 still-grain opacity-60" />
            </button>
            <div className={`mt-2 font-label text-[11px] tracking-[0.14em] uppercase truncate ${focused ? 'text-gold-light' : 'text-gray-500'}`}>{pick.title}</div>
        </li>
    );
};

const FocusReel = ({ seed, how, picks, act, reducedMotion }) => {
    const section = useRef(null);
    const scroller = useRef(null);
    const frames = useRef([]);
    const [focus, setFocus] = useState(0);
    const [inView, setInView] = useState(false);
    const [taken, setTaken] = useState(false); // someone has taken hold of it: it stops moving by itself
    const [reading, setReading] = useState(false);
    const [backdrop, setBackdrop] = useState(null);
    const drag = useRef(null);

    useEffect(() => {
        let gone = false;
        defocus(seed?.still && sized(seed.still, 'w300'), { width: 960, height: 540 }).then((url) => { if (!gone) setBackdrop(url); });
        return () => { gone = true; };
    }, [seed?.still]);

    // the reel moves by itself only while most of it is on screen
    useEffect(() => {
        const el = section.current;
        if (!el || reducedMotion) return undefined;
        const io = new IntersectionObserver(([entry]) => setInView(entry.intersectionRatio >= 0.5), { threshold: [0, 0.5, 1] });
        io.observe(el);
        return () => io.disconnect();
    }, [reducedMotion]);

    // the depth of field follows the reel
    useEffect(() => {
        const el = scroller.current;
        if (!el) return undefined;
        let raf = 0;
        let centres = [];
        let widths = [];
        const measure = () => {
            centres = frames.current.map((f) => (f ? f.offsetLeft + f.offsetWidth / 2 : 0));
            widths = frames.current.map((f) => f?.offsetWidth || 1);
        };
        const paint = () => {
            raf = 0;
            const mid = el.scrollLeft + el.clientWidth / 2;
            let best = 0;
            let bestD = Infinity;
            frames.current.forEach((f, i) => {
                if (!f) return;
                const d = Math.abs(centres[i] - mid) / widths[i];
                if (!reducedMotion) {
                    f.style.setProperty('--sharp', Math.max(0, 1 - d * 1.25).toFixed(3));
                    f.style.setProperty('--depth', Math.min(d, 1.4).toFixed(3));
                }
                if (d < bestD) { bestD = d; best = i; }
            });
            setFocus((v) => (v === best ? v : best));
        };
        const later = () => { if (!raf) raf = requestAnimationFrame(paint); };
        const onResize = () => { measure(); later(); };
        measure();
        later();
        el.addEventListener('scroll', later, { passive: true });
        window.addEventListener('resize', onResize);
        return () => {
            cancelAnimationFrame(raf);
            el.removeEventListener('scroll', later);
            window.removeEventListener('resize', onResize);
        };
    }, [picks.length, reducedMotion]);

    const go = useCallback((i) => {
        const el = scroller.current;
        const f = frames.current[i];
        if (!el || !f) return;
        el.scrollTo({ left: f.offsetLeft + f.offsetWidth / 2 - el.clientWidth / 2, behavior: reducedMotion ? 'auto' : 'smooth' });
    }, [reducedMotion]);
    const take = (i) => {
        setTaken(true);
        go(i);
    };
    // the frame nearest the middle of the reel right now
    const nearest = () => {
        const el = scroller.current;
        const mid = el.scrollLeft + el.clientWidth / 2;
        let best = 0;
        frames.current.forEach((f, i) => {
            const b = frames.current[best];
            if (f && b && Math.abs(f.offsetLeft + f.offsetWidth / 2 - mid) < Math.abs(b.offsetLeft + b.offsetWidth / 2 - mid)) best = i;
        });
        return best;
    };
    // a mouse can drag the reel as a finger does (a click without a drag still picks a frame)
    const hand = {
        onPointerDown: (e) => {
            setTaken(true);
            if (e.pointerType !== 'mouse' || e.button !== 0) return;
            drag.current = { x: e.clientX, left: scroller.current.scrollLeft, moved: false };
        },
        onPointerMove: (e) => {
            const d = drag.current;
            if (!d) return;
            const dx = e.clientX - d.x;
            if (!d.moved && Math.abs(dx) > 5) {
                d.moved = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                e.currentTarget.classList.add('is-dragging');
            }
            if (d.moved) scroller.current.scrollLeft = d.left - dx;
        },
        onPointerUp: (e) => {
            const d = drag.current;
            drag.current = null;
            if (!d?.moved) return;
            e.currentTarget.classList.remove('is-dragging');
            go(nearest());
        },
        onPointerCancel: (e) => {
            drag.current = null;
            e.currentTarget.classList.remove('is-dragging');
        },
    };

    // on by itself, a frame every few seconds, and from the last back to the first
    useEffect(() => {
        if (reducedMotion || taken || reading || !inView || picks.length < 2) return undefined;
        const t = setTimeout(() => go(focus + 1 < picks.length ? focus + 1 : 0), STEP * 1000);
        return () => clearTimeout(t);
    }, [reducedMotion, taken, reading, inView, focus, picks.length, go]);

    const pick = picks[Math.min(focus, picks.length - 1)];
    const fact = factWords(pick?.because?.shared);
    const also = alsoWords(pick?.also);
    const title = seed ? seed.title : 'The most acclaimed films here';
    const step = 'w-10 h-10 flex items-center justify-center rounded-full ring-1 ring-white/25 text-gray-100 hover:ring-gold hover:text-gold-light disabled:opacity-25 disabled:hover:ring-white/25 transition-colors';

    return (
        <section
            ref={section}
            className="reel-arrive relative overflow-hidden ring-1 ring-white/10 bg-[#0b0a09]"
            onFocus={() => setTaken(true)}
        >
            {backdrop && <img src={backdrop} alt="" aria-hidden="true" className="absolute inset-x-0 top-0 w-full h-[75%] object-cover max-w-none opacity-80" />}
            <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,7,6,0.2)_0%,rgba(8,7,6,0.6)_32%,rgba(8,7,6,0.93)_62%,#080706_78%)]" />
            <div className="relative pt-9 pb-10 md:pt-11 md:pb-12 [container-type:inline-size]">
                {/* on a phone the steppers sit beside the small line, so the title has the width */}
                <header className="px-5 md:px-10 mb-7 grid grid-cols-[minmax(0,1fr)_auto] items-center md:items-end gap-x-4">
                    <div className="col-start-1 row-start-1 font-label text-[12px] tracking-[0.14em] uppercase text-gold">{seed ? HEADS[how] || HEADS.loved : 'From the canon'}</div>
                    <h2 className="relative col-span-2 md:col-span-1 row-start-2 mt-1 font-serif text-[1.9rem] md:text-[2.6rem] leading-tight text-white">
                        <span aria-hidden="true" className="rack-soft absolute inset-0 blur-[7px]">{title}</span>
                        <span className="rack-sharp block">{title}</span>
                    </h2>
                    {picks.length > 1 && (
                        <div className="col-start-2 row-start-1 md:row-span-2 flex items-center gap-2">
                            <button type="button" onClick={() => take(focus - 1)} disabled={focus === 0} aria-label="Previous film" className={step}>‹</button>
                            <span className="font-label text-[12px] tracking-[0.14em] tabular-nums text-gray-300 w-12 text-center">{focus + 1} / {picks.length}</span>
                            <button type="button" onClick={() => take(focus + 1)} disabled={focus >= picks.length - 1} aria-label="Next film" className={step}>›</button>
                        </div>
                    )}
                </header>
                <ul
                    ref={scroller}
                    {...hand}
                    onDragStart={(e) => e.preventDefault()}
                    onWheel={(e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) setTaken(true); }}
                    className="reel-drag [&_img]:[-webkit-user-drag:none] flex gap-5 md:gap-7 overflow-x-auto overscroll-x-contain snap-x snap-mandatory px-[11cqw] sm:px-[24cqw] lg:px-[31cqw] py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {picks.map((p, i) => (
                        <ReelFrame key={p._id} pick={p} focused={i === focus} setRef={(el) => { frames.current[i] = el; }} onPick={() => (i === focus ? null : take(i))} />
                    ))}
                </ul>
                {pick && (
                    <div
                        className="px-5 md:px-10 mt-6 grid md:grid-cols-[1fr_auto] gap-x-10 gap-y-5 items-end"
                        onPointerEnter={(e) => e.pointerType === 'mouse' && setReading(true)}
                        onPointerLeave={() => setReading(false)}
                    >
                        <div className="min-w-0">
                            <Link to={`/movie/${pick._id}`} className="block hover:text-gold-light transition-colors">
                                <h3 className="font-serif text-[1.9rem] md:text-[2.4rem] leading-tight text-white"><RackText key={pick._id}>{pick.title}</RackText></h3>
                            </Link>
                            <div className="mt-1 font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">{[pick.year, pick.directors?.[0], pick.runtime && `${pick.runtime} min`].filter(Boolean).join(' · ')}</div>
                            <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-gray-300">{evidenceWords(pick.because, { turn: focus })}{also && <span className="text-gray-400"> {also}</span>}</p>
                            {fact && <span className="mt-2 inline-block px-2 py-0.5 ring-1 ring-gold/35 font-label text-[11px] tracking-[0.14em] uppercase text-gold">{fact}</span>}
                        </div>
                        <Actions film={pick} act={act} />
                    </div>
                )}
            </div>
        </section>
    );
};

export default FocusReel;
