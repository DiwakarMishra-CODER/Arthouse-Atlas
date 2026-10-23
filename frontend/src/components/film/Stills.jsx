import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdChevronLeft, MdChevronRight, MdClose } from 'react-icons/md';
import { sized } from '../movements/treatments';
import { sizeFor, useDecoded } from '../about/frames';
import { framesOf } from './frames';

/**
 * Stills from the film: every frame the atlas holds of it, laid out as a contact sheet (the sheet a
 * photographer prints a roll on, each frame numbered at its edge), so they can be seen at once and
 * not only one by one behind the opening. Tap one and it fills the screen: Previous and Next (or the
 * arrow keys, or a swipe), Close (or Esc). The full-size picture is drawn over its small copy once
 * it's in, so the screen is never blank while it loads.
 */

const num = (i) => `${String(i + 1).padStart(2, '0')}A`;

// the frame, full screen
const Viewer = ({ title, frames, at, onGo, onClose }) => {
    const [size] = useState(sizeFor);
    const [ready, want] = useDecoded();
    const close = useRef(null);
    const swipe = useRef(null);
    const n = frames.length;
    const small = frames[at];
    const big = sized(small, size);

    useEffect(() => { want([big, sized(frames[(at + 1) % n], size), sized(frames[(at - 1 + n) % n], size)]); });
    useEffect(() => {
        const back = document.activeElement;
        close.current?.focus();
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = overflow; back?.focus?.(); };
    }, []);
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') onGo(1);
            if (e.key === 'ArrowLeft') onGo(-1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onGo, onClose]);

    const arrow = 'absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/60 ring-1 ring-white/25 text-white hover:ring-gold hover:text-gold-light';
    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`${title}: still ${at + 1} of ${n}`}
            className="own-transitions fixed inset-0 z-[80] flex flex-col bg-black/95"
            onPointerDown={(e) => { swipe.current = e.clientX; }}
            onPointerUp={(e) => {
                const dx = swipe.current == null ? 0 : e.clientX - swipe.current;
                swipe.current = null;
                if (Math.abs(dx) > 50) onGo(dx < 0 ? 1 : -1);
            }}
        >
            <div className="shrink-0 flex items-center justify-between gap-4 px-4 md:px-8 h-16">
                <div className="min-w-0 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gray-300 truncate">
                    <span className="text-white">{title}</span> · Still {at + 1} of {n}
                </div>
                <button ref={close} type="button" onClick={onClose} className="shrink-0 flex items-center gap-1.5 min-h-11 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gray-200 hover:text-white">
                    Close <MdClose size={18} aria-hidden="true" />
                </button>
            </div>
            <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 md:px-20 pb-6">
                {/* (a frame's box as big as the screen allows, at the film's 16:9; a frame of another shape sits inside it) */}
                <div key={small} className="still-open relative w-[min(100%,calc((100svh-7rem)*16/9))] aspect-video">
                    <img src={small} alt={`${title}, still ${at + 1}`} draggable={false} className="absolute inset-0 w-full h-full object-contain select-none" />
                    {/* the full-size picture, over its small copy once it's in */}
                    {ready.has(big) && big !== small && <img src={big} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full object-contain select-none" />}
                    <span aria-hidden="true" className="absolute left-2 bottom-2 px-2 py-0.5 bg-black/70 font-label text-[12px] tracking-[0.14em] tabular-nums text-white/85">{num(at)}</span>
                </div>
                {n > 1 && (
                    <>
                        <button type="button" onClick={() => onGo(-1)} aria-label="Previous still" className={`${arrow} left-2 md:left-6`}><MdChevronLeft size={30} aria-hidden="true" /></button>
                        <button type="button" onClick={() => onGo(1)} aria-label="Next still" className={`${arrow} right-2 md:right-6`}><MdChevronRight size={30} aria-hidden="true" /></button>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
};

const Stills = ({ movie }) => {
    const frames = framesOf(movie);
    const [open, setOpen] = useState(null); // the frame on the full screen, or null
    const n = frames.length;
    const go = useCallback((d) => setOpen((i) => (i == null ? i : (i + d + n) % n)), [n]);
    const shut = useCallback(() => setOpen(null), []);
    if (n < 2) return null;

    return (
        <section id="stills" aria-labelledby="stills-title" className="own-transitions pt-24 md:pt-32 scroll-mt-4">
            <h2 id="stills-title" className="font-serif text-4xl md:text-5xl text-center">Stills from the film</h2>
            <p className="mt-3 mb-10 text-center font-serif italic text-lg text-gray-400">{n} frames. Tap any of them to see it full size.</p>
            {/* the contact sheet: the roll printed in frames, each numbered at its edge */}
            <div className="p-2.5 md:p-4 bg-[#0b0a09] ring-1 ring-white/[0.07]">
                <ol className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4">
                    {frames.map((src, i) => (
                        <li key={src}>
                            <button
                                type="button"
                                onClick={() => setOpen(i)}
                                aria-label={`Still ${i + 1} of ${n}: see it full size`}
                                className="group relative block w-full aspect-video overflow-hidden bg-black ring-1 ring-white/10 hover:ring-gold/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light"
                            >
                                <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover max-w-none transition-transform duration-500 group-hover:scale-[1.03]" />
                                <span aria-hidden="true" className="absolute left-2 bottom-1.5 font-label text-[12px] tracking-[0.14em] tabular-nums text-white/80 [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">{num(i)}</span>
                                <span aria-hidden="true" className="absolute right-2 top-2 px-2 py-0.5 bg-black/65 font-label text-[12px] tracking-[0.14em] uppercase text-gray-100 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">See it full size</span>
                            </button>
                        </li>
                    ))}
                </ol>
            </div>
            {open != null && <Viewer title={movie.title} frames={frames} at={open} onGo={go} onClose={shut} />}
        </section>
    );
};

export default Stills;
