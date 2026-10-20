/**
 * The foyer's letterboard: white plastic letters pushed into the grooves of black
 * felt, behind glass, in a brass frame, lit from above. It says, in plain words,
 * what's showing; the gold phrases are the controls (tap one to change it, × to
 * take it down).
 *
 * Each letter sits a hair off true, the same way on every visit (a hash of where
 * it is). When a phrase changes, only its letters are re-set: they drop into the
 * groove one by one, and a glint of light crosses the glass.
 *
 * lines: [{ size: 'small' | 'big' | 'medium' | 'sort', phrases: [{ id, text, control?, label?, onClick?, onRemove? }] }]
 */

const SIZES = {
    small: 'text-[clamp(0.8rem,1.3vw,1.05rem)] tracking-[0.45em] text-[#f3efe6]/70',
    big: 'mt-2 md:mt-3 text-[clamp(1.55rem,4.1vw,3.5rem)] tracking-[0.06em]',
    medium: 'mt-1 md:mt-2 text-[clamp(1.05rem,2.3vw,1.9rem)] tracking-[0.06em]',
    sort: 'mt-3 md:mt-5 text-[clamp(0.85rem,1.5vw,1.25rem)] tracking-[0.18em]',
};

const hash = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
};

// the letters of a phrase, word by word so the board wraps between words, never inside one
// (the s of a decade stays small: THE 1950s, not THE 1950S)
const Letters = ({ text, seed, animate }) => {
    let n = 0;
    return text.split(' ').map((word, w) => (
        <span key={w} className="inline-block whitespace-nowrap mr-[0.32em] last:mr-0">
            {[...word].map((ch, i) => {
                const h = hash(`${seed}|${w}|${i}|${ch}`);
                const tilt = ((h % 1000) / 1000 - 0.5) * 2.4;
                const dy = (((h >>> 10) % 1000) / 1000 - 0.5) * 2;
                return (
                    <span
                        key={i}
                        className={`board-letter${animate ? ' is-slotting' : ''}${ch === 's' && /\d/.test(word[i - 1] || '') ? ' normal-case' : ''}`}
                        style={{ '--tilt': `${tilt.toFixed(2)}deg`, '--dy': `${dy.toFixed(2)}px`, '--i': n++ }}
                    >
                        {ch}
                    </span>
                );
            })}
        </span>
    ));
};

const Phrase = ({ phrase, animate }) => {
    const letters = <Letters text={phrase.text} seed={phrase.id} animate={animate} />;
    // the board's label reads the whole sentence, so plain words aren't spelt out letter by letter
    if (!phrase.control) return <span aria-hidden="true" className="text-[#f3efe6]">{letters}</span>;
    return (
        <span className="inline-flex items-center">
            <button
                type="button"
                onClick={phrase.onClick}
                aria-label={`${phrase.label}. Change`}
                className="uppercase text-[#e2b866] hover:text-[#f6d796] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#e2b866]"
            >
                {letters}
                <svg aria-hidden="true" viewBox="0 0 10 6" className="ml-[0.3em] inline-block w-[max(0.34em,9px)] h-auto align-middle -translate-y-[0.06em] opacity-90"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
            </button>
            {phrase.onRemove && (
                <button
                    type="button"
                    onClick={phrase.onRemove}
                    aria-label={`Remove ${phrase.label}`}
                    className="ml-[0.25em] inline-flex items-center justify-center w-[1.15em] h-[1.15em] min-w-[22px] min-h-[22px] rounded-full ring-1 ring-[#e2b866]/50 text-[#e2b866] text-[0.42em] leading-none hover:bg-[#e2b866] hover:text-black transition-colors"
                >
                    ✕
                </button>
            )}
        </span>
    );
};

const Letterboard = ({ lines, label, version, reducedMotion }) => (
    <div className="relative">
        {/* the foyer light above the board */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[95%] h-80 bg-[radial-gradient(ellipse_at_top,rgba(255,206,140,0.17),transparent_68%)]" />
        <div className="relative p-[7px] md:p-[9px] rounded-[2px] bg-[linear-gradient(135deg,#6b552f,#c9a35e_22%,#7d6234_48%,#b8914e_74%,#5a4728)] shadow-[0_40px_90px_-20px_rgba(0,0,0,0.9)]">
            <div role="group" aria-label={label} className="board-felt relative overflow-hidden px-5 py-7 md:px-12 md:py-10 font-oswald font-medium uppercase leading-[1.2] text-center">
                {lines.map((line, i) => (
                    <div key={i} className={SIZES[line.size]}>
                        {line.phrases.map((p, j) => (
                            <span key={`${p.id}:${p.text}`} className={j ? 'ml-[0.32em]' : ''}>
                                <Phrase phrase={p} animate={!reducedMotion} />
                            </span>
                        ))}
                    </div>
                ))}
                {/* the glass over the felt, and the light crossing it after a change */}
                <div aria-hidden="true" className="absolute inset-0 pointer-events-none bg-[linear-gradient(115deg,rgba(255,255,255,0.07),transparent_32%,transparent_70%,rgba(255,255,255,0.03))]" />
                {!reducedMotion && <div key={version} aria-hidden="true" className="board-glint" />}
            </div>
        </div>
    </div>
);

export default Letterboard;
