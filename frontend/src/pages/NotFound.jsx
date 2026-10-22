import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

/**
 * A page that isn't there, as the end of a reel: the film has run out of the projector, and the
 * screen is left showing the lamp's bare light, flickering, with the dust and a scratch of the gate.
 * Under it, in plain words, what happened and the ways back. The film, director, movement and studio
 * pages use it too, worded for what's missing; they set the tab's title themselves, and PageNotFound
 * (the address that matches no page) sets its own.
 */

const HOME = [
    { to: '/', label: 'The home page' },
    { to: '/explore', label: 'Explore the films' },
    { to: '/about', label: 'About the atlas' },
];

const NotFound = ({
    kicker = 'Page not found',
    title = 'There’s nothing on this reel.',
    line = 'The page you asked for isn’t here. The link may be wrong, or the page may have moved.',
    links = HOME,
}) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-5 pt-28 pb-20 text-center">
            {/* the screen, with only the lamp's light on it */}
            <div aria-hidden="true" className="relative w-full max-w-3xl aspect-[2.39/1] overflow-hidden bg-[#0b0a09] ring-1 ring-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.8)]">
                <span className="projector-flicker absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_50%,rgba(255,246,228,0.92),rgba(241,230,206,0.55)_45%,rgba(120,105,85,0.25)_80%,rgba(20,18,15,0.6))]" />
                <span className="absolute inset-0 still-grain opacity-80" />
                {/* a scratch in the gate, jumping as the frames go by */}
                <span className="gate-scratch absolute top-0 bottom-0 left-[38%] w-px bg-[#2a2520]/60" />
                <span className="gate-scratch absolute top-0 bottom-0 left-[71%] w-px bg-[#2a2520]/40 [animation-delay:-0.7s]" />
                {/* the dark the lens throws round the frame */}
                <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(5,5,5,0.55))]" />
            </div>

            <div className="mt-10 font-label text-[12px] tracking-[0.14em] uppercase text-gold">{kicker}</div>
            <h1 className="mt-3 max-w-3xl font-serif font-light text-4xl md:text-6xl leading-[1.05] text-white">{title}</h1>
            <p className="mt-4 max-w-xl font-serif text-lg md:text-xl leading-relaxed text-gray-300">{line}</p>
            <nav aria-label="Ways back" className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3">
                {links.map((l) => (
                    <Link key={l.to} to={l.to} className="min-h-11 inline-flex items-center font-label text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">
                        {l.label} ›
                    </Link>
                ))}
            </nav>
        </div>
    );
};

// the address that matches no page at all
export const PageNotFound = () => {
    usePageTitle('Page not found');
    return <NotFound />;
};

export default NotFound;
