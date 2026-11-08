import { MdArrowDownward } from 'react-icons/md';
import { STEPS } from './words';

/**
 * The box of letters under the board: what its gold words can say, as pictures, open from the start
 * (a board's own words read as a sign, not as something to press; this is plainly something to pick
 * from). Each tab is one of the board's words, and shows that word's own picker right here (the night
 * earth, the strip of decades, the contact sheet of directors…): there are no dropdowns to find. It
 * opens on the first word still blank: with nothing chosen, the map, the plainest "tap me" there is. Pick one and
 * the board changes; the tray stays on that word, so you can pick more of it (any of them will do).
 * It used to move on to the next blank word and ask for it, which read as a form to complete: people
 * filled every word and were left with a handful of films. Now, once anything is chosen, the main
 * action is "Show me the N films", above the picker and again under it.
 *
 * Its tab is the page's (`tab`, `onTab`), so a gold word can open its picker here, and the board can
 * light the word the tray is asking for. The pickers come from the page (`picker(id)`).
 */

const TABS = [...STEPS, { id: 'sort', tab: 'Order' }];

// what "or" means here, in this word's own terms
const MULTI_HINT = {
    country: 'Pick another country to add it with “or”: Japan or South Korea.',
    decade: 'Pick another decade to add it with “or”: the 1960s or 1970s.',
    director: 'Pick another director to add them with “or”: Ozu or Naruse.',
    movement: 'Pick another movement to add it with “or”.',
    mood: 'Pick another mood to add it with “or”: melancholic or dreamlike.',
    genre: 'Pick another genre to add it with “or”: Drama or Romance.',
    length: 'Pick another length to add it with “or”: under 90 minutes or 90 minutes to 2 hours.',
};
const filmsWord = (n) => `${n.toLocaleString('en')} ${n === 1 ? 'film' : 'films'}`;

// down to the films: plain words with nothing chosen, the main gold button once something is
const ShowButton = ({ first, total, onShow }) => (first ? (
    <button type="button" onClick={onShow} className="self-start md:self-auto inline-flex items-center gap-2 min-h-11 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">
        Or just show me the films <MdArrowDownward aria-hidden="true" />
    </button>
) : (
    <button type="button" onClick={onShow} className="self-start md:self-auto inline-flex items-center gap-2.5 min-h-11 px-5 rounded-xl bg-gold text-black font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase shadow-[0_10px_30px_-12px_rgba(217,173,98,0.7)] hover:bg-gold-light transition-colors">
        {total == null ? 'Show me the films' : total === 0 ? 'See what nearly fits' : `Show me the ${total === 1 ? 'film' : filmsWord(total)}`} <MdArrowDownward aria-hidden="true" className="text-[15px]" />
    </button>
));

const Tray = ({ sel, tab, onTab, first = false, total = null, multi = [], onShow, onHide = null, titles, picker }) => {
    const open = TABS.some((t) => t.id === tab) ? tab : STEPS[0].id;

    return (
        <section aria-label="Ways in" className="own-transitions mt-6 md:mt-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                    <p className="font-serif text-xl md:text-2xl text-white">
                        {first && open === 'country' ? 'Start anywhere: tap a country on the map, or try another tab.' : titles[open]}
                    </p>
                    {multi.includes(open) && <p className="mt-1 text-[14px] text-gray-400">{MULTI_HINT[open] || 'Pick another to add it with “or”: a film needs only one of them.'}</p>}
                </div>
                {/* (never in the way of the films: they're one tap down from the start; and the tray folds away) */}
                <div className="flex items-center gap-4 md:gap-5 self-start md:self-auto">
                    {onHide && (
                        <button type="button" onClick={onHide} aria-expanded="true" className="inline-flex items-center gap-1.5 min-h-11 font-label text-[12px] md:text-[12.5px] tracking-[0.14em] uppercase text-gray-400 hover:text-white transition-colors">
                            Hide filters <span aria-hidden="true" className="text-gold">▴</span>
                        </button>
                    )}
                    <ShowButton first={first} total={total} onShow={onShow} />
                </div>
            </div>
            {/* the tabs: a bit of everything, then each of the board's words */}
            <div role="tablist" aria-label="Choose by" className="mt-3 -mx-4 px-4 md:mx-0 md:px-0 flex gap-x-5 md:gap-x-7 overflow-x-auto [scrollbar-width:none] border-b border-white/10">
                {TABS.map((s) => {
                    const here = open === s.id;
                    const set = s.id !== 'sort' && sel[s.id];
                    return (
                        <button key={s.id} type="button" role="tab" aria-selected={here} onClick={() => onTab(s.id)} className={`shrink-0 min-h-11 -mb-px border-b-2 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase whitespace-nowrap ${here ? 'border-gold text-gold-light' : 'border-transparent text-gray-300 hover:text-white'}`}>
                            {s.tab}{set && <span aria-label=" (chosen)" className="ml-1.5 text-gold">•</span>}
                        </button>
                    );
                })}
            </div>
            {/* the word's own picker, open right here */}
            <div role="tabpanel" key={open} className="still-open mt-4 p-4 md:p-6 bg-[#0b0a09] ring-1 ring-white/10">
                {picker(open)}
                {!first && (
                    <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                        <ShowButton first={false} total={total} onShow={onShow} />
                    </div>
                )}
            </div>
        </section>
    );
};

export default Tray;
