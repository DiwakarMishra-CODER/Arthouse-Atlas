import { useState } from 'react';
import { MdArrowDownward } from 'react-icons/md';
import { sized } from '../movements/treatments';
import { LENGTH_WORDS, STEPS } from './words';

/**
 * The box of letters under the board: what its gold words can say, as pictures, open from the start
 * (a board's own words read as a sign, not as something to press; this is plainly something to pick
 * from). It opens on a bit of everything, one picture for each way in (a place, a decade, a director,
 * a movement, a mood, a kind of film, a length), so the first look shows all of them; each tab is one
 * of the board's words. Pick one and the board changes, and the tray moves on to the next word still
 * blank, asking for it ("And when?"), so the sentence fills one word at a time. Nobody has to go on:
 * the films change with every pick, and "Show me the films" goes down to them.
 *
 * Its tab is the page's (`tab`, `onTab`), so the board can light the word it's asking for.
 */

const MIX = 'mix';
const ROW = 14; // pictures in a row before "all of them"

// a choice as a tile: what the board takes, what it's called, and its picture
const tileOf = (id, o) => ({
    id,
    value: id === 'movement' ? o.tag || o.value : o.value,
    name: id === 'decade' ? `The ${o.value}s` : id === 'length' ? LENGTH_WORDS[o.value] || o.value : id === 'country' && o.value === 'United States of America' ? 'United States' : o.value,
    n: o.n,
    still: o.top?.still || o.hero || null,
    portrait: id === 'director' ? o.portrait : null,
    film: o.top?.title || null,
});

// the row for a way in: the ones with the most films first (decades in order, lengths shortest first)
const rowOf = (id, options = []) => {
    const usable = options.filter((o) => o.n > 0);
    const ordered = id === 'decade' ? [...usable].sort((a, b) => a.value - b.value)
        : id === 'length' ? usable
        : [...usable].sort((a, b) => b.n - a.n);
    return ordered.map((o) => tileOf(id, o));
};

// a bit of everything: one choice from each way in, never one that's much of the atlas (Drama, the
// United States), and
// a different one on each visit, from among the few with the most films
const mixOf = (facets, total) => STEPS.map(({ id }) => {
    const few = (facets[id] || []).filter((o) => o.n > 0 && o.n <= total * 0.3 && (id !== 'movement' || o.tag)).sort((a, b) => b.n - a.n).slice(0, id === 'director' || id === 'movement' ? 6 : 4);
    if (!few.length) return null;
    return tileOf(id, few[Math.floor(Math.random() * few.length)]);
}).filter(Boolean);

const Tile = ({ tile, kicker, on, onPick }) => (
    <button
        type="button"
        onClick={() => onPick(tile.id, tile.value)}
        aria-pressed={on}
        aria-label={`${kicker ? `${kicker}: ` : ''}${tile.name}, ${tile.n} ${tile.n === 1 ? 'film' : 'films'}`}
        className={`group relative shrink-0 snap-start w-[10.5rem] sm:w-[12rem] md:w-[13rem] aspect-[16/10] overflow-hidden bg-[#0c0b0a] text-left ring-1 ${on ? 'ring-gold' : 'ring-white/15 hover:ring-gold/70'} transition-[box-shadow] duration-200`}
    >
        {tile.still && <img src={sized(tile.still, 'w342')} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover max-w-none [filter:sepia(0.25)_brightness(0.72)] group-hover:[filter:brightness(0.95)] transition-[filter] duration-300" />}
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
        {tile.portrait && <img src={sized(tile.portrait, 'w185')} alt="" loading="lazy" className="absolute right-2 top-2 w-10 h-10 rounded-full object-cover max-w-none grayscale ring-1 ring-gold/60" />}
        {on && <span className="absolute left-2 top-2 px-2 py-0.5 bg-gold text-[#141110] font-label text-[12px] tracking-[0.14em] uppercase">On the board</span>}
        <span className="absolute inset-x-0 bottom-0 px-3 pb-2.5">
            {kicker && <span className="block font-label text-[12px] tracking-[0.14em] uppercase text-gold">{kicker}</span>}
            <span className="block font-serif text-[17px] md:text-lg leading-tight text-white truncate group-hover:text-gold-light">{tile.name}</span>
            <span className="block font-label text-[12px] tracking-[0.14em] uppercase text-gray-300">{tile.n} {tile.n === 1 ? 'film' : 'films'}</span>
        </span>
    </button>
);

const Tray = ({ facets, total, sel, tab, onTab, asked, onPick, onMore, onShow }) => {
    // (the mix is drawn once a visit, so it doesn't reshuffle under someone's hand)
    const [mix] = useState(() => mixOf(facets, total));
    const step = STEPS.find((s) => s.id === tab);
    const row = step ? rowOf(step.id, facets[step.id]) : mix;
    const shown = row.slice(0, ROW);
    const more = step && row.length > shown.length;
    const kickerOf = (id) => STEPS.find((s) => s.id === id)?.tab;

    return (
        <section aria-label="Ways in" className="own-transitions mt-6 md:mt-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <p aria-live="polite" className="font-serif text-xl md:text-2xl text-white">
                    {asked && step ? <><span className="font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold mr-3">Next</span>{step.ask}</> : 'Start anywhere: tap a picture.'}
                </p>
                {asked && (
                    <button type="button" onClick={onShow} className="self-start md:self-auto inline-flex items-center gap-2 min-h-11 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">
                        That’s enough, show me the films <MdArrowDownward aria-hidden="true" />
                    </button>
                )}
            </div>
            {/* the tabs: a bit of everything, then each of the board's words */}
            <div role="tablist" aria-label="Choose by" className="mt-3 -mx-4 px-4 md:mx-0 md:px-0 flex gap-x-5 md:gap-x-7 overflow-x-auto [scrollbar-width:none] border-b border-white/10">
                {[{ id: MIX, tab: 'A bit of everything' }, ...STEPS].map((s) => {
                    const here = (tab || MIX) === s.id;
                    const set = s.id !== MIX && sel[s.id];
                    return (
                        <button key={s.id} type="button" role="tab" aria-selected={here} onClick={() => onTab(s.id)} className={`shrink-0 min-h-11 -mb-px border-b-2 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase whitespace-nowrap ${here ? 'border-gold text-gold-light' : 'border-transparent text-gray-300 hover:text-white'}`}>
                            {s.tab}{set && <span aria-label=" (chosen)" className="ml-1.5 text-gold">•</span>}
                        </button>
                    );
                })}
            </div>
            {/* the pictures: one row, swiped on a phone */}
            <div role="tabpanel" className="mt-4 -mx-4 px-4 md:mx-0 md:px-0 flex gap-3 overflow-x-auto snap-x pb-3 [scrollbar-width:thin]">
                {shown.map((t) => (
                    <Tile key={`${t.id}:${t.value}`} tile={t} kicker={step ? null : kickerOf(t.id)} on={String(sel[t.id] || '') === String(t.value)} onPick={onPick} />
                ))}
                {more && (
                    <button type="button" onClick={() => onMore(step.id)} className="shrink-0 snap-start w-[10.5rem] sm:w-[12rem] md:w-[13rem] aspect-[16/10] flex flex-col items-center justify-center ring-1 ring-gold/40 hover:ring-gold bg-white/[0.02] font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">
                        <span>All {row.length}</span>
                        <span className="mt-1 text-gray-300">See them all ›</span>
                    </button>
                )}
            </div>
        </section>
    );
};

export default Tray;
