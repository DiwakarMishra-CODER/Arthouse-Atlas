import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { MdArrowBack, MdArrowOutward } from 'react-icons/md';
import { studiosAPI } from '../services/api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import LightScreen from '../components/studios/LightScreen';
import DollyTrack from '../components/studios/DollyTrack';
import { pic } from '../components/directors/arrange';

/**
 * One house: you've come down off the lot and onto its stage. It plays as the house's own opening
 * titles. The screen goes white and its mark stands in the light (its real logo, or its name), then
 * its signature film comes up out of the light and the camera creeps in, with the house's name and
 * when, where and by whom it was founded. A few lines about it. Then the stage itself: every film it
 * made here, in order, on a track you dolly along. Its style in a line; the people who worked here,
 * standing taller the more films they made here; and its neighbours on the lot.
 */

const COUNTRY = { 'United States of America': 'United States' };
const named = (list) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list.at(-1)}` : list[0]);
const yearsOf = (y) => (y ? (y[0] === y[1] ? `${y[0]}` : `${y[0]}–${y[1]}`) : '');

const StudioDetail = () => {
    const { slug } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const reducedMotion = useMotionPreference();
    const [result, setResult] = useState({ slug: null, data: null });
    const screen = useRef(null);

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
    const films = useMemo(() => (house ? [...house.films].sort((a, b) => (a.y || 0) - (b.y || 0)) : []), [house]);

    // the opening titles: its mark in the light, then its signature film comes up out of it
    useEffect(() => {
        if (!house) return undefined;
        screen.current?.credit(house);
        const signature = house.run?.[0] || films.find((f) => f.s);
        if (signature?.s) new Image().src = pic(signature.s, 'w1280'); // (fetched while its mark is held)
        const t = setTimeout(() => screen.current?.film(signature), reducedMotion ? 0 : 1400);
        return () => clearTimeout(t);
    }, [house, films, reducedMotion]);

    const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/studios'));
    if (loading) return <div className="min-h-screen pt-40 text-center font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">The light is coming up…</div>;
    if (!house) {
        return (
            <div className="min-h-screen pt-40 px-6 text-center">
                <p className="font-serif text-3xl text-gray-100">There’s no house here by that name.</p>
                <Link to="/studios" className="mt-6 inline-block font-label text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">The whole lot ›</Link>
            </div>
        );
    }

    const about = house.about || {};
    const founding = [
        about.founded && `Founded ${about.founded}`,
        about.place && `${about.founded ? 'in' : 'In'} ${about.place}`,
        about.founders?.length && `by ${named(about.founders)}`,
    ].filter(Boolean).join(' ');
    const facts = [founding, `${house.count} ${house.count === 1 ? 'film' : 'films'} here, ${yearsOf(house.years)}`].filter(Boolean).join('  ·  ');

    // its style, in a line
    const style = house.style || {};
    const top = style.countries?.[0];
    const bw = style.bw || { n: 0, of: 0 };
    const [d1, d2] = style.decades || [];
    const decades = d2?.count > 1 ? [d1.value, d2.value].sort((a, b) => a - b) : null;
    const place = top && (COUNTRY[top.value] || top.value);
    const styleLine = [
        top && (top.count === house.count ? `All from ${place}` : top.count > house.count / 2 && `Mostly from ${place}`),
        bw.n > 0 && (bw.n === house.count ? 'All in black and white' : bw.of === house.count ? `${bw.n} of ${house.count} in black and white` : `${bw.n} in black and white`),
        d1 && (d1.count === house.count ? `All made in the ${d1.value}s` : decades ? `Busiest in the ${decades[0]}s and ${decades[1]}s` : d1.count > 1 && `Busiest in the ${d1.value}s`),
        style.longest && `Longest: ${style.longest.t}, ${style.longest.r} min`,
    ].filter(Boolean);

    const most = Math.max(...house.directors.map((d) => d.n), 1);
    // (where there's no portrait of a director, a frame from their own film here stands in)
    const frameBy = (name) => films.find((f) => f.s && f.d?.includes(name))?.s;

    return (
        <div className="own-transitions relative min-h-screen pb-32">
            {/* the opening titles */}
            <section className="relative h-[88svh] min-h-[460px] overflow-hidden">
                {/* (the picture fades into the room at its foot, under the house's name) */}
                <div className="h-full [mask-image:linear-gradient(to_bottom,black_45%,transparent_98%)]">
                    <LightScreen ref={screen} push caption={false} reducedMotion={reducedMotion} className="h-full" />
                </div>
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-[#050505]/80 to-transparent" />
                <button type="button" onClick={goBack} className="font-label absolute top-24 left-4 md:left-10 z-20 flex items-center gap-2 text-xs tracking-[0.14em] uppercase text-gray-200 hover:text-white transition-colors [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
                    <MdArrowBack aria-hidden="true" /> Studios
                </button>
                <div className="absolute inset-x-0 bottom-0">
                    <div className="studio-title max-w-7xl mx-auto px-4 md:px-10 pb-8 md:pb-12">
                        <div className="font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold">{[COUNTRY[house.country] || house.country, house.kind === 'label' ? 'Label' : null].filter(Boolean).join(' · ')}</div>
                        <h1 className="mt-2 font-serif font-light text-[2.8rem] md:text-7xl lg:text-[6rem] leading-[0.98] text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.5)]">{house.name}</h1>
                        <div className="mt-3 md:mt-4 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gray-200">{facts}</div>
                    </div>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 md:px-10">
                {/* a few lines about it */}
                {house.note && (
                    <section className="pt-10 md:pt-16 max-w-3xl">
                        <p className="font-serif text-[1.35rem] md:text-[1.9rem] leading-snug text-gray-100">{house.note}</p>
                        {about.wiki && (
                            <a href={about.wiki} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 font-label text-[11px] tracking-[0.14em] uppercase text-gray-500 hover:text-gray-300">
                                More on Wikipedia <MdArrowOutward aria-hidden="true" />
                            </a>
                        )}
                    </section>
                )}
            </div>

            {/* on the stage: every film it made here, in order */}
            <section className="pt-16 md:pt-24">
                <div className="max-w-7xl mx-auto px-4 md:px-10 mb-5 md:mb-7 flex items-baseline gap-4">
                    <h2 className="font-label text-[12px] md:text-[13px] tracking-[0.3em] uppercase text-gold">On this stage</h2>
                    <span className="flex-1 h-px bg-white/10" />
                </div>
                <DollyTrack films={films} reducedMotion={reducedMotion} />
                {styleLine.length > 0 && (
                    <p className="mt-10 md:mt-12 px-4 text-center [text-wrap:balance] font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gray-300">
                        {styleLine.join('  ·  ')}
                    </p>
                )}
            </section>

            <div className="max-w-7xl mx-auto px-4 md:px-10">
                {/* the people who worked here, standing taller the more films they made here */}
                <section className="pt-20 md:pt-28">
                    <div className="mb-6 md:mb-8 flex items-baseline gap-4">
                        <h2 className="font-label text-[12px] md:text-[13px] tracking-[0.3em] uppercase text-gold">Who worked here</h2>
                        <span className="flex-1 h-px bg-white/10" />
                    </div>
                    <ul className="flex items-end gap-4 md:gap-6 overflow-x-auto pb-3 [scrollbar-width:thin]">
                        {house.directors.map((d) => {
                            const base = house.directors.length <= 3 ? 170 : 110; // (a few stand bigger)
                            const h = Math.round(base + base * ((d.n - 1) / Math.max(1, most - 1)));
                            return (
                                <li key={d.name} className="shrink-0">
                                    <Link to={d.id ? `/directors/${d.id}` : `/explore?director=${encodeURIComponent(d.name)}`} className="group block" style={{ width: Math.round((h * 3) / 4) }}>
                                        <div className="relative overflow-hidden bg-[#141210] ring-1 ring-white/10 group-hover:ring-white/40" style={{ height: h }}>
                                            {d.p
                                                ? <img src={pic(d.p, 'w185')} alt="" loading="lazy" className="w-full h-full object-cover max-w-none grayscale contrast-[1.08]" />
                                                : frameBy(d.name) && <img src={pic(frameBy(d.name), 'w300')} alt="" loading="lazy" className="w-full h-full object-cover max-w-none grayscale contrast-[1.08] brightness-90" />}
                                        </div>
                                        <div className="mt-2 font-serif text-[15px] leading-tight text-gray-100 group-hover:text-gold-light">{d.name}</div>
                                        <div className="font-label text-[11px] tracking-[0.14em] uppercase text-gray-500">{d.n} {d.n === 1 ? 'film' : 'films'}</div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                {/* its neighbours on the lot */}
                <section className="pt-20 md:pt-28">
                    <div className="mb-6 md:mb-8 flex items-baseline gap-4">
                        <h2 className="font-label text-[12px] md:text-[13px] tracking-[0.3em] uppercase text-gold">Next door on the lot</h2>
                        <span className="flex-1 h-px bg-white/10" />
                        <Link to={`/studios?focus=${house.slug}`} className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-300 hover:text-white">Back to the lot ›</Link>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                        {(house.neighbours || []).map((n) => (
                            <li key={n.slug}>
                                <Link to={`/studios/${n.slug}`} className="group relative block aspect-video overflow-hidden bg-[#0d0c0b] ring-1 ring-white/10 hover:ring-gold/70">
                                    {n.s && <img src={pic(n.s, 'w780')} alt="" loading="lazy" className="w-full h-full object-cover max-w-none transition-transform duration-700 group-hover:scale-105" />}
                                    <span className="absolute inset-x-0 bottom-0 px-4 pt-10 pb-3 bg-gradient-to-t from-black/90 to-transparent font-label text-[13px] md:text-[14px] tracking-[0.18em] uppercase text-white">{n.name}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    );
};

export default StudioDetail;
