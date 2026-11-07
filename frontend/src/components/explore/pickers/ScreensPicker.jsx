import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clear } from './parts';
import { filmsWord } from './util';
import CountryPicker from '../../film/CountryPicker';
import { placeBy, useRegions } from '../../film/regionPicker';
import { regionName } from '../../../hooks/region';

/**
 * Where you'll watch it: the films streaming tonight, in your country. Two big tickets first,
 * anything streaming at all, and free to watch (with ads, or a library card); then the services
 * themselves, each with its mark and how many of these films it has, to tick as many as you have
 * (a service counts with its channels and ad tiers: ticking MUBI finds what's on MUBI's Amazon
 * channel too). The country is a gold word, changed with the same picker as a film's page. The
 * tickets print in as the tab opens; a ticked one gets its gold stamp. Counts are with the board's
 * other words applied, like every other picker's. JustWatch's listings, credited.
 *
 * value: '' (any screen, streaming or not) | 'all' | 'free' | '11,8' (service ids)
 */

const LOGO = 'https://image.tmdb.org/t/p/w92';
const FIRST = 18; // services shown before "All N services"
const EASE = [0.22, 1, 0.36, 1];
const print = {
    hidden: { opacity: 0, y: -10, clipPath: 'inset(0% 0% 100% 0% round 12px)' },
    shown: { opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0% round 12px)', transition: { duration: 0.45, ease: EASE } },
};

const Tick = ({ on, still }) => (
    <AnimatePresence>
        {on && (
            <motion.span
                key="tick"
                aria-hidden="true"
                initial={still ? false : { scale: 1.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 520, damping: 20 }}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gold text-black flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.6)]"
            >
                <svg viewBox="0 0 12 12" className="w-3 h-3"><path d="M2.5 6.3l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </motion.span>
        )}
    </AnimatePresence>
);

