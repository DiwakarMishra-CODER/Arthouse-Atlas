import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdSearch } from 'react-icons/md';
import { moviesAPI } from '../../services/api';
import { sized } from '../movements/treatments';

/**
 * Search a film or a director. Suggestions come as you type (the server forgives
 * accents and a typo per word): films open their page, directors fill the board.
 * Enter with nothing chosen puts the words themselves on the board ("MATCHING …").
 */

const SearchBox = ({ value, onSearch, onDirector }) => {
    const navigate = useNavigate();
    const [text, setText] = useState(value || '');
    const [results, setResults] = useState({ q: '', films: [], directors: [] });
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const box = useRef(null);

    // the board changed the search (cleared, or arrived by link): follow it
    const [shown, setShown] = useState(value);
    if (value !== shown) {
        setShown(value);
        setText(value || '');
    }

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

    const current = text.trim().length >= 2 && results.q === text.trim() ? results : { films: [], directors: [] };
    const items = [
        ...current.films.map((f) => ({ kind: 'film', key: f._id, f })),
        ...current.directors.map((d) => ({ kind: 'director', key: d.name, d })),
    ];

    const choose = (item) => {
        setOpen(false);
        if (!item) {
            onSearch(text.trim());
            return;
        }
        if (item.kind === 'film') navigate(`/movie/${item.f._id}`);
        else { setText(''); onDirector(item.d.name); }
    };

    const onKey = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(items.length - 1, a + 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
        else if (e.key === 'Enter') { e.preventDefault(); choose(items[active]); }
        else if (e.key === 'Escape') setOpen(false);
    };

    return (
        <div ref={box} className="relative w-full md:w-80">
            <label className="flex items-center gap-2 border-b border-white/25 focus-within:border-[#e2b866] transition-colors">
                <MdSearch className="text-gray-400 flex-shrink-0" aria-hidden="true" />
                <input
                    id="explore-search"
                    type="search"
                    value={text}
                    onChange={(e) => { setText(e.target.value); setOpen(true); setActive(-1); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKey}
                    placeholder="Search a film or a director"
                    aria-label="Search a film or a director"
                    aria-expanded={open && items.length > 0}
                    aria-controls="explore-suggestions"
                    className="w-full bg-transparent py-2.5 text-gray-100 placeholder:text-gray-500 outline-none [&::-webkit-search-cancel-button]:appearance-none"
                />
            </label>
            {open && items.length > 0 && (
                <ul id="explore-suggestions" role="listbox" className="absolute z-30 left-0 right-0 mt-2 bg-[#0b0b0b] ring-1 ring-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.7)] max-h-[60vh] overflow-y-auto">
                    {items.map((item, i) => (
                        <li key={`${item.kind}:${item.key}`} role="option" aria-selected={i === active}>
                            <button
                                type="button"
                                onMouseEnter={() => setActive(i)}
                                onClick={() => choose(item)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left ${i === active ? 'bg-white/10' : ''}`}
                            >
                                {item.kind === 'film' ? (
                                    <>
                                        <span className="w-16 aspect-video flex-shrink-0 overflow-hidden bg-[#141414]">
                                            {(item.f.still || item.f.posterUrl) && <img src={item.f.still ? sized(item.f.still, 'w300') : sized(item.f.posterUrl, 'w185')} alt="" className="w-full h-full object-cover" />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block font-serif text-gray-100 truncate">{item.f.title}</span>
                                            <span className="block font-mono text-[10px] tracking-[0.15em] uppercase text-gray-500 truncate">{[item.f.year, item.f.directors?.[0]].filter(Boolean).join(' · ')}</span>
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-9 h-9 flex-shrink-0 overflow-hidden bg-[#141414] ring-1 ring-white/10">
                                            {item.d.portrait && <img src={sized(item.d.portrait, 'w185')} alt="" className="w-full h-full object-cover grayscale" />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-gray-100 truncate">{item.d.name}</span>
                                            <span className="block font-mono text-[10px] tracking-[0.15em] uppercase text-gray-500">Director · {item.d.films} {item.d.films === 1 ? 'film' : 'films'}</span>
                                        </span>
                                    </>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SearchBox;
