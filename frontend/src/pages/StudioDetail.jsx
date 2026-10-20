import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { MdArrowBack, MdArrowOutward } from 'react-icons/md';
import { studiosAPI } from '../services/api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import LightScreen from '../components/studios/LightScreen';
import FrameStrip from '../components/studios/FrameStrip';
import { pic } from '../components/directors/arrange';

/**
 * One house. The screen first holds its name in the projector's white; under it, every film it made,
 * by year, as a strip pulled through a gate, stepping on by itself until a hand takes it, and the
 * film in the gate comes up out of the light. Then every film it made (or, for a label, brought out)
 * as credits, and the directors who made them here, with their retrospectives where the atlas has one.
 */

const STEP = 2200; // ms per film while the strip runs by itself
const REST = 5000; // ms it waits after a hand has been on it

// the screen and the strip under it
const HouseReel = ({ house, reducedMotion }) => {
    const screen = useRef(null);
    const reel = useRef(null);
    const opened = useRef(0);
    const resting = useRef(0);
    const films = useMemo(() => [...house.films].sort((a, b) => (a.y || 0) - (b.y || 0)), [house]);

    useEffect(() => {
        screen.current?.credit(house);
        opened.current = performance.now();
    }, [house]);
    // the name holds in the light a moment, then the film in the gate comes up
    const onGate = useCallback((f, fast) => {
        const wait = 1000 - (performance.now() - opened.current);
        if (wait > 0) setTimeout(() => screen.current?.film(f), wait);
        else screen.current?.film(f, { cut: fast });
    }, []);
    // the strip steps on by itself, a film at a time, until a hand takes it
    useEffect(() => {
        if (reducedMotion) return undefined;
        const t = setInterval(() => {
            const strip = reel.current?.querySelector('ol');
            if (!strip || document.hidden || Date.now() < resting.current) return;
            const step = strip.children[0]?.offsetWidth + 8 || 160;
            if (strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4) strip.scrollTo({ left: 0, behavior: 'smooth' });
            else strip.scrollBy({ left: step, behavior: 'smooth' });
        }, STEP);
        return () => clearInterval(t);
    }, [reducedMotion]);
    const hold = () => { resting.current = Date.now() + REST; };

    return (
        <div>
            <LightScreen ref={screen} reducedMotion={reducedMotion} className="w-full max-w-5xl mx-auto aspect-video shadow-[0_40px_120px_-30px_rgba(241,236,226,0.22)]" />
            <div ref={reel} className="mt-6 max-w-5xl mx-auto" onPointerDown={hold} onWheel={hold} onKeyDown={hold} onTouchStart={hold}>
                <FrameStrip films={films} onGate={onGate} />
            </div>
        </div>
    );
};

const COUNTRY = { 'United States of America': 'United States' };

