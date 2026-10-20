import { sized } from '../../movements/treatments';
import { Clear } from './parts';
import { filmsWord } from './util';

/**
 * When it was made: a strip of 35 mm film, one frame for each decade of the century, each
 * frame a still from that decade's most acclaimed film here (with what's already chosen).
 * The decade and its count are printed along the edge, the way film stock prints its
 * edge numbers. The chosen frame is lit; the rest wait in the dark.
 */

const DECADES = Array.from({ length: 11 }, (_, i) => 1920 + i * 10);

const TimePicker = ({ options = [], value, onPick }) => {
    const byDecade = new Map(options.map((o) => [o.value, o]));
    const chosen = DECADES.find((d) => String(d) === String(value));
    return (
        <>
            <Clear label="Any time" active={!value} onClick={() => onPick('')} />
            <div className="-mx-5 md:mx-0 overflow-x-auto overscroll-x-contain snap-x snap-mandatory [scrollbar-width:none]">
                <div className="relative inline-flex md:flex min-w-full gap-2 md:gap-2.5 bg-[#0d0b09] px-5 md:px-4 pt-9 pb-16 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
                    <span aria-hidden="true" className="film-sprockets absolute inset-x-0 top-1.5 h-6" />
                    <span aria-hidden="true" className="film-sprockets absolute inset-x-0 bottom-1.5 h-6" />
                    {DECADES.map((d) => {
                        const o = byDecade.get(d);
                        const n = o?.n || 0;
                        const active = d === chosen;
                        return (
                            <button
                                key={d}
                                type="button"
                                disabled={!n && !active}
                                onClick={() => onPick(d)}
                                aria-pressed={active}
                                aria-label={`The ${d}s: ${filmsWord(n)}`}
                                className={`group relative snap-start flex-shrink-0 w-[7.5rem] md:w-auto md:flex-1 text-left transition-opacity duration-300 disabled:opacity-25 ${chosen && !active ? 'opacity-45 hover:opacity-90' : ''}`}
                            >
                                <span className={`relative block aspect-[4/3] overflow-hidden bg-[#1a1714] ring-1 transition-shadow ${active ? 'ring-gold-light shadow-[0_0_26px_rgba(240,207,142,0.4)]' : 'ring-black'}`}>
                                    {o?.top?.still && <img src={sized(o.top.still, 'w300')} alt="" loading="lazy" decoding="async" className={`w-full h-full object-cover max-w-none transition-[filter] duration-500 ${active ? '' : 'grayscale-[0.6] brightness-[0.8] group-hover:grayscale-0 group-hover:brightness-100'}`} />}
                                </span>
                                {/* the edge print */}
                                <span className="absolute left-0 -bottom-11 leading-tight">
                                    <span className={`block font-label text-[12px] tracking-[0.14em] ${active ? 'text-gold-light' : 'text-gold/75'}`}>{d}s</span>
                                    <span className="block font-label text-[11px] tracking-[0.14em] tabular-nums text-gray-500">{n ? filmsWord(n) : 'none'}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <p className="mt-3 text-[15px] text-gray-400">
                {chosen && byDecade.get(chosen)?.top
                    ? <>Pictured for the {chosen}s: <span className="italic text-gray-200">{byDecade.get(chosen).top.title}</span> ({byDecade.get(chosen).top.year}).</>
                    : 'Each frame: the most acclaimed film of its decade here.'}
            </p>
        </>
    );
};

export default TimePicker;
