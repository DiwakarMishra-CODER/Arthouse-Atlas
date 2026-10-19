/**
 * Which country of the map holds which films — shared by the map's renderer
 * and the section around it.
 *
 * A catalogue country lights one or more map shapes: itself, its successor
 * states for a country that no longer exists (the Soviet Union lights fifteen),
 * or a disc for a place too small for the map (Hong Kong). A shape lit by an
 * old country is named for both: "Russia · Soviet Union".
 */
export const buildAtlasModel = (films, regions, shapeNames) => {
    const known = new Set(shapeNames);
    const keysFor = (country) => (regions.points[country]
        ? [`point:${country}`]
        : (regions.regions[country] || [country]).filter((n) => known.has(n)));

    const shapes = new Map(); // key → { films, names }
    for (const f of films) {
        for (const key of keysFor(f.c)) {
            if (!shapes.has(key)) shapes.set(key, { films: [], names: new Set() });
            const s = shapes.get(key);
            s.films.push(f);
            s.names.add(f.c);
        }
    }
    shapes.forEach((s) => s.films.sort((a, b) => a.y - b.y || (a.r ?? 9999) - (b.r ?? 9999)));

    const labelFor = (key) => {
        if (!key) return '';
        const name = key.startsWith('point:') ? key.slice(6) : key;
        const others = [...(shapes.get(key)?.names || [])].filter((n) => n !== name);
        return others.length ? `${name} · ${others.join(' · ')}` : name;
    };

    return {
        shapes,
        keyFor: (country) => keysFor(country)[0] || null,
        labelFor,
        filmsFor: (key) => shapes.get(key)?.films || []
    };
};