const StudioDetail = () => {
    const { slug } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const reducedMotion = useMotionPreference();
    const [result, setResult] = useState({ slug: null, data: null });

    useEffect(() => {
        let gone = false;
        window.scrollTo(0, 0);
        studiosAPI.getOne(slug)
            .then((r) => { if (!gone) setResult({ slug, data: r.data }); })
            .catch(() => { if (!gone) setResult({ slug, data: null }); });
        return () => { gone = true; };
    }, [slug]);

    const loading = result.slug !== slug;
    const house = loading ? null : result.data;
    const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/studios'));
    const years = house?.years ? (house.years[0] === house.years[1] ? `${house.years[0]}` : `${house.years[0]}–${house.years[1]}`) : '';

    return (
        <div className="own-transitions relative min-h-screen pt-28 md:pt-32 pb-32">
            <button type="button" onClick={goBack} className="font-label absolute top-24 left-4 md:left-10 z-20 flex items-center gap-2 text-xs tracking-[0.14em] uppercase text-gray-300 hover:text-white transition-colors">
                <MdArrowBack aria-hidden="true" /> Studios
            </button>
            <div className="max-w-6xl mx-auto px-4 md:px-10">
                {loading && <p className="py-24 font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">The light is coming up…</p>}
                {!loading && !house && (
                    <div className="py-24">
                        <p className="font-serif text-3xl text-gray-100">There’s no house here by that name.</p>
                        <Link to="/studios" className="mt-6 inline-block font-label text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">Every house ›</Link>
                    </div>
                )}
                {house && (
                    <>
                        <header className="pt-4">
                            <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">{[COUNTRY[house.country] || house.country, house.kind === 'label' ? 'Label' : null].filter(Boolean).join(' · ')}</div>
                            <h1 className="mt-2 font-serif font-light text-[2.6rem] md:text-6xl lg:text-7xl leading-[1.02] text-white">{house.name}</h1>
                            <div className="mt-3 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gray-400">{house.count} {house.count === 1 ? 'film' : 'films'} · {years} · {house.directors.length} {house.directors.length === 1 ? 'director' : 'directors'}</div>
                        </header>

                        <div className="mt-8 md:mt-10">
                            <HouseReel key={house.slug} house={house} reducedMotion={reducedMotion} />
                        </div>

                        <div className="mt-16 md:mt-20 grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-14 lg:gap-16 items-start">
                            <section>
                                <h2 className="mb-4 flex items-baseline gap-4">
                                    <span className="font-label text-[12px] md:text-[13px] tracking-[0.3em] uppercase text-gold">Films</span>
                                    <span className="flex-1 h-px bg-white/10" />
                                </h2>
                                <ol>
                                    {house.films.map((f) => (
                                        <li key={f.id}>
                                            <Link to={`/movie/${f.id}`} className="credit-line flex flex-wrap md:flex-nowrap items-baseline gap-x-3 py-[7px] md:py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-light">
                                                {f.spine != null && <span className="shrink-0 w-14 font-label text-[11px] md:text-[12px] tracking-[0.1em] text-gray-500">No. {f.spine}</span>}
                                                <span className="credit-name min-w-0 flex-1 md:flex-none md:max-w-[55%] truncate font-serif italic text-[17px] md:text-[19px] text-white">{f.t}</span>
                                                <span aria-hidden="true" className="credit-leader hidden md:block flex-1 min-w-6" />
                                                {/* on a phone, who made it and when go under the title rather than squeeze beside it */}
                                                <span className={`credit-film basis-full md:basis-auto shrink-0 md:max-w-[40%] truncate font-serif text-[14px] md:text-[16px] text-gray-400 ${f.spine != null ? 'pl-[4.25rem] md:pl-0' : ''}`}>{f.d?.join(' & ')}{f.y ? `, ${f.y}` : ''}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                            <section>
                                <h2 className="mb-5 flex items-baseline gap-4">
                                    <span className="font-label text-[12px] md:text-[13px] tracking-[0.3em] uppercase text-gold">Directors</span>
                                    <span className="flex-1 h-px bg-white/10" />
                                </h2>
                                <ul className="flex flex-col gap-3">
                                    {house.directors.map((d) => (
                                        <li key={d.name}>
                                            <Link to={d.id ? `/directors/${d.id}` : `/explore?director=${encodeURIComponent(d.name)}`} className="group flex items-center gap-3">
                                                <span className="w-10 h-10 shrink-0 rounded-full overflow-hidden bg-[#141210] ring-1 ring-white/15">
                                                    {d.p && <img src={pic(d.p, 'w185')} alt="" loading="lazy" className="w-full h-full object-cover max-w-none grayscale contrast-[1.08]" />}
                                                </span>
                                                <span className="font-serif text-[17px] text-gray-100 group-hover:text-gold-light transition-colors">{d.name}</span>
                                                <span className="font-label text-[11px] tracking-[0.14em] text-gray-500">{d.n}</span>
                                                {d.id && <MdArrowOutward aria-hidden="true" className="text-gray-500 group-hover:text-gold" />}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StudioDetail;
