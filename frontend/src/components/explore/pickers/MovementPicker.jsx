import TreatmentTitle from '../../movements/TreatmentTitle';
import { sized } from '../../movements/treatments';
import { Clear } from './parts';
import { filmsWord } from './util';

/**
 * Which movement: each one a title card in its own type (as on the Movements page), over the
 * still that stands for it, with its years and how many of its films are here.
 */
const MovementPicker = ({ options = [], value, onPick }) => (
    <>
        <Clear label="Any movement" active={!value} onClick={() => onPick('')} />
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {options.map((o) => {
                const active = o.tag === value;
                return (
                    <li key={o.value}>
                        <button type="button" disabled={!o.tag} onClick={() => onPick(o.tag)} aria-pressed={active} className={`group relative block w-full min-h-[9.5rem] overflow-hidden text-left ring-1 transition-shadow ${active ? 'ring-gold shadow-[0_0_30px_rgba(217,173,98,0.25)]' : 'ring-white/10 hover:ring-white/30'}`}>
                            {o.hero && <img src={sized(o.hero, 'w780')} alt="" loading="lazy" decoding="async" style={o.focus ? { objectPosition: o.focus } : undefined} className={`absolute inset-0 w-full h-full object-cover max-w-none transition-opacity duration-500 ${active ? 'opacity-70' : 'opacity-40 group-hover:opacity-60'}`} />}
                            <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,5,5,0.94)_10%,rgba(5,5,5,0.45))]" />
                            <span className="relative block px-4 pt-5 pb-4">
                                <span className="block min-h-[3.2rem] pointer-events-none"><TreatmentTitle movement={{ title: o.value, tag: o.tag }} size="card" as="span" /></span>
                                <span className="mt-3 block font-label text-[12px] tracking-[0.14em] uppercase text-gray-300">{o.era ? `${o.era} · ` : ''}{filmsWord(o.n)}</span>
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    </>
);

export default MovementPicker;
