import { compact } from './directorIndex.js';
import { normalizeName } from './nameUtils.js';

/**
 * A member's awards night (the Profile room): every film they rate is a vote, and their ratings pick
 * the winners. Each award has its nominees (what it was chosen from) and says, in plain words, what it
 * asks and why the winner won.
 *
 * "Loved" is rated 4 or 5, or a favourite. An award is only given when there's a contest: two or more
 * nominees, and a winner with enough behind it.
 *   film       Your favourite film: the highest-rated (a favourite left unrated counts as 4.5; ties go
 *              to favourites, then the canon)
 *   director   Your favourite director: behind the most films they love (2 or more)
 *   movement   Your favourite movement: the one most of the films they love belong to (2 or more)
 *   country    Your favourite country: where most of the films they love were made (2 or more)
 *   decade     Your favourite decade: when most of them were made (2 or more)
 *   gem        Your hidden gem: the least-seen film they love (TMDB votes), if fewer people have seen
 *              it than half the atlas
 *
 * Everything is looked up in the in-memory catalogue (byId); a film that's left it is skipped.
 *
 * The ballot also counts what they've seen (rated, favourites, watched): its hours, countries and years.
 *
 * -> { name, since, ballot: { rated, favourites, loved, seen, hours, countries, from, to },
 *      awards: [{ key, label, question, why, to, nominees: [{ name, sub, s, o?, p?, fav?, to, win }] }],
 *      shelves: { favourites, watched, rated, watchlist, notFor } } (films: { id, t, y, d, c, r, s, o?, mark? })
 */

const PLACE = { 'United States of America': 'United States', 'United Kingdom of Great Britain and Northern Ireland': 'United Kingdom' };
const MOST = 5; // nominees at most
const byCanon = (a, b) => (a.canonRank ?? Infinity) - (b.canonRank ?? Infinity) || (b.provenanceScore || 0) - (a.provenanceScore || 0);
const filmOf = (c, mark) => ({
    id: c._id,
    t: c.title,
    y: c.year,
    d: c.directors,
    c: c.country || null,
    r: c.runtime || null,
    s: compact(c.still),
    ...(c.still ? {} : { o: compact(c.posterUrl) }),
    ...(mark != null ? { mark } : {}),
});
// a picture from some films (the best known, with a still)
const pictureOf = (films) => {
    const c = films.find((f) => f.still) || films[0];
    return { s: compact(c.still), ...(c.still ? {} : { o: compact(c.posterUrl) }) };
};
// "A, B and C", or "A, B, C and 3 more"
const listOf = (titles, max = 4) => {
    if (titles.length <= 1) return titles[0] || '';
    if (titles.length <= max) return `${titles.slice(0, -1).join(', ')} and ${titles.at(-1)}`;
    return `${titles.slice(0, max - 1).join(', ')} and ${titles.length - (max - 1)} more`;
};
// every value among some films, with its films (best known first), the most films first
const tally = (cards, valuesOf) => {
    const by = new Map();
    for (const c of cards) {
        for (const v of new Set((valuesOf(c) || []).filter(Boolean))) {
            if (!by.has(v)) by.set(v, []);
            by.get(v).push(c);
        }
    }
    return [...by].map(([value, films]) => ({ value, films: [...films].sort(byCanon) }))
        .sort((a, b) => b.films.length - a.films.length || byCanon(a.films[0], b.films[0]));
};
const filmsWord = (n, you = 'you', love = 'love') => (n === 1 ? `1 film ${you} ${love}` : `${n} films ${you} ${love}`);

