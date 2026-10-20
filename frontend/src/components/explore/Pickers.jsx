import { useEffect, useRef, useState } from 'react';
import TreatmentTitle from '../movements/TreatmentTitle';
import { sized } from '../movements/treatments';
import { LENGTH_WORDS, SORT_WORDS } from './words';

/**
 * What you choose from when you change a phrase on the letterboard. Each is made
 * for what it picks: a bar chart of the century for decades, portraits for
 * directors, every movement set in its own title type. Counts always mean "how
 * many films you'd see", with the board's other choices applied; an option that
 * would show nothing is dimmed.
 *
 * On a phone a picker rises as a sheet from the bottom; on a desktop it opens
 * under the board.
 */

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();


// focus moves into the picker when it opens, and back to what opened it when it closes
export const PickerPanel = ({ title, onClose, children }) => {
    const panel = useRef(null);
    useEffect(() => {
        const opener = document.activeElement;
        panel.current?.focus({ preventScroll: true });
        return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); };
    }, []);
    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/70 md:hidden" onClick={onClose} aria-hidden="true" />
            <section
                ref={panel}
                tabIndex={-1}
                role="dialog"
                aria-label={title}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[78vh] overflow-y-auto overscroll-contain rounded-t-2xl bg-[#0b0b0b] ring-1 ring-white/10 px-5 pt-5 pb-8 outline-none md:static md:z-auto md:mt-6 md:max-h-[62vh] md:rounded-none md:px-8 md:pt-6"
            >
                <div className="flex items-center justify-between gap-4 mb-5">
                    <h2 className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">{title}</h2>
                    <button type="button" onClick={onClose} className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-300 hover:text-white px-2 py-1">Done</button>
                </div>
                {children}
            </section>
        </>
    );
};

const Count = ({ n }) => <span className="ml-2 font-label text-[12px] text-gray-500 tabular-nums">{n}</span>;

// a plain choice: a word and how many films it would give
const Choice = ({ label, n, active, onClick, className = '' }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={!n && !active}
        aria-pressed={active}
        className={`text-left px-3 py-2.5 ring-1 transition-colors ${active ? 'ring-gold text-gold-light bg-gold/10' : 'ring-white/10 text-gray-200 hover:ring-white/40 hover:text-white'} disabled:opacity-30 disabled:hover:ring-white/10 ${className}`}
    >
        {label}<Count n={n} />
    </button>
);

const Clear = ({ label, onClick, active }) => (
    <button type="button" onClick={onClick} className={`mb-4 font-label text-[12px] tracking-[0.14em] uppercase ${active ? 'text-gold' : 'text-gray-400 hover:text-white'}`}>
        {active ? `● ${label}` : label}
    </button>
);

const Filter = ({ value, onChange, placeholder }) => (
    <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full md:w-80 mb-4 bg-transparent border-b border-white/20 focus:border-gold outline-none py-2 text-gray-100 placeholder:text-gray-500 [&::-webkit-search-cancel-button]:appearance-none"
    />
);

export const CountryPicker = ({ options = [], value, onPick }) => {
    const [typed, setTyped] = useState('');
    const shown = options.filter((o) => norm(o.value).includes(norm(typed)));
    return (
        <>
            <Clear label="Everywhere" active={!value} onClick={() => onPick('')} />
            <Filter value={typed} onChange={setTyped} placeholder="Type a country" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {shown.map((o) => <Choice key={o.value} label={o.value === 'United States of America' ? 'United States' : o.value} n={o.n} active={o.value === value} onClick={() => onPick(o.value)} />)}
            </div>
        </>
    );
};

// the century as a bar chart: each bar is a decade, as tall as the films it would give;
// under the bars, which century each belongs to (so the 1920s and the 2020s aren't both "20s")
export const DecadePicker = ({ options = [], value, onPick }) => {
    const all = Array.from({ length: 11 }, (_, i) => 1920 + i * 10);
    const count = new Map(options.map((o) => [o.value, o.n]));
    const max = Math.max(1, ...options.map((o) => o.n));
    return (
        <>
            <Clear label="Every decade" active={!value} onClick={() => onPick('')} />
            <div className="grid grid-cols-11 items-end gap-1.5 md:gap-3 h-48 md:h-56">
                {all.map((d) => {
                    const n = count.get(d) || 0;
                    const active = String(d) === String(value);
                    return (
                        <button key={d} type="button" disabled={!n && !active} onClick={() => onPick(d)} aria-pressed={active} aria-label={`The ${d}s: ${n} films`} className="group h-full flex flex-col justify-end items-center gap-2 disabled:opacity-30">
                            <span className={`font-label text-[12px] tabular-nums ${active ? 'text-gold-light' : 'text-gray-400'}`}>{n || ''}</span>
                            <span className={`w-full transition-colors ${active ? 'bg-gold' : 'bg-gold/35 group-hover:bg-gold/70'}`} style={{ height: `${Math.max(2, (n / max) * 100)}%` }} />
                            <span className={`font-label text-[12px] md:text-[13px] tracking-[0.14em] ${active ? 'text-gold' : 'text-gray-300'}`}>{`${String(d).slice(2)}s`}</span>
                        </button>
                    );
                })}
            </div>
            <div aria-hidden="true" className="mt-2 grid grid-cols-11 gap-1.5 md:gap-3 font-label text-[12px] tracking-[0.14em] text-gray-500">
                <span className="col-span-8 border-t border-white/15 pt-1.5 text-center">1900s</span>
                <span className="col-span-3 border-t border-white/15 pt-1.5 text-center">2000s</span>
            </div>
        </>
    );
};

