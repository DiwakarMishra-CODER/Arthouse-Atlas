import fs from 'fs';
import Studio from '../models/Studio.js';
import { loadCatalogue } from './catalogue.js';
import { normalizeName } from './nameUtils.js';
import { compact } from './directorIndex.js';
import { HOUSES, LABELS } from '../data/studios.js';
import { NOTES } from '../data/studioNotes.js';

/**
 * The Studios room's houses and their films (see data/studios.js for who's in it and why).
 * A house holds every film it's credited with producing (exact names, its spellings merged);
 * Criterion holds every film the canon cites from its collection, in spine order; the other labels
 * hold the films on their Studio record that were checked as theirs.
 *
 * Each house also carries what's known of it (`about`: founded, founders, place, its TMDB logo, its
 * Wikipedia page; data/studioFacts.json) and a short note (data/studioNotes.js); its style, in a few
 * facts from its films (how many are in black and white comes from data/filmColour.json); and its neighbours on the lot (the houses that share its directors, then its
 * country).
 *
 * index: [{ slug, name, country, kind, count, years, run, posters, ids }]
 * detail: { slug, name, country, kind, count, years, about, note, style, neighbours,
 *   films: [{ id, t, y, d, c, r, s, o?, spine? }], directors: [{ name, n, id?, p? }] }
 */

const key = (s) => (s || '').trim().toLowerCase();
const spineOf = (detail) => {
    const m = /#\s*(\d+)/.exec(detail || '');
    return m ? Number(m[1]) : null;
};
const byStanding = (a, b) => (a.canonRank ?? Infinity) - (b.canonRank ?? Infinity) || (b.provenanceScore || 0) - (a.provenanceScore || 0);
const filmOf = (c, criterion) => ({
    id: c._id,
    t: c.title,
    y: c.year,
    d: c.directors,
    c: c.country,
    r: c.runtime || null,
    s: compact(c.still),
    ...(c.still ? {} : { o: compact(c.posterUrl) }),
    ...(criterion && c._criterion ? { spine: spineOf(c._criterion) } : {}),
});

// a house's style, in a few facts from its films: where they're from, when, and the longest
const styleOf = (list, colour) => {
    const most = (values) => {
        const n = new Map();
        values.filter(Boolean).forEach((v) => n.set(v, (n.get(v) || 0) + 1));
        return [...n].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([value, count]) => ({ value, count }));
    };
    const longest = [...list].filter((c) => c.runtime).sort((a, b) => b.runtime - a.runtime)[0];
    const known = list.filter((c) => colour[c._tmdb]);
    return {
        // in black and white, of the films whose colour is known (a film shot in both doesn't count)
        bw: { n: known.filter((c) => colour[c._tmdb] === 'bw').length, of: known.length },
        countries: most(list.map((c) => c.country)),
        decades: most(list.map((c) => (c.year ? Math.floor(c.year / 10) * 10 : null))),
        longest: longest ? { t: longest.title, r: longest.runtime } : null,
    };
};

// for each house, the others nearest it on the lot: sharing its directors first, then its country
const neighboursOf = (houses) => {
    const people = new Map(houses.map((h) => [h.slug, new Set(h.directors.map((d) => d.name))]));
    return new Map(houses.map((h) => {
        const mine = people.get(h.slug);
        const near = houses
            .filter((o) => o.slug !== h.slug)
            .map((o) => ({ o, shared: [...people.get(o.slug)].filter((d) => mine.has(d)).length, same: o.country === h.country }))
            .filter((x) => x.shared || x.same)
            .sort((a, b) => b.shared - a.shared || Number(b.same) - Number(a.same) || b.o.count - a.o.count)
            .slice(0, 3)
            // (each shown by a film of its own, not one the two houses share)
            .map(({ o }) => ({ slug: o.slug, name: o.name, s: (o.run.find((f) => !h.films.some((g) => g.id === f.id)) || o.run[0])?.s || null }));
        return [h.slug, near];
    }));
};