// a member made of the marks a browser kept, for the night without an account: only films in the
// atlas count, ratings from 1 to 5, at most 500 of each; the browser keeps its newest rating last,
// so it's dated last, and listed first
export const memberFromMarks = (body, byId) => {
    const known = (id) => byId.has(String(id));
    const listOf = (key) => (Array.isArray(body?.[key]) ? body[key].slice(0, 500).map(String).filter(known) : []);
    const ratings = (Array.isArray(body?.ratings) ? body.ratings.slice(0, 500) : [])
        .map((r, i) => ({ movie: String(r?.id), value: Number(r?.value), ratedAt: new Date(i) }))
        .filter((r) => known(r.movie) && r.value >= 1 && r.value <= 5);
    return { username: null, createdAt: null, favorites: listOf('favorites'), watched: listOf('watched'), watchlist: listOf('watchlist'), notFor: listOf('notFor'), ratings };
};

export const buildFestival = ({ user, catalogue, as = null }) => {
    // who the night is said to: you, or, named (`as`), someone else (the example night a visitor sees)
    const Your = as ? `${as}’s` : 'Your';
    const your = as ? `${as}’s` : 'your';
    const You = as || 'You';
    const you = as || 'you';
    const love = as ? 'loves' : 'love';
    const { byId, directors, movementsByTitle } = catalogue;
    // ids -> cards, once each, in the order given
    const cardsOf = (ids = []) => {
        const seen = new Set();
        return ids.map((id) => byId.get(String(id))).filter((c) => c && !seen.has(c._id) && seen.add(c._id));
    };
    const ratings = (user.ratings || []).filter((r) => r.movie);
    const marks = new Map(ratings.map((r) => [String(r.movie), r.value]));
    const markOf = (c) => marks.get(c._id) ?? null;

    const favourites = cardsOf([...(user.favorites || [])].reverse()); // newest first
    const fav = new Set(favourites.map((c) => c._id));
    const rated = cardsOf([...ratings].sort((a, b) => new Date(b.ratedAt || 0) - new Date(a.ratedAt || 0)).map((r) => r.movie));
    const watched = cardsOf([...(user.watched || [])].reverse());
    const watchlist = cardsOf([...(user.watchlist || [])].reverse());
    const notFor = cardsOf([...(user.notFor || [])].reverse());
    const loved = cardsOf([...favourites, ...rated.filter((c) => markOf(c) >= 4)].map((c) => c._id));
    const seen = cardsOf([...rated, ...favourites, ...watched].map((c) => c._id));
    const years = seen.map((c) => c.year).filter(Boolean);

    const awards = [];
    const score = (c) => markOf(c) ?? (fav.has(c._id) ? 4.5 : 0);
    const filmSub = (c) => (markOf(c) ? `${You} rated it ${markOf(c)}/5` : `One of ${your} favourites`);

    // Your favourite film
    const films = [...loved].sort((a, b) => score(b) - score(a) || Number(fav.has(b._id)) - Number(fav.has(a._id)) || byCanon(a, b)).slice(0, MOST);
    if (films.length >= 2) {
        const w = films[0];
        const mark = markOf(w);
        awards.push({
            key: 'film', label: `${Your} favourite film`, question: `The film ${you} rated highest`,
            why: mark ? `${You} rated it ${mark} out of 5${fav.has(w._id) ? ', and made it a favourite' : ''}.` : `${You} made it a favourite.`,
            to: `/movie/${w._id}`,
            nominees: films.map((c, i) => ({ name: c.title, sub: filmSub(c), ...pictureOf([c]), ...(fav.has(c._id) ? { fav: true } : {}), to: `/movie/${c._id}`, win: i === 0 })),
        });
    }

    // the awards that count the films they love by something (director, movement, country, decade)
    const counted = ({ key, label, question, valuesOf, nameOf = (v) => v, why, extra = () => ({}), to }) => {
        const ranked = tally(loved, valuesOf).slice(0, MOST);
        if (ranked.length < 2 || ranked[0].films.length < 2) return;
        const w = ranked[0];
        awards.push({
            key, label, question,
            why: why(w.films.length, listOf(w.films.map((c) => c.title))),
            to: to(w.value),
            nominees: ranked.map((r, i) => ({ name: nameOf(r.value), sub: filmsWord(r.films.length, you, love), ...pictureOf(r.films), ...extra(r), to: to(r.value), win: i === 0 })),
        });
    };
    const pageOf = (name) => directors.get(normalizeName(name));
    counted({
        key: 'director', label: `${Your} favourite director`, question: `Whose films ${you} ${love} most`,
        valuesOf: (c) => c.directors,
        why: (n, list) => `${You} ${love} ${n} of their films: ${list}.`,
        extra: (r) => (pageOf(r.value)?.profileUrl ? { p: compact(pageOf(r.value).profileUrl) } : {}),
        to: (v) => (pageOf(v) ? `/directors/${pageOf(v)._id}` : `/explore?director=${encodeURIComponent(v)}`),
    });
    counted({
        key: 'movement', label: `${Your} favourite movement`, question: `The film movement most of the films ${you} ${love} belong to`,
        valuesOf: (c) => c.movements,
        why: (n, list) => `${n} of the films ${you} ${love} belong to it: ${list}.`,
        extra: (r) => (movementsByTitle.get(r.value)?.heroStill ? { s: compact(movementsByTitle.get(r.value).heroStill) } : {}),
        to: (v) => {
            const room = movementsByTitle.get(v);
            return room ? `/movements/${room.tag || room._id}` : `/explore?movement=${encodeURIComponent(v)}`;
        },
    });
    counted({
        key: 'country', label: `${Your} favourite country`, question: `Where most of the films ${you} ${love} were made`,
        valuesOf: (c) => (c.countries?.length ? c.countries : [c.country]),
        nameOf: (v) => PLACE[v] || v,
        why: (n, list) => `${n} of the films ${you} ${love} were made there: ${list}.`,
        to: (v) => `/explore?country=${encodeURIComponent(v)}`,
    });
    counted({
        key: 'decade', label: `${Your} favourite decade`, question: `When most of the films ${you} ${love} were made`,
        valuesOf: (c) => [c.decade],
        nameOf: (v) => `The ${v}s`,
        why: (n, list) => `${n} of the films ${you} ${love} were made then: ${list}.`,
        to: (v) => `/explore?decade=${v}`,
    });

    // Your hidden gem
    const known = catalogue.cards.filter((c) => c._votes > 0);
    const rarer = (c) => known.filter((k) => k._votes > c._votes).length / known.length; // share seen by more people
    const tenths = (c) => Math.min(9, Math.floor(rarer(c) * 10));
    const gems = loved.filter((c) => c._votes > 0).sort((a, b) => a._votes - b._votes).slice(0, MOST - 1);
    if (gems.length >= 2 && rarer(gems[0]) > 0.5) {
        const w = gems[0];
        awards.push({
            key: 'gem', label: `${Your} hidden gem`, question: `The least-seen film ${you} ${love}`,
            why: `Fewer people have seen it than ${tenths(w)} in 10 films in the atlas, and ${you} ${love} it.`,
            to: `/movie/${w._id}`,
            nominees: gems.map((c, i) => ({
                name: c.title,
                sub: tenths(c) >= 1 ? `Less seen than ${tenths(c)} in 10 films here` : 'Seen by most',
                ...pictureOf([c]), to: `/movie/${c._id}`, win: i === 0,
            })),
        });
    }

    return {
        name: user.username,
        since: user.createdAt || null,
        ballot: {
            rated: rated.length,
            favourites: favourites.length,
            loved: loved.length,
            seen: seen.length,
            hours: Math.round(seen.reduce((sum, c) => sum + (c.runtime || 0), 0) / 60),
            countries: new Set(seen.map((c) => c.country).filter(Boolean)).size,
            from: years.length ? Math.min(...years) : null,
            to: years.length ? Math.max(...years) : null,
        },
        awards,
        shelves: {
            favourites: favourites.map((c) => filmOf(c, markOf(c))),
            watched: watched.map((c) => filmOf(c, markOf(c))),
            rated: rated.map((c) => filmOf(c, markOf(c))),
            watchlist: watchlist.map((c) => filmOf(c)),
            notFor: notFor.map((c) => filmOf(c)),
        },
    };
};
