import { MdArrowDownward } from 'react-icons/md';
import { STEPS } from './words';

/**
 * The box of letters under the board: what its gold words can say, as pictures, open from the start
 * (a board's own words read as a sign, not as something to press; this is plainly something to pick
 * from). Each tab is one of the board's words, and shows that word's own picker right here (the night
 * earth, the strip of decades, the contact sheet of directors…): there are no dropdowns to find. It
 * opens on the first word still blank: with nothing chosen, the map, the plainest "tap me" there is. Pick one and
 * the board changes, and the tray opens the picker for the next word still blank, asking for it
 * ("And when?"), so the sentence fills one word at a time. Nobody has to go on: the films change
 * with every pick, and "Show me the films" goes down to them.
 *
 * Its tab is the page's (`tab`, `onTab`), so a gold word can open its picker here, and the board can
 * light the word the tray is asking for. The pickers come from the page (`picker(id)`).
 */

const TABS = [...STEPS, { id: 'sort', tab: 'Order' }];

const Tray = ({ sel, tab, onTab, asked, first = false, onShow, titles, picker }) => {
    const open = TABS.some((t) => t.id === tab) ? tab : STEPS[0].id;
    const step = STEPS.find((s) => s.id === open);

    return (
        <section aria-label="Ways in" className="own-transitions mt-6 md:mt-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <p aria-live="polite" className="font-serif text-xl md:text-2xl text-white">
                    {asked && step
                        ? <><span className="font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold mr-3">Next</span>{step.ask}</>
                        : first && open === 'country' ? 'Start anywhere: tap a country on the map, or try another tab.' : titles[open]}
                </p>
                {/* (never in the way of the films: they're one tap down from the start) */}
                <button type="button" onClick={onShow} className="self-start md:self-auto inline-flex items-center gap-2 min-h-11 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">
                    {asked ? 'That’s enough, show me the films' : 'Or just show me the films'} <MdArrowDownward aria-hidden="true" />
                </button>
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
            </div>
        </section>
    );
};

export default Tray;