export const buildStudios = ({ cards, records, directors, facts = {}, notes = {}, colour = {} }) => {
    const credited = new Map(); // a production credit, as spelt -> the house it belongs to
    HOUSES.forEach((h) => h.credits.forEach((c) => credited.set(key(c), h.slug)));
    const houses = [...HOUSES.map((h) => ({ ...h, kind: 'house' })), ...LABELS.map((h) => ({ ...h, kind: 'label' }))];
    const films = new Map(houses.map((h) => [h.slug, new Map()]));
    for (const c of cards) {
        for (const name of c._companies || []) {
            const slug = credited.get(key(name));
            if (slug) films.get(slug).set(c._id, c);
        }
        if (c._criterion) films.get('criterion').set(c._id, c);
    }
    const byId = new Map(cards.map((c) => [c._id, c]));
    const recordOf = new Map(records.map((r) => [r.name, r]));
    for (const h of houses) {
        for (const f of (h.studio && recordOf.get(h.studio)?.featuredFilms) || []) {
            const c = byId.get(String(f.movieId));
            if (c && !(h.drop || []).includes(c.title)) films.get(h.slug).set(c._id, c);
        }
    }

    const built = houses
        .map((h) => {
            const list = [...films.get(h.slug).values()];
            if (h.provenance === 'criterion') list.sort((a, b) => (spineOf(a._criterion) ?? Infinity) - (spineOf(b._criterion) ?? Infinity) || (a.year || 0) - (b.year || 0));
            else list.sort((a, b) => (a.year || 0) - (b.year || 0) || a.title.localeCompare(b.title));
            return { ...h, list };
        })
        .filter((h) => h.list.length)
        .map((h) => {
            const years = h.list.map((c) => c.year).filter(Boolean);
            const best = [...h.list].sort(byStanding);
            const tally = new Map();
            h.list.forEach((c) => c.directors.forEach((d) => tally.set(d, (tally.get(d) || 0) + 1)));
            return {
                slug: h.slug,
                name: h.name,
                country: h.country,
                kind: h.kind,
                about: facts[h.slug] || null,
                note: notes[h.slug] || null,
                style: styleOf(h.list, colour),
                count: h.list.length,
                years: years.length ? [Math.min(...years), Math.max(...years)] : null,
                // the film it opens on, and a strip of its best-known frames
                run: best.filter((c) => c.still).slice(0, 8).map((c) => filmOf(c)),
                strip: best.filter((c) => c.still).slice(0, 6).map((c) => compact(c.still)),
                posters: best.filter((c) => c.posterUrl).slice(0, 4).map((c) => c.posterUrl),
                films: h.list.map((c) => filmOf(c, h.provenance === 'criterion')),
                directors: [...tally]
                    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                    .map(([name, n]) => {
                        const d = directors.get(normalizeName(name));
                        return { name, n, ...(d ? { id: String(d._id), p: compact(d.profileUrl) || null } : {}) };
                    }),
            };
        })
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const near = neighboursOf(built);
    return built.map((h) => ({ ...h, neighbours: near.get(h.slug) }));
};

// built once per catalogue (kept for ten minutes)
let cache = { of: null, value: null };
const studios = async () => {
    const catalogue = await loadCatalogue();
    if (cache.of === catalogue) return cache.value;
    const records = await Studio.find({}).select('name featuredFilms').lean();
    const read = (file) => { try { return JSON.parse(fs.readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8')); } catch { return {}; } }; // (not fetched yet)
    const all = buildStudios({ cards: catalogue.cards, records, directors: catalogue.directors, facts: read('studioFacts.json'), notes: NOTES, colour: read('filmColour.json') });
    cache = { of: catalogue, value: { all, bySlug: new Map(all.map((s) => [s.slug, s])) } };
    return cache.value;
};

// every house with its films' ids in the order they were made (the Lot builds each stage from them)
export const studioIndex = async () => (await studios()).all.map(({ films, directors, strip, about, note, style, neighbours, ...s }) => ({
    ...s,
    run: s.run.slice(0, 1),
    ids: [...films].sort((a, b) => (a.y || 0) - (b.y || 0) || a.t.localeCompare(b.t)).map((f) => f.id),
}));
export const studioBySlug = async (slug) => {
    const s = (await studios()).bySlug.get(slug);
    if (!s) return null;
    const { strip, posters, ...rest } = s;
    return rest;
};
