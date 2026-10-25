import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdSearch } from 'react-icons/md';
import { moviesAPI } from '../../services/api';
import { sized, stillSrc } from '../movements/treatments';

/**
 * Ask for anything: a film you love, a director, a place, a mood, a studio. For someone who knows no
 * names yet, the field offers places to start before a word is typed: films most people have
 * seen (each opens a wall of the films like it), famous directors with the film they're known
 * for, a few moods and places. Typing searches all of it at once (accents and a typo per word
 * forgiven), best match first. Enter takes what you plainly named (a director, a country, a
 * film by its exact name: "stanley kubrick" puts BY STANLEY KUBRICK on the board); otherwise it
 * shows every film matching the words, as the last row says.
 *
 * Its placeholder runs once through a few examples, then rests (nothing moves forever).
 */

const GROUPS = { films: 'Films', like: 'Or start from a film', directors: 'Directors', places: 'Countries', movements: 'Movements', studios: 'Studios', moods: 'Moods', genres: 'Genres', outside: 'Not in the atlas: start from it', all: 'Or' };
const ORDER = Object.keys(GROUPS);

// how plainly a row answers what was typed: its exact name (3), a whole word of it, like a
// surname (2.5), the start of it (2), somewhere in it (1), only by a typo (0.5)
const plain = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const strengthOf = (label, q) => {
    const a = plain(label);
    const b = plain(q);
    if (!a || !b) return 0;
    if (a === b) return 3;
    if (a.split(' ').includes(b)) return 2.5;
    if (a.startsWith(b)) return 2;
    return a.includes(b) ? 1 : 0.5;
};
const RESTING = 'A film you love, a director, a place, a mood…';

const Thumb = ({ src, round = false, wide = false }) => (
    <span className={`flex-shrink-0 overflow-hidden bg-[#141312] ring-1 ring-white/10 ${round ? 'w-9 h-9 rounded-full' : wide ? 'w-16 aspect-video' : 'w-9 h-12'}`}>
        {src && <img src={src} alt="" loading="lazy" className={`w-full h-full object-cover max-w-none ${round ? 'grayscale' : ''}`} />}
    </span>
);

