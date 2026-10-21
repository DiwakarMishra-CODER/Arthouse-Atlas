import { useImperativeHandle, useRef, useState } from 'react';
import { pic } from '../directors/arrange';

/**
 * The Studios room's screen: the moment before a film when the screen goes white and the company
 * that made it puts its name there. `credit(house)` brings the projector's white up with the house's
 * name standing in it, set the way a company credits itself ("Toho presents"); `film(f)` lets one of
 * its films come up out of the light, the white falling away as the picture prints through. Between
 * two films of one house it flashes back through the white; when the scroll races, it simply cuts.
 * Only opacity moves (element.animate), and the words are the only state.
 *
 * Where the house's real logo is known (house.about.logo, from TMDB), it stands in the light exactly as
 * it is, only ever faded; a logo drawn light (for a dark ground) stands on the black instead.
 *
 * ref: { credit(house), film(f, { cut }) -> Promise, img() } · className sizes the screen · push: the
 * camera creeps in on the film while it's held
 */

// the white up or down, from wherever it is now
const fade = (el, to, duration) => {
    if (!el) return Promise.resolve();
    el.getAnimations().forEach((a) => a.cancel());
    const from = getComputedStyle(el).opacity;
    if (!duration) { el.style.opacity = String(to); return Promise.resolve(); }
    const a = el.animate([{ opacity: from }, { opacity: to }], { duration, easing: to ? 'cubic-bezier(0.2, 0.7, 0.2, 1)' : 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' });
    return a.finished.then(() => { el.style.opacity = String(to); a.cancel(); }).catch(() => {});
};
const srcOf = (f) => (f?.s ? pic(f.s, 'w1280') : f?.o ? pic(f.o, 'w780') : null);

const LOGO = 'https://image.tmdb.org/t/p/w500';

const LightScreen = ({ ref, className = '', reducedMotion, caption = true, push = false }) => {
    const img = useRef(null);
    const light = useRef(null);
    const gen = useRef(0);
    const shown = useRef({ house: null, film: null });
    const [words, setWords] = useState({ house: null, film: null });

    useImperativeHandle(ref, () => ({
        img: () => img.current,
        credit: (house) => {
            if (!house || (shown.current.house === house.slug && !shown.current.film)) return;
            gen.current += 1;
            shown.current = { house: house.slug, film: null };
            setWords({ house, film: null });
            fade(light.current, 1, reducedMotion ? 0 : 180);
        },
        film: (f, { cut = false } = {}) => {
            if (!f || shown.current.film === f.id) return Promise.resolve();
            const g = ++gen.current;
            const src = srcOf(f);
            const el = img.current;
            const was = shown.current.film;
            shown.current = { ...shown.current, film: f.id };
            const up = () => {
                if (g !== gen.current) return;
                if (src) el.src = src;
                setWords((w) => ({ ...w, film: f }));
                return fade(light.current, 0, cut || reducedMotion ? 0 : 900);
            };
            // between two films, back through the white first (unless the scroll is racing)
            const through = was && !cut && !reducedMotion ? fade(light.current, 1, 140) : Promise.resolve();
            const probe = new Image();
            if (src) probe.src = src;
            const ready = src && probe.decode ? probe.decode().catch(() => {}) : Promise.resolve();
            return Promise.all([ready, through]).then(up);
        },
    }), [reducedMotion]);

    const { house, film } = words;
    const logo = house?.about?.logo;
    const onBlack = house?.about?.logoTone === 'light';
    const ink = onBlack ? 'text-[#d9d2c3]' : 'text-[#3a332a]';
    return (
        <div className={`relative overflow-hidden bg-black ${className}`}>
            <img ref={img} alt="" decoding="async" className={`absolute inset-0 w-full h-full object-cover max-w-none ${push && !reducedMotion ? 'breath-push' : ''}`} />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.5))]" />
            {caption && film && (
                <div className="absolute inset-x-0 bottom-0 px-4 md:px-6 pt-10 pb-3 md:pb-4 bg-gradient-to-t from-black/85 to-transparent">
                    {house && <div className="mb-1 font-label text-[10px] md:text-[11px] tracking-[0.3em] uppercase text-gold">{house.name} presents</div>}
                    <div className="font-serif italic text-[15px] md:text-xl text-white truncate">{film.t}</div>
                    <div className="mt-0.5 font-label text-[11px] md:text-[12px] tracking-[0.14em] uppercase text-gray-300 truncate">
                        {[film.d?.join(' & '), film.y].filter(Boolean).join(' · ')}
                    </div>
                </div>
            )}
            {/* the projector's white, with the house's mark standing in it (its logo, or its name) */}
            <div ref={light} className={`${onBlack ? 'bg-black' : 'light-plate'} absolute inset-0 flex items-center justify-center`} style={{ opacity: 1 }}>
                {house && (
                    <div key={house.slug} className="title-rise relative w-full h-full flex flex-col items-center justify-center text-center px-6">
                        {logo ? (
                            <img src={`${LOGO}${logo}`} alt={house.name} className="max-w-[56%] max-h-[38%] w-auto h-auto object-contain" />
                        ) : (
                            <div className="font-serif uppercase tracking-[0.12em] leading-[1.05] text-[#16130e] text-[clamp(1.7rem,5vw,4.6rem)]">{house.name}</div>
                        )}
                        <div className={`mt-3 md:mt-4 flex items-center justify-center gap-3 font-label text-[11px] md:text-[13px] tracking-[0.35em] uppercase ${ink}`}>
                            <span className="w-8 h-px bg-current opacity-50" />presents<span className="w-8 h-px bg-current opacity-50" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LightScreen;
