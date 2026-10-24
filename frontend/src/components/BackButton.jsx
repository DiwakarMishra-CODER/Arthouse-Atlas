import { useLocation, useNavigate } from 'react-router-dom';
import { MdFastRewind } from 'react-icons/md';
import { previousPage } from '../hooks/trail';

/**
 * Back: a rewind mark (as a reel is wound back), just under the navbar on the left, on every page but the home page: always in the
 * same place, and there the whole way down (it's fixed). It leaves with the navbar while a scene has
 * the lights down (`hidden`, from the navbar) and comes back with it. It goes back through the browser's
 * history to the page you came from (so that page's scroll and state come back with it); arriving
 * from another site, up to the room above this one. Where it goes is said to a screen reader and in
 * its tooltip ("Back to Explore"), not on the page.
 */

// the rooms as the navbar names them; any other page by its title, without the year
const NAMES = { '/': 'Home', '/explore': 'Explore', '/recommendations': 'For You', '/profile': 'your profile', '/login': 'Sign in', '/register': 'Join' };
const nameOf = (page) => NAMES[page.path] || (page.title || '').replace(/\s*\(\d{4}\)$/, '');
// the room above a page, for someone who arrived from outside
const UP = [[/^\/movie\//, '/explore', 'the films'], [/^\/directors\/./, '/directors', 'the directors'], [/^\/movements\/./, '/movements', 'the movements'], [/^\/studios\/./, '/studios', 'the studios']];
const upOf = (path) => {
    const room = UP.find(([re]) => re.test(path));
    return room ? { to: room[1], label: room[2] } : { to: '/', label: 'Home' };
};

const BackButton = ({ hidden = false }) => {
    const navigate = useNavigate();
    const { pathname } = useLocation(); // (read again on every move: a page can stay mounted from one address to the next)
    const prev = previousPage();
    const up = upOf(pathname);
    if (pathname === '/') return null;
    // the same page a step ago (Explore keeps each choice in its address): Back undoes the last one
    const name = !prev ? up.label : prev.path === pathname ? 'your last pick' : nameOf(prev);
    const says = name ? `Back to ${name}` : 'Back';
    return (
        <button
            type="button"
            onClick={() => (prev ? navigate(-1) : navigate(up.to))}
            aria-label={says}
            title={says}
            tabIndex={hidden ? -1 : undefined}
            className={`group fixed z-40 left-4 md:left-10 top-[5.25rem] md:top-[5.75rem] transition-[opacity,transform] duration-500 ${hidden ? 'opacity-0 -translate-y-3 pointer-events-none' : ''} flex items-center justify-center w-10 h-10 rounded-full ring-1 ring-white/25 bg-black/55 backdrop-blur-sm text-gray-100 shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:ring-gold/70 hover:text-gold-light`}
        >
            <MdFastRewind size={20} aria-hidden="true" className="-ml-0.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
        </button>
    );
};

export default BackButton;
