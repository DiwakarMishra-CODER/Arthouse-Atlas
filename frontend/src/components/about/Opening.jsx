import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdArrowOutward } from 'react-icons/md';
import { sized } from '../movements/treatments';
import { sizeFor, useDecoded } from './frames';
import { MAKER, MAKER_FILMS, MAKER_LINKS } from './maker';

/**
 * About's opening: the page opens the way a film does, on a picture, with its maker's name coming
 * up over it. The picture is three of the maker's films (MAKER_FILMS), full-bleed, cutting from one
 * to the next with a frame of black between, the camera creeping in, each named in the corner while
 * it plays. Over them, low on the left where a film sets its credits: "An atlas by",
 * and the name, racked into focus, with where to find its maker.
 *
 * A frame is cut to only once it's decoded, and the last one holds till then (never a black screen).
 */

const HOLD = 4000; // ms on each film

const Opening = ({ films = {}, reducedMotion }) => {
    const [size] = useState(sizeFor);
    const [ready, want] = useDecoded();
    const [k, setK] = useState(0);
    const reel = MAKER_FILMS.map((f) => ({ ...f, src: sized(f.still, size) }));
    const n = reel.length;
    const at = n ? reel[k % n] : null;
    // (the cut waits for its frame: until it's in, the last one holds)
    const [shown, setShown] = useState(null);
    if (at && at.src !== shown?.src && ready.has(at.src)) setShown(at);

    useEffect(() => { if (n) want([reel[k % n].src, reel[(k + 1) % n].src]); });
    useEffect(() => {
        if (reducedMotion || n < 2) return undefined;
        const t = setInterval(() => setK((x) => x + 1), HOLD);
        return () => clearInterval(t);
    }, [reducedMotion, n]);

    return (
        <section aria-label={`An atlas by ${MAKER}`} className="relative h-[88svh] min-h-[560px] overflow-hidden">
            {/* the picture starts under the navbar, not behind it, so no one in it is hidden there */}
            <div className="absolute inset-x-0 top-[4.25rem] md:top-[4.75rem] bottom-0 overflow-hidden bg-black">
            {shown && (
                <img
                    key={shown.src}
                    src={shown.src}
                    alt=""
                    className="frame-push absolute inset-0 w-full h-full object-cover max-w-none [object-position:var(--fm)] [transform-origin:var(--fm)] md:[object-position:var(--fd)] md:[transform-origin:var(--fd)]"
                    style={{ '--fd': shown.focus, '--fm': shown.phone }}
                />
            )}
            <span key={`cut-${shown?.src}`} aria-hidden="true" className="shutter absolute inset-0 bg-black" />
            <span aria-hidden="true" className="absolute inset-0 still-grain opacity-50 pointer-events-none" />
            {/* the dark the credit needs: up from the foot, and in from the left */}
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/45 to-transparent" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 via-[#050505]/15 to-transparent" />
            </div>


            {/* the film on the screen just now */}
            {shown && (
                <div key={`on-${shown.film}`} className="subtitle-in absolute right-4 md:right-10 top-[8.5rem] md:top-auto md:bottom-10 max-w-[60%] md:max-w-sm text-right [text-shadow:0_2px_12px_rgba(0,0,0,0.9)]">
                    <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">On screen</div>
                    {films[shown.film]?.id
                        ? <Link to={`/movie/${films[shown.film].id}`} className="mt-0.5 inline-block font-serif italic text-[15px] md:text-lg leading-snug text-white underline decoration-gold/50 underline-offset-4 hover:text-gold-light">{shown.film} ›</Link>
                        : <div className="mt-0.5 font-serif italic text-[15px] md:text-lg leading-snug text-white">{shown.film}</div>}
                    {shown.credit && <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-300">{shown.credit}</div>}
                </div>
            )}

            {/* the credit, low on the left, as a film sets it */}
            <div className="absolute inset-x-0 bottom-0 max-w-7xl mx-auto px-4 md:px-10 pb-10 md:pb-14 [text-shadow:0_2px_24px_rgba(0,0,0,0.7)]">
                <div className="card-rise font-label text-[12px] md:text-[13px] tracking-[0.3em] uppercase text-gold">An atlas by</div>
                <div className="relative mt-2 md:mt-3">
                    <p className="focus-in font-serif font-light leading-[0.92] text-[3.4rem] sm:text-7xl md:text-8xl lg:text-[8.5rem] text-white">{MAKER}</p>
                    {/* the name out of focus, given up as the lens finds it */}
                    <p aria-hidden="true" className="focus-out pointer-events-none absolute inset-0 font-serif font-light leading-[0.92] text-[3.4rem] sm:text-7xl md:text-8xl lg:text-[8.5rem] text-white blur-[8px]">{MAKER}</p>
                </div>
                <div className="card-rise-late mt-4 md:mt-6 flex flex-wrap gap-x-7 md:gap-x-9 gap-y-1 [text-shadow:none]">
                    {MAKER_LINKS.map(([label, href]) => (
                        <a key={label} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 min-h-11 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">
                            {label} <MdArrowOutward aria-hidden="true" />
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Opening;
