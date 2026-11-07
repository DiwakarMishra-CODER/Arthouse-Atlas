import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, animate, motion } from 'framer-motion';
import { setRegion, regionName } from '../../hooks/region';
import { serviceLink } from './serviceLink';
import { WATCH_ARRIVE, goToWatch } from './watchJump';
import CountryPicker from './CountryPicker';
import { placeBy, useRegions } from './regionPicker';

/**
 * Where to watch a film: the box office's window, its own section under the film's opening.
 *
 * "Tonight in India", the country a gold word you can change (it flips over like a departure
 * board's letters when you do). Beside it, each service showing the film there, printed as a ticket:
 * the service's mark on the stub, its name, and its stamp (Stream in gold, Free in ivory, Rent and
 * Buy outlined). The tickets print in one after another as the section comes into view, and print
 * again for a new country. Five at most until you ask for the rest. How many countries are showing
 * it counts up. Arriving from the dock or the opening's last card, a projector beam sweeps the panel
 * once, softly. When it isn't showing here: where it is, and a button that takes you there.
 * JustWatch's listings, through TMDB, credited at the foot. Reduced motion: all of it, still.
 *
 * `watch` is the listing (GET /movies/:id/watch), null while it's on its way, false if it failed.
 */

const KIND = { stream: 'Stream', free: 'Free', rent: 'Rent', buy: 'Buy' };
const STAMP = {
    stream: 'bg-gold text-black',
    free: 'bg-[#f1ece2] text-black',
    rent: 'ring-1 ring-inset ring-white/35 text-gray-100',
    buy: 'ring-1 ring-inset ring-white/35 text-gray-100',
};
const LIBRARY = new Set(['Kanopy', 'Hoopla']);
const LOGO = 'https://image.tmdb.org/t/p/w92';
const FIRST = 5; // tickets shown before "N more ways to watch"
const PANEL = '#0c0b0a';
const EASE = [0.22, 1, 0.36, 1];

const streams = (o) => o.kinds.includes('stream') || o.kinds.includes('free');
const names = (list) => (list.length <= 2 ? list.join(' and ') : `${list.slice(0, 2).join(', ')} and ${list.length - 2} more`);
const daysSince = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

// the country's name, flipping over letter by letter (a departure board) when it changes
const FlipWord = ({ text, still }) => (
    <span className="inline-block [perspective:600px]">
        <AnimatePresence mode="wait" initial={false}>
            <motion.span key={text} className="inline-block" aria-hidden="true">
                {[...text].map((ch, i) => (
                    <motion.span
                        key={i}
                        className="inline-block origin-[50%_60%] [backface-visibility:hidden]"
                        initial={still ? false : { rotateX: -90, opacity: 0 }}
                        animate={{ rotateX: 0, opacity: 1, transition: { duration: 0.32, delay: i * 0.028, ease: EASE } }}
                        exit={still ? undefined : { rotateX: 90, opacity: 0, transition: { duration: 0.16, delay: i * 0.012 } }}
                    >
                        {ch === ' ' ? ' ' : ch}
                    </motion.span>
                ))}
            </motion.span>
        </AnimatePresence>
        <span className="sr-only">{text}</span>
    </span>
);

// a number counting up from nothing the first time it's seen (written straight to the page, no re-render per frame)
const CountUp = ({ to, still }) => {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        if (still) { el.textContent = String(to); return undefined; }
        let run;
        const seen = new IntersectionObserver(([e]) => {
            if (!e.isIntersecting) return;
            seen.disconnect();
            run = animate(0, to, { duration: 1.2, ease: EASE, onUpdate: (v) => { el.textContent = String(Math.round(v)); } });
        }, { threshold: 0.6 });
        seen.observe(el);
        return () => { seen.disconnect(); run?.stop(); };
    }, [to, still]);
    return <span ref={ref}>{still ? to : 0}</span>;
};

// a ticket printing out of the box office's slot, its stamp landing after it
const print = {
    hidden: { opacity: 0, y: -16, clipPath: 'inset(0% 0% 100% 0% round 12px)' },
    shown: { opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0% round 12px)', transition: { duration: 0.55, ease: EASE } },
};
const stamp = {
    hidden: { opacity: 0, scale: 1.7 },
    shown: (i) => ({ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 520, damping: 20, delay: 0.32 + i * 0.06 } }),
};

