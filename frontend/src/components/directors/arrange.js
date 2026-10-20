import { countryName, norm } from '../explore/pickers/util';

/**
 * The Directors index, arranged. Pure functions over GET /api/directors/index (see
 * backend/services/directorIndex.js for its short field names): the four ways in (acclaim,
 * country, decade, movement), each a list of sections of places, a place being a director and
 * the film of theirs that puts them there; and the search.
 */

export const ARRANGEMENTS = [
    { key: 'acclaim', word: 'Acclaim' },
    { key: 'country', word: 'Country' },
    { key: 'decade', word: 'Decade' },
    { key: 'movement', word: 'Movement' },
];

// a picture as the index sends it: a TMDB path, a still the atlas hosts itself, or a whole address
export const pic = (path, size) => {
    if (!path) return null;
    if (/^https?:/.test(path) || path.startsWith('/stills/')) return path;
    return `https://image.tmdb.org/t/p/${size}${path}`;
};

// of some films (best first), the best one there's a picture of
const pictured = (films) => films.find((f) => f.s) || films.find((f) => f.o) || null;

const BANDS = [[1, 10], [11, 100], [101, 250], [251, 500], [501, Infinity]];
const byRank = (a, b) => (a.film?.r ?? Infinity) - (b.film?.r ?? Infinity) || a.d.n.localeCompare(b.d.n);

// acclaim: by the canon's place of each director's best film, in bands
const byAcclaim = (directors) => {
    const last = Math.max(0, ...directors.map((d) => d.f[0]?.r || 0));
    const sections = BANDS.map(([lo, hi]) => ({ key: `${lo}`, title: `${lo}–${Math.min(hi, last)}`, places: [] }));
    const unranked = { key: 'unranked', title: 'Not ranked', places: [] };
    for (const d of directors) {
        const best = d.f[0];
        const place = { d, film: best?.s || best?.o ? best : pictured(d.f), rank: best?.r ?? null, ranked: best };
        const band = best?.r ? sections.find((_, i) => best.r >= BANDS[i][0] && best.r <= BANDS[i][1]) : unranked;
        band.places.push(place);
    }
    const sort = (a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.d.n.localeCompare(b.d.n);
    return [...sections, unranked].filter((s) => s.places.length).map((s) => ({ ...s, places: s.places.sort(sort) }));
};

// country and decade: a director stands under every country (decade) their films here come from,
// each time with their best film from there
const byGroup = (directors, groupOf, order) => {
    const groups = new Map();
    for (const d of directors) {
        const mine = new Map();
        for (const f of d.f) {
            const g = groupOf(f);
            if (g == null) continue;
            if (!mine.has(g)) mine.set(g, []);
            mine.get(g).push(f);
        }
        for (const [g, films] of mine) {
            if (!groups.has(g)) groups.set(g, []);
            groups.get(g).push({ d, film: pictured(films) || pictured(d.f) });
        }
    }
    return [...groups].sort(order).map(([g, places]) => ({ key: String(g), title: g, places: places.sort(byRank) }));
};

// movement: in the order the movements began, each director it names as key, with their film of
// it; then everyone no movement names
const byMovement = (directors, movements) => {
    const sections = movements.map((m) => ({
        key: m.tag,
        title: m.title,
        tag: m.tag,
        places: directors.filter((d) => d.mv.includes(m.tag)).map((d) => ({ d, film: pictured(d.f.filter((f) => f.mv.includes(m.tag))) || pictured(d.f) })).sort(byRank),
    }));
    const outside = directors.filter((d) => !d.mv.length).map((d) => ({ d, film: pictured(d.f) })).sort(byRank);
    return [...sections, { key: 'outside', title: 'Outside any movement', places: outside }].filter((s) => s.places.length);
};

export const arrange = (index, by) => {
    const { directors, movements } = index;
    if (by === 'country') {
        return byGroup(directors, (f) => f.c && countryName(f.c), (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    }
    if (by === 'decade') {
        return byGroup(directors, (f) => (f.y ? Math.floor(f.y / 10) * 10 : null), (a, b) => a[0] - b[0])
            .map((s) => ({ ...s, title: `${s.key}s` }));
    }
    if (by === 'movement') return byMovement(directors, movements);
    return byAcclaim(directors);
};

// ---- search: names, ignoring accents and forgiving one typo a word; the titles of their films; and
// where their films come from ----
const wordsOf = (s) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);
const oneTypoApart = (a, b) => {
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
    return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
};

// how a director answers the search: by name (true), by one of their films (that film), or not at all
export const answers = (d, q) => {
    const query = norm(q).trim();
    if (!query) return true;
    const name = norm(d.n);
    if (name.includes(query)) return true;
    const asked = wordsOf(query);
    const own = wordsOf(d.n);
    if (asked.every((w) => own.some((o) => o.startsWith(w) || (w.length >= 4 && oneTypoApart(w, o))))) return true;
    if (query.length >= 3) {
        const film = d.f.find((f) => norm(f.t).includes(query)) || d.f.find((f) => f.c && norm(countryName(f.c)).startsWith(query));
        if (film) return film;
    }
    return null;
};

// the sections with only the places that answer the search (a film found by its title takes the tile)
export const narrow = (sections, q) => {
    if (!norm(q).trim()) return sections;
    return sections
        .map((s) => ({
            ...s,
            places: s.places.flatMap((p) => {
                const a = answers(p.d, q);
                if (!a) return [];
                return [a === true ? p : { ...p, film: a.s || a.o ? a : p.film, found: a }];
            }),
        }))
        .filter((s) => s.places.length);
};
