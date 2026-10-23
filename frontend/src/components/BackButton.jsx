import { useLocation, useNavigate } from 'react-router-dom';
import { MdFastRewind } from 'react-icons/md';
import { previousPage } from '../hooks/trail';

/**
 * Back, as a reel is wound back: framed by a viewfinder's corner marks, it reads like a title card,
 * "Back to" printed small in gold and the place in italic. It goes back through the browser's history
 * to the page you came from (so that page's scroll and state come back with it), named; arriving from
 * another site, it goes up to the room above this one instead (`up`).
 */

// the rooms as the navbar names them; any other page by its title, without the year
const NAMES = { '/': 'Home', '/explore': 'Explore', '/recommendations': 'For You', '/profile': 'your profile', '/login': 'Sign in', '/register': 'Join' };
const nameOf = (page) => NAMES[page.path] || (page.title || '').replace(/\s*\(\d{4}\)$/, '');

const BackButton = ({ up = { to: '/', label: 'Home' }, className = '' }) => {
    const navigate = useNavigate();
    useLocation(); // (read again on every move: a page can stay mounted from one address to the next)
    const prev = previousPage();
    const name = prev ? nameOf(prev) : up.label;
    return (
        <button
            type="button"
            onClick={() => (prev ? navigate(-1) : navigate(up.to))}
            className={`viewfinder group relative inline-flex items-center gap-2.5 min-h-11 pl-3.5 pr-4 max-w-[min(82vw,26rem)] bg-black/60 backdrop-blur-md ring-1 ring-white/10 [text-shadow:none] ${className}`}
        >
            <MdFastRewind aria-hidden="true" size={17} className="shrink-0 text-gold-light transition-transform duration-300 group-hover:-translate-x-1" />
            <span className="shrink-0 font-label text-[12px] tracking-[0.14em] uppercase text-gold">{name ? 'Back to' : 'Back'}</span>
            {name && <span className="truncate font-serif italic text-[17px] leading-tight text-white group-hover:text-gold-light">{name}</span>}
        </button>
    );
};

export default BackButton;
