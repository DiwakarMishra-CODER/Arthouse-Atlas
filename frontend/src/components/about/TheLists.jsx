import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MdArrowOutward, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { aboutAPI } from '../../services/api';
import { pic } from '../directors/arrange';
import { citation } from '../film/canonWords';
import { GROUPS, LISTS, groupName } from './listNotes';
import { sizeFor, useDecoded } from './frames';

/**
 * Where the votes come from: the 20 lists, as a repertory cinema's programmes, on one screen.
 *
 * The screen plays one list as two films, each a big still with the camera creeping in: its number
 * one (or the film it shares with the most lists), then its rarest pick, the film on it the fewest
 * other lists have, so you see what the list is and what only it brings. Each says how many of the
 * lists have it. Then the next list comes on (its title card, then its first film). Under the screen,
 * the programme: all twenty as a reel of pictures; tap one and the screen changes right there, so
 * nothing makes you scroll back up. The bar under the screen's corner is its clock: it fills as a film
 * plays, and a hand on the screen holds it. ?list=<source> opens it on a list.
 */

const STEP = 4500; // ms on each film
const REST = 7000; // ms a hand on it holds the playing
const CARD = 900; // ms on a list's title card

// a film's place, worded: a number set large where there is one ("#2 · 2022" → 2, "· 2022")
const placeOf = (p) => {
    if (p.source === 'ebert-great') return { text: 'One of his Great Movies' };
    const t = citation(p).place || '';
    const ranked = /^#(\d+)\s*(.*)$/.exec(t);
    if (ranked) return { num: ranked[1], rest: ranked[2].replace(/^·\s*/, '') };
    const spine = /^Spine\s*#?(\d+)/i.exec(t);
    if (spine) return { pre: 'Spine', num: spine[1] };
    return { text: t };
};
// what each of a list's two films is to it
const roleOf = (l, i) => {
    if (i === 1) return 'Its rarest pick';
    if (l.top?.p.rank === 1) return 'Its number one';
    return l.source === 'criterion' ? 'Its first' : 'Its most shared film';
};

