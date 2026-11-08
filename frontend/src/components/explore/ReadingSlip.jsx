import { motion } from 'framer-motion';
import { MdClose } from 'react-icons/md';

/**
 * A search typed as a description ("depressing", "slow sad Japanese films from the 60s"), as the visitor
 * sees it. Two parts, so a search always visibly does something:
 *
 * - SearchNote, under the search box: "Searching…" while the words are read, and the plain answer when
 *   they aren't about films (nothing changes then).
 * - SearchResults, a slim strip right under the board (which shows the reading in its gold words):
 *   the search, what a reference was read as, what orders the films, what couldn't be used (or, when
 *   nothing could, that it couldn't become a search), and the way out: search titles and names instead.
 *
 * Every word on them is the visitor's own or the site's: the model's own words never reach the page.
 * reading: { q, state: 'reading' | 'done' | 'offTopic' | 'failed', answer: { feel, unplaced, empty, by } }
 */

const quote = (s) => `“${s}”`;
const list = (xs) => xs.map(quote).join(', ');

export const SearchNote = ({ reading, onClose, reducedMotion: still = false }) => (
    <motion.div
        role="status"
        aria-live="polite"
        initial={still ? false : { opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mt-3.5 pr-8 text-[15px] md:text-[16px] leading-relaxed text-gray-300"
    >
        {reading.state === 'reading'
            ? <>Finding films for <span className="italic text-white">{quote(reading.q)}</span><span aria-hidden="true" className={still ? '' : 'animate-pulse'}>…</span></>
            : <>{quote(reading.q)} doesn’t sound like a request for films, so nothing changed. Try something like <span className="italic text-white">“slow Japanese films from the 60s”</span>.</>}
        {reading.state !== 'reading' && (
            <button type="button" onClick={onClose} aria-label="Close" className="absolute right-0 top-0.5 p-1 text-gray-500 hover:text-white"><MdClose aria-hidden="true" /></button>
        )}
    </motion.div>
);

export const SearchResults = ({ reading, total = null, feelFailed = false, sure = 0, basis = null, onPlain, onRetry, onClose, reducedMotion: still = false }) => {
    const { q, state, answer } = reading;
    const failed = state === 'failed';
    // nothing in it could become a search (no filter, no feeling, no subject): say that first, plainly
    const nothing = !failed && answer?.empty;
    const said = (words) => words.map(quote).join(' or ');
    const n = (k) => `${k.toLocaleString('en')} ${k === 1 ? 'film' : 'films'}`;
    let order = null;
    if (failed) order = 'We couldn’t read it as a description just now, so these are the films whose titles or names match the words.';
    else if (answer.about?.length && basis === 'viewers') order = <>First the {n(sure)} tagged or described as {said([...answer.feel, ...answer.about])}, then the rest, closest story first.</>;
    else if (answer.about?.length && basis === 'story' && !feelFailed) order = <>Nothing here is tagged {said(answer.about)}, so the films are ordered by how close each story is.</>;
    else if (answer.feel.length && basis === 'viewers') order = <>First the {n(sure)} viewers called {said(answer.feel)}, then the rest, most acclaimed first.</>;
    else if (answer.feel.length && basis === 'story' && !feelFailed) order = <>No viewer used {answer.feel.length === 1 ? 'that word' : 'those words'}, so the films are ordered by how close each story is. Trust it less.</>;
    else if (answer.feel.length) order = <>Couldn’t sort by {said(answer.feel)} just now, so the most acclaimed come first.</>;
    else if (nothing) {
        order = <>
            {answer.unplaced.length ? <>The filters can’t say {list(answer.unplaced)}. </> : 'Nothing in it is a place, a time, a person or a feeling the films can be found by. '}
            Try how a film should feel, or where and when it’s from: <span className="italic text-white">“something dreamlike”</span>, <span className="italic text-white">“French films from the 60s”</span>. Below is every film.
        </>;
    }
    const unplaced = failed || nothing ? [] : answer.unplaced;
    // a feeling described through a reference, and what it was read as ("like a warm hug": warm, gentle)
    const translated = failed ? [] : Object.entries((answer.inferred || []).reduce((by, i) => ({ ...by, [i.from]: [...(by[i.from] || []), i.value] }), {}));
    const line = 'text-[14.5px] md:text-[15.5px] leading-relaxed text-gray-300';

    return (
        <motion.section
            id="results"
            aria-live="polite"
            initial={still ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative mt-4 mx-auto max-w-5xl rounded-2xl bg-[#100e0c] ring-1 ring-white/10 px-5 md:px-6 py-4 pr-11"
        >
            <p className="text-[15px] md:text-[16px] text-gray-100">
                <span className="mr-2 font-label text-[11.5px] tracking-[0.16em] uppercase text-gold">Your search</span>
                <span className="italic">{quote(q)}</span>
                {nothing && <span className="text-[#e0675d]"> couldn’t become a search</span>}
                {total != null && !nothing && <span className="text-gray-400"> · {failed ? `${n(total)} match the words` : n(total)}</span>}
            </p>
            {translated.map(([from, values]) => (
                <p key={from} className={`mt-1 ${line}`}>We read <span className="italic text-white">{quote(from)}</span> as: <span className="text-gold-light">{values.join(', ')}</span>.</p>
            ))}
            {order && <p className={`mt-1 ${line}`}>{order}</p>}
            {unplaced.length > 0 && (
                <p className={`mt-1 ${line}`}><span className="text-[#e0675d]">Couldn’t use</span> {list(unplaced)}: the filters can’t say {unplaced.length === 1 ? 'that' : 'those'}.</p>
            )}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5">
                {failed
                    ? <button type="button" onClick={() => onRetry(q)} className="font-label text-[12px] tracking-[0.14em] uppercase text-gold-light underline decoration-gold/40 underline-offset-4 hover:text-white">Try reading it again</button>
                    : <button type="button" onClick={() => onPlain(q)} className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-300 underline decoration-white/25 underline-offset-4 hover:text-white">Search titles and names instead</button>}
                {!failed && <span className="text-[12.5px] text-gray-500">Understood by {answer.by}, checked against the atlas</span>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 p-1.5 text-gray-500 hover:text-white"><MdClose aria-hidden="true" /></button>
        </motion.section>
    );
};
