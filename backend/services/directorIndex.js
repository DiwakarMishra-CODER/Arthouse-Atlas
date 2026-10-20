import Director from '../models/Director.js';
import Movement from '../models/Movement.js';
import { loadCatalogue } from './catalogue.js';
import { normalizeName } from './nameUtils.js';

/**
 * The Directors index: every director with every film of theirs in the atlas, best first, small
 * enough to send whole (the page arranges it by acclaim, country, decade and movement itself).
 *
 * { movements: [{ tag, title, start }], directors: [{ id, n, p, mv, f: [{ id, t, y, r, c, mv, s, o }] }] }
 *   n name · p portrait · mv movement tags · f films: t title, y year, r canon rank, c country,
 *   mv movement tags, s still, o poster (only when there's no still). Pictures are compact: a TMDB
 *   path ('/abc.jpg') or a still the atlas hosts itself ('/stills/…').
 */

// the names a director's films credit them under, besides the spelling on their own record
export const ALIASES = {
    'Alexander Sokurov': ['Aleksandr Sokurov'],
    'Fernando Solanas': ['Fernando E. Solanas'],
};
export const namesOf = (name) => [name, ...(ALIASES[name] || [])];

// a director's films in the order that stands for them: the canon's place, then how often cited,
// then the earlier film
export const byStanding = (a, b) => (a.canonRank ?? Infinity) - (b.canonRank ?? Infinity)
    || (b.provenanceScore || 0) - (a.provenanceScore || 0)
    || (a.year || 0) - (b.year || 0);

export const compact = (url) => (url ? url.replace(/^https:\/\/image\.tmdb\.org\/t\/p\/[a-z0-9]+(?=\/)/, '') : null);

export const buildDirectorIndex = ({ directors, movements, cards }) => {
    const credited = new Map(); // a credited name, normalised -> their films
    for (const c of cards) {
        for (const d of c._directors) {
            if (!credited.has(d)) credited.set(d, []);
            credited.get(d).push(c);
        }
    }
    const tagOf = new Map(movements.filter((m) => m.tag).map((m) => [m.title, m.tag]));
    const tagsOf = new Map(); // director id -> the movements they're key to
    for (const m of movements) {
        for (const k of m.keyDirectors || []) {
            if (!k.directorId || !m.tag) continue;
            const id = String(k.directorId);
            if (!tagsOf.has(id)) tagsOf.set(id, []);
            if (!tagsOf.get(id).includes(m.tag)) tagsOf.get(id).push(m.tag);
        }
    }
    return {
        movements: movements
            .filter((m) => m.tag)
            .sort((a, b) => (a.startYear ?? 9999) - (b.startYear ?? 9999) || a.title.localeCompare(b.title))
            .map((m) => ({ tag: m.tag, title: m.title, start: m.startYear ?? null })),
        directors: directors.map((d) => {
            const seen = new Set();
            const films = namesOf(d.name)
                .flatMap((name) => credited.get(normalizeName(name)) || [])
                .filter((c) => !seen.has(c._id) && seen.add(c._id))
                .sort(byStanding);
            return {
                id: String(d._id),
                n: d.name,
                p: compact(d.profileUrl) || null,
                mv: tagsOf.get(String(d._id)) || [],
                f: films.map((c) => ({
                    id: c._id,
                    t: c.title,
                    y: c.year,
                    r: c.canonRank,
                    c: c.country,
                    mv: c.movements.map((t) => tagOf.get(t)).filter(Boolean),
                    s: compact(c.still),
                    ...(c.still ? {} : { o: compact(c.posterUrl) }),
                })),
            };
        }),
    };
};

// built once per catalogue (which is itself kept for ten minutes)
let cache = { of: null, value: null };
export const directorIndex = async () => {
    const catalogue = await loadCatalogue();
    if (cache.of === catalogue) return cache.value;
    const [directors, movements] = await Promise.all([
        Director.find({}).select('name profileUrl').sort({ name: 1 }).lean(),
        Movement.find({}).select('title tag startYear keyDirectors').lean(),
    ]);
    cache = { of: catalogue, value: buildDirectorIndex({ directors, movements, cards: catalogue.cards }) };
    return cache.value;
};
