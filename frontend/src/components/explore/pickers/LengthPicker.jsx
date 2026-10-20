import { LENGTH_WORDS } from '../words';
import { Clear } from './parts';
import { filmsWord } from './util';

/**
 * How long: four reels of film, as big as the films they hold. The one you choose spins once.
 */
const SIZE = { short: 58, standard: 74, long: 92, epic: 112 };

const Reel = ({ size }) => (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <circle cx="50" cy="50" r="47" fill="#1b1814" stroke="currentColor" strokeWidth="2" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
        {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={50 + 25 * Math.sin((a * Math.PI) / 180)} cy={50 - 25 * Math.cos((a * Math.PI) / 180)} r="10.5" fill="#050505" stroke="currentColor" strokeWidth="1.2" />
        ))}
        <circle cx="50" cy="50" r="7" fill="currentColor" />
        <circle cx="50" cy="50" r="2.4" fill="#050505" />
    </svg>
);

const LengthPicker = ({ options = [], value, onPick }) => {
    const count = new Map(options.map((o) => [o.value, o.n]));
    return (
        <>
            <Clear label="Any length" active={!value} onClick={() => onPick('')} />
            <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(LENGTH_WORDS).map(([k, label]) => {
                    const n = count.get(k) || 0;
                    const active = k === value;
                    return (
                        <li key={k}>
                            <button type="button" disabled={!n && !active} onClick={() => onPick(k)} aria-pressed={active} className={`group w-full h-full flex flex-col items-center justify-end gap-3 px-3 pt-5 pb-4 ring-1 disabled:opacity-30 ${active ? 'ring-gold text-gold' : 'ring-white/10 text-gray-300 hover:ring-white/30 hover:text-white'}`}>
                                <span key={active ? 'spun' : 'still'} className={`inline-block transition-transform duration-700 group-hover:rotate-[24deg] ${active ? 'reel-spin' : ''}`}><Reel size={SIZE[k]} /></span>
                                <span className="text-center">
                                    <span className="block text-[16px] text-gray-100 first-letter:uppercase">{label}</span>
                                    <span className="block font-label text-[11px] tracking-[0.14em] uppercase text-gray-500">{filmsWord(n)}</span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
            <p className="mt-4 text-[15px] text-gray-400">A thousand-foot reel of 35 mm runs about eleven minutes.</p>
        </>
    );
};

export default LengthPicker;
