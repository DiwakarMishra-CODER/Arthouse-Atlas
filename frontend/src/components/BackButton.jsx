import { useLocation, useNavigate } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';
import { previousPage } from '../hooks/trail';

/**
 * Back: one arrow, in the navbar beside the crest, on every page but the home page, so it's in the
 * same place on every page and there the whole way down. It goes back through the browser's
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

const BackButton = () => {
    const navigate = useNavigate();
    const { pathname } = useLocation(); // (read again on every move: a page can stay mounted from one address to the next)
    const prev = previousPage();
    const up = upOf(pathname);
    // the same page a step ago (Explore keeps each choice in its address): Back undoes the last one
    const name = !prev ? up.label : prev.path === pathname ? 'your last pick' : nameOf(prev);
    const says = name ? `Back to ${name}` : 'Back';
    return (
        <button
            type="button"
            onClick={() => (prev ? navigate(-1) : navigate(up.to))}
            aria-label={says}
            title={says}
            className="group shrink-0 flex items-center justify-center w-10 h-10 rounded-full ring-1 ring-white/25 bg-black/40 text-gray-100 hover:ring-gold/70 hover:text-gold-light"
        >
            <MdArrowBack size={19} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-x-0.5" />
        </button>
    );
};

export default BackButton;
