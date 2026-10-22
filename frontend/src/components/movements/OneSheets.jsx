import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { sized } from './treatments';

/**
 * A movement's films as their posters, hung in the house's lit display frames (the foyer's black
 * lacquer and gilt fillet), in the order they were made. Each frame's lamp strikes on as it comes
 * into view, the ones arriving together one after another, so the movement lights up year by year
 * as you scroll. Under each, a wall label: the title, then when and who. The whole frame opens the
 * film; nothing waits for a hover.
 * A film without a poster hangs its still with its title on it, or its title alone on the dark.
 */
const OneSheets = ({ films, reducedMotion = false }) => {
    const wall = useRef(null);

    // each frame lights as it comes into view; with reduced motion, all at once
    useEffect(() => {
        const root = wall.current;
        if (!root) return undefined;
        const dark = [...root.querySelectorAll('[data-film]:not([data-lit])')];
        if (reducedMotion || typeof IntersectionObserver === 'undefined') {
            dark.forEach((el) => { el.dataset.lit = '1'; });
            return undefined;
        }
        const io = new IntersectionObserver((entries) => {
            let k = 0; // frames arriving together strike on in turn
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                e.target.style.setProperty('--i', k++);
                e.target.dataset.lit = '1';
                io.unobserve(e.target);
            });
        }, { threshold: 0.2 });
        dark.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [films, reducedMotion]);

    return (
        <ol ref={wall} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-9 md:gap-x-7 md:gap-y-12">
            {films.map((film) => {
                const still = film.stills?.[0] || film.backdropUrl;
                const director = film.directors?.[0];
                return (
                    <li key={film._id} data-film>
                        <Link to={`/movie/${film._id}`} className="group block focus-visible:outline-none">
                            <span className="relative block">
                                {/* the frame's light spilling onto the wall around it */}
                                <span aria-hidden="true" className="case-glow pointer-events-none absolute -inset-3 bg-[radial-gradient(ellipse_at_center,rgba(255,236,205,0.10),transparent_70%)]" />
                                <span className="lobby-frame relative block group-hover:-translate-y-1 group-focus-visible:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-gold">
                                    <span className="lobby-mat relative block aspect-[2/3] overflow-hidden bg-[#0c0b0a]">
                                        {film.posterUrl ? (
                                            <img src={sized(film.posterUrl, 'w500')} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover max-w-none" />
                                        ) : still ? (
                                            <>
                                                <img src={sized(still, 'w780')} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover max-w-none" />
                                                <span className="absolute inset-x-0 bottom-0 p-3 pt-10 bg-gradient-to-t from-black/85 to-transparent font-serif text-lg leading-tight text-white">{film.title}</span>
                                            </>
                                        ) : (
                                            <span className="absolute inset-0 flex items-center justify-center p-4 text-center font-serif text-xl leading-tight text-gray-200">{film.title}</span>
                                        )}
                                        <span aria-hidden="true" className="absolute inset-0 still-grain opacity-60 pointer-events-none" />
                                        {/* until its lamp strikes on, the poster waits in the dark; then it's lit from behind, under glass */}
                                        <span aria-hidden="true" className="case-shade absolute inset-0 bg-black/65 pointer-events-none" />
                                        <span aria-hidden="true" className="case-light absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,244,225,0.10),transparent_75%)]" />
                                        <span aria-hidden="true" className="absolute inset-0 pointer-events-none bg-[linear-gradient(118deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.02)_28%,transparent_42%)]" />
                                    </span>
                                </span>
                            </span>
                            {/* the wall label */}
                            <span className="mt-3.5 block font-serif text-[1.05rem] md:text-lg leading-tight text-gray-100 group-hover:text-white line-clamp-2">{film.title}</span>
                            <span className="mt-1 block font-label text-[12px] tracking-[0.14em] uppercase text-gray-400 truncate">
                                {[film.year, director].filter(Boolean).join(' · ')}
                            </span>
                        </Link>
                    </li>
                );
            })}
        </ol>
    );
};

export default OneSheets;