const SearchBox = ({ value, start, onSearch, on }) => {
    const navigate = useNavigate();
    const [text, setText] = useState(value || '');
    const [results, setResults] = useState({ q: '' });
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [hint, setHint] = useState(0);
    const box = useRef(null);

    // the board changed the search (taken down, or arrived by link): follow it
    const [shown, setShown] = useState(value);
    if (value !== shown) {
        setShown(value);
        setText(value || '');
    }

    // a few examples, once through, then the plain invitation
    const examples = start ? [
        start.known?.[1] && `Try “${start.known[1].title}”`,
        start.directors?.[4] && `Try “${start.directors[4].name.split(' ').pop()}”`,
        start.places?.[4] && `Try “${start.places[4].value}”`,
        start.moods?.[0] && `Try “${start.moods[0].value}”`,
    ].filter(Boolean) : [];
    useEffect(() => {
        if (!examples.length) return undefined;
        const t = setInterval(() => setHint((h) => Math.min(h + 1, examples.length)), 2600);
        const done = setTimeout(() => clearInterval(t), 2600 * (examples.length + 1));
        return () => { clearInterval(t); clearTimeout(done); };
    }, [examples.length]);
    const placeholder = hint < examples.length ? examples[hint] : RESTING;

    useEffect(() => {
        const q = text.trim();
        if (q.length < 2) return undefined;
        let gone = false;
        const t = setTimeout(() => {
            moviesAPI.exploreSuggest(q).then((r) => { if (!gone) setResults({ q, ...r.data }); }).catch(() => {});
        }, 180);
        return () => { gone = true; clearTimeout(t); };
    }, [text]);

    // close when you click elsewhere
    useEffect(() => {
        const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
        document.addEventListener('pointerdown', away);
        return () => document.removeEventListener('pointerdown', away);
    }, []);

    // everything the panel offers, in order, as rows: { group, key, label, sub, image, act }
    const typed = text.trim();
    const rows = [];
    if (typed.length < 2) {
        if (start) {
            start.known?.forEach((f) => rows.push({ group: 'like', key: `k${f._id}`, label: f.title, sub: f.year, image: f.still && sized(f.still, 'w300'), wide: true, act: () => on.like(f._id) }));
            start.outside?.forEach((f) => rows.push({ group: 'outside', key: `o${f.tmdbId}`, label: f.title, sub: f.year, image: f.poster, act: () => on.from(f.tmdbId) }));
            start.directors?.forEach((d) => rows.push({ group: 'directors', key: `d${d.name}`, label: d.name, sub: d.best, italic: true, image: d.portrait && sized(d.portrait, 'w185'), round: true, act: () => on.director(d.name) }));
            start.moods?.forEach((m) => rows.push({ group: 'moods', key: `m${m.value}`, label: m.value, sub: `${m.n} films`, act: () => on.mood(m.value) }));
            start.places?.forEach((p) => rows.push({ group: 'places', key: `p${p.value}`, label: p.value === 'United States of America' ? 'United States' : p.value, sub: `${p.n} films`, act: () => on.country(p.value) }));
        }
    } else if (results.q === typed) {
        results.films?.forEach((f) => rows.push({ group: 'films', key: `f${f._id}`, label: f.title, sub: [f.year, f.directors?.[0]].filter(Boolean).join(' · '), image: f.still ? sized(f.still, 'w300') : f.posterUrl && sized(f.posterUrl, 'w185'), wide: !!f.still, act: () => navigate(`/movie/${f._id}`) }));
        // the best match is also a place to start: the films like it
        if (results.films?.[0]) {
            const f = results.films[0];
            rows.push({ group: 'like', key: `l${f._id}`, label: `Films like ${f.title}`, name: f.title, sub: 'The films people who loved it loved', act: () => on.like(f._id) });
        }
        results.directors?.forEach((d) => rows.push({ group: 'directors', key: `d${d.name}`, label: d.name, sub: `${d.films} ${d.films === 1 ? 'film' : 'films'} here${d.best ? ` · best known for ${d.best}` : ''}`, image: d.portrait && sized(d.portrait, 'w185'), round: true, act: () => on.director(d.name) }));
        results.places?.forEach((p) => rows.push({ group: 'places', key: `p${p.value}`, label: p.value === 'United States of America' ? 'United States' : p.value, sub: `${p.n} films`, act: () => on.country(p.value) }));
        results.movements?.forEach((m) => rows.push({ group: 'movements', key: `mv${m.tag}`, label: m.value, sub: `${m.n} films`, act: () => on.movement(m.tag) }));
        results.studios?.forEach((h) => rows.push({ group: 'studios', key: `s${h.slug}`, label: h.name, sub: `${h.kind === 'label' ? 'A label' : 'A studio'}, ${h.country === 'United States of America' ? 'United States' : h.country} · ${h.count} films here`, image: h.still && stillSrc(h.still, 'w300'), wide: true, act: () => navigate(`/studios/${h.slug}`) }));
        results.moods?.forEach((m) => rows.push({ group: 'moods', key: `m${m.value}`, label: m.value, sub: `${m.n} films`, act: () => on.mood(m.value) }));
        results.genres?.forEach((g) => rows.push({ group: 'genres', key: `g${g.value}`, label: g.value, sub: `${g.n} films`, act: () => on.genre(g.value) }));
        results.outside?.forEach((f) => rows.push({ group: 'outside', key: `o${f.tmdbId}`, label: f.title, sub: `${f.year || ''} · its fans loved films here`, image: f.poster, act: () => on.from(f.tmdbId) }));
        // best answers first: each group ranked by its plainest match
        const best = new Map();
        rows.forEach((r) => best.set(r.group, Math.max(best.get(r.group) || 0, strengthOf(r.name || r.label, typed))));
        rows.sort((a, b) => (best.get(b.group) - best.get(a.group)) || (ORDER.indexOf(a.group) - ORDER.indexOf(b.group)));
        rows.push({ group: 'all', key: 'all', label: `Show every film matching “${typed}”`, act: () => onSearch(typed) });
    }

    // what Enter takes: the one thing plainly named (a single row at the top that names it exactly
    // or by a whole word, like a surname), or else every film matching the words
    const plainly = typed.length >= 2 ? rows.filter((r) => r.group !== 'all' && r.group !== 'like' && strengthOf(r.label, typed) >= 2.5) : [];
    const enterIndex = plainly.length === 1 ? rows.indexOf(plainly[0]) : rows.findIndex((r) => r.group === 'all');
    const lit = active >= 0 ? active : enterIndex;

    const choose = (row) => {
        setOpen(false);
        if (row) {
            if (row.group !== 'films' && row.group !== 'all') setText('');
            row.act();
        } else if (typed) onSearch(typed);
    };

    const onKey = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(rows.length - 1, a + 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
        else if (e.key === 'Enter') { e.preventDefault(); choose(rows[lit]); }
        else if (e.key === 'Escape') setOpen(false);
    };

    return (
        <div ref={box} className="relative w-full">
            {/* a window you can see is a search from across the room: framed, lit gold when it's yours */}
            <label className="flex items-center gap-3 px-3.5 md:px-5 bg-black/45 ring-1 ring-white/25 hover:ring-white/40 focus-within:ring-gold focus-within:shadow-[0_0_30px_rgba(217,173,98,0.16)] cursor-text">
                <MdSearch className="text-gold text-[22px] md:text-2xl flex-shrink-0" aria-hidden="true" />
                <input
                    id="explore-search"
                    type="search"
                    value={text}
                    onChange={(e) => { setText(e.target.value); setOpen(true); setActive(-1); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKey}
                    placeholder={placeholder}
                    aria-label="Search the atlas: a film, a director, a place or a mood"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={open && rows.length > 0}
                    aria-controls="explore-suggestions"
                    autoComplete="off"
                    className="w-full min-w-0 bg-transparent py-3.5 md:py-4 font-serif text-[1.15rem] md:text-[1.4rem] text-gray-100 placeholder:text-gray-400 placeholder:italic outline-none [&::-webkit-search-cancel-button]:appearance-none"
                />
            </label>
            {open && rows.length > 0 && (
                <div id="explore-suggestions" role="listbox" className="absolute z-30 left-0 right-0 mt-2 bg-[#0b0a09] ring-1 ring-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.75)] max-h-[64vh] overflow-y-auto py-2">
                    {!typed && <div className="px-4 pt-2 pb-1 font-serif italic text-[17px] text-gray-200">Start somewhere</div>}
                    {rows.map((row, i) => (
                        <div key={row.key} role="presentation">
                            {(i === 0 || rows[i - 1].group !== row.group) && (
                                <div role="presentation" className="px-4 pt-3 pb-1 font-label text-[12px] tracking-[0.14em] uppercase text-gold">
                                    {!typed && row.group === 'like' ? 'Films you might know: start from one' : GROUPS[row.group]}
                                    {typed && i === enterIndex && active < 0 && <span className="ml-2 normal-case tracking-normal font-serif italic text-[13px] text-gray-400">(press Enter)</span>}
                                </div>
                            )}
                            <button
                                type="button"
                                role="option"
                                aria-selected={i === lit}
                                onMouseEnter={() => setActive(i)}
                                onClick={() => choose(row)}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-left ${i === lit ? 'bg-white/[0.08]' : ''} ${row.group === 'all' ? 'border-t border-white/10 mt-1' : ''}`}
                            >
                                {(row.image !== undefined || row.round) && <Thumb src={row.image} round={row.round} wide={row.wide} />}
                                <span className="min-w-0">
                                    <span className={`block text-[16px] truncate first-letter:uppercase ${row.group === 'all' ? 'text-gold-light' : 'text-gray-100'}`}>{row.label}</span>
                                    {row.sub && <span className={`block text-[13px] text-gray-400 truncate ${row.italic ? 'italic' : ''}`}>{row.sub}</span>}
                                </span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchBox;
