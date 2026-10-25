import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { MdArrowDownward, MdArrowOutward, MdClose, MdSkipNext } from 'react-icons/md';
import { sized } from '../movements/treatments';
import { sizeFor, useDecoded } from '../about/frames';
import { ShelfSigns, TicketDock, TrailerScreen } from './Ticket';
import BillingBlock from './BillingBlock';
import { directorPath } from './directorPath';
import { framesOf } from './frames';

/**
 * The film page's opening: the page plays the film's opening titles.
 *
 * You arrive on its title card, set over its own frames, which cut from one to the next while you
 * stay (a frame of black between, the camera creeping in); the title is racked into focus. Scroll,
 * and the screen holds while the opening titles play one card at a time over its frames: who's in
 * it, who shot it, scored it and cut it, who wrote and directed it; then its programme note as
 * subtitles, a sentence or two at a time; then why it matters; then the house lights come up on
 * where to watch it. "Read it as text" (and reduced motion) sets it all still instead.
 *
 * Play the trailer and it plays right here: the house goes dark, the masking above and below the
 * picture opens, and YouTube's player runs on the screen (Close, Esc, or the trailer's end brings
 * the lights back up). A film with no trailer that plays here runs its own frames instead, like a
 * projector, and says so in plain words.
 */

const FRAME = 2600; // ms on each frame in the projection
const IDLE = 4500; // ms between cuts while you stay on the title card
const STEP = 30; // svh of scroll for each card
const COUNTRY = { 'United States of America': 'United States', 'United Kingdom': 'UK' };
const SOURCE = { Novel: 'the novel by', Book: 'the book by', Play: 'the play by', 'Short Story': 'the story by', 'Comic Book': 'the comic by', Author: 'the work of' };

const youTubeId = (url) => (url || '').match(/(?:v=|embed\/|youtu\.be\/)([\w-]{11})/)?.[1] || null;

// YouTube's player script, loaded the first time a trailer is played
let youTube = null;
const loadYouTube = () => {
    if (youTube) return youTube;
    youTube = new Promise((resolve, reject) => {
        if (window.YT?.Player) { resolve(window.YT); return; }
        const before = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => { before?.(); resolve(window.YT); };
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.onerror = () => { youTube = null; reject(new Error('YouTube unavailable')); };
        document.head.appendChild(s);
    });
    return youTube;
};

