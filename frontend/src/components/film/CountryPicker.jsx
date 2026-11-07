import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { regionName } from '../../hooks/region';
import { PICKER_W } from './regionPicker';

/**
 * The country picker: a dark sheet that unrolls from the word that opened it (like film off a
 * reel), found by typing, with the countries that matter here first (on a film's page, the ones
 * showing it), each lit by a gold dot. Enter takes the first match, Esc closes and gives focus
 * back. On a phone it doesn't focus the search by itself (that would pull the keyboard up unasked).
 *
 * `place` comes from placeBy() (regionPicker.js), worked out when the word was pressed.
 */

const EASE = [0.22, 1, 0.36, 1];

const CountryItem = ({ cc, lit, region, onPick, i, still }) => (
    <motion.li
        initial={still ? false : { opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: Math.min(i, 12) * 0.025, ease: EASE }}
    >
        <button
            type="button"
            onClick={() => onPick(cc)}
            aria-current={cc === region ? 'true' : undefined}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left font-serif text-[17px] transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.08] outline-none ${cc === region ? 'text-gold-light' : 'text-gray-100'}`}
        >
            <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full shrink-0 ${lit ? 'bg-gold shadow-[0_0_10px_rgba(217,173,98,0.9)]' : 'bg-white/15'}`} />
            <span className="flex-1">{regionName(cc)}</span>
            {cc === region && <span className="font-label uppercase text-[11px] tracking-[0.18em] text-gold">Yours</span>}
        </button>
    </motion.li>
);

const NONE = new Set();

const CountryPicker = ({ place, anchorRef, region, regions, showing = NONE, showingLabel = 'Showing this film', onPick, onClose, still }) => {
    const [q, setQ] = useState('');
    const sheet = useRef(null);
    const input = useRef(null);

    useEffect(() => { if (window.matchMedia?.('(pointer: fine)').matches) input.current?.focus({ preventScroll: true }); }, []);
    // a click elsewhere closes it, and so does scrolling the page on; small scrolls (a phone's
    // keyboard nudging the page) don't
    useEffect(() => {
        const startY = window.scrollY;
        const away = (e) => { if (!sheet.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) onClose(false); };
        const moved = () => { if (Math.abs(window.scrollY - startY) > 60) onClose(false); };
        document.addEventListener('pointerdown', away);
        window.addEventListener('scroll', moved, { passive: true });
        return () => {
            document.removeEventListener('pointerdown', away);
            window.removeEventListener('scroll', moved);
        };
    }, [anchorRef, onClose]);

    const find = q.trim().toLowerCase();
    const matches = regions.filter((cc) => !find || regionName(cc).toLowerCase().includes(find) || cc.toLowerCase() === find);
    const here = matches.filter((cc) => showing.has(cc));
    const rest = matches.filter((cc) => !showing.has(cc));
    const pickFirst = (e) => { if (e.key === 'Enter' && matches.length) { e.preventDefault(); onPick(matches[0]); } };
    const { from, ...at } = place;
    const shut = from === 'top' ? 'inset(0% 0% 100% 0% round 14px)' : 'inset(100% 0% 0% 0% round 14px)';

    return createPortal(
        <motion.div
            ref={sheet}
            role="dialog"
            aria-label="Choose your country"
            onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(true); } }}
            initial={still ? false : { clipPath: shut, opacity: 0.4 }}
            animate={{ clipPath: 'inset(0% 0% 0% 0% round 14px)', opacity: 1 }}
            transition={{ duration: 0.42, ease: EASE }}
            style={{ ...at, width: `min(${PICKER_W}px, calc(100vw - 32px))` }}
            className="fixed z-[90] flex flex-col max-h-[min(460px,70vh)] rounded-[14px] bg-[#0c0b0a] ring-1 ring-white/15 shadow-[0_30px_80px_rgba(0,0,0,0.75)]"
        >
            <div className="px-4 pt-4 pb-3 border-b border-white/10">
                <div className="font-label uppercase text-[11px] tracking-[0.24em] text-gold">Watching from</div>
                <input
                    ref={input}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={pickFirst}
                    placeholder="Find a country"
                    aria-label="Find a country"
                    className="mt-2 w-full rounded-lg bg-white/[0.06] px-3 py-2.5 font-sans text-[15px] text-white placeholder:text-gray-500 ring-1 ring-white/10 focus:ring-gold/60 outline-none"
                />
            </div>
            <div className="overflow-y-auto overscroll-contain p-2">
                {here.length > 0 && (
                    <>
                        <div className="px-3 pt-1 pb-1 font-label uppercase text-[11px] tracking-[0.2em] text-gold/90">{showingLabel} · {here.length}</div>
                        <ul>{here.map((cc, i) => <CountryItem key={cc} cc={cc} lit region={region} onPick={onPick} i={i} still={still} />)}</ul>
                    </>
                )}
                {rest.length > 0 && (
                    <>
                        <div className="px-3 pt-3 pb-1 font-label uppercase text-[11px] tracking-[0.2em] text-gray-400">{here.length ? 'Everywhere else' : 'Countries'}</div>
                        <ul>{rest.map((cc, i) => <CountryItem key={cc} cc={cc} region={region} onPick={onPick} i={here.length + i} still={still} />)}</ul>
                    </>
                )}
                {!matches.length && <p className="px-3 py-3 font-serif italic text-gray-400">No country by that name.</p>}
            </div>
        </motion.div>,
        document.body,
    );
};

export default CountryPicker;
