import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigationType } from 'react-router-dom';
import { moviesAPI } from '../services/api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import HomeHero from '../components/home/HomeHero';
import ArthouseBreath from '../components/home/ArthouseBreath';
import CanonCountdown from '../components/home/CanonCountdown';
import JustMissingOut from '../components/home/JustMissingOut';
import AtlasMap from '../components/home/AtlasMap';
import Auditorium from '../components/home/Auditorium';
import NextFilm from '../components/home/NextFilm';

/**
 * The front door of the atlas.
 *
 * Every film in the atlas, then tonight's (the hero); what arthouse cinema is,
 * answered by the films; the canon's top ten, counted down on a running reel;
 * a century of cinema lighting up the world map; the three rooms
 * of the atlas, played in an auditorium; and your next film, printed at the box office.
 */
const SCROLL_KEY = 'home:scroll';
// the top ten, kept between visits, so coming back draws the whole page at once
let topCache = null;

const Home = () => {
    const reducedMotion = useMotionPreference();
    const navigation = useNavigationType();
    const [top, setTop] = useState(() => topCache || { films: [], next: [], of: 0 });

    useEffect(() => {
        moviesAPI.getCanonTop(10, 10).then((r) => { topCache = r.data; setTop(r.data); }).catch(() => {});
    }, []);

    // Coming back (Back button) should land where you left, but the page rebuilds from scratch and the
    // browser restores the old position on a page that's still short — the countdown, screens tall,
    // only appears once its films load. So the page keeps its own note of where you are, and puts you
    // back there itself once it has been rebuilt.
    useEffect(() => {
        const previous = window.history.scrollRestoration;
        window.history.scrollRestoration = 'manual';
        let t = 0;
        let pending = false;
        const save = () => { pending = false; sessionStorage.setItem(SCROLL_KEY, String(Math.round(window.scrollY))); };
        const remember = () => {
            pending = true;
            clearTimeout(t);
            t = setTimeout(save, 120);
        };
        window.addEventListener('scroll', remember, { passive: true });
        return () => {
            clearTimeout(t);
            // leaving mid-scroll: the page hasn't scrolled away yet, so this is exactly where you were.
            // (Only then — a remount that never scrolled must not overwrite the note with the top.)
            if (pending) save();
            window.removeEventListener('scroll', remember);
            window.history.scrollRestoration = previous;
        };
    }, []);

    // before the first paint: with the page already at full height, put you back where you were
    // (once only — later updates of the top ten mustn't pull you back)
    const restored = useRef(false);
    useLayoutEffect(() => {
        if (restored.current || navigation !== 'POP' || !top.films.length) return;
        const y = Number(sessionStorage.getItem(SCROLL_KEY));
        if (y) window.scrollTo(0, y);
        restored.current = true;
    }, [navigation, top.films.length]);

    const heading = (kicker, title, line) => (
        <div className="max-w-7xl mx-auto px-6 md:px-14 mb-10 md:mb-14">
            <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">{kicker}</div>
            <h2 className="mt-3 font-serif text-4xl md:text-6xl text-white leading-tight">{title}</h2>
            {line && <p className="mt-4 max-w-2xl text-lg text-gray-400 leading-relaxed">{line}</p>}
        </div>
    );

    return (
        <div className="min-h-screen">
            {/* every film in the atlas, then tonight's */}
            <HomeHero />

            {/* what arthouse cinema is: films whose makers didn't take the note */}
            <ArthouseBreath films={[...top.films, ...(top.next || [])]} reducedMotion={reducedMotion} />

            {/* the canon's top ten, counted down */}
            {top.films.length > 0 && <CanonCountdown films={top.films} of={top.of} reducedMotion={reducedMotion} />}
            {top.next?.length > 0 && <JustMissingOut films={top.next} from={top.films.length + 1} reducedMotion={reducedMotion} />}

            {/* a century of cinema, around the world */}
            <section className="pt-28 md:pt-16">
                <div className="max-w-7xl mx-auto px-6 md:px-14">
                    <AtlasMap
                        heading={(
                            // compact, so the heading, the earth and the years all fit one screen
                            <div className="shrink-0 mb-8 md:mb-3 xl:flex xl:items-end xl:justify-between xl:gap-10">
                                <div>
                                    <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">The atlas</div>
                                    <h2 className="mt-3 font-serif text-4xl text-white leading-tight">A century of cinema, around the world</h2>
                                </div>
                                <p className="mt-2 xl:mt-0 max-w-2xl xl:max-w-[26rem] text-base text-gray-400 leading-relaxed">The earth at night: each country glows while its cinema is happening. Run the years, or click a country to fly in.</p>
                            </div>
                        )}
                    />
                </div>
            </section>

            {/* the rest of the atlas, played in an auditorium */}
            <section className="pt-28 md:pt-40">
                {/* a short heading, so it and the whole auditorium fit one screen */}
                <div className="max-w-7xl mx-auto px-6 md:px-14 mb-6">
                    <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">Keep exploring</div>
                    <h2 className="mt-3 font-serif text-4xl text-white leading-tight">Three rooms of the atlas</h2>
                </div>
                <div className="max-w-7xl mx-auto px-6 md:px-14">
                    <Auditorium reducedMotion={reducedMotion} />
                </div>
            </section>

            {/* your next film, printed at the box office */}
            <section className="pt-28 md:pt-40 pb-32">
                {heading('Your next film', 'Picked for you, from the atlas')}
                <div className="max-w-7xl mx-auto px-6 md:px-14">
                    <NextFilm reducedMotion={reducedMotion} />
                </div>
            </section>
        </div>
    );
};

export default Home;
