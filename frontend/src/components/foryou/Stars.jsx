import { useState } from 'react';

/**
 * "Seen it": how much did you like it? Five plain stars; four or five makes it a film the
 * engine works from, one to three just takes it off your picks.
 */
const Stars = ({ onRate, onCancel }) => {
    const [over, setOver] = useState(0);
    return (
        <div className="inline-flex items-center gap-1" role="group" aria-label="How much did you like it?">
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setOver(n)}
                    onMouseLeave={() => setOver(0)}
                    onClick={() => onRate(n)}
                    aria-label={`${n} star${n === 1 ? '' : 's'}`}
                    className={`text-[22px] leading-none px-0.5 transition-colors ${n <= over ? 'text-gold-light' : 'text-gray-500 hover:text-gold-light'}`}
                >
                    ★
                </button>
            ))}
            <button type="button" onClick={onCancel} className="ml-2 font-label text-[12px] tracking-[0.14em] uppercase text-gray-400 hover:text-white">Cancel</button>
        </div>
    );
};

export default Stars;
