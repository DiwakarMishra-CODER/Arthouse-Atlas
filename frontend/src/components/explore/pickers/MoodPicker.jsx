import { sized } from '../../movements/treatments';
import { Clear } from './parts';
import { filmsWord } from './util';

/**
 * How it feels: a mood board. Each mood is a frame from its most acclaimed film here, drained
 * of colour, with the word set over it; the one you choose comes back into colour.
 */
const MoodPicker = ({ options = [], value, onPick, notes }) => (
    <>
        <Clear label="Any mood" active={!value} onClick={() => onPick('')} />
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <li key={o.value}>
                        <button type="button" disabled={!o.n && !active} onClick={() => onPick(o.value)} aria-pressed={active} className={`group relative block w-full aspect-[4/3] overflow-hidden text-left ring-1 disabled:opacity-30 ${active ? 'ring-gold' : 'ring-white/10 hover:ring-white/30'}`}>
                            {o.top?.still && <img src={sized(o.top.still, 'w300')} alt="" loading="lazy" decoding="async" className={`absolute inset-0 w-full h-full object-cover max-w-none transition-[filter] duration-700 ${active ? '' : 'grayscale brightness-[0.6] group-hover:grayscale-0 group-hover:brightness-90'}`} />}
                            <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,5,5,0.9),transparent_65%)]" />
                            <span className="absolute left-3 right-3 bottom-2.5">
                                <span className="block font-serif italic text-[1.55rem] leading-none text-white">{o.value}</span>
                                <span className="mt-1 block font-label text-[11px] tracking-[0.14em] uppercase text-gray-300">{filmsWord(o.n)}</span>
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
        {notes && <p className="mt-5 text-[15px] text-gray-400">Moods come from our own notes on {notes} films; more as we write them.</p>}
    </>
);

export default MoodPicker;
