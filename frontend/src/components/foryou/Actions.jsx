import { useState } from 'react';
import { Link } from 'react-router-dom';
import Stars from './Stars';

/**
 * What you can do with a pick, always in view: open it, keep it on your watchlist (signed in),
 * say you've seen it (and how much you liked it), or that it isn't for you.
 */
const Actions = ({ film, act, large = false }) => {
    const [rating, setRating] = useState(false);
    const base = `font-label tracking-[0.14em] uppercase transition-colors ${large ? 'text-[13px] px-5 py-3' : 'text-[12px] px-3 py-2'}`;
    if (rating) {
        return <Stars onRate={(n) => { setRating(false); act.rate(film, n); }} onCancel={() => setRating(false)} />;
    }
    return (
        <div className="flex flex-wrap items-center gap-2">
            {large && <Link to={`/movie/${film._id}`} className={`${base} bg-gold text-black hover:bg-gold-light`}>Open the film →</Link>}
            {act.canList && (
                <button type="button" onClick={() => act.watchlist(film)} className={`${base} ring-1 ${act.listed(film._id) ? 'ring-gold/70 text-gold-light' : 'ring-white/25 text-gray-100 hover:ring-white/60'}`}>
                    {act.listed(film._id) ? '✓ On your watchlist' : 'Watchlist'}
                </button>
            )}
            <button type="button" onClick={() => setRating(true)} className={`${base} ring-1 ring-white/25 text-gray-100 hover:ring-white/60`}>Seen it</button>
            <button type="button" onClick={() => act.notFor(film)} className={`${base} text-gray-400 hover:text-white`}>Not for me</button>
        </div>
    );
};

export default Actions;
