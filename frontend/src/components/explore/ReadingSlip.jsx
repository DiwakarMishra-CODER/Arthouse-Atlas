import { motion } from 'framer-motion';
import { MdClose } from 'react-icons/md';

/**
 * How a sentence typed into the search was read: a slip of card stock under the search, like the note
 * a box office clips to your ticket. The board above already shows the reading in its gold words; the
 * slip says it in a sentence, names what couldn't be placed (and so isn't on the board: "not
 * American", a director the atlas doesn't have), says what orders the wall, and who read it. While
 * the sentence is being read, it says so; a sentence that isn't about films changes nothing; one that
 * couldn't be read becomes an ordinary search. Every word on it is the visitor's own or the site's:
 * the model's own words never reach the page.
 *
 * reading: { q, state: 'reading' | 'done' | 'offTopic' | 'failed', answer: { feel, unplaced, empty, by } }
 */

const quote = (s) => `“${s}”`;
const list = (xs) => xs.map(quote).join(', ');

const ReadingSlip = ({ reading, feelFailed = false, onPlain, onClose, reducedMotion: still = false }) => {
    const { q, state, answer } = reading;
    let line;
    let note = null;
    if (state === 'reading') line = <>Reading it into the board’s words<span aria-hidden="true" className={still ? '' : 'animate-pulse'}>…</span></>;
    else if (state === 'offTopic') line = 'That doesn’t sound like a request for films, so the board is as it was. Try something like “slow Japanese films from the 60s”.';
    else if (state === 'failed') line = 'The board couldn’t read that just now, so these are the films whose titles or names match your words.';
    else if (answer.empty && !answer.unplaced.length) line = 'Nothing in that narrows the films, so the board shows them all, most acclaimed first.';
    else {
        line = answer.empty ? 'Nothing in that could go on the board, so it shows every film.' : 'Read into the gold words on the board above. Change or take off any of them.';
        if (answer.feel.length && !feelFailed) note = <>Sorted by how well they fit {list(answer.feel)}: what viewers said about each film, and its story.</>;
        if (answer.feel.length && feelFailed) note = <>Couldn’t sort by {list(answer.feel)} just now, so the films are in the canon’s order.</>;
    }
    const unplaced = state === 'done' ? answer.unplaced : [];

    return (
        <motion.div
            role="status"
            aria-live="polite"
            initial={still ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative mt-4 flex overflow-hidden rounded-[6px] bg-[#efe6d3] text-[#1c1915] shadow-[0_14px_36px_rgba(0,0,0,0.55)]"
        >
            {/* the stub */}
            <div aria-hidden="true" className="flex w-9 flex-shrink-0 items-center justify-center border-r border-dashed border-[#1c1915]/30 bg-[#e4d6b8]">
                <span className="-rotate-90 whitespace-nowrap font-label text-[10.5px] tracking-[0.2em] uppercase text-[#b4372f]">{state === 'reading' ? 'Reading' : 'Read'}</span>
            </div>
            <div className="min-w-0 flex-1 px-4 py-3 pr-10">
                <p className="font-serif italic text-[17px] leading-snug">{quote(q)}</p>
                <p className="mt-1 text-[14.5px] leading-relaxed text-[#3a342b]">{line}</p>
                {note && <p className="mt-1 text-[14.5px] leading-relaxed text-[#3a342b]">{note}</p>}
                {unplaced.length > 0 && (
                    <p className="mt-1 text-[14.5px] leading-relaxed text-[#3a342b]">
                        <span className="font-semibold text-[#b4372f]">Couldn’t place</span> {list(unplaced)}: the board can’t say {unplaced.length === 1 ? 'that' : 'those'}, so {unplaced.length === 1 ? 'it isn’t' : 'they aren’t'} on it.
                    </p>
                )}
                {state === 'done' && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-label text-[11px] tracking-[0.14em] uppercase text-[#6b6152]">
                        <span>Read by {answer.by}, checked against the atlas</span>
                        <button type="button" onClick={() => onPlain(q)} className="underline decoration-[#6b6152]/40 underline-offset-4 hover:text-[#1c1915]">Search the words instead</button>
                    </div>
                )}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="absolute right-2 top-2 p-1.5 text-[#6b6152] hover:text-[#1c1915]">
                <MdClose aria-hidden="true" />
            </button>
        </motion.div>
    );
};

export default ReadingSlip;