const Ticket = ({ o, title, page, still }) => {
    const direct = serviceLink(o.name, title); // the service's own search (its app, on a phone), else the listings
    return (
        <motion.li variants={still ? undefined : print} className="relative">
            <a
                href={direct || page}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${o.name}: ${o.kinds.map((k) => KIND[k]).join(', ')} (${direct ? `opens ${o.name}` : 'opens the listings'})`}
                className="group flex items-stretch rounded-xl bg-white/[0.035] ring-1 ring-white/10 transition-colors hover:bg-white/[0.07] hover:ring-white/25"
            >
                {/* the stub: the service's mark */}
                <span className="flex items-center justify-center w-[64px] md:w-[72px] shrink-0 border-r border-dashed border-white/15">
                    {o.logo
                        ? <img src={`${LOGO}${o.logo}`} alt="" decoding="async" className="w-10 h-10 rounded-lg ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105" />
                        : <span aria-hidden="true" className="w-10 h-10 rounded-lg bg-white/10" />}
                </span>
                <span className="flex-1 min-w-0 flex items-center gap-3 pl-4 pr-3 md:pr-4 py-3.5">
                    <span className="flex-1 min-w-0 truncate font-serif text-[18px] md:text-[21px] leading-snug text-white">{o.name}</span>
                    <span className="flex flex-wrap justify-end gap-1.5">
                        {o.kinds.map((k, i) => (
                            <motion.span key={k} variants={still ? undefined : stamp} custom={i} className={`rounded-md px-2.5 py-1.5 font-label uppercase text-[11px] md:text-[12px] tracking-[0.16em] leading-none ${STAMP[k]}`}>
                                {KIND[k]}
                            </motion.span>
                        ))}
                    </span>
                    <svg aria-hidden="true" viewBox="0 0 12 12" className="w-3 h-3 shrink-0 text-gray-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"><path d="M3 9l6-6M4.5 3H9v4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
                </span>
            </a>
            {/* the notches where the stub tears off */}
            <span aria-hidden="true" className="absolute left-[58px] md:left-[66px] -top-[6px] w-3 h-3 rounded-full" style={{ background: PANEL }} />
            <span aria-hidden="true" className="absolute left-[58px] md:left-[66px] -bottom-[6px] w-3 h-3 rounded-full" style={{ background: PANEL }} />
        </motion.li>
    );
};

// what the listing comes to, in a sentence
const summaryOf = (offers, watch, region) => {
    const on = offers.filter(streams).map((o) => o.name);
    const off = offers.filter((o) => !streams(o)).map((o) => o.name);
    if (on.length) return `Streaming on ${names(on)}.${off.length ? ` To rent or buy on ${off.length === 1 ? off[0] : `${off.length} more`}.` : ''}`;
    if (off.length) return `Not streaming in ${regionName(region, { inSentence: true })}, but you can rent or buy it on ${names(off)}.`;
    return null; // (nothing here: the card beside it says so, and where it is instead)
};

// "India’s", "the United States’"
const possessive = (name) => (name.endsWith('s') ? `${name}’` : `${name}’s`);

// ---------------------------------------------------------------------------
// the section
// ---------------------------------------------------------------------------
const WhereToWatch = ({ watch, region, title, reducedMotion: still = false }) => {
    const regions = useRegions(region);
    const [open, setOpen] = useState(null); // where the picker sits while open (null: closed)
    const [moreFor, setMoreFor] = useState(null); // the country the rest of the tickets are open for
    const [beam, setBeam] = useState(0); // each sweep of the projector's beam
    const trigger = useRef(null);
    const panel = useRef(null);
    const showing = useMemo(() => new Set(watch?.showingIn || []), [watch]);
    const offers = watch?.offers || [];
    const more = moreFor === region;
    const shownOffers = more ? offers : offers.slice(0, FIRST);
    const hidden = offers.length - FIRST;

    const close = useMemo(() => (refocus) => { setOpen(null); if (refocus) trigger.current?.focus(); }, []);
    const pick = (cc) => { setRegion(cc); close(true); };
    const toggle = () => setOpen((now) => (now ? null : placeBy(trigger.current.getBoundingClientRect())));

    // the beam sweeps once when the section first comes into view, and again when you're brought to it
    useEffect(() => {
        if (still || !panel.current) return undefined;
        const seen = new IntersectionObserver(([e]) => { if (e.isIntersecting) { seen.disconnect(); setBeam((b) => b + 1); } }, { threshold: 0.4 });
        seen.observe(panel.current);
        let wait;
        const arrive = () => { clearTimeout(wait); wait = setTimeout(() => setBeam((b) => b + 1), 650); };
        window.addEventListener(WATCH_ARRIVE, arrive);
        return () => { seen.disconnect(); clearTimeout(wait); window.removeEventListener(WATCH_ARRIVE, arrive); };
    }, [still]);

    return (
        <section id="watch" aria-labelledby="watch-title" className="pt-20 md:pt-28 scroll-mt-24">
            <div ref={panel} className="relative overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.55)] px-5 py-7 md:px-10 md:py-10" style={{ background: PANEL }}>
                {/* the projector's beam: a soft band of light crossing the panel once */}
                {beam > 0 && !still && (
                    <motion.div
                        key={beam}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-[linear-gradient(100deg,transparent,rgba(241,236,226,0.07),transparent)]"
                        initial={{ x: '0%' }}
                        animate={{ x: '420%' }}
                        transition={{ duration: 1.7, ease: [0.45, 0, 0.2, 1] }}
                    />
                )}

                <div className="relative grid lg:grid-cols-12 gap-8 lg:gap-12">
                    {/* the window: the country, what's on, how widely */}
                    <div className="lg:col-span-5">
                        <div className="font-label uppercase text-[12px] tracking-[0.3em] text-gold">Where to watch</div>
                        <h2 id="watch-title" className="mt-2 font-serif font-light text-[32px] md:text-[44px] leading-[1.1] text-white">
                            Tonight in{' '}
                            <button
                                ref={trigger}
                                type="button"
                                onClick={toggle}
                                aria-haspopup="dialog"
                                aria-expanded={!!open}
                                aria-label={`${regionName(region)}: change your country`}
                                className="inline-flex items-baseline gap-2 rounded-md text-gold-light underline decoration-gold/40 decoration-1 underline-offset-[8px] hover:decoration-gold-light focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold"
                            >
                                <FlipWord text={regionName(region)} still={still} />
                                <svg aria-hidden="true" viewBox="0 0 12 8" className={`w-3.5 h-2.5 self-center transition-transform duration-300 ${open ? 'rotate-180' : ''}`}><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
                            </button>
                        </h2>
                        {open && <CountryPicker place={open} anchorRef={trigger} region={region} regions={regions} showing={showing} onPick={pick} onClose={close} still={still} />}

                        {watch && summaryOf(offers, watch, region) && (
                            <p className="mt-4 font-serif italic text-[18px] md:text-[20px] leading-relaxed text-gray-200">{summaryOf(offers, watch, region)}</p>
                        )}
                        {watch && watch.countries > 0 && (
                            <div className="mt-7 flex items-end gap-3">
                                <span className="font-label text-[56px] md:text-[68px] leading-[0.85] text-gold tabular-nums"><CountUp to={watch.countries} still={still} /></span>
                                <span className="pb-1 font-label uppercase text-[12px] tracking-[0.2em] leading-snug text-gray-300">{watch.countries === 1 ? 'country' : 'countries'}<br />showing it</span>
                            </div>
                        )}
                        {watch && (
                            <p className="mt-7 font-label uppercase text-[11.5px] md:text-[12px] tracking-[0.14em] leading-relaxed text-gray-300">
                                <a href={watch.page} target="_blank" rel="noopener noreferrer" className="text-gray-100 underline decoration-white/30 underline-offset-4 hover:text-white">All listings ↗</a>
                                <span aria-hidden="true" className="mx-2 text-gray-600">·</span>
                                <span>Data from <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer" className="underline decoration-white/30 underline-offset-4 hover:text-white">JustWatch</a></span>
                                {watch.stale && watch.checkedAt && <><span aria-hidden="true" className="mx-2 text-gray-600">·</span><span>Checked {daysSince(watch.checkedAt)} days ago</span></>}
                            </p>
                        )}
                    </div>

                    {/* the tickets */}
                    <div className="lg:col-span-7" aria-live="polite">
                        {watch === null ? (
                            <div aria-label="Finding where it's showing" className="space-y-3">
                                {[0, 1, 2].map((i) => <div key={i} className="h-[68px] rounded-xl animate-pulse bg-white/[0.05]" />)}
                            </div>
                        ) : watch === false ? (
                            <p className="font-serif italic text-[20px] text-gray-200">The listings can’t be reached just now. Try again in a moment.</p>
                        ) : offers.length ? (
                            <>
                                <motion.ul
                                    key={region}
                                    className="space-y-3"
                                    initial={still ? false : 'hidden'}
                                    whileInView="shown"
                                    viewport={{ once: true, amount: 0.2 }}
                                    variants={{ shown: { transition: { staggerChildren: 0.09 } } }}
                                >
                                    {shownOffers.map((o) => <Ticket key={o.id} o={o} title={title} page={watch.page} still={still} />)}
                                </motion.ul>
                                {hidden > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setMoreFor(more ? null : region)}
                                        aria-expanded={more}
                                        className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3 font-label uppercase text-[12px] tracking-[0.2em] text-gray-200 transition-colors hover:border-white/40 hover:text-white"
                                    >
                                        {more ? 'Fewer' : `${hidden} more ${hidden === 1 ? 'way' : 'ways'} to watch`}
                                        <svg aria-hidden="true" viewBox="0 0 12 8" className={`w-3 h-2 transition-transform duration-300 ${more ? 'rotate-180' : ''}`}><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
                                    </button>
                                )}
                            </>
                        ) : (
                            <motion.div
                                key={region}
                                initial={still ? false : { opacity: 0, y: 14 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, ease: EASE }}
                                className="rounded-xl bg-white/[0.035] ring-1 ring-white/10 p-6 md:p-8"
                            >
                                <p className="font-serif italic text-[24px] md:text-[28px] leading-snug text-white">
                                    {watch.countries ? `Not showing in ${regionName(region, { inSentence: true })} tonight.` : 'Not showing anywhere just now.'}
                                </p>
                                {watch.elsewhere && (
                                    <>
                                        <p className="mt-2 text-[16px] md:text-[17px] leading-relaxed text-gray-200">
                                            {watch.elsewhere.free ? 'Free' : 'Streaming'} in {regionName(watch.elsewhere.region, { inSentence: true })} on {watch.elsewhere.name}{LIBRARY.has(watch.elsewhere.name) ? ', with a library card' : ''}.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setRegion(watch.elsewhere.region)}
                                            className="mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-3 font-label uppercase text-[12px] tracking-[0.18em] text-gold-light ring-1 ring-gold/50 transition-colors hover:bg-gold hover:text-black"
                                        >
                                            See {possessive(regionName(watch.elsewhere.region, { inSentence: true }))} listings <span aria-hidden="true">→</span>
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

// the opening's last card: one line on where it's showing, and the way down to the box office
export const WatchTeaser = ({ watch, region }) => {
    const offers = watch?.offers || [];
    const on = offers.filter(streams);
    const here = regionName(region, { inSentence: true });
    const line = watch == null ? 'Finding where it’s showing…'
        : watch === false ? 'Where to watch it, below'
            : on.length ? `Streaming on ${on[0].name}${on.length > 1 ? ` and ${on.length - 1} more` : ''} in ${here}`
                : offers.length ? `To rent or buy on ${offers[0].name}${offers.length > 1 ? ` and ${offers.length - 1} more` : ''} in ${here}`
                    : `Not streaming in ${here} tonight`;
    return (
        <div className="flex flex-col items-center text-center">
            <div className="card-rise font-label uppercase text-[12px] md:text-[13px] tracking-[0.3em] text-gold">Where to watch</div>
            <p className="card-rise mt-2 font-serif text-[24px] md:text-[32px] leading-snug text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.85)]">{line}</p>
            <button
                type="button"
                onClick={goToWatch}
                className="card-rise-late mt-5 inline-flex items-center gap-2 rounded-full bg-black/55 px-5 py-2.5 font-label uppercase text-[12px] tracking-[0.2em] text-gold-light ring-1 ring-gold/50 transition-colors hover:bg-gold hover:text-black"
            >
                See where to watch <span aria-hidden="true">↓</span>
            </button>
        </div>
    );
};

export default WhereToWatch;
