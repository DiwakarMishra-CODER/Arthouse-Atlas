import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { moviesAPI } from '../../services/api';
import { sized } from '../movements/treatments';

/**
 * Let the projector pick. The house lights go down, a beam falls from the booth onto a screen,
 * and one film from what's showing (any of them, not only those already on the wall) is
 * projected there: its still, its title, who made it. Open it, ask for another, or bring the
 * lights back up (Esc, or a click in the dark).
 */

const newSeed = () => String(Math.floor(Math.random() * 1e9));

const ProjectorPick = ({ query, onClose }) => {
    const [film, setFilm] = useState(null);
    const [failed, setFailed] = useState(false);
    const [reel, setReel] = useState(0); // every pick is a new reel: the screen strikes on again
    const openLink = useRef(null);

    const pick = useCallback(() => {
        moviesAPI.explore({ ...query, sort: 'surprise', seed: newSeed(), page: 1, limit: 1, facets: '0' })
            .then((r) => { setFilm(r.data.films[0] || null); setFailed(false); setReel((n) => n + 1); })
            .catch(() => setFailed(true));
    }, [query]);

    useEffect(() => { pick(); }, [pick]);

    // the house is dark: the page stays still, Esc brings the lights up, focus comes back after
    useEffect(() => {
        const opener = document.activeElement;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
            if (opener?.isConnected) opener.focus({ preventScroll: true });
        };
    }, [onClose]);
    useEffect(() => { if (film) openLink.current?.focus({ preventScroll: true }); }, [film]);

    const meta = film && [film.directors?.[0] && `by ${film.directors.join(' & ')}`, film.year, film.country === 'United States of America' ? 'United States' : film.country].filter(Boolean).join(' · ');

    // over everything, the navbar too: the whole house goes dark
    return createPortal(
        <div role="dialog" aria-modal="true" aria-label="The projector's pick" className="fixed inset-0 z-[70] overflow-y-auto">
            <button type="button" tabIndex={-1} aria-label="Bring the lights up" onClick={onClose} className="pick-dim fixed inset-0 bg-[#030303]/[0.95] cursor-default" />
            <div className="relative min-h-full flex flex-col items-center justify-center px-5 py-16">
                <div className="relative w-full max-w-3xl">
                    {/* the beam from the booth, falling onto the screen */}
                    <span aria-hidden="true" className="pick-beam pointer-events-none absolute left-0 right-0 bottom-full h-[45vh]" />
                    <div key={reel} className="pick-screen relative aspect-video overflow-hidden bg-[#d9d3c6] shadow-[0_0_140px_rgba(255,236,200,0.22)]">
                        {film?.still && <img src={sized(film.still, 'w1280')} alt="" className="absolute inset-0 w-full h-full object-cover max-w-none" />}
                        {film && !film.still && film.posterUrl && <img src={sized(film.posterUrl, 'w500')} alt="" className="absolute inset-y-0 left-1/2 -translate-x-1/2 h-full w-auto max-w-none" />}
                        <span aria-hidden="true" className="absolute inset-0 still-grain opacity-80" />
                        <span aria-hidden="true" className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.55)]" />
                    </div>
                </div>
                <div className="relative mt-8 text-center max-w-2xl" aria-live="polite">
                    {failed && <p className="text-gray-300">The projector jammed. Try again in a moment.</p>}
                    {film && (
                        <>
                            <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">The projector picked</div>
                            <h2 className="mt-2 font-serif font-light text-4xl md:text-6xl leading-tight text-white">{film.title}</h2>
                            {film.originalTitle && <div className="mt-1 italic text-gray-400">{film.originalTitle}</div>}
                            <div className="mt-3 text-[16px] text-gray-300">{meta}</div>
                            {film.hook && <p className="mt-4 font-serif italic text-[1.2rem] text-gray-200">{film.hook}</p>}
                        </>
                    )}
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        {film && (
                            <Link ref={openLink} to={`/movie/${film._id}`} className="px-6 py-3 bg-gold text-black font-label text-[13px] tracking-[0.14em] uppercase hover:bg-gold-light transition-colors">
                                Open the film →
                            </Link>
                        )}
                        <button type="button" onClick={pick} className="px-6 py-3 ring-1 ring-white/30 text-gray-100 font-label text-[13px] tracking-[0.14em] uppercase hover:ring-white/60 transition-colors">Another</button>
                        <button type="button" onClick={onClose} className="px-4 py-3 text-gray-400 font-label text-[13px] tracking-[0.14em] uppercase hover:text-white transition-colors">Lights up</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default ProjectorPick;
