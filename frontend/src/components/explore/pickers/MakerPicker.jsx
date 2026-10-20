import { useState } from 'react';
import { sized } from '../../movements/treatments';
import { Clear, Filter } from './parts';
import { norm, filmsWord } from './util';

/**
 * Who made it: a photographer's contact sheet. Every director a small black-and-white print
 * with its frame number, their name, and their most acclaimed film here (so a name you don't
 * know still tells you something). A director without a portrait shows a frame of their best
 * film instead. Choose one and it's ringed in red grease pencil, the way a picture editor
 * marks the frame they want.
 */

const initials = (name) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const FIRST = 48;

const MakerPicker = ({ options = [], value, onPick }) => {
    const [typed, setTyped] = useState('');
    const [all, setAll] = useState(false);
    const matching = options.filter((o) => norm(o.value).includes(norm(typed)));
    const shown = typed || all ? matching : matching.slice(0, FIRST);
    return (
        <>
            <div className="flex flex-wrap items-end gap-x-8">
                <Clear label="Anyone" active={!value} onClick={() => onPick('')} />
                <Filter value={typed} onChange={setTyped} placeholder="Type a name" />
            </div>
            <div className="bg-[#0a0909] ring-1 ring-white/10 px-3 py-4 md:px-5 md:py-6">
                <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-3 md:gap-x-4 gap-y-6">
                    {shown.map((o, i) => {
                        const active = norm(o.value) === norm(value);
                        const picture = o.portrait ? sized(o.portrait, 'w185') : o.top?.still ? sized(o.top.still, 'w300') : null;
                        return (
                            <li key={o.value}>
                                <button type="button" onClick={() => onPick(o.value)} aria-pressed={active} className="group relative block w-full text-left">
                                    <span aria-hidden="true" className="block mb-1 font-label text-[11px] tracking-[0.14em] text-gold/60">{Math.floor(i / 2) + 1}{i % 2 ? 'A' : ''}</span>
                                    <span className="relative block aspect-[4/5] overflow-hidden bg-[#171513] ring-[3px] ring-[#e7e1d5]/80">
                                        {picture
                                            ? <img src={picture} alt="" loading="lazy" decoding="async" className={`w-full h-full object-cover max-w-none grayscale contrast-[1.08] transition-[filter] duration-500 ${o.portrait ? '' : 'brightness-75'} group-hover:brightness-110`} />
                                            : <span className="w-full h-full flex items-center justify-center font-serif text-2xl text-gray-500">{initials(o.value)}</span>}
                                    </span>
                                    <span className={`mt-2 block text-[14px] leading-tight ${active ? 'text-white' : 'text-gray-200'}`}>{o.value}</span>
                                    {o.top?.title && <span className="block italic text-[13px] leading-snug text-gray-400 line-clamp-1">{o.top.title}</span>}
                                    <span className="block font-label text-[11px] tracking-[0.14em] uppercase text-gray-500">{filmsWord(o.n)}</span>
                                    {active && (
                                        <svg aria-hidden="true" viewBox="0 0 100 140" preserveAspectRatio="none" className="grease-loop absolute -left-2 -right-2 top-1 -bottom-2 w-[calc(100%+16px)] h-[calc(100%+4px)] pointer-events-none overflow-visible">
                                            <path d="M52 3 C 84 1, 99 30, 97 70 C 95 112, 76 137, 47 136 C 16 135, 2 108, 3 68 C 4 30, 20 5, 58 6" pathLength="100" fill="none" stroke="#d2382b" strokeWidth="2.6" strokeLinecap="round" opacity="0.92" />
                                        </svg>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
                {!shown.length && <p className="text-[15px] text-gray-400">No one here by that name.</p>}
            </div>
            {!typed && !all && matching.length > shown.length && (
                <button type="button" onClick={() => setAll(true)} className="mt-5 font-label text-[13px] tracking-[0.14em] uppercase text-gray-200 hover:text-white">
                    Show all {matching.length} directors
                </button>
            )}
        </>
    );
};

export default MakerPicker;