const TheLists = ({ reducedMotion }) => {
    const [params, setParams] = useSearchParams();
    const [index, setIndex] = useState([]);
    const [source, setSource] = useState(() => params.get('list'));
    const [shot, setShot] = useState(0);
    const [card, setCard] = useState(false);
    const [held, setHeld] = useState(() => !!params.get('list'));
    const [seen, setSeen] = useState(false);
    const [size] = useState(sizeFor);
    const [ready, want] = useDecoded();
    const block = useRef(null);
    const reel = useRef(null);
    const swipe = useRef(null);
    const letGo = useRef(null);

    // the programme: the lists by group, the most films first within each
    const programme = useMemo(() => GROUPS.flatMap(([family]) => index.filter((l) => l.family === family).sort((a, b) => b.count - a.count)), [index]);
    const i = programme.findIndex((l) => l.source === source);
    const list = programme[i];
    const shots = list ? [list.top, list.own].filter(Boolean) : [];
    const film = shots[shot];
    const upNext = programme.length ? programme[(i + 1) % programme.length] : null;
    const note = LISTS[source] || {};

    useEffect(() => {
        let gone = false;
        aboutAPI.lists().then((r) => {
            if (gone) return;
            setIndex(r.data);
            setSource((s) => (s && r.data.some((l) => l.source === s) ? s : 'ss2022-critics'));
        }).catch(() => {});
        return () => { gone = true; };
    }, []);
    // opened on a list (from a film page): straight to it, held there a moment
    useEffect(() => {
        if (!params.get('list') || !index.length) return undefined;
        const t = setTimeout(() => document.getElementById('lists')?.scrollIntoView({ block: 'start' }), 60);
        letGo.current = setTimeout(() => setHeld(false), REST);
        return () => clearTimeout(t);
        // (once, when the lists have come)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index.length]);
    useEffect(() => () => clearTimeout(letGo.current), []);

    // this list's two stills and the next list's first, decoded ahead
    useEffect(() => {
        if (list) want([list.top, list.own, upNext?.top].map((f) => (f?.s ? pic(f.s, size) : null)));
    }, [list, upNext, size, want]);

    // it plays only while it's on screen
    useEffect(() => {
        const el = block.current;
        if (!el) return undefined;
        const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.4 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    const hold = () => {
        setHeld(true);
        clearTimeout(letGo.current);
        letGo.current = setTimeout(() => setHeld(false), REST);
    };
    const choose = (s, { by = 'hand' } = {}) => {
        if (by === 'hand') hold();
        setSource(s);
        setShot(0);
        if (!reducedMotion) {
            setCard(true);
            setTimeout(() => setCard(false), CARD);
        }
        if (by === 'hand') {
            const next = new URLSearchParams(params);
            next.set('list', s);
            setParams(next, { replace: true, preventScrollReset: true });
        }
    };
    const stepList = (d) => {
        if (programme.length) choose(programme[(i + d + programme.length) % programme.length].source);
    };
    // the clock ran out: the list's next film, or the next list
    const advance = () => {
        if (shot + 1 < shots.length) setShot(shot + 1);
        else if (upNext) choose(upNext.source, { by: 'itself' });
    };

    // the programme follows the list playing (sideways only: the page itself never moves)
    useEffect(() => {
        const r = reel.current;
        const el = r?.querySelector(`[data-source="${source}"]`);
        if (el) r.scrollTo({ left: el.offsetLeft - (r.clientWidth - el.offsetWidth) / 2, behavior: reducedMotion ? 'auto' : 'smooth' });
    }, [source, reducedMotion, programme.length]);

    const src = film?.s ? pic(film.s, size) : null;
    const place = film ? placeOf(film.p) : null;
    const playing = seen && !held && !reducedMotion;

    return (
        <section id="lists" aria-labelledby="lists-title" className="pt-24 md:pt-32 scroll-mt-16">
            <div className="max-w-7xl mx-auto px-4 md:px-10">
                <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">Where the votes come from</div>
                <h2 id="lists-title" className="mt-1 font-serif font-light text-3xl md:text-5xl leading-tight text-white">The {index.length || 20} lists</h2>
                <p className="mt-2 max-w-3xl font-serif italic text-lg text-gray-300">Every film in the atlas is here because at least one of these placed it. Each list plays as two films: its number one, and the pick that only it, or almost only it, made.</p>
            </div>

            <div ref={block} className="mt-6 md:mt-8 h-[calc(100svh-4.5rem)] md:h-[calc(100svh-5rem)] min-h-[560px] flex flex-col bg-black">
                {/* the screen: a list, playing */}
                <div
                    className="relative basis-[70%] md:basis-[71%] shrink-0 overflow-hidden select-none touch-pan-y"
                    tabIndex={0}
                    aria-label={note.name ? `${note.name}, playing. Arrow keys change the list.` : 'A list, playing'}
                    onKeyDown={(e) => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (d) { e.preventDefault(); stepList(d); } }}
                    onPointerDown={(e) => { swipe.current = e.clientX; }}
                    onPointerUp={(e) => { const dx = swipe.current == null ? 0 : e.clientX - swipe.current; swipe.current = null; if (Math.abs(dx) > 50) stepList(dx < 0 ? 1 : -1); }}
                >
                    {/* (a list's first film starts from its picture on the reel, already here, until the sharp one is ready) */}
                    {!card && src && (ready.has(src) || shot === 0) && (
                        <img key={`${source}-${shot}`} src={ready.has(src) ? src : pic(film.s, 'w300')} alt="" className="absolute inset-0 w-full h-full object-cover max-w-none frame-push [object-position:50%_25%] [transform-origin:50%_25%]" />
                    )}
                    <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.88),rgba(0,0,0,0.3)_45%,rgba(0,0,0,0.1)_65%,rgba(0,0,0,0.6))]" />

                    {/* the list, named */}
                    {list && (
                        <div key={`n-${source}`} className="subtitle-in absolute left-4 md:left-10 right-4 md:right-[40%] top-4 md:top-7 [text-shadow:0_1px_10px_rgba(0,0,0,0.85)]">
                            <div className="font-label text-[11px] md:text-[12px] tracking-[0.18em] uppercase text-gold">{groupName(list.family)}</div>
                            <div className="mt-1 font-serif text-[1.35rem] md:text-[2rem] leading-tight text-white">{note.name || list.label}</div>
                            {note.line && <p className="hidden md:block mt-1.5 font-serif text-[1.02rem] leading-snug text-gray-200">{note.line}</p>}
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-5 font-label text-[11px] md:text-[12px] tracking-[0.14em] uppercase text-gray-300">
                                <span><span className="text-gold-light">{list.count}</span> of its films are in the atlas</span>
                                {list.url && <a href={list.url} target="_blank" rel="noreferrer" className="hidden md:inline-flex items-center gap-1 min-h-9 text-gold hover:text-gold-light">The list itself <MdArrowOutward aria-hidden="true" /></a>}
                            </div>
                        </div>
                    )}

                    {/* a list's title card, as it comes on */}
                    {card && list && (
                        <div className="frame-cut absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-black">
                            <div className="font-label text-[12px] tracking-[0.3em] uppercase text-gold">{groupName(list.family)}</div>
                            <div className="mt-2 font-serif font-light text-3xl md:text-6xl leading-tight text-white">{note.name || list.label}</div>
                        </div>
                    )}

                    {/* the bottom of the screen: the film, and the hands (above it on a phone, beside it wider) */}
                    {list && (
                        <div className="absolute left-4 right-3 md:left-10 md:right-8 bottom-4 md:bottom-7 flex flex-col-reverse md:flex-row md:items-end md:justify-between gap-1 md:gap-8">
                            {/* the film: what it is to the list, its place set large, its name, how many lists have it */}
                            {film && !card ? (
                                <Link key={`p-${source}-${shot}`} to={`/movie/${film.id}`} className="subtitle-in group block min-w-0 md:max-w-[64%] [text-shadow:0_1px_12px_rgba(0,0,0,0.9)]">
                                    <span className="block font-label text-[12px] md:text-[13px] tracking-[0.18em] uppercase text-gold">{roleOf(list, shot)}</span>
                                    <span className="mt-3 md:mt-5 flex items-end gap-3 md:gap-5">
                                        {place?.num ? (
                                            <span className="shrink-0 flex items-end gap-1.5">
                                                {place.pre && <span className="mb-2 font-label text-[11px] md:text-[13px] tracking-[0.14em] uppercase text-gray-300">{place.pre}</span>}
                                                <span className="font-serif font-light text-[4rem] md:text-[7rem] leading-[0.8] text-gold-light [font-variant-numeric:lining-nums]">{place.num}</span>
                                            </span>
                                        ) : (
                                            <span className="shrink-0 max-w-[9rem] md:max-w-[16rem] font-serif italic text-[1.15rem] md:text-[1.6rem] leading-tight text-gold-light">{place?.text}</span>
                                        )}
                                        <span className="min-w-0 pb-0.5">
                                            {place?.rest && <span className="block font-label text-[11px] md:text-[12px] tracking-[0.14em] uppercase text-gray-300">{place.rest}</span>}
                                            <span className="block font-serif italic text-[1.25rem] md:text-[2rem] leading-tight text-white group-hover:text-gold-light truncate">{film.t}</span>
                                            <span className="block font-label text-[11px] md:text-[12px] tracking-[0.14em] uppercase text-gray-300 truncate">{[film.d?.join(' & '), film.y].filter(Boolean).join(' · ')}</span>
                                        </span>
                                    </span>
                                    <span className="mt-2 block font-label text-[11px] md:text-[12px] tracking-[0.14em] uppercase text-gray-200">
                                        {film.lists > 1 ? <>On <span className="text-gold-light">{film.lists}</span> of the {index.length} lists</> : 'On this list alone'}
                                    </span>
                                </Link>
                            ) : <span />}

                            {/* the clock and the hands: its two films, then the lists either side */}
                            <div className="self-end shrink-0 flex flex-col items-end gap-1">
                                <div className="flex gap-1.5">
                                    {shots.map((f, k) => (
                                        <button key={k} type="button" aria-label={`${roleOf(list, k)}: ${f.t}`} aria-pressed={k === shot} onClick={() => { hold(); setShot(k); }} className="w-12 md:w-20 h-8 flex items-center">
                                            <span className="relative block w-full h-[3px] bg-white/25 overflow-hidden">
                                                {k < shot && <span className="absolute inset-0 bg-gold" />}
                                                {k === shot && !card && (
                                                    <span
                                                        key={`${source}-${shot}`}
                                                        className="prize-clock absolute inset-0 bg-gold"
                                                        style={{ '--hold': `${STEP}ms`, animationPlayState: playing ? 'running' : 'paused' }}
                                                        onAnimationEnd={(e) => { if (e.animationName === 'prize-clock') advance(); }}
                                                    />
                                                )}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center">
                                    <button type="button" aria-label="The list before" onClick={() => stepList(-1)} className="w-11 h-11 flex items-center justify-center text-gray-200 hover:text-white"><MdChevronLeft size={26} /></button>
                                    <span className="font-label text-[11px] md:text-[12px] tracking-[0.14em] uppercase text-gray-300 tabular-nums">List {i + 1} of {programme.length}</span>
                                    <button type="button" aria-label="The next list" onClick={() => stepList(1)} className="w-11 h-11 flex items-center justify-center text-gray-200 hover:text-white"><MdChevronRight size={26} /></button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* the programme: every list, a picture each; tap one and it plays above */}
                <div className="relative flex-1 min-h-0 border-t border-white/10">
                    <ol
                        ref={reel}
                        aria-label="The twenty lists"
                        className="h-full flex items-center gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory px-4 md:px-10 [scrollbar-width:none]"
                        onKeyDown={(e) => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (d) { e.preventDefault(); stepList(d); } }}
                    >
                        {programme.map((l, k) => {
                            const on = l.source === source;
                            const starts = k === 0 || programme[k - 1].family !== l.family;
                            return (
                                <li key={l.source} data-source={l.source} className="relative shrink-0 snap-center pt-6">
                                    {starts && <div className="absolute left-0 top-0 font-label text-[10px] md:text-[11px] tracking-[0.18em] uppercase text-gold whitespace-nowrap">{groupName(l.family)}</div>}
                                    <button
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => choose(l.source)}
                                        className={`group relative block w-[200px] md:w-[248px] aspect-video overflow-hidden text-left transition-[transform,opacity] duration-300 ${on ? '-translate-y-1.5 opacity-100 ring-2 ring-gold' : 'opacity-[0.72] hover:opacity-100 ring-1 ring-white/15'}`}
                                    >
                                        {l.top?.s && <img src={pic(l.top.s, 'w300')} alt="" className="absolute inset-0 w-full h-full object-cover max-w-none" />}
                                        <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.92),rgba(0,0,0,0.35)_55%,transparent)]" />
                                        <span className="absolute left-2 right-2 bottom-1.5 flex items-end justify-between gap-2">
                                            <span className="font-serif text-[12px] md:text-[14px] leading-tight text-white line-clamp-2">{LISTS[l.source]?.name || l.label}</span>
                                            <span className={`shrink-0 font-serif font-light text-[1.3rem] md:text-[1.7rem] leading-none [font-variant-numeric:lining-nums] ${on ? 'text-gold-light' : 'text-gray-200'}`}>{l.count}</span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </div>
        </section>
    );
};

export default TheLists;
