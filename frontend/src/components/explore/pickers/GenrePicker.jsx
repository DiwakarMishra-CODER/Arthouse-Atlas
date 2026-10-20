import { notched } from '../../ticket';
import { Clear } from './parts';

/**
 * What kind of film: a ticket for each, cream card with punched notches at the perforation and
 * the number of films on the stub. The one you choose is torn at the stub, as the usher does at the door.
 */
const BODY = notched('100%', 7);
const STUB = notched('0', 7);

const GenrePicker = ({ options = [], value, onPick }) => (
    <>
        <Clear label="Any genre" active={!value} onClick={() => onPick('')} />
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-4">
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <li key={o.value}>
                        <button type="button" disabled={!o.n && !active} onClick={() => onPick(o.value)} aria-pressed={active} aria-label={`${o.value}: ${o.n} films`} className={`group flex w-full h-[4.4rem] text-left transition-transform hover:-translate-y-0.5 disabled:opacity-30 ${active ? 'ticket-torn' : ''}`}>
                            <span className="ticket-body flex-1 min-w-0 flex flex-col justify-center bg-[#efe5cf] text-[#1c1812] pl-3 pr-2" style={BODY}>
                                <span className="font-serif text-[1.05rem] leading-[1.1] line-clamp-2">{o.value}</span>
                                {active && <span className="font-label text-[11px] tracking-[0.14em] uppercase text-[#6b5d45]">Admitted</span>}
                            </span>
                            <span className="ticket-stub w-12 flex items-center justify-center bg-[#e4d5b6] text-[#1c1812] border-l border-dashed border-[#1c1812]/35" style={STUB}>
                                <span className="font-label text-[15px] tabular-nums">{o.n}</span>
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    </>
);

export default GenrePicker;