// a big ticket: anything streaming, or free
const BigTicket = ({ on, onClick, title, line, n, icon, still }) => (
    <motion.div variants={still ? undefined : print}>
        <button
            type="button"
            onClick={onClick}
            aria-pressed={on}
            disabled={!n && !on}
            className={`group relative w-full h-full flex items-center gap-4 rounded-xl px-5 py-4 text-left ring-1 transition-colors disabled:opacity-30 ${on ? 'ring-gold bg-gold/[0.09]' : 'ring-white/10 bg-white/[0.03] hover:ring-white/30 hover:bg-white/[0.05]'}`}
        >
            <span aria-hidden="true" className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ring-1 ${on ? 'bg-gold text-black ring-gold' : 'text-gold-light ring-gold/40'}`}>{icon}</span>
            <span className="flex-1 min-w-0">
                <span className="block font-serif text-[20px] md:text-[22px] leading-tight text-white">{title}</span>
                <span className="block mt-0.5 text-[14px] text-gray-400">{line}</span>
            </span>
            <span className="font-label text-[22px] md:text-[26px] leading-none text-gold tabular-nums">{n}<span className="ml-1.5 text-[11px] tracking-[0.14em] uppercase text-gray-400">{n === 1 ? 'film' : 'films'}</span></span>
            <Tick on={on} still={still} />
        </button>
    </motion.div>
);

const Service = ({ s, on, onClick, still }) => (
    <motion.li variants={still ? undefined : print}>
        <button
            type="button"
            onClick={onClick}
            aria-pressed={on}
            disabled={!s.n && !on}
            className={`group relative w-full h-full flex items-center gap-3 rounded-xl p-3 text-left ring-1 transition-colors disabled:opacity-30 ${on ? 'ring-gold bg-gold/[0.08]' : 'ring-white/10 bg-white/[0.03] hover:ring-white/30 hover:bg-white/[0.05]'}`}
        >
            {s.logo
                ? <img src={`${LOGO}${s.logo}`} alt="" decoding="async" className="w-11 h-11 shrink-0 rounded-lg ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105" />
                : <span aria-hidden="true" className="w-11 h-11 shrink-0 rounded-lg bg-white/10" />}
            <span className="min-w-0">
                <span className="block font-serif text-[16px] leading-tight text-gray-100 truncate">{s.name}</span>
                <span className="block mt-1 font-label uppercase text-[11px] tracking-[0.14em] text-gray-400">{filmsWord(s.n)}</span>
            </span>
            <Tick on={on} still={still} />
        </button>
    </motion.li>
);

const PLAY = <svg viewBox="0 0 20 20" className="w-5 h-5"><rect x="2" y="4" width="16" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M7 18h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M8.6 7.2v4.6l3.8-2.3z" fill="currentColor" /></svg>;
const FREE = <svg viewBox="0 0 20 20" className="w-5 h-5"><path d="M3 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 17 5.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5v-2a2.5 2.5 0 0 0 0-5z" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M8 7.5l4 5M12 7.5l-4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;

const ScreensPicker = ({ facet, value, region, onChange, onRegion, still = false }) => {
    const regions = useRegions(region);
    const [open, setOpen] = useState(null); // where the country picker sits while open
    const [everything, setEverything] = useState(false);
    const trigger = useRef(null);
    const ids = useMemo(() => new Set(/^[\d,]+$/.test(value || '') ? value.split(',').map(Number) : []), [value]);
    const toggle = (id) => {
        const next = new Set(ids);
        if (next.has(id)) next.delete(id); else next.add(id);
        onChange([...next].join(','));
    };
    const close = useMemo(() => (refocus) => { setOpen(null); if (refocus) trigger.current?.focus(); }, []);
    const services = facet?.services || [];
    // the first few, and any ticked ones further down
    const shown = everything ? services : [...services.slice(0, FIRST), ...services.slice(FIRST).filter((s) => ids.has(s.id))];

    return (
        <>
            <Clear label="Any screen, streaming or not" active={!value} onClick={() => onChange('')} />
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <h3 className="font-serif text-[22px] md:text-[26px] text-white">
                    Streaming tonight in{' '}
                    <button
                        ref={trigger}
                        type="button"
                        onClick={() => setOpen((now) => (now ? null : placeBy(trigger.current.getBoundingClientRect())))}
                        aria-haspopup="dialog"
                        aria-expanded={!!open}
                        aria-label={`${regionName(region)}: change your country`}
                        className="inline-flex items-baseline gap-1.5 rounded-md text-gold-light underline decoration-gold/40 underline-offset-[6px] hover:decoration-gold-light"
                    >
                        {regionName(region)}
                        <svg aria-hidden="true" viewBox="0 0 12 8" className={`w-3 h-2 self-center transition-transform duration-300 ${open ? 'rotate-180' : ''}`}><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
                    </button>
                </h3>
                <span className="font-label uppercase text-[11px] tracking-[0.16em] text-gray-400">
                    Updated daily · data from <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer" className="underline decoration-white/30 underline-offset-4 hover:text-white">JustWatch</a>
                </span>
            </div>
            {open && <CountryPicker place={open} anchorRef={trigger} region={region} regions={regions} onPick={(cc) => { onRegion(cc); close(true); }} onClose={close} still={still} />}

            {!facet ? (
                <div className="grid sm:grid-cols-2 gap-3">{[0, 1].map((i) => <div key={i} className="h-[84px] rounded-xl animate-pulse bg-white/[0.05]" />)}</div>
            ) : !facet.ready ? (
                <p className="font-serif italic text-[19px] text-gray-300">Tonight’s listings are still being gathered. Try again in a minute.</p>
            ) : !facet.all ? (
                <p className="font-serif italic text-[19px] text-gray-300">None of these films is streaming in {regionName(region, { inSentence: true })} tonight. Take a word off the board, or try another country.</p>
            ) : (
                <>
                    <motion.div key={region} className="grid sm:grid-cols-2 gap-3" initial={still ? false : 'hidden'} animate="shown" variants={{ shown: { transition: { staggerChildren: 0.08 } } }}>
                        <BigTicket on={value === 'all'} onClick={() => onChange(value === 'all' ? '' : 'all')} title="Anything streaming" line="On any service, with a subscription or free" n={facet.all} icon={PLAY} still={still} />
                        {facet.free > 0 && <BigTicket on={value === 'free'} onClick={() => onChange(value === 'free' ? '' : 'free')} title="Free to watch" line="With ads, or with a library card" n={facet.free} icon={FREE} still={still} />}
                    </motion.div>

                    <div className="mt-7 mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-label uppercase text-[12px] tracking-[0.2em] text-gold">Or the services you have</span>
                        <span className="text-[14px] text-gray-400">tick as many as you like</span>
                    </div>
                    <motion.ul key={`s-${region}`} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" initial={still ? false : 'hidden'} animate="shown" variants={{ shown: { transition: { staggerChildren: 0.035, delayChildren: 0.15 } } }}>
                        {shown.map((s) => <Service key={s.id} s={s} on={ids.has(s.id)} onClick={() => toggle(s.id)} still={still} />)}
                    </motion.ul>
                    {services.length > FIRST && (
                        <button
                            type="button"
                            onClick={() => setEverything((e) => !e)}
                            aria-expanded={everything}
                            className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3 font-label uppercase text-[12px] tracking-[0.2em] text-gray-200 transition-colors hover:border-white/40 hover:text-white"
                        >
                            {everything ? 'Fewer services' : `All ${services.length} services`}
                            <svg aria-hidden="true" viewBox="0 0 12 8" className={`w-3 h-2 transition-transform duration-300 ${everything ? 'rotate-180' : ''}`}><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
                        </button>
                    )}
                </>
            )}
        </>
    );
};

export default ScreensPicker;
