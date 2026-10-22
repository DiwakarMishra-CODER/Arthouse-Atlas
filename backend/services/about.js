import fs from 'fs';
import { breakdown } from '../scripts/canon/scoring.js';
import { compact } from './directorIndex.js';
import { normalizeName } from './nameUtils.js';

/**
 * The About room's data: the 20 lists the canon is built from, each list's films in its own order,
 * and one film's count (how its votes became its place), all from the in-memory catalogue.
 *
 * Each list keeps the order it has itself: a ranked poll by rank; a list of the year (Cahiers,
 * CriticsTop10, Kinema Junpo, Sight and Sound's year-end) and Sight and Sound's older polls by year,
 * then rank; the Criterion Collection by spine; festival prizes by year; a critic's canon by when the
 * films were made.
 */

const SOURCES = JSON.parse(fs.readFileSync(new URL('../data/listSources.json', import.meta.url), 'utf8'));

const filmOf = (c) => ({
    id: c._id,
    t: c.title,
    y: c.year,
    d: c.directors,
    c: c.country || null,
    r: c.runtime || null,
    s: compact(c.still),
    ...(c.still ? {} : { o: compact(c.posterUrl) }),
});
const yearOf = (p) => p.pollYear || Number((p.detail || '').match(/(\d{4})/)?.[1]) || null;
const spineOf = (p) => Number((p.detail || '').match(/#\s*(\d+)/)?.[1]) || null;
const by = (...keys) => (a, b) => {
    for (const k of keys) {
        const x = k(a) ?? Infinity;
        const y = k(b) ?? Infinity;
        if (x !== y) return x - y;
    }
    return 0;
};
// a list's own order, from each film's entry on it
const orderOf = (id, kind) => {
    const rank = (e) => e.p.rank;
    const year = (e) => yearOf(e.p);
    const made = (e) => e.film.y;
    if (id === 'criterion') return by((e) => spineOf(e.p), made);
    if (kind === 'ranked') return by(rank, made);
    if (kind === 'ranked-yearly' || kind === 'ranked-historic') return by(year, rank);
    if (id === 'festival-awards') return by(year, made);
    return by(made);
};

// one list's films, in its order, each with what the list says of it
const entriesOn = (cards, id) => {
    const out = [];
    for (const c of cards) {
        const p = (c._prov || []).find((x) => x.source === id);
        if (p) out.push({ film: filmOf(c), p: { source: id, detail: p.detail, rank: p.rank, pollYear: p.pollYear, url: p.url } });
    }
    return out.sort(orderOf(id, SOURCES[id]?.kind));
};

// how many of the lists have a film (a list counts once, however many times it names it)
const listsWith = (cards) => new Map(cards.map((c) => [String(c._id), new Set((c._prov || []).map((p) => p.source)).size]));

// Each list with its two films to show.
// Its first: its number one where it ranks, or the Criterion Collection's Spine 1; for a list made
// year by year, the number one the most lists share; for one with no order, the film the most lists
// share (those last two never one another list already shows).
// Its rarest pick: the film on it that the fewest other lists have (the highest placed of those), no
// two lists the same. Lists with the fewest films choose first, so a small list keeps its one find.
export const listIndex = (cards) => {
    const shared = listsWith(cards);
    const n = (e) => shared.get(String(e.film.id)) || 1;
    const shown = (e) => (e ? { ...e.film, p: e.p, lists: n(e) } : null);
    const lists = Object.entries(SOURCES).map(([source, s]) => {
        const on = entriesOn(cards, source);
        // a list that names its own first (by rank, or the Criterion Collection by spine) keeps it
        const fixed = s.kind === 'ranked' || source === 'criterion';
        const could = /yearly|historic/.test(s.kind) ? on.filter((e) => e.p.rank === 1 && e.film.s) : on.filter((e) => e.film.s);
        return { source, s, on, fixed, could, top: fixed ? on.find((e) => e.film.s) || on[0] : null };
    });
    const taken = new Set(lists.filter((l) => l.top).map((l) => String(l.top.film.id)));
    // the others take the most shared film not already shown (a real number one may repeat)
    for (const l of lists.filter((x) => !x.fixed)) {
        l.top = [...l.could].sort((a, b) => n(b) - n(a)).find((e) => !taken.has(String(e.film.id))) || l.could[0] || l.on[0];
        if (l.top) taken.add(String(l.top.film.id));
    }
    const own = new Map();
    for (const l of [...lists].sort((a, b) => a.on.length - b.on.length)) {
        const pick = l.on
            .map((e, i) => ({ e, i }))
            .filter(({ e }) => e.film.s && !taken.has(String(e.film.id)))
            .sort((a, b) => n(a.e) - n(b.e) || a.i - b.i)[0]?.e;
        if (pick) { taken.add(String(pick.film.id)); own.set(l.source, pick); }
    }
    return lists.map(({ source, s, on, top }) => ({
        source, family: s.family, kind: s.kind, url: s.url, label: s.label, count: on.length, top: shown(top), own: shown(own.get(source)),
    })).sort((a, b) => b.count - a.count);
};


export const listFilms = (cards, source) => {
    if (!SOURCES[source]) return null;
    const s = SOURCES[source];
    return { source, family: s.family, kind: s.kind, url: s.url, label: s.label, films: entriesOn(cards, source).map((e) => ({ ...e.film, p: e.p })) };
};

// how one film's votes became its place
export const countFor = (catalogue, id) => {
    const card = catalogue.byId.get(String(id));
    if (!card) return null;
    const evidence = (card._prov || []).map((p) => ({ source: p.source, strength: p.strength, pollYear: p.pollYear, detail: p.detail, rank: p.rank }));
    const b = breakdown(evidence, SOURCES);
    const r = card.canonRank;
    const near = r ? catalogue.cards.filter((c) => c.canonRank && Math.abs(c.canonRank - r) <= 2).sort((a, b2) => a.canonRank - b2.canonRank) : [];
    return {
        film: { ...filmOf(card), rank: r || null },
        families: b.families,
        endurance: b.endurance,
        score: b.score,
        of: catalogue.cards.filter((c) => c.canonRank).length,
        neighbours: near.map((c) => ({ ...filmOf(c), rank: c.canonRank, self: c._id === card._id })),
    };
};

// three films that are counted differently: the atlas's first, a recent one, and a quiet one
export const examples = (cards) => {
    const ranked = cards.filter((c) => c.canonRank && c.still).sort((a, b) => a.canonRank - b.canonRank);
    const first = ranked[0];
    const recent = cards.find((c) => normalizeName(c.title) === normalizeName('Parasite')) || ranked.filter((c) => c.year >= 2015)[0];
    const quiet = ranked.filter((c) => (c._prov || []).length >= 2 && (c._prov || []).length <= 4)[Math.floor(ranked.length * 0.45)] || ranked.at(-1);
    return [first, recent, quiet].filter(Boolean).map((c) => ({ id: c._id, t: c.title, y: c.year }));
};

// the atlas in figures, for saying what it is
export const facts = (catalogue) => {
    const years = catalogue.cards.map((c) => c.year).filter(Boolean);
    return {
        films: catalogue.cards.length,
        countries: new Set(catalogue.cards.flatMap((c) => c.countries?.length ? c.countries : [c.country]).filter(Boolean)).size,
        directors: catalogue.directors?.size || null,
        movements: catalogue.movementsByTitle?.size || null,
        from: Math.min(...years),
        to: Math.max(...years),
        lists: Object.keys(SOURCES).length,
        ranked: catalogue.cards.filter((c) => c.canonRank).length,
    };
};

// the films a page names, by title
export const filmsNamed = (cards, titles) => {
    const byTitle = new Map(cards.map((c) => [normalizeName(c.title), c]));
    return Object.fromEntries(titles.map((t) => [t, byTitle.get(normalizeName(t))]).filter(([, c]) => c).map(([t, c]) => [t, filmOf(c)]));
};
