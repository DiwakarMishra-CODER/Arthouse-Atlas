import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { aboutAPI } from '../services/api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import Commentary from '../components/about/Commentary';
import TheCount from '../components/about/TheCount';
import TheLists from '../components/about/TheLists';
import ForYouExample from '../components/about/ForYouExample';
import Credits from '../components/about/Credits';
import { usePageTitle } from '../hooks/usePageTitle';
import Opening from '../components/about/Opening';
import { CHAPTERS as NOTE } from '../components/about/note';
import { MAKER_FILMS } from '../components/about/maker';

/**
 * About: how the atlas is made. It opens the way a film does, on a picture (the films that made the
 * atlas, running) with its maker's name coming up over it (Opening); then what it is, in two lines; why it exists, in its maker's words, played as
 * a commentary over the films that made them; how a film earns its place, one real film counted step by step as
 * you scroll; the 20 lists the votes come from, every one, with its films in its own order; For You,
 * shown working; and the credits.
 */

const CHAPTERS = [
    ['why', 'Why I made this'],
    ['count', 'How a film earns its place'],
    ['lists', 'The 20 lists'],
    ['foryou-how', 'How For You works'],
    ['credits', 'Credits'],
];

const About = () => {
    const reducedMotion = useMotionPreference();
    usePageTitle('About', 'Why the atlas was made, how a film earns its place, the lists it’s built from, and how For You works.');
    const location = useLocation();
    const [facts, setFacts] = useState(null);
    // the films the page shows (the opening's, and the note's), so each can lead to its own page
    const [films, setFilms] = useState({});

    useEffect(() => {
        let gone = false;
        aboutAPI.facts().then((r) => { if (!gone) setFacts(r.data); }).catch(() => {});
        aboutAPI.films([...new Set([...MAKER_FILMS, ...NOTE].map((c) => c.film))]).then((r) => { if (!gone) setFilms(r.data); }).catch(() => {});
        return () => { gone = true; };
    }, []);
    // arriving at a part of the page (the footer's "The 20 lists")
    useEffect(() => {
        if (!location.hash) return undefined;
        const t = setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' }), 250);
        return () => clearTimeout(t);
    }, [location.hash]);

    const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    const f = facts;

    return (
        <div className="own-transitions relative min-h-screen">
            {/* what this is */}
            {/* it opens as a film does: on a picture, with its maker's name coming up over it */}
            <Opening films={films} reducedMotion={reducedMotion} />
            <header className="pt-10 md:pt-14 pb-10 md:pb-14">
                <div className="max-w-7xl mx-auto px-4 md:px-10">
                    <div className="title-rise font-label text-[12px] tracking-[0.14em] uppercase text-gold">About the atlas</div>
                    <h1 className="title-rise mt-2 font-serif font-light text-[2.5rem] md:text-6xl leading-[1.04] text-white">How the atlas is made</h1>
                    <p className="title-rise mt-5 max-w-3xl font-serif text-xl md:text-2xl leading-snug text-gray-200">
                        {f ? `${f.films} films from ${f.countries} countries, ${f.from} to ${f.to}` : 'Hundreds of films from all over the world'}: arthouse cinema as critics have agreed on it for seventy years. Every film is here because lists like Sight and Sound’s placed it, and this page shows how.
                    </p>
                    <nav aria-label="On this page" className="title-rise mt-7 flex flex-wrap gap-x-6 gap-y-1">
                        {CHAPTERS.map(([id, label]) => (
                            <button key={id} type="button" onClick={() => go(id)} className="min-h-11 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gray-300 hover:text-gold-light">{label} ›</button>
                        ))}
                    </nav>
                </div>
            </header>

            <div className="pb-24 md:pb-32"><Commentary films={films} reducedMotion={reducedMotion} /></div>
            <TheCount reducedMotion={reducedMotion} />
            <TheLists reducedMotion={reducedMotion} />
            <ForYouExample reducedMotion={reducedMotion} />
            <Credits />
        </div>
    );
};

export default About;
