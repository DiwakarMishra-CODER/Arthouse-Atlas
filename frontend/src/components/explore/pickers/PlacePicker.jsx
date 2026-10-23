import { useEffect, useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { buildAtlasModel } from '../../home/atlasModel';
import { Clear, Filter } from './parts';
import { norm, countryName, filmsWord } from './util';

/**
 * From where: the atlas's own night earth. Every country that made films here glows, brighter
 * for more; the chosen one is lit gold. A land that has made films under two names (Russia,
 * and the Soviet Union before it) asks which. Folded below it, a printed index of every country
 * with dotted leaders: the way to reach places too small to click, and for screen readers, the
 * real control (the map is a picture of it).
 */

const W = 960;
const H = 500;

// the home page's map data (usually already in the browser's cache), drawn once
let world = null;
const loadWorld = () => {
    if (!world) {
        world = Promise.all([
            fetch('/atlas/countries.json').then((r) => r.json()),
            fetch('/atlas/regions.json').then((r) => r.json()),
        ]).then(([topo, regions]) => {
            const features = feature(topo, topo.objects.countries).features.filter((f) => f.properties.name !== 'Antarctica');
            const projection = geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'FeatureCollection', features });
            const path = geoPath(projection);
            const points = Object.entries(regions.points || {}).map(([name, at]) => ({ name, at: projection(at) }));
            return { regions, shapes: features.map((f) => ({ name: f.properties.name, d: path(f) })), points };
        }).catch((err) => { world = null; throw err; });
    }
    return world;
};

const PlacePicker = ({ options = [], value, onPick }) => {
    const [map, setMap] = useState(null);
    const [typed, setTyped] = useState('');
    const [asking, setAsking] = useState(null); // a land that made films under two names

    useEffect(() => {
        let gone = false;
        loadWorld().then((w) => { if (!gone) setMap(w); }).catch(() => {});
        return () => { gone = true; };
    }, []);

    // which land stands for which catalogue countries (the Soviet Union lights its successors),
    // and how many films each would give
    const model = useMemo(() => map && buildAtlasModel(options.map((o) => ({ c: o.value, n: o.n })), map.regions, map.shapes.map((s) => s.name)), [map, options]);
    const max = Math.max(1, ...options.map((o) => o.n));
    const countOf = (key) => (model?.shapes.get(key)?.films || []).reduce((sum, f) => sum + f.n, 0);
    const namesOf = (key) => [...(model?.shapes.get(key)?.names || [])];

    const pickLand = (key) => {
        const names = namesOf(key);
        if (names.length === 1) { setAsking(null); onPick(names[0]); } else setAsking({ key, names });
    };
    const glow = (key) => {
        const n = countOf(key);
        if (!n) return { fill: '#191714', stroke: '#2a2622', width: 0.5 };
        if (namesOf(key).includes(value)) return { fill: '#f0cf8e', stroke: '#fbe7b8', width: 1.1, lit: true };
        return { fill: `rgba(217, 173, 98, ${(0.14 + 0.62 * Math.sqrt(n / max)).toFixed(3)})`, stroke: 'rgba(240, 207, 142, 0.35)', width: 0.5 };
    };

    const listed = [...options].sort((a, b) => countryName(a.value).localeCompare(countryName(b.value)))
        .filter((o) => norm(countryName(o.value)).includes(norm(typed)));

    return (
        <>
            <Clear label="Everywhere" active={!value} onClick={() => onPick('')} />
            {/* (no wider than a screen's worth of height, so the films below stay near) */}
            <div className="relative -mx-2 md:mx-auto md:max-w-[min(100%,calc(62svh*1.92))]">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-hidden="true">
                    <defs>
                        <filter id="place-glow" x="-30%" y="-30%" width="160%" height="160%">
                            <feGaussianBlur stdDeviation="4" result="b" />
                            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>
                    {map?.shapes.map((s) => {
                        const g = glow(s.name);
                        const n = countOf(s.name);
                        return (
                            <path
                                key={s.name}
                                d={s.d}
                                fill={g.fill}
                                stroke={g.stroke}
                                strokeWidth={g.width}
                                filter={g.lit ? 'url(#place-glow)' : undefined}
                                onClick={n ? () => pickLand(s.name) : undefined}
                                className={n ? 'cursor-pointer hover:brightness-150 transition-[filter,fill] duration-300' : undefined}
                            >
                                {n ? <title>{`${model.labelFor(s.name)}: ${filmsWord(n)}`}</title> : null}
                            </path>
                        );
                    })}
                    {map?.points.map((p) => {
                        const key = `point:${p.name}`;
                        const n = countOf(key);
                        if (!n || !p.at) return null;
                        const lit = namesOf(key).includes(value);
                        return (
                            <circle key={key} cx={p.at[0]} cy={p.at[1]} r={lit ? 6 : 4.5} fill={lit ? '#f0cf8e' : 'rgba(217, 173, 98, 0.85)'} stroke="#050505" strokeWidth="1" className="cursor-pointer" onClick={() => pickLand(key)}>
                                <title>{`${p.name}: ${filmsWord(n)}`}</title>
                            </circle>
                        );
                    })}
                </svg>
                {!map && <div className="absolute inset-0 flex items-center justify-center font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">The map is coming up…</div>}
            </div>
            {asking && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[15px] text-gray-300">This land made films as</span>
                    {asking.names.map((name) => (
                        <button key={name} type="button" onClick={() => { setAsking(null); onPick(name); }} className="px-3 py-1.5 ring-1 ring-gold/50 text-gold font-label text-[12px] tracking-[0.14em] uppercase hover:bg-gold hover:text-black transition-colors">
                            {countryName(name)} · {options.find((o) => o.value === name)?.n || 0}
                        </button>
                    ))}
                </div>
            )}

            {/* the printed index, folded under the map (it's long: the map is the first look) */}
            <details className="group/idx mt-5">
                <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer inline-flex items-center min-h-11 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">
                    <span className="group-open/idx:hidden">List every country ({options.filter((o) => o.n > 0).length}) ›</span>
                    <span className="hidden group-open/idx:inline">Hide the list</span>
                </summary>
                <div className="mt-3">
                <Filter value={typed} onChange={setTyped} placeholder="Type a country" />
                <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-10">
                    {listed.map((o) => {
                        const active = o.value === value;
                        return (
                            <li key={o.value}>
                                <button type="button" onClick={() => onPick(o.value)} aria-pressed={active} disabled={!o.n && !active} className={`w-full flex items-baseline gap-2 py-1.5 text-left text-[16px] disabled:opacity-30 ${active ? 'text-gold-light' : 'text-gray-200 hover:text-white'}`}>
                                    <span className="truncate">{countryName(o.value)}</span>
                                    <span aria-hidden="true" className="flex-1 min-w-4 border-b border-dotted border-white/20 translate-y-[-4px]" />
                                    <span className="font-label text-[12px] tracking-[0.14em] tabular-nums text-gray-400">{o.n}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
                </div>
            </details>
        </>
    );
};

export default PlacePicker;
