import { useState } from 'react';
import { MdArrowForward } from 'react-icons/md';

/**
 * Describe what you want to watch: the search that reads a description ("something slow and sad from
 * the 60s", "I want to cry") into the board's filters and orders the films by how well they fit
 * (natural-language search: the server's /movies/understand, checked against the atlas). Its own box,
 * labelled, above the lookup of titles and names, so nobody has to guess which kind of search they're
 * running, and the AI only runs when someone asks it to. Example descriptions under it run when tapped.
 *
 * value / onChange: the text (the page keeps it, so "Describe it instead" from the lookup can fill it)
 * onSubmit(text): read it; reading: while it's being read
 */

const MAX = 200;

// quiet: the page's own heading asks the question, so the box's label is for screen readers only
const DescribeBox = ({ value, onChange, onSubmit, reading = false, examples = [], quiet = false }) => {
    const [focused, setFocused] = useState(false);
    const text = value.trim();
    const submit = (e) => {
        e.preventDefault();
        if (!text) { document.getElementById('explore-describe')?.focus(); return; } // nothing typed yet: where to type
        if (!reading) onSubmit(text);
    };
    return (
        <form onSubmit={submit} role="search" aria-label="Describe what you want to watch">
            <label htmlFor="explore-describe" className={quiet ? 'sr-only' : 'block font-label text-[12px] md:text-[13px] tracking-[0.2em] uppercase text-gold'}>Describe what you want to watch</label>
            <div className={`relative ${quiet ? '' : 'mt-3'} flex items-stretch gap-2 p-1.5 min-h-[3.75rem] md:min-h-[4.25rem] rounded-[1.25rem] bg-[#1c1813] ring-[1.5px] transition-shadow ${focused ? 'ring-gold shadow-[0_0_0_4px_rgba(217,173,98,0.16),0_16px_44px_rgba(0,0,0,0.55)]' : 'ring-gold/70 hover:ring-gold shadow-[0_16px_44px_rgba(0,0,0,0.45)]'}`}>
                <input
                    id="explore-describe"
                    type="text"
                    value={value}
                    maxLength={MAX}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="e.g. a funny road trip film, or a heist set in Paris"
                    autoComplete="off"
                    enterKeyHint="search"
                    className="w-full min-w-0 bg-transparent pl-3.5 md:pl-4 py-2.5 text-[1.05rem] md:text-[1.2rem] text-white placeholder:text-[#b9b0a2] outline-none"
                />
                <button type="submit" disabled={reading} aria-label="Find films" className="flex-shrink-0 inline-flex items-center gap-2 px-4 md:px-6 rounded-[0.9rem] bg-gold text-black font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase shadow-[0_6px_18px_rgba(217,173,98,0.3)] hover:bg-gold-light active:scale-[0.98] disabled:opacity-80 disabled:hover:bg-gold transition">
                    {reading ? 'Searching…' : <><span className="hidden sm:inline">Find films</span><MdArrowForward aria-hidden="true" className="text-[18px]" /></>}
                </button>
                {/* while it's read: a short light running along the bottom of the box */}
                {reading && <span aria-hidden="true" className="search-reading absolute left-5 right-5 bottom-0 h-[2px] overflow-hidden rounded-full"><span /></span>}
            </div>
            {examples.length > 0 && (
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <span className="mr-1 font-label text-[12px] tracking-[0.16em] uppercase text-gold-light">Try</span>
                    {examples.map((d) => (
                        <button key={d} type="button" disabled={reading} onClick={() => { onChange(d); onSubmit(d); }} className="rounded-full px-3.5 py-1.5 bg-white/[0.07] ring-1 ring-white/15 text-[14.5px] md:text-[15px] text-gray-100 hover:bg-gold/15 hover:ring-gold/60 hover:text-white active:scale-[0.97] transition disabled:opacity-50">{d}</button>
                    ))}
                </div>
            )}
        </form>
    );
};

export default DescribeBox;
