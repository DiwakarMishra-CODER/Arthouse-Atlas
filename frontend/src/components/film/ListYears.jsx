import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { citation, yearIn } from './canonWords';
import { LISTS } from '../about/listNotes';

/**
 * When the lists placed it: every list that names the film, in the decade it named it, from the
 * decade the film came out to now. A line runs out along the decades like a leader as it comes into
 * view, and each decade's lists light as the line reaches them. Lists with no date of their own (a
 * collection, a list kept up to date) stand at the end, under Now. Two or more decades running with
 * no list fold into one quiet stop (1950s–2000s). Across on a wide screen, down on a phone. How many decades have named it is what the canon's endurance bonus counts.
 */

const UNDATED = new Set(['criterion', 'tspdt-1000', 'ebert-great']);
const NOW = new Date().getFullYear();

const yearOf = (p) => {
    if (UNDATED.has(p.source)) return null;
    const y = Number(p.pollYear || yearIn(p.detail || '') || (LISTS[p.source]?.name || '').match(/(\d{4})\s*$/)?.[1]);
    return y >= 1895 && y <= NOW + 1 ? y : null;
};
const shortName = (p) => (LISTS[p.source]?.name || citation(p).name).replace(/,\s*\d{4}$/, '');

const ListYears = ({ film }) => {
    const [on, setOn] = useState(false);
    const ref = useRef(null);
    const cites = film.provenance || [];

    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.3 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    if (!cites.length) return null;
    const first = Math.floor((film.year || NOW) / 10) * 10;
    const cols = [];
    for (let d = first; d <= Math.floor(NOW / 10) * 10; d += 10) cols.push({ label: `${d}s`, marks: [] });
    const now = { label: 'Now', marks: [] };
    for (const p of cites) {
        const y = yearOf(p);
        const col = y ? cols[Math.min(cols.length - 1, Math.max(0, Math.floor(y / 10) * 10 - first) / 10)] : now;
        col.marks.push({ p, y });
    }
    cols.forEach((c) => c.marks.sort((a, b) => a.y - b.y));
    const decades = cols.filter((c) => c.marks.length).length;
    // a run of empty decades folds into one stop
    const stops = [];
    for (const c of cols) {
        const last = stops.at(-1);
        if (!c.marks.length && last && !last.marks.length) { last.to = c.label; continue; }
        stops.push({ ...c });
    }
    stops.forEach((c) => { if (c.to) c.label = `${c.label}–${c.to}`; });
    if (now.marks.length) stops.push(now);

    return (
        <div ref={ref} data-on={on || undefined} className="mt-20 md:mt-24">
            <h3 className="text-center font-serif text-3xl md:text-4xl">When the lists placed it</h3>
            <p className="mt-2 text-center font-serif italic text-lg text-gray-400">From the year it came out to now, each list in the decade it named the film.</p>
            {decades > 1 && <p className="mt-3 text-center font-label text-[12px] tracking-[0.14em] uppercase text-gold">Named in {decades} different decades</p>}

            <div className="relative mt-10 md:mt-12">
                {/* the line: across on a wide screen, down on a phone */}
                <span aria-hidden="true" className="years-line hidden md:block absolute left-0 right-0 top-[5px] h-px bg-gradient-to-r from-gold/80 via-gold/60 to-gold/30" />
                <span aria-hidden="true" className="years-line-v md:hidden absolute left-[5px] top-1 bottom-0 w-px bg-gradient-to-b from-gold/80 via-gold/60 to-gold/30" />
                <ol className="relative flex flex-col md:grid gap-y-6 md:gap-x-3" style={{ gridTemplateColumns: stops.map((c) => (c.marks.length ? 'minmax(0, 1fr)' : 'minmax(0, 0.7fr)')).join(' ') }}>
                    {stops.map((c, k) => {
                        const lit = c.marks.length > 0;
                        return (
                            <li key={c.label} className="relative pl-7 md:pl-0" style={{ '--k': k, '--n': stops.length }}>
                                <span aria-hidden="true" className={`years-dot absolute left-0 md:static block rounded-full ${lit ? 'w-[11px] h-[11px] bg-gold shadow-[0_0_14px_rgba(217,173,98,0.7)]' : 'ml-[3px] md:ml-0 mt-[3px] md:mt-0 w-[5px] h-[5px] bg-gray-600'}`} />
                                <div className={`md:mt-3 font-label text-[12px] tracking-[0.14em] uppercase leading-none ${lit ? 'text-white' : 'text-gray-600'}`}>{c.label}</div>
                                {lit && (
                                    <ul className="mt-3 space-y-3">
                                        {c.marks.map(({ p }, j) => {
                                            const place = p.source === 'ebert-great' ? 'One of his Great Movies' : citation(p).place;
                                            return (
                                                <li key={`${p.source}-${p.detail}-${j}`} className="years-mark" style={{ '--j': j }}>
                                                    <Link to={`/about?list=${p.source}`} className="group block">
                                                        <span className="block font-serif text-[1.05rem] md:text-[1.15rem] leading-tight text-gold-light group-hover:text-white">{place}</span>
                                                        <span className="block mt-0.5 text-[13px] leading-snug text-gray-300 group-hover:text-white">{shortName(p)}</span>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </div>
        </div>
    );
};

export default ListYears;
