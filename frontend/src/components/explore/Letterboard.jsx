/**
 * The foyer's letterboard: white plastic letters pushed into the grooves of black
 * felt, behind glass, in a brass frame, lit from above. It says, in plain words,
 * what's showing, and it is the only control. Every word you can change sits in a slot
 * cut into the felt, edged in gold with a ▾ like any menu: dashed while it's a blank to
 * fill ("FROM [ANYWHERE]", "BY [ANYONE]"), solid and lit once chosen. When the board is set
 * up, a light runs along the slots once, and a brass plate beneath says what to do.
 * A chosen slot carries its own × (the word changes it, the × takes it off), and "Clear all"
 * under the board starts again.
 *
 * Each letter sits a hair off true, the same way on every visit (a hash of where
 * it is). When a phrase changes, only its letters are re-set: they drop into the
 * groove one by one, and a glint of light crosses the glass.
 *
 * lines: [{ size: 'small' | 'big' | 'medium' | 'list' | 'sort', phrases: [{ id, text, control?, blank?, label?, onClick?, onRemove? }] }]
 */

const SIZES = {
    small: 'text-[clamp(0.8rem,1.3vw,1.05rem)] tracking-[0.45em] text-[#f3efe6]/70',
    big: 'mt-2 md:mt-3 text-[clamp(1.55rem,4.1vw,3.5rem)] tracking-[0.06em]',
    medium: 'mt-2 md:mt-3 text-[clamp(1.05rem,2.3vw,1.9rem)] tracking-[0.06em] leading-[1.6]',
    list: 'mt-1 md:mt-2 text-[clamp(0.95rem,1.8vw,1.5rem)] tracking-[0.06em] leading-[1.7]',
    sort: 'mt-2 md:mt-4 text-[clamp(0.85rem,1.5vw,1.25rem)] tracking-[0.18em]',
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

const Chevron = () => (
    <svg viewBox="0 0 10 6"><path d="M1.2 1.2l3.8 3.6 3.8-3.6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Cross = () => (
    <svg viewBox="0 0 10 10"><path d="M2.4 2.4l5.2 5.2M7.6 2.4l-5.2 5.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
);

const Phrase = ({ phrase, animate, n }) => {
    const letters = <Letters text={phrase.text} seed={phrase.id} animate={animate} />;
    // the board's label reads the whole sentence, so plain words aren't spelt out letter by letter
    if (!phrase.control) return <span aria-hidden="true" className="text-[#f3efe6]">{letters}</span>;
    const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-light';
    // a blank (or the order): one menu, its word and its ▾
    if (phrase.blank || !phrase.onRemove) {
        return (
            <button type="button" onClick={phrase.onClick} aria-label={`${phrase.label}. Change`} aria-haspopup="dialog" className={`board-slot ${phrase.blank ? 'is-blank' : 'is-set'} uppercase ${ring}`} style={{ '--n': n }}>
                <span>{letters}</span>
                <span aria-hidden="true" className="board-slot-chevron"><Chevron /></span>
            </button>
        );
    }
    // chosen: the word changes it, its own × takes it off (one slot, two doors)
    return (
        <span className={`board-slot is-set uppercase`} style={{ '--n': n }}>
            <button type="button" onClick={phrase.onClick} aria-label={`${phrase.label}. Change`} aria-haspopup="dialog" className={`uppercase ${ring}`}>{letters}</button>
            <button type="button" onClick={phrase.onRemove} aria-label={`Take off ${phrase.label}`} className={`slot-off ${ring}`}>
                <span aria-hidden="true" className="board-slot-chevron"><Cross /></span>
            </button>
        </span>
    );
};

const Letterboard = ({ lines, label, version, reducedMotion, chosen = false, onReset }) => {
    // the slots in reading order, so the light can run along them one after another
    let n = 0;
    const numbered = lines.map((line) => ({ ...line, phrases: line.phrases.map((p) => ({ p, n: p.control ? n++ : 0 })) }));
    return (
    <div className="relative">
        {/* the foyer light above the board */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[95%] h-80 bg-[radial-gradient(ellipse_at_top,rgba(255,206,140,0.17),transparent_68%)]" />
        <div className="relative p-[7px] md:p-[9px] rounded-[2px] bg-[linear-gradient(135deg,#6b552f,#c9a35e_22%,#7d6234_48%,#b8914e_74%,#5a4728)] shadow-[0_40px_90px_-20px_rgba(0,0,0,0.9)]">
            <div role="group" aria-label={label} className="board-felt relative overflow-hidden px-5 py-7 md:px-12 md:py-10 font-oswald font-medium uppercase leading-[1.2] text-center">
                {numbered.map((line, i) => (
                    <div key={i} className={SIZES[line.size]}>
                        {line.phrases.map(({ p, n: slot }, j) => (
                            <span key={`${p.id}:${p.text}`} className={j ? 'ml-[0.32em]' : ''}>
                                <Phrase phrase={p} animate={!reducedMotion} n={slot} />
                            </span>
                        ))}
                    </div>
                ))}
                {/* the glass over the felt, and the light crossing it after a change */}
                <div aria-hidden="true" className="absolute inset-0 pointer-events-none bg-[linear-gradient(115deg,rgba(255,255,255,0.07),transparent_32%,transparent_70%,rgba(255,255,255,0.03))]" />
                {!reducedMotion && <div key={version} aria-hidden="true" className="board-glint" />}
            </div>
        </div>
        {/* the brass plate under the board, for anyone who hasn't guessed; and, once something's
            chosen, a way to start again */}
        <div className="flex justify-center">
            <div className="inline-flex items-stretch max-w-full">
                <p className={`board-plate ${chosen && onReset ? 'has-button' : ''} inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 px-3 sm:px-5 md:px-6 py-2 font-label font-medium text-[12px] sm:text-[13px] md:text-[14px] tracking-[0.1em] uppercase`}>
                    {chosen ? (
                        <>
                            <span className="whitespace-nowrap">Tap a gold word to change it</span>
                            <span aria-hidden="true" className="hidden sm:inline opacity-50">·</span>
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">its <span aria-hidden="true" className="plate-badge"><Cross /></span><span className="sr-only">×</span> takes it off</span>
                        </>
                    ) : 'Tap any gold word to change what’s showing'}
                </p>
                {chosen && onReset && (
                    <button type="button" onClick={onReset} className="board-plate-button inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-5 font-label font-medium text-[12px] sm:text-[13px] md:text-[14px] tracking-[0.1em] uppercase whitespace-nowrap">
                        <svg aria-hidden="true" viewBox="0 0 16 16" className="w-[1.05em] h-[1.05em]"><path d="M3.2 6.2A5.2 5.2 0 1 1 3 9.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M2.6 2.6v3.8h3.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Clear all
                    </button>
                )}
            </div>
        </div>
    </div>
    );
};

export default Letterboard;