// the programme note, cut into subtitles: whole sentences, a few to a card
const subtitlesOf = (text) => {
    const sentences = (text || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+(?=[A-Z0-9"“‘'(])/);
    const cards = [];
    for (const s of sentences) {
        const last = cards.at(-1);
        if (last && last.length + s.length < 300) cards[cards.length - 1] = `${last} ${s}`;
        else cards.push(s);
    }
    // never more than three: the rest joins the last
    return cards.length > 3 ? [...cards.slice(0, 2), cards.slice(2).join(' ')] : cards.filter(Boolean);
};

// the opening, card by card
const cardsOf = (movie) => {
    const directors = movie.directors || [];
    const writers = movie.writers || [];
    const wrote = writers.filter((w) => ['Screenplay', 'Writer'].includes(w.job)).map((w) => w.name);
    const source = writers.find((w) => SOURCE[w.job]);
    const auteur = directors.length === 1 && wrote.length === 1 && wrote[0] === directors[0];
    // who's in it and who made it with them, on one card
    const crew = [
        movie.cast?.length && { role: 'Starring', names: movie.cast.slice(0, 3).map((c) => c.name), stack: true },
        movie.cinematographers?.length && { role: 'Photographed by', names: movie.cinematographers.slice(0, 2) },
        movie.composers?.length && { role: 'Music by', names: movie.composers.slice(0, 2) },
        movie.editors?.length && { role: 'Edited by', names: movie.editors.slice(0, 2) },
    ].filter(Boolean);
    // the studios that made it, where they have a page, credited just before the director as films do
    const studios = (movie.houses || []).filter((h) => h.kind === 'house').slice(0, 2);
    const made = [
        source && { role: `Based on ${SOURCE[source.job]}`, names: [source.name] },
        !auteur && wrote.length && { role: 'Written by', names: wrote.slice(0, 3) },
        studios.length && { role: 'Produced by', names: studios.map((h) => h.name), studios },
    ].filter(Boolean);
    const ed = movie.editorial || {};
    return [
        { kind: 'title' },
        crew.length && { kind: 'credits', label: 'Cast and crew', entries: crew },
        directors.length && { kind: 'credits', label: auteur ? 'Written and directed' : 'Directed', entries: [...made, { role: auteur ? 'Written and directed by' : 'Directed by', names: directors, big: true }], facts: true },
        ...subtitlesOf(ed.synopsis || movie.synopsis).map((text, i) => ({ kind: 'note', label: i === 0 ? 'About the film' : null, text })),
        ed.whyItMatters && { kind: 'why', label: 'Why it matters', text: ed.whyItMatters },
        { kind: 'end', label: 'Where to watch it' },
    ].filter(Boolean);
};

// the frame on the screen. A frame (its small w780 copy) is cut to only once it can be shown, and the
// last one holds till then, so the screen never goes black waiting on TMDB (a full-size still can
// take seconds); the small copy shows first and is sharpened in place once the full-size one is in.
// [the frame shown, the picture to draw for it]
const useHeld = (frame, size, ready) => {
    const [shown, setShown] = useState(null);
    if (frame && frame !== shown && (ready.has(frame) || ready.has(sized(frame, size)))) setShown(frame);
    return [shown, shown && (ready.has(sized(shown, size)) ? sized(shown, size) : shown)];
};

// the film's frames, run like a projector (each decoded before it's shown)
const Frames = ({ stills }) => {
    const [size] = useState(sizeFor);
    const [ready, want] = useDecoded();
    const [k, setK] = useState(0);
    const next = stills[(k + 1) % stills.length];
    useEffect(() => { want([stills[k], sized(stills[k], size), next, sized(next, size), ...stills]); });
    useEffect(() => {
        const t = setInterval(() => setK((x) => (x + 1) % stills.length), FRAME);
        return () => clearInterval(t);
    }, [stills.length]);
    const [shown, pic] = useHeld(stills[k], size, ready);
    return (
        <>
            {pic && <img key={shown} src={pic} alt="" className="frame-push absolute inset-0 w-full h-full object-cover max-w-none" />}
            <span key={`s${shown}`} aria-hidden="true" className="shutter absolute inset-0 bg-black" />
            <span aria-hidden="true" className="absolute inset-0 still-grain opacity-60 pointer-events-none" />
            {shown && <span className="absolute right-3 bottom-2 font-label text-[12px] tracking-[0.14em] text-white/70 tabular-nums">{String(stills.indexOf(shown) + 1).padStart(2, '0')}A</span>}
        </>
    );
};

// the house dark, the screen open: the trailer, or the frames
const Projection = ({ movie, stills, start, shared, onClose }) => {
    const id = youTubeId(movie.trailerUrl);
    const [failed, setFailed] = useState(start === 'frames' ? 'none' : null);
    const [started, setStarted] = useState(false); // the trailer's running: the film's picture gives way
    const host = useRef(null);
    const close = useRef(null);

    useEffect(() => {
        close.current?.focus();
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
    }, [onClose]);

    useEffect(() => {
        if (failed || !id || !host.current) return undefined;
        let player = null;
        let gone = false;
        const el = document.createElement('div');
        host.current.appendChild(el);
        loadYouTube().then((YT) => {
            if (gone) return;
            player = new YT.Player(el, {
                host: 'https://www.youtube-nocookie.com',
                videoId: id,
                width: '100%',
                height: '100%',
                playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1 },
                events: {
                    onError: (e) => setFailed([101, 150].includes(e.data) ? 'elsewhere' : 'gone'),
                    onStateChange: (e) => {
                        if (e.data === 1) setStarted(true);
                        if (e.data === 0) onClose(); // the trailer's over: lights up
                    },
                },
            });
        }).catch(() => { if (!gone) setFailed('gone'); });
        const box = host.current;
        return () => { gone = true; player?.destroy?.(); box.replaceChildren(); };
    }, [id, failed, onClose]);

    const frames = failed && stills.length > 1;
    const onYouTube = id && <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer" className="not-italic inline-flex items-center gap-1 font-label text-[12px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">Watch it on YouTube <MdArrowOutward aria-hidden="true" /></a>;
    return createPortal(
        <div role="dialog" aria-modal="true" aria-label={`${movie.title}: ${frames ? 'frames from the film' : 'trailer'}`} className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-0 md:px-8">
            <div aria-hidden="true" className="house-down absolute inset-0 bg-black" onClick={onClose} />
            <div className="relative w-full flex items-center justify-between gap-4 px-4 md:px-0 pb-3 max-w-[min(100%,calc((100svh-8rem)*16/9))]">
                <div className="subtitle-in font-label text-[12px] tracking-[0.14em] uppercase text-gray-300 truncate">
                    <span className="text-white">{movie.title}</span> · {frames ? 'Frames from the film' : 'Trailer'}
                </div>
                <button ref={close} type="button" onClick={onClose} className="shrink-0 flex items-center gap-1.5 min-h-11 font-label text-[12px] tracking-[0.14em] uppercase text-gray-200 hover:text-white">
                    Close <MdClose size={18} aria-hidden="true" />
                </button>
            </div>
            {/* the screen: the little one that was pressed, grown to full size */}
            <motion.div layoutId={shared} transition={{ duration: 0.6, ease: [0.6, 0, 0.2, 1] }} className="relative w-full aspect-video overflow-hidden bg-black max-w-[min(100%,calc((100svh-8rem)*16/9))]">
                {frames ? <Frames stills={stills} /> : <div ref={host} className="absolute inset-0 [&_iframe]:w-full [&_iframe]:h-full" />}
                {/* the film's picture, carried by the screen as it grows, until the trailer runs */}
                {!frames && stills[0] && <img src={sized(stills[0], 'w780')} alt="" className={`absolute inset-0 z-[5] w-full h-full object-cover max-w-none pointer-events-none transition-opacity duration-700 ${started ? 'opacity-0' : 'opacity-100'}`} />}
                {/* (grown from the little screen, the growing is the reveal; otherwise the masking opens) */}
                {!shared && <span aria-hidden="true" className="mask-up absolute inset-x-0 top-0 h-1/2 bg-black z-10" />}
                {!shared && <span aria-hidden="true" className="mask-down absolute inset-x-0 bottom-0 h-1/2 bg-black z-10" />}
            </motion.div>
            <div className="relative w-full px-4 md:px-0 pt-3 min-h-11 max-w-[min(100%,calc((100svh-8rem)*16/9))] font-serif italic text-[15px] md:text-base text-gray-300">
                {!failed && id && <>Trouble playing it? {onYouTube}</>}
                {failed === 'none' && 'No trailer for it online. These are frames from the film.'}
                {failed === 'gone' && 'Its trailer is no longer online. These are frames from the film.'}
                {failed === 'elsewhere' && <>Its trailer only plays on YouTube itself. These are frames from the film. {onYouTube}</>}
            </div>
        </div>,
        document.body,
    );
};

// a studio that made the film, as a chip that reads as a button: its logo on a plate of light (or of
// black, for a logo drawn light), its name, and the way to its page
const StudioChip = ({ house, light }) => (
    <Link
        to={`/studios/${house.slug}`}
        className={`group/house inline-flex items-center gap-2 align-middle rounded-full ${house.logo ? 'pl-1' : 'pl-3.5'} pr-3 py-1 bg-black/45 backdrop-blur-sm text-white hover:bg-black/70 transition-colors [text-shadow:none]`}
        style={{ boxShadow: `0 0 0 1px ${light}99, 0 0 18px ${light}33` }}
    >
        {house.logo && (
            <span aria-hidden="true" className={`inline-flex items-center justify-center h-7 px-2.5 rounded-full shrink-0 ${house.tone === 'light' ? 'bg-black' : 'bg-white'}`}>
                <img src={`https://image.tmdb.org/t/p/w185${house.logo}`} alt="" className="h-4 w-auto max-w-[56px] object-contain" />
            </span>
        )}
        <span>{house.name}</span>
        <span aria-hidden="true" style={{ color: light }} className="transition-transform duration-300 group-hover/house:translate-x-0.5">›</span>
    </Link>
);

// the title card's words: what it is, its title racked into focus, its line, and your tickets
const TitleBlock =({ movie, light, frames, canPlay, trailer, onPlay, playRef, playing }) => {
    const ed = movie.editorial || {};
    const facts = [movie.year, COUNTRY[movie.country] || movie.country, movie.originalLanguage, movie.runtime && `${movie.runtime} min`].filter(Boolean);
    const directors = movie.directors || [];
    const line = ed.hook || (movie.tagline && `“${movie.tagline.replace(/^["“]|["”]$/g, '')}”`);
    const makers = (movie.houses || []).filter((h) => h.kind === 'house').slice(0, 2);
    return (
        <div className="[text-shadow:0_2px_24px_rgba(0,0,0,0.6)]">
            {/* first, as films open on it, the studio that presents it: a chip like the director's, its
                mark standing in the light as it does on its own page, and the way there */}
            {makers.length > 0 && (
                <div className="card-rise mb-1 font-label text-[12px] tracking-[0.16em] uppercase leading-[2.4] text-gray-200">
                    {makers.map((h, i) => (
                        <Fragment key={h.slug}>
                            {i > 0 && <span className="mx-1.5">&amp;</span>}
                            <StudioChip house={h} light={light} />
                        </Fragment>
                    ))}
                    <span className="ml-2">{makers.length > 1 ? 'present' : 'presents'}</span>
                </div>
            )}
            {/* who made it leads the line, as films open on it ("a film by"), and leads to them: a chip
                that reads as a button, with their face irised in where they have a page */}
            <div className="card-rise font-label text-[12px] tracking-[0.16em] uppercase leading-[2.4]" style={{ color: light }}>
                {directors.length > 0 && <span className="mr-2">A film by</span>}
                {directors.map((d, i) => {
                    const face = movie.retrospectives?.find((r) => r.name === d)?.portrait;
                    return (
                        <Fragment key={d}>
                            {i > 0 && <span className="mx-1.5">&amp;</span>}
                            <Link
                                to={directorPath(movie, d)}
                                className={`group/who inline-flex items-center gap-2 align-middle rounded-full ${face ? 'pl-1' : 'pl-3.5'} pr-3 py-1 bg-black/45 backdrop-blur-sm text-white hover:bg-black/70 transition-colors [text-shadow:none]`}
                                style={{ boxShadow: `0 0 0 1px ${light}99, 0 0 18px ${light}33` }}
                            >
                                {face && (
                                    <span aria-hidden="true" className="face-iris relative inline-block w-7 h-7 rounded-full overflow-hidden shrink-0 bg-black">
                                        <img src={sized(face, 'w185')} alt="" className="w-full h-full object-cover max-w-none grayscale group-hover/who:grayscale-0 transition-[filter] duration-500" />
                                    </span>
                                )}
                                <span>{d}</span>
                                <span aria-hidden="true" style={{ color: light }} className="transition-transform duration-300 group-hover/who:translate-x-0.5">›</span>
                            </Link>
                        </Fragment>
                    );
                })}
                {directors.length > 0 && facts.length > 0 && '  ·  '}
                {facts.join('  ·  ')}
            </div>
            <div className="relative mt-3 md:mt-4">
                <h1 className="focus-in font-serif font-light leading-[0.95] text-[2.9rem] sm:text-6xl md:text-7xl lg:text-[6.5rem] max-w-5xl">{movie.title}</h1>
                {/* the title out of focus, given up as the lens finds it */}
                <div aria-hidden="true" className="focus-out pointer-events-none absolute inset-0 font-serif font-light leading-[0.95] text-[2.9rem] sm:text-6xl md:text-7xl lg:text-[6.5rem] max-w-5xl blur-[7px]">{movie.title}</div>
            </div>
            {movie.originalTitle && movie.originalTitle !== movie.title && (
                <div className="card-rise-late mt-2 md:mt-3 font-serif italic text-lg md:text-2xl text-gray-300">{movie.originalTitle}</div>
            )}
            {line && <p className="card-rise-late mt-4 md:mt-5 max-w-2xl font-serif italic text-lg md:text-2xl leading-snug text-gray-100">{line}</p>}
            <div className="card-rise-late mt-6 md:mt-8 flex flex-col md:flex-row md:items-end gap-5 md:gap-12 [text-shadow:none]">
                {canPlay && <TrailerScreen buttonRef={playRef} frames={frames} light={light} trailer={trailer} onClick={() => onPlay('title')} shared="trailer-screen" hidden={playing?.from === 'title'} />}
                {/* (on a phone the bar along the foot keeps track instead) */}
                <div className="hidden md:block"><ShelfSigns movie={movie} light={light} /></div>
            </div>
        </div>
    );
};

// a name that never breaks at its hyphens (Suk-Ping, Ki-Hop), only between its words
const unbroken = (name) => name.split(' ').map((w, k) => (
    <Fragment key={k}>{k > 0 && ' '}{w.includes('-') ? <span className="whitespace-nowrap">{w}</span> : w}</Fragment>
));

// the credits on a card, as a film's opening titles set them: the role small, the name large; the
// director last and largest, on a line of their own
const Entry = ({ e, i, movie, light }) => (
    <div className={i ? 'card-rise-late' : 'card-rise'}>
        {/* the director's face irised in above their credit: someone you can visit */}
        {e.big && <Faces movie={movie} names={e.names} light={light} />}
        <div className="font-label text-[12px] md:text-[13px] tracking-[0.3em] uppercase text-gray-200">{e.role}</div>
        <div className={`mt-2 md:mt-3 font-serif font-light leading-[1.02] text-white ${e.big ? 'text-5xl md:text-8xl' : e.stack ? 'text-3xl md:text-6xl' : 'text-2xl md:text-5xl'}`}>
            {e.names.map((n, k) => (
                // (two studios' long names each take a line of their own on a phone)
                <span key={n} className={e.stack ? 'block mt-1' : e.studios ? 'block md:inline mt-1 md:mt-0' : ''}>
                    {!e.stack && k > 0 && <span className={`text-gray-400 ${e.studios ? 'hidden md:inline' : ''}`}> &amp; </span>}
                    {e.big
                        ? <Link to={directorPath(movie, n)} className="underline decoration-1 underline-offset-[10px] hover:text-gold-light" style={{ textDecorationColor: `${light}99` }}>{unbroken(n)}</Link>
                        : e.studios
                            // (a studio's name goes to its page, with the mark a way on carries)
                            ? <Link to={`/studios/${e.studios[k].slug}`} className="group/st underline decoration-1 underline-offset-[8px] hover:text-gold-light" style={{ textDecorationColor: `${light}99` }}>{unbroken(n)}<span aria-hidden="true" className="inline-block ml-2 text-[0.55em] align-middle transition-transform duration-300 group-hover/st:translate-x-1" style={{ color: light }}>›</span></Link>
                            : unbroken(n)}
                </span>
            ))}
        </div>
    </div>
);

// a face in an iris for each director with a page, opening as their card comes up
const Faces = ({ movie, names, light }) => {
    const faces = names.map((n) => movie.retrospectives?.find((r) => r.name === n)).filter((r) => r?.portrait);
    if (!faces.length) return null;
    return (
        <div className="mb-5 md:mb-7 flex justify-center gap-5 md:gap-8">
            {faces.map((r) => (
                <Link key={r.id} to={`/directors/${r.id}`} aria-label={`Open ${r.name}'s retrospective`} className="group/face relative block rounded-full">
                    <span className="face-iris block w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden bg-black" style={{ '--iris-delay': '0.2s' }}>
                        <img src={sized(r.portrait, 'w185')} alt="" className="w-full h-full object-cover max-w-none grayscale group-hover/face:grayscale-0 transition-[filter] duration-500" />
                    </span>
                    <span aria-hidden="true" className="absolute -inset-1 rounded-full transition-transform duration-500 group-hover/face:scale-105" style={{ boxShadow: `0 0 0 1px ${light}aa, 0 0 40px ${light}44` }} />
                </Link>
            ))}
        </div>
    );
};

// under the director's card, the way on: their retrospective, or their films where they have no page
const WayOn = ({ movie, names }) => (
    <div className="card-rise-late flex flex-wrap justify-center gap-x-8 gap-y-3">
        {names.map((n) => {
            const page = movie.retrospectives?.find((r) => r.name === n);
            const label = page
                ? (names.length > 1 ? `${n}'s retrospective` : 'Open their retrospective')
                : (names.length > 1 ? `${n}'s films in the atlas` : 'Their films in the atlas');
            return (
                <Link key={n} to={directorPath(movie, n)} className="inline-flex items-center min-h-11 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">
                    {label} ›
                </Link>
            );
        })}
    </div>
);

const Credits = ({ card, movie, light }) => {
    const cast = card.entries.find((e) => e.stack);
    const small = card.entries.filter((e) => !e.big && !e.stack);
    const big = card.entries.find((e) => e.big);
    return (
        <div className="flex flex-col items-center gap-7 md:gap-10 text-center [text-shadow:0_0_3px_rgba(0,0,0,0.7),0_2px_22px_rgba(0,0,0,0.85)]">
            {cast && <Entry e={cast} i={0} movie={movie} light={light} />}
            {small.length > 0 && (
                <div className={`grid grid-cols-1 gap-6 md:gap-14 ${small.length === 3 ? 'md:grid-cols-3' : small.length === 2 ? 'md:grid-cols-2' : ''}`}>
                    {small.map((e, i) => <Entry key={e.role} e={e} i={i + (cast ? 1 : 0)} movie={movie} light={light} />)}
                </div>
            )}
            {big && <Entry e={big} i={small.length} movie={movie} light={light} />}
            {card.facts && (
                <div className="card-rise-late font-label text-[12px] md:text-[13px] tracking-[0.22em] uppercase text-gray-300">
                    {[COUNTRY[movie.country] || movie.country, movie.year, movie.runtime && `${movie.runtime} minutes`, movie.languages?.length && `in ${movie.languages.slice(0, 2).join(' and ')}`].filter(Boolean).join('  ·  ')}
                </div>
            )}
            {big && <WayOn movie={movie} names={big.names} />}
        </div>
    );
};

const WhereToWatch = ({ movie, providers, tags }) => (
    <div className="flex flex-col items-center text-center">
        <div className="card-rise font-label text-[12px] md:text-[13px] tracking-[0.3em] uppercase text-gray-200">Where to watch it</div>
        {providers === null ? (
            <div className="mt-5 animate-pulse h-10 w-48 bg-white/5" />
        ) : providers.length ? (
            <div className="card-rise-late mt-5 flex flex-wrap justify-center gap-2 max-w-3xl">
                {providers.map((p) => (
                    <a key={p.provider_id} href={`https://www.google.com/search?q=Watch+${encodeURIComponent(movie.title)}+on+${encodeURIComponent(p.provider_name)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 pr-3 bg-black/50 ring-1 ring-white/15 hover:ring-white/40 transition-colors">
                        <img src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt="" className="w-9 h-9 object-cover" />
                        <span className="text-[13px] text-gray-100 whitespace-nowrap">{p.provider_name}</span>
                    </a>
                ))}
            </div>
        ) : (
            <p className="card-rise-late mt-4 font-serif italic text-xl text-gray-200">Not streaming in India or the US just now.</p>
        )}
        {tags.length > 0 && (
            <p className="card-rise-late mt-8 max-w-2xl text-[15px] leading-loose">
                {tags.map((t, i) => (
                    <span key={t.label}>
                        {i > 0 && <span className="mx-2.5 text-gray-500">/</span>}
                        <Link to={t.to} className="text-gray-200 hover:text-white capitalize">{t.label}</Link>
                    </span>
                ))}
            </p>
        )}
    </div>
);

const TheScreen = ({ movie, light, reducedMotion, providers, tags }) => {
    const section = useRef(null);
    const play = useRef(null);
    const [playing, setPlaying] = useState(null); // { kind: 'trailer' | 'frames', from: 'title' | 'dock' }
    const [asText, setAsText] = useState(false);
    const [c, setC] = useState(0);
    const [idle, setIdle] = useState(0);
    const [seen, setSeen] = useState(true);
    const [size] = useState(sizeFor);
    const [ready, want] = useDecoded();

    const frames = framesOf(movie);
    const trailer = !!youTubeId(movie.trailerUrl);
    const canPlay = trailer || frames.length > 1;
    const cards = cardsOf(movie);
    const n = cards.length;
    const card = cards[c];
    // each card cuts to the next frame; on the title card they cut by themselves too
    const frameAt = (i) => (frames.length ? frames[(i + idle) % frames.length] : null);
    const [shown, pic] = useHeld(frameAt(c), size, ready);

    // (one function for the screen's life: the player is built once per showing, not per render)
    const stop = useCallback(() => { setPlaying(null); setTimeout(() => play.current?.focus(), 0); }, []);
    const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
    useMotionValueEvent(scrollYProgress, 'change', (p) => {
        const i = Math.min(n - 1, Math.max(0, Math.floor(p * n)));
        if (i !== c) setC(i);
    });
    // this frame and the next at full size; every frame's small copy, so any cut has one at hand
    useEffect(() => { want([frameAt(c), sized(frameAt(c), size), frameAt(c + 1), sized(frameAt(c + 1), size), ...frames]); });
    useEffect(() => {
        const el = section.current;
        if (!el) return undefined;
        const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting));
        io.observe(el);
        return () => io.disconnect();
    }, [asText]);
    useEffect(() => {
        if (c !== 0 || !seen || playing || reducedMotion || frames.length < 2) return undefined;
        const t = setInterval(() => setIdle((x) => x + 1), IDLE);
        return () => clearInterval(t);
    }, [c, seen, playing, reducedMotion, frames.length]);
    // a new card can turn the house lights down or up (the navbar and the docked ticket check on
    // scroll, and a single jump of the scroll is over before the stage says which card it's on)
    useEffect(() => { window.dispatchEvent(new Event('scroll')); }, [c]);
    // (with reduced motion it's set still, as text)
    useEffect(() => {
        if (!reducedMotion) return undefined;
        const t = setTimeout(() => setAsText(true), 0);
        return () => clearTimeout(t);
    }, [reducedMotion]);

    const toCard = (i) => {
        const el = section.current;
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + ((el.offsetHeight - window.innerHeight) * (i + 0.5)) / n, behavior: 'smooth' });
    };
    const skip = () => document.getElementById('critics')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const projection = playing && <Projection movie={movie} stills={frames} start={playing.kind} shared={playing.from === 'title' ? 'trailer-screen' : undefined} onClose={stop} />;
    const onPlay = (from = 'dock') => setPlaying({ kind: trailer ? 'trailer' : 'frames', from });
    const dock = <TicketDock movie={movie} light={light} frames={frames} onPlay={canPlay ? () => onPlay('dock') : null} playLabel={trailer ? 'Play the trailer' : 'Play its frames'} />;

    // still, as text: the title card, then the billing block and the note as they read on paper
    if (asText) {
        const ed = movie.editorial || {};
        const note = ed.synopsis || movie.synopsis;
        return (
            <div ref={section}>
                <section className="relative h-[88vh] min-h-[560px] overflow-hidden">
                    {movie.backdropUrl && <img src={sized(movie.backdropUrl, 'original')} alt="" className="absolute inset-0 w-full h-full object-cover [object-position:50%_30%]" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/55 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 via-[#050505]/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 max-w-7xl mx-auto px-4 md:px-10 pb-10 md:pb-14">
                        <TitleBlock movie={movie} light={light} frames={frames} canPlay={canPlay} trailer={trailer} onPlay={onPlay} playRef={play} playing={playing} />
                    </div>
                    {projection}
                    {dock}
                </section>
                <div className="max-w-7xl mx-auto px-4 md:px-10">
                    {!reducedMotion && <div className="pt-8 text-right"><button type="button" onClick={() => setAsText(false)} className="min-h-11 font-label text-[12px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">Play it as the opening ›</button></div>}
                    <BillingBlock movie={movie} light={light} providers={providers} reducedMotion={reducedMotion} />
                    {(note || ed.whyItMatters) && (
                        <section className="pt-20 md:pt-28 max-w-3xl mx-auto">
                            <h2 className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-400 mb-6">About the film</h2>
                            {note && <p className="text-gray-200 text-lg md:text-xl leading-relaxed">{note}</p>}
                            {ed.whyItMatters && (
                                <blockquote className="mt-12 pl-6 border-l-2" style={{ borderColor: light }}>
                                    <div className="font-label text-[12px] tracking-[0.14em] uppercase mb-3" style={{ color: light }}>Why it matters</div>
                                    <p className="font-serif text-2xl md:text-[1.7rem] leading-snug text-white">{ed.whyItMatters}</p>
                                </blockquote>
                            )}
                        </section>
                    )}
                </div>
            </div>
        );
    }

    const low = card.kind === 'note';
    return (
        <section ref={section} aria-label={`${movie.title}: its opening titles`} className="own-transitions relative" style={{ height: `${100 + n * STEP}svh` }}>
            {/* (once the titles run, the house lights go down: the navbar leaves until the opening's over) */}
            <div data-lights-down={c > 0 ? '' : undefined} className="sticky top-0 h-[100svh] overflow-hidden bg-black">
                {/* the frame, cut to the next as the card changes, the camera creeping in */}
                {pic && <img key={shown} src={pic} alt="" className="frame-push absolute inset-0 w-full h-full object-cover max-w-none [object-position:50%_30%] [transform-origin:50%_30%]" />}
                <span key={`cut-${shown}`} aria-hidden="true" className="shutter absolute inset-0 bg-black" />
                <span aria-hidden="true" className="absolute inset-0 still-grain opacity-50 pointer-events-none" />
                {/* the dark the words need: low and to the left on the title card, round the centre for credits, at the foot for subtitles, all over as the lights come up */}
                <div aria-hidden="true" className={`absolute inset-0 transition-opacity duration-700 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent ${card.kind === 'title' ? 'opacity-100' : 'opacity-0'}`} />
                <div aria-hidden="true" className={`absolute inset-0 transition-opacity duration-700 bg-gradient-to-r from-[#050505]/80 via-[#050505]/15 to-transparent ${card.kind === 'title' ? 'opacity-100' : 'opacity-0'}`} />
                <div aria-hidden="true" className={`absolute inset-0 transition-opacity duration-700 bg-[radial-gradient(ellipse_75%_60%_at_50%_50%,rgba(0,0,0,0.72),rgba(0,0,0,0.35)_70%,rgba(0,0,0,0.2))] ${card.kind === 'credits' || card.kind === 'why' ? 'opacity-100' : 'opacity-0'}`} />
                <div aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-[55%] transition-opacity duration-700 bg-[linear-gradient(to_top,rgba(0,0,0,0.92),rgba(0,0,0,0.7)_40%,transparent)] ${low ? 'opacity-100' : 'opacity-0'}`} />
                <div aria-hidden="true" className={`absolute inset-0 transition-opacity duration-700 bg-[#050505]/80 ${card.kind === 'end' ? 'opacity-100' : 'opacity-0'}`} />

                {/* the card (the credits, the note and why it matters are read out from the words below instead) */}
                <div key={`card-${c}`} aria-hidden={['credits', 'note', 'why'].includes(card.kind) || undefined} className="absolute inset-0 px-4 md:px-10 pt-24 pb-40 md:pb-24 flex">
                    {card.kind === 'title' && (
                        <div className="self-end w-full max-w-7xl mx-auto">
                            <TitleBlock movie={movie} light={light} frames={frames} canPlay={canPlay} trailer={trailer} onPlay={onPlay} playRef={play} playing={playing} />
                        </div>
                    )}
                    {card.kind === 'credits' && <div className="m-auto"><Credits card={card} movie={movie} light={light} /></div>}
                    {card.kind === 'note' && (
                        <div className="self-end w-full flex flex-col items-center text-center [text-shadow:0_0_2px_rgba(0,0,0,0.95),0_2px_12px_rgba(0,0,0,0.85)]">
                            {card.label && <div className="card-rise font-label text-[12px] tracking-[0.3em] uppercase text-gray-300 mb-3">{card.label}</div>}
                            <p className="subtitle-in max-w-4xl font-serif text-[1.3rem] md:text-[2rem] leading-snug text-[#fbf8f2]">{card.text}</p>
                        </div>
                    )}
                    {card.kind === 'why' && (
                        <div className="m-auto max-w-4xl text-center">
                            <div className="card-rise font-label text-[12px] md:text-[13px] tracking-[0.3em] uppercase" style={{ color: light }}>{card.label}</div>
                            <p className="card-rise-late mt-4 md:mt-6 font-serif font-light text-[1.7rem] md:text-[3rem] leading-[1.15] text-white">{card.text}</p>
                        </div>
                    )}
                    {card.kind === 'end' && <div className="m-auto"><WhereToWatch movie={movie} providers={providers} tags={tags} /></div>}
                </div>

                {/* where you are in the opening, and the ways out of it */}
                <div className="absolute inset-x-0 bottom-0 px-4 md:px-10 pb-[4.5rem] md:pb-4 pt-10 bg-gradient-to-t from-black/75 to-transparent">
                    <div className="max-w-7xl mx-auto">
                        <div className="relative h-[2px] bg-white/15">
                            <motion.span className="absolute inset-0 bg-gold origin-left" style={{ scaleX: scrollYProgress }} />
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-4 font-label text-[12px] tracking-[0.14em] uppercase">
                            <button type="button" onClick={skip} className="inline-flex items-center gap-2 min-h-10 px-4 bg-black/60 backdrop-blur-sm ring-1 ring-gold/70 text-white hover:bg-black/80 hover:ring-gold-light whitespace-nowrap">
                                Skip the opening <MdSkipNext aria-hidden="true" size={18} className="text-gold-light" />
                            </button>
                            <ol className="hidden md:flex items-center gap-1">
                                {cards.map((x, i) => (
                                    <li key={i}>
                                        <button type="button" onClick={() => toCard(i)} aria-label={`Card ${i + 1}${x.label ? `: ${x.label}` : ''}`} className="w-6 h-10 flex items-center justify-center">
                                            <span className={`block h-[3px] transition-[width,background-color] ${i === c ? 'w-5 bg-gold' : 'w-2 bg-white/35'}`} />
                                        </button>
                                    </li>
                                ))}
                            </ol>
                            <span className="flex items-center gap-4 md:gap-6">
                                {c < n - 1 && <span className="hidden sm:flex items-center gap-1 text-gray-400">{c === 0 ? 'Scroll for its opening titles' : 'Scroll on'} <MdArrowDownward aria-hidden="true" /></span>}
                                <button type="button" onClick={() => setAsText(true)} className="min-h-10 text-gold hover:text-gold-light whitespace-nowrap">Read it as text ›</button>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            {/* the opening, in words, for a screen reader */}
            <div className="sr-only">
                {cards.map((x, i) => (
                    x.kind === 'credits' ? <p key={i}>{x.entries.map((e) => `${e.role} ${e.names.join(' and ')}.`).join(' ')}</p>
                        : x.kind === 'note' || x.kind === 'why' ? <p key={i}>{x.label ? `${x.label}: ` : ''}{x.text}</p> : null
                ))}
            </div>
            {projection}
            {dock}
        </section>
    );
};

export default TheScreen;