const initials = (name) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// the people: a portrait (or their initials), name and number of films, most films first
export const DirectorPicker = ({ options = [], value, onPick }) => {
    const [typed, setTyped] = useState('');
    const [all, setAll] = useState(false);
    const matching = options.filter((o) => norm(o.value).includes(norm(typed)));
    const shown = typed || all ? matching : matching.slice(0, 48);
    return (
        <>
            <Clear label="Any director" active={!value} onClick={() => onPick('')} />
            <Filter value={typed} onChange={setTyped} placeholder="Type a name" />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
                {shown.map((o) => {
                    const active = norm(o.value) === norm(value);
                    return (
                        <button key={o.value} type="button" onClick={() => onPick(o.value)} aria-pressed={active} className="group text-left">
                            <span className={`block aspect-square overflow-hidden ring-1 ${active ? 'ring-gold' : 'ring-white/10 group-hover:ring-white/40'} bg-[#141414]`}>
                                {o.portrait
                                    ? <img src={sized(o.portrait, 'w185')} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-[filter] duration-500" />
                                    : <span className="w-full h-full flex items-center justify-center font-serif text-2xl text-gray-500">{initials(o.value)}</span>}
                            </span>
                            <span className={`mt-1.5 block text-[12px] leading-tight ${active ? 'text-gold-light' : 'text-gray-200'}`}>{o.value}</span>
                            <span className="font-label text-[12px] text-gray-500">{o.n} {o.n === 1 ? 'film' : 'films'}</span>
                        </button>
                    );
                })}
            </div>
            {!typed && !all && matching.length > shown.length && (
                <button type="button" onClick={() => setAll(true)} className="mt-5 font-label text-[12px] tracking-[0.14em] uppercase text-gray-300 hover:text-white">
                    Show all {matching.length} directors
                </button>
            )}
        </>
    );
};

// every movement in its own title type, with its years
export const MovementPicker = ({ options = [], value, onPick }) => (
    <>
        <Clear label="Any movement" active={!value} onClick={() => onPick('')} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {options.map((o) => {
                const active = o.tag === value;
                return (
                    <button key={o.value} type="button" disabled={!o.tag} onClick={() => onPick(o.tag)} aria-pressed={active} className={`group text-left px-4 py-4 ring-1 ${active ? 'ring-gold bg-gold/5' : 'ring-white/10 hover:ring-white/40'} overflow-hidden`}>
                        <span className="block min-h-[3.2rem] pointer-events-none"><TreatmentTitle movement={{ title: o.value, tag: o.tag }} size="card" as="span" /></span>
                        <span className="mt-3 block font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">{o.era ? `${o.era} · ` : ''}{o.n} {o.n === 1 ? 'film' : 'films'}</span>
                    </button>
                );
            })}
        </div>
    </>
);

export const MoodPicker = ({ options = [], value, onPick, notes }) => (
    <>
        <Clear label="Any mood" active={!value} onClick={() => onPick('')} />
        <div className="flex flex-wrap gap-2">
            {options.map((o) => <Choice key={o.value} label={o.value} n={o.n} active={o.value === value} onClick={() => onPick(o.value)} />)}
        </div>
        {notes && <p className="mt-5 text-sm text-gray-500">Moods come from our own notes on {notes} films; more as we write them.</p>}
    </>
);

export const GenrePicker = ({ options = [], value, onPick }) => (
    <>
        <Clear label="Any genre" active={!value} onClick={() => onPick('')} />
        <div className="flex flex-wrap gap-2">
            {options.map((o) => <Choice key={o.value} label={o.value} n={o.n} active={o.value === value} onClick={() => onPick(o.value)} />)}
        </div>
    </>
);

export const LengthPicker = ({ options = [], value, onPick }) => {
    const count = new Map(options.map((o) => [o.value, o.n]));
    return (
        <>
            <Clear label="Any length" active={!value} onClick={() => onPick('')} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {Object.entries(LENGTH_WORDS).map(([k, label]) => <Choice key={k} label={label} n={count.get(k) || 0} active={k === value} onClick={() => onPick(k)} />)}
            </div>
        </>
    );
};

export const SortPicker = ({ value, onPick }) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {Object.entries(SORT_WORDS).map(([k, label]) => (
            <button key={k} type="button" onClick={() => onPick(k)} aria-pressed={k === value} className={`text-left px-3 py-2.5 ring-1 transition-colors ${k === value ? 'ring-gold text-gold-light bg-gold/10' : 'ring-white/10 text-gray-200 hover:ring-white/40 hover:text-white'}`}>
                {k === 'surprise' && value === 'surprise' ? 'Shuffle again' : label}
            </button>
        ))}
    </div>
);
