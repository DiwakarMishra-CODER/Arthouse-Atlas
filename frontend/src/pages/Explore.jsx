import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigationType, useSearchParams } from 'react-router-dom';
import { MdCasino } from 'react-icons/md';
import { moviesAPI } from '../services/api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import Letterboard from '../components/explore/Letterboard';
import FoyerWall from '../components/explore/FoyerWall';
import Banner from '../components/explore/Banner';
import Intertitle from '../components/explore/Intertitle';
import SearchBox from '../components/explore/SearchBox';
import ProjectorPick from '../components/explore/ProjectorPick';
import Tray from '../components/explore/Tray';
import Nearly from '../components/explore/Nearly';
import { norm } from '../components/explore/pickers/util';
import { SearchNote, SearchResults } from '../components/explore/ReadingSlip';
import DescribeBox from '../components/explore/DescribeBox';
import PlacePicker from '../components/explore/pickers/PlacePicker';
import TimePicker from '../components/explore/pickers/TimePicker';
import MakerPicker from '../components/explore/pickers/MakerPicker';
import MovementPicker from '../components/explore/pickers/MovementPicker';
import MoodPicker from '../components/explore/pickers/MoodPicker';
import GenrePicker from '../components/explore/pickers/GenrePicker';
import LengthPicker from '../components/explore/pickers/LengthPicker';
import OrderPicker from '../components/explore/pickers/OrderPicker';
import ScreensPicker from '../components/explore/pickers/ScreensPicker';
import { LENGTH_WORDS, STEPS } from '../components/explore/words';
import { usePageTitle } from '../hooks/usePageTitle';
import { useRegion, setRegion, regionName } from '../hooks/region';

/**
 * Explore: the cinema foyer.
 *
 * The letterboard says, in plain words, what's showing: every
 * word you can change sits in a gold slot, dashed while it's a blank ("FROM [ANYWHERE]"),
 * lit once chosen; tap one and its picker opens in the box of letters under the board (Tray), which
 * shows the choices as pictures from the start and, after each pick, opens the picker for the next
 * blank word, which the board lights. (There are no dropdowns: a picker that opened somewhere below
 * went unseen.) (The board no longer tries words out by itself: a sign whose words change on their
 * own reads as a display, not as something to press.) Every choice is
 * made with pictures: the night earth for places, a strip of film for decades, a contact
 * sheet for directors, title cards for movements, a mood board, tickets, reels. Below, the
 * films hang in the foyer's display cases, lit as you reach them, their stills running when
 * you look closer. Someone who knows no names can start from a film everyone has seen (any
 * film opens a wall of the films like it), or let the projector pick one.
 *
 * The URL is the selection, so a wall can be shared and Back steps through your choices.
 * Coming back from a film lands on the same wall at the same place: the page notes how many
 * cards were loaded and where you were, per selection.
 */

const PAGE = 24;
const FILTERS = ['q', 'country', 'decade', 'director', 'actor', 'language', 'movement', 'mood', 'genre', 'length', 'known', 'since', 'until', 'like', 'from', 'screens', 'in', 'feel', 'about', 'sure'];
// the words that can hold several values ("from Japan or South Korea"), kept in the address split by
// "|": a film needs only one of them. (Between words it's still "and".)
const MULTI = ['country', 'decade', 'director', 'actor', 'language', 'movement', 'mood', 'genre', 'length'];
const listOf = (v) => (v ? String(v).split('|').filter(Boolean) : []);
// "Japan", "Japan or Italy", "Japan, Italy or Iran", "Japan, Italy +2 more"
const orWords = (names) => (names.length <= 1 ? names[0] || ''
    : names.length === 2 ? `${names[0]} or ${names[1]}`
        : names.length === 3 ? `${names[0]}, ${names[1]} or ${names[2]}`
            : `${names[0]}, ${names[1]} +${names.length - 2} more`);
// decades: "1960s", "1960s to 1980s" (a run of them), "1950s or 1970s"
const decadeWords = (ds) => {
    const sorted = ds.map(Number).sort((a, b) => a - b);
    const run = sorted.length > 2 && sorted.every((d, i) => !i || d - sorted[i - 1] === 10);
    return run ? `${sorted[0]}s to ${sorted.at(-1)}s` : orWords(sorted.map((d) => `${d}s`));
};
// a span of years from a search: "before 1950", "since 1975", "1950 to 1969"
const spanWords = (since, until) => (since && until ? `${since} to ${until}` : until ? `before ${Number(until) + 1}` : since ? `since ${since}` : '');
const MOODS = ['contemplative', 'melancholic', 'dreamlike', 'surreal', 'intimate', 'existential', 'psychological', 'minimalist', 'slow', 'austere', 'poetic', 'lyrical', 'enigmatic', 'fragmented', 'bleak', 'atmospheric', 'funny', 'whimsical', 'romantic', 'warm', 'tense'];
const PICKER_TITLES = {
    country: 'From where', decade: 'When it was made', director: 'Who made it', movement: 'Which movement',
    mood: 'How it feels', genre: 'What kind of film', length: 'How long', screens: 'Where you’ll watch it', sort: 'In what order',
};

// the board's words for what you'll watch it on: "any service", "MUBI or Netflix", "MUBI, Netflix +1"
const screensWords = (v, facet) => {
    if (v === 'all') return 'any service';
    if (v === 'free') return 'a free service';
    const names = String(v).split(',').map((id) => facet?.services?.find((s) => String(s.id) === id)?.name).filter(Boolean);
    if (!names.length) return 'your services';
    return names.length <= 2 ? names.join(' or ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
};
// ways to describe a film, offered under the describe box (each is read when tapped): one of each kind,
// a different three each visit, so the examples show how much it can take (and aren't all sad)
const DESCRIBE = [
    ['something dreamlike', 'funny and under 90 minutes', 'feels like a warm hug', 'something really scary'],
    ['a heist movie', 'set in Tokyo', 'a road trip film', 'films with Tony Leung', 'Isabelle Huppert films'],
    ['French New Wave from the 60s', 'hidden gems from Japan', 'Iranian films under 90 minutes', 'something on MUBI tonight'],
];
const pickExamples = () => DESCRIBE.map((kind) => kind[Math.floor(Math.random() * kind.length)]);
const ORDER_WORDS = { acclaimed: 'most acclaimed first', oldest: 'oldest first', newest: 'newest first', surprise: 'in a surprise order', closest: 'closest first', feel: 'best match first' };

// links from before the foyer: ?search= became q, ?tags= becomes a mood when it is one
const fromOldLink = (params) => {
    if (!params.has('search') && !params.has('tags')) return null;
    const next = new URLSearchParams(params);
    if (params.has('search')) { if (params.get('search')) next.set('q', params.get('search')); next.delete('search'); }
    if (params.has('tags')) {
        const mood = params.get('tags').split(',').map((t) => t.trim().toLowerCase()).find((t) => MOODS.includes(t));
        next.delete('tags');
        if (mood) next.set('mood', mood);
    }
    return next;
};

// "from Japan", "from the Soviet Union", "from the United States"
const THE = /^(United |Soviet Union|Netherlands|Philippines|Czech Republic|Dominican Republic|Democratic Republic)/;
const countryWords = (c) => {
    const name = c === 'United States of America' ? 'United States' : c;
    return THE.test(name) ? `the ${name}` : name;
};

// the board's next word still blank after those already chosen (wrapping round), or the first
const nextBlank = (chosen, after = null) => {
    const at = after ? STEPS.findIndex((x) => x.id === after) : STEPS.map((x) => !!chosen(x.id)).lastIndexOf(true);
    const order = [...STEPS.slice(at + 1), ...STEPS.slice(0, at + 1)];
    return order.find((x) => x.id !== after && !chosen(x.id))?.id || null;
};

// a new shuffle (kept in the URL, so the same shuffle comes back with Back)
const newSeed = () => String(Math.floor(Math.random() * 1e9));

const readNote = (key) => {
    try { return JSON.parse(sessionStorage.getItem(`explore:${key}`) || 'null'); } catch { return null; }
};

// the address keeps only what differs from the default order (closest to the feel when a sentence
// gave feel words, closest when the wall starts from a film), and no order the wall can't have
const tidyOrder = (next) => {
    const started = next.has('like') || next.has('from');
    const feeling = next.has('feel') || next.has('about');
    const sort = next.get('sort');
    const natural = feeling ? 'feel' : started ? 'closest' : 'acclaimed';
    if (sort === natural || (sort === 'closest' && !started) || (sort === 'feel' && !feeling)) next.delete('sort');
    if (sort !== 'surprise' && next.get('sort') !== 'surprise') next.delete('seed');
    return next;
};

const Explore = () => {
    const [params, setParams] = useSearchParams();
    const navigation = useNavigationType();
    // back to wherever you came from (or home, when Explore is where you arrived)
    const reducedMotion = useMotionPreference();
    usePageTitle('Explore the films', 'Every film in the atlas, in canon order: narrow it by movement, decade, country, length, genre, mood or director, or start from a film you love.');
    const oldLink = fromOldLink(params);

    const sel = useMemo(() => Object.fromEntries([...FILTERS, 'sort', 'seed'].map((k) => [k, params.get(k) || ''])), [params]);
    const started = Boolean(sel.like || sel.from);
    const feeling = Boolean(sel.feel || sel.about);
    const sort = sel.sort || (feeling ? 'feel' : started ? 'closest' : 'acclaimed');
    const query = useMemo(() => Object.fromEntries(Object.entries(sel).filter(([, v]) => v)), [sel]);
    // every request says which country you watch in, so the Streaming tab counts what's on there
    // (the address only keeps it once streaming is chosen, so a shared wall shows the same country)
    const region = useRegion();
    const ask = useMemo(() => ({ ...query, in: query.in || region }), [query, region]);
    const key = useMemo(() => new URLSearchParams(ask).toString(), [ask]);
    // what the projector picks from: what's showing, in any order
    const pickQuery = useMemo(() => {
        const { sort: _sort, seed: _seed, ...rest } = ask;
        return rest;
    }, [ask]);

    const [wall, setWall] = useState({ key: null, films: [], total: 0, facets: null, nearly: [], selected: {}, notes: null });
    const [loadingMore, setLoadingMore] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [start, setStart] = useState(null);
    const [projector, setProjector] = useState(false);
    // the line for newcomers shows until you've chosen something once (remembered on this device)
    const [knowsTheWay, setKnowsTheWay] = useState(() => {
        try { return localStorage.getItem('explore:knows-the-way') === '1'; } catch { return false; }
    });
    // the tray's open tab (one of the board's words, or the order): it opens on the first word still
    // blank (with nothing chosen, the map), and stays on a word while you pick from it
    const [trayTab, setTrayTab] = useState(() => nextBlank((k) => params.get(k)));
    const restoreY = useRef(null);
    const sentinel = useRef(null);
    const restoring = navigation === 'POP';
    // the tray of filters: open on a first visit (it's how you learn to choose: the map, the decades, the
    // faces), closed once you've chosen something before (remembered on this device), so the films come
    // first; a description search folds it away; a gold word, a tab on its folded bar, or "Show filters"
    // opens it, and "Hide filters" closes it
    const [trayOpen, setTrayOpen] = useState(() => {
        try { return localStorage.getItem('explore:knows-the-way') !== '1'; } catch { return true; }
    });
    // a gold word opens its picker in the tray, and brings the tray into view if it's out of it
    const openPicker = useCallback((id) => {
        setTrayTab(id);
        setTrayOpen(true);
        setTimeout(() => document.getElementById('ways-in')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' }), 0);
    }, [reducedMotion]);

    // places to start, for the search and the line under it
    useEffect(() => {
        let gone = false;
        moviesAPI.exploreSuggest('').then((r) => { if (!gone) setStart(r.data.start || null); }).catch(() => {});
        return () => { gone = true; };
    }, []);

    // a new selection: its first cards (as many as you'd loaded, when coming back), and its counts
    useEffect(() => {
        if (oldLink) return undefined;
        let gone = false;
        const note = restoring ? readNote(key) : null;
        const limit = Math.min(96, Math.max(PAGE, note?.count || PAGE));
        moviesAPI.explore({ ...ask, page: 1, limit })
            .then((r) => {
                if (gone) return;
                restoreY.current = note ? note.y : null;
                setWall({ key, films: r.data.films, total: r.data.total, facets: r.data.facets, nearly: r.data.nearly || [], selected: r.data.selected || {}, notes: r.data.notes });
            })
            .catch(() => { if (!gone) setWall((w) => ({ ...w, key, films: [], total: 0, facets: w.facets, nearly: [], failed: true })); });
        return () => { gone = true; };
    }, [key, ask, restoring, oldLink, attempt]);

    // a film to start from that can't be found (an old link, a film since removed): take it off the board
    useEffect(() => {
        if (wall.key !== key || !wall.notes?.startMissing) return;
        const next = new URLSearchParams(params);
        next.delete('like');
        next.delete('from');
        setParams(tidyOrder(next), { replace: true });
    }, [wall, key, params, setParams]);

    // back at the place you left it
    useLayoutEffect(() => {
        if (wall.key !== key || restoreY.current == null) return;
        window.scrollTo(0, restoreY.current);
        restoreY.current = null;
    }, [wall, key]);

    // the page puts you back itself (the browser would try while the wall is still empty)
    useEffect(() => {
        const previous = window.history.scrollRestoration;
        window.history.scrollRestoration = 'manual';
        return () => { window.history.scrollRestoration = previous; };
    }, []);

    // note how far you'd got, for coming back: as you scroll, and the moment you click away.
    // (Not as the page goes: by then the film's page has taken its place and the scroll is gone.)
    useEffect(() => {
        if (wall.key !== key) return undefined;
        let t = 0;
        const save = () => {
            clearTimeout(t);
            try { sessionStorage.setItem(`explore:${key}`, JSON.stringify({ count: wall.films.length, y: Math.round(window.scrollY) })); } catch { /* storage full or blocked */ }
        };
        const onScroll = () => { clearTimeout(t); t = setTimeout(save, 150); };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('click', save, true);
        return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); window.removeEventListener('click', save, true); };
    }, [key, wall.key, wall.films.length]);

    // more cards as you near the end of the wall
    const hasMore = wall.key === key && wall.films.length < wall.total;
    const loadMore = useCallback(() => {
        if (loadingMore) return;
        setLoadingMore(true);
        const page = Math.floor(wall.films.length / PAGE) + 1;
        moviesAPI.explore({ ...ask, page, limit: PAGE, facets: '0' })
            .then((r) => setWall((w) => {
                if (w.key !== key) return w;
                const have = new Set(w.films.map((f) => f._id));
                return { ...w, films: [...w.films, ...r.data.films.filter((f) => !have.has(f._id))] };
            }))
            .catch(() => {})
            .finally(() => setLoadingMore(false));
    }, [loadingMore, wall.films.length, ask, key]);
    useEffect(() => {
        if (!hasMore || !sentinel.current) return undefined;
        const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) loadMore(); }, { rootMargin: '1200px 0px' });
        io.observe(sentinel.current);
        return () => io.disconnect();
    }, [hasMore, loadMore]);


    // change one word on the board (from a card, also go back up to the board to see it change)
    // (`also`: other words changed with it, as choosing decades takes off a span of years)
    const choose = useCallback((k, v, { up = false, also = {} } = {}) => {
        const next = new URLSearchParams(params);
        if (v === '' || v === null || v === undefined) next.delete(k);
        else next.set(k, String(v));
        Object.entries(also).forEach(([ak, av]) => (av ? next.set(ak, String(av)) : next.delete(ak)));
        if (k === 'sort' && v === 'surprise') next.set('seed', newSeed());
        // a film to start from replaces the search, the other film, and the order
        if ((k === 'like' || k === 'from') && v) {
            next.delete(k === 'like' ? 'from' : 'like');
            ['q', 'sort', 'seed'].forEach((p) => next.delete(p));
        }
        // streaming is always somewhere: the address keeps the country with it, and drops it with it
        if (k === 'screens') {
            if (v) next.set('in', next.get('in') || region);
            else next.delete('in');
        }
        // choosing "most acclaimed" on a wall that starts from a film has to say so (its default is closest)
        if (k === 'sort' && v === 'acclaimed' && (next.has('like') || next.has('from') || next.has('feel'))) { next.set('sort', 'acclaimed'); next.delete('seed'); }
        else tidyOrder(next);
        setParams(next);
        if (!knowsTheWay) {
            setKnowsTheWay(true);
            try { localStorage.setItem('explore:knows-the-way', '1'); } catch { /* storage blocked: it just shows again next time */ }
        }
        if (up) window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    }, [params, setParams, reducedMotion, knowsTheWay, region]);
    const reset = () => { setParams(new URLSearchParams()); setTrayTab(STEPS[0].id); setTrayOpen(true); setReading(null); setDescribed(''); };
    // take a word off the board (the decades take a span of years with them)
    const drop = useCallback((id) => choose(id, '', id === 'decade' ? { also: { since: '', until: '' } } : {}), [choose]);
    // a picture in the tray adds its value to its word, or takes it back off. The tray stays on that
    // word, so you can pick more of it ("Japan or South Korea") or go and see the films; it no longer
    // moves on to the next blank by itself, which nudged people to fill every word until little was left.
    const trayPick = (id, value) => {
        if (value === '' || value == null) { drop(id); return; }
        if (!MULTI.includes(id)) { choose(id, String(sel[id] || '') === String(value) ? '' : value); return; }
        const now = listOf(sel[id]);
        const has = now.some((v) => norm(v) === norm(value));
        const next = has ? now.filter((v) => norm(v) !== norm(value)) : [...now, String(value)];
        choose(id, next.join('|'), id === 'decade' ? { also: { since: '', until: '' } } : {});
    };
    // what each word holds, as lists (the length's list is `lengths`: a plain `length` key reads as an
    // array's size), and a span of years, from a search
    // a sentence typed into the search, read into the board's words by the server (a language model,
    // checked against the atlas): it replaces the board, its feel words order the wall, and the slip
    // under the search says how it was read and what couldn't be placed. If it can't be read, it's
    // an ordinary search; if it isn't about films, nothing changes.
    const [reading, setReading] = useState(null); // { q, state: 'reading' | 'done' | 'offTopic' | 'failed' | 'plain', answer, at }
    const [described, setDescribed] = useState(''); // the describe box's text
    const [examples] = useState(pickExamples); // this visit's three
    const askBoard = useCallback((q) => {
        setReading({ q, state: 'reading' });
        moviesAPI.understand(q, region)
            .then((r) => {
                const a = r.data;
                if (a.offTopic) { setReading({ q, state: 'offTopic' }); return; }
                const next = new URLSearchParams();
                Object.entries(a.params || {}).forEach(([k, v]) => next.set(k, v));
                if (a.feel?.length) next.set('feel', a.feel.join('|'));
                tidyOrder(next);
                setParams(next);
                setReading({ q, state: 'done', answer: a, at: next.toString() });
                setTrayOpen(false);
                setKnowsTheWay(true);
            })
            .catch(() => { setReading({ q, state: 'failed' }); setTrayOpen(false); choose('q', q); });
    }, [setParams, choose, setReading, region]);
    const picked = useMemo(() => ({
        country: listOf(sel.country), decade: listOf(sel.decade), director: listOf(sel.director), movement: listOf(sel.movement),
        mood: listOf(sel.mood), genre: listOf(sel.genre), lengths: listOf(sel.length),
        actor: listOf(sel.actor), language: listOf(sel.language),
        span: spanWords(sel.since, sel.until), // a span of years, from a search
    }), [sel]);
    const { span } = picked;
    // each way in's own picker, made of pictures, as the tray shows it
    const pickerFor = (id) => {
        const on = (v) => trayPick(id, v);
        if (id === 'country') return <PlacePicker options={facets.country} value={picked.country} onPick={on} />;
        if (id === 'decade') return <TimePicker options={facets.decade} value={picked.decade} range={span ? `made ${span}` : ''} onPick={on} />;
        if (id === 'director') return <MakerPicker options={facets.director} value={picked.director} onPick={on} />;
        if (id === 'movement') return <MovementPicker options={facets.movement} value={picked.movement} onPick={on} />;
        if (id === 'mood') return <MoodPicker options={facets.mood} value={picked.mood} onPick={on} notes={wall.notes?.moodFilms} />;
        if (id === 'genre') return <GenrePicker options={facets.genre} value={picked.genre} onPick={on} />;
        if (id === 'length') return <LengthPicker options={facets.length} value={picked.lengths} onPick={on} />;
        // (several services at once, so a pick doesn't move the tray on to the next word)
        if (id === 'screens') {
            return (
                <ScreensPicker
                    facet={facets.screens}
                    value={sel.screens}
                    region={sel.in || region}
                    onChange={(v) => choose('screens', v)}
                    onRegion={(cc) => { setRegion(cc); if (sel.screens) choose('in', cc); }}
                    still={reducedMotion}
                />
            );
        };
        if (id === 'sort') return <OrderPicker value={sort} started={started} feeling={feeling} onPick={(v) => choose('sort', v)} />;
        return null;
    };
    const toWall = () => document.getElementById('the-wall')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    const focusSearch = () => document.getElementById('explore-search')?.focus();

    const facets = wall.facets || {};
    const onDirector = useCallback((d) => choose('director', d, { up: true }), [choose]);
    const onMovement = useCallback((m) => choose('movement', facets.movement?.find((x) => x.value === m)?.tag || m, { up: true }), [choose, facets.movement]);
    const searchOn = useMemo(() => ({
        like: (id) => choose('like', id, { up: true }),
        from: (id) => choose('from', id, { up: true }),
        director: (name) => choose('director', name),
        country: (c) => choose('country', c),
        mood: (m) => choose('mood', m),
        genre: (g) => choose('genre', g),
        movement: (tag) => choose('movement', tag),
        actor: (name) => choose('actor', name),
        // nothing in the lookup is called that: hand the words to the describe box, and read them
        describe: (text) => { setDescribed(text); askBoard(text); },
    }), [choose, askBoard, setDescribed]);
    const closeProjector = useCallback(() => setProjector(false), []);
    const decadeCounts = useMemo(() => new Map((facets.decade || []).map((d) => [d.value, d.n])), [facets.decade]);
    const movementTitles = useMemo(() => new Map((facets.movement || []).map((m) => [m.tag, m.value])), [facets.movement]);

    // ---- the board's words: plain words in white, and what you can change in gold slots ----
    // (dashed while a blank to fill, lit once chosen)
    const ready = wall.key === key;
    // a search's results heading, while the wall is the one it set (it goes when you change the board by hand)
    const searchShown = reading && ((reading.state === 'done' && reading.at === params.toString()) || ((reading.state === 'failed' || reading.state === 'plain') && sel.q === reading.q));
    const scrolledFor = useRef(null);
    useEffect(() => {
        if (!searchShown || !ready || scrolledFor.current === reading) return;
        scrolledFor.current = reading;
        document.getElementById('board')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    }, [searchShown, ready, reading, reducedMotion]);
    const changing = wall.key !== null && !ready;
    const movementText = orWords(picked.movement.map((tag) => movementTitles.get(tag) || (wall.selected.movement?.tag === tag && wall.selected.movement.title) || tag));
    const startTitle = wall.selected.start?.title;
    const actorText = orWords(picked.actor);
    const languageText = orWords(picked.language);
    const directorText = orWords(picked.director.length === 1 && wall.selected.director?.name ? [wall.selected.director.name] : picked.director);
    const countryText = orWords(picked.country.map(countryWords));
    const decadeText = decadeWords(picked.decade);
    const moodText = orWords(picked.mood);
    const genreText = orWords(picked.genre);
    const lengthText = orWords(picked.lengths.map((l) => LENGTH_WORDS[l] || l));
    const oneDecade = picked.decade.length === 1 && !span ? picked.decade[0] : '';
    const any = FILTERS.some((k) => sel[k]);
    const total = wall.total;
    const word = (id, text) => ({ id, text });
    const control = (id, text, label, extra = {}) => ({ id, text, control: true, label, onClick: () => openPicker(id), onRemove: () => drop(id), ...extra });
    // (the blank the tray is asking for is lit)
    const blank = (id, text, label) => ({ id, text, control: true, blank: true, label, onClick: () => openPicker(id) });

    const countText = wall.key === null || wall.failed ? '· · ·' : !any ? `all ${total} films` : `${total} ${total === 1 ? 'film' : 'films'}`;
    const big = [word('count', countText)];
    if (sel.q) big.push(word('q-w', 'matching'), control('q', `“${sel.q}”`, `Search: ${sel.q}`, { onClick: focusSearch }));
    if (started) big.push(word('like-w', 'like'), control(sel.like ? 'like' : 'from', startTitle || '…', `Starting from ${startTitle || 'a film'}`, { onClick: focusSearch }));
    const medium = [
        word('country-w', 'from'),
        picked.country.length ? control('country', countryText, `Country: ${countryText}`) : blank('country', 'anywhere', 'Country: anywhere'),
        ...(span
            ? [word('decade-w', 'made'), control('decade', span, `Years: ${span}`)]
            : picked.decade.length
                ? [word('decade-w', 'made in the'), control('decade', decadeText, `Decade: the ${decadeText}`)]
                : [word('decade-w', 'made'), blank('decade', 'any time', 'Decade: any time')]),
        word('director-w', 'by'),
        picked.director.length ? control('director', directorText, `Director: ${directorText}`) : blank('director', 'anyone', 'Director: anyone'),
        // an actor or a language, once chosen (by name in the lookup, or from a sentence): no blanks for them
        ...(picked.actor.length ? [word('actor-w', 'starring'), control('actor', actorText, `Starring: ${actorText}`, { onClick: focusSearch })] : []),
        ...(picked.language.length ? [word('language-w', 'in'), control('language', languageText, `Language: ${languageText}`, { onClick: focusSearch })] : []),
    ];
    const list = [
        picked.movement.length ? control('movement', movementText, `Movement: ${movementText}`) : blank('movement', 'movement', 'Movement: any'),
        picked.mood.length ? control('mood', moodText, `Mood: ${moodText}`) : blank('mood', 'mood', 'Mood: any'),
        picked.genre.length ? control('genre', genreText, `Genre: ${genreText}`) : blank('genre', 'genre', 'Genre: any'),
        picked.lengths.length ? control('length', lengthText, `Length: ${lengthText}`) : blank('length', 'length', 'Length: any'),
        // where you'll watch it: a blank like its neighbours until chosen, then its own line
        ...(sel.screens ? [] : [blank('screens', 'streaming', 'Streaming: anywhere, or not streaming at all')]),
    ];
    // where you'll watch it, once chosen: "STREAMING ON [MUBI OR NETFLIX] IN INDIA"
    const screensText = sel.screens ? screensWords(sel.screens, facets.screens) : '';
    const watchedIn = regionName(sel.in || region, { inSentence: true });
    const screensLine = sel.screens
        ? [word('screens-w', 'streaming on'), control('screens', screensText, `Streaming on ${screensText} in ${watchedIn}`), word('in-w', `in ${watchedIn}`)]
        : [];
    // how it should feel, from a sentence: "THAT FEEL [SLOW, SAD]" (it orders the wall; it isn't a filter)
    const feelText = listOf(sel.feel).join(', ');
    // what it should be about, from a sentence: "ABOUT [A HEIST]" (it orders the wall too)
    const aboutText = listOf(sel.about).join(', ');
    // on a wall ordered by feel: where the films viewers described that way end, and the rest (in the
    // canon's order) begin; with a way to keep only the first
    const feelSaid = [...listOf(sel.feel), ...listOf(sel.about)].map((w) => `“${w}”`).join(' or ');
    const aboutToo = listOf(sel.about).length > 0;
    const sure = ready ? wall.notes?.feelSure || 0 : 0;
    const feelSplit = sort === 'feel' && !sel.sure && sure > 0 && sure < total ? {
        at: sure,
        kicker: 'The rest',
        title: aboutToo ? `Nothing tags these ${feelSaid}` : `No viewer called these ${feelSaid}`,
        extra: (
            <>
                <p className="mt-4 text-gray-300">The {sure === 1 ? 'film' : `${sure} films`} above {sure === 1 ? 'is' : 'are'} the ones {aboutToo ? 'tagged or described' : 'viewers described'} that way. The rest follow, {aboutToo ? 'closest story first' : 'most acclaimed first'}.</p>
                <button type="button" onClick={() => { choose('sure', '1'); toWall(); }} className="mt-6 inline-flex items-center gap-2 min-h-11 px-5 ring-1 ring-gold/60 text-gold-light font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase hover:bg-gold hover:text-black transition-colors">
                    Only show {sure === 1 ? 'that film' : `these ${sure} films`}
                </button>
            </>
        ),
    } : null;
    const lines = [
        { size: 'small', phrases: [{ id: 'now', text: ready && !wall.failed && total === 0 ? 'Nothing showing' : 'Now showing' }] },
        { size: 'big', phrases: big },
        { size: 'medium', phrases: medium },
        { size: 'list', phrases: list },
        ...(feelText ? [{ size: 'list', phrases: [word('feel-w', 'that feel'), control('feel', feelText, `Feel: ${feelText}`, { onClick: focusSearch })] }] : []),
        ...(aboutText ? [{ size: 'list', phrases: [word('about-w', 'about'), control('about', aboutText, `About: ${aboutText}`, { onClick: focusSearch })] }] : []),
        // lesser known (from "underrated", "hidden gems"): under 500 ratings on TMDB
        ...(sel.known === 'less' ? [{ size: 'list', phrases: [word('known-w', 'that'), control('known', 'few have seen', 'Lesser known: fewer than 500 ratings on TMDB', { onClick: focusSearch })] }] : []),
        ...(screensLine.length ? [{ size: 'list', phrases: screensLine }] : []),
        { size: 'sort', phrases: [control('sort', ORDER_WORDS[sort], `Order: ${ORDER_WORDS[sort]}`, { onRemove: null })] },
    ];
    // what's chosen, in words: the board's label for screen readers, and the empty wall's ways out
    const chosen = [
        sel.q && { id: 'q', text: `matching “${sel.q}”` },
        started && { id: sel.like ? 'like' : 'from', text: `like ${startTitle || 'that film'}` },
        picked.country.length && { id: 'country', text: `from ${countryText}` },
        span ? { id: 'decade', text: `made ${span}` } : picked.decade.length && { id: 'decade', text: `made in the ${decadeText}` },
        picked.director.length && { id: 'director', text: `by ${directorText}` },
        picked.actor.length && { id: 'actor', text: `starring ${actorText}` },
        picked.language.length && { id: 'language', text: `in ${languageText}` },
        sel.known === 'less' && { id: 'known', text: 'that few have seen' },
        picked.movement.length && { id: 'movement', text: movementText },
        picked.mood.length && { id: 'mood', text: moodText },
        picked.genre.length && { id: 'genre', text: genreText },
        picked.lengths.length && { id: 'length', text: lengthText },
        sel.screens && { id: 'screens', text: `streaming on ${screensText} in ${watchedIn}` },
    ].filter(Boolean);
    const boardLabel = `Now showing: ${[countText, ...chosen.map((c) => c.text), feelText && `that feel ${feelText}`, aboutText && `about ${aboutText}`].filter(Boolean).join(', ')}, ${ORDER_WORDS[sort]}.`;

    // the nearest decade that has films, for the end of a wall
    const nextDecade = oneDecade && facets.decade?.filter((d) => d.n > 0 && String(d.value) !== oneDecade)
        .sort((a, b) => Math.abs(a.value - oneDecade) - Math.abs(b.value - oneDecade) || b.value - a.value)[0];
    // a small wall: for each word, the films that miss only it, and a way to take it off
    // (the server's "years" is the board's span of years, on the decade's slot)
    const nearly = ready && !wall.failed && total < 12 ? (wall.nearly || []).map((o) => {
        const id = o.key === 'years' ? 'decade' : o.key;
        const said = chosen.find((c) => c.id === id);
        if (!said) return null;
        const onDrop = o.key === 'years' ? () => choose('since', '', { also: { until: '' } }) : () => drop(id);
        return { ...o, word: said.text, onDrop };
    }).filter(Boolean) : [];
    const known = start?.known?.slice(0, 3) || [];

    if (oldLink) return <Navigate to={`/explore?${oldLink.toString()}`} replace />;

    return (
        <div className="relative min-h-screen pt-36 md:pt-32 pb-32">
            <h1 className="sr-only">Explore the atlas</h1>
            <div className="max-w-7xl mx-auto px-4 md:px-14">
                {/* first, what you'd like to watch, in your own words (read by the AI into the board's words);
                    under it, the quick lookup of a title or name (the atlas's own data, never the AI) and the
                    projector; until you've chosen something once, a line for someone who knows no names yet */}
                <section aria-labelledby="ask" className="relative z-20 max-w-3xl mx-auto">
                    <h2 id="ask" className="text-center font-serif font-light text-[30px] md:text-[44px] leading-tight text-white">What do you want to watch?</h2>
                    <p className="mt-2.5 text-center text-[16px] md:text-[17px] text-gray-200">Describe it in your own words: a feeling, a place, a time, a person, what it’s about.</p>
                    <div className="mt-6 md:mt-7">
                        <DescribeBox value={described} onChange={setDescribed} onSubmit={askBoard} reading={reading?.state === 'reading'} examples={examples} quiet />
                    </div>
                    {reading && (reading.state === 'reading' || reading.state === 'offTopic') && (
                        <SearchNote reading={reading} onClose={() => setReading(null)} reducedMotion={reducedMotion} />
                    )}
                    <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                        <span className="flex-shrink-0 font-label text-[12.5px] md:text-[13px] tracking-[0.14em] uppercase text-gray-200">Or look up a title or name</span>
                        <div className="flex flex-1 min-w-0 items-stretch gap-2.5">
                            <div className="flex-1 min-w-0">
                                <SearchBox value={sel.q} start={start} onSearch={(q) => choose('q', q)} on={searchOn} compact />
                            </div>
                            {/* the projector picks a film at random (from what's showing) */}
                            <button type="button" onClick={() => setProjector(true)} title="Let the projector pick a film at random" className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-4 rounded-2xl ring-1 ring-gold/70 bg-gold/[0.1] text-gold-light font-label text-[12px] md:text-[12.5px] tracking-[0.14em] uppercase shadow-[0_0_18px_rgba(217,173,98,0.18)] hover:bg-gold hover:text-black hover:shadow-[0_0_30px_rgba(217,173,98,0.55)] transition-[background-color,color,box-shadow] duration-300">
                                <MdCasino aria-hidden="true" className="text-[1.15rem]" /> Random pick
                            </button>
                        </div>
                    </div>
                    {!any && !knowsTheWay && known.length > 0 && !reading && (
                        <p className="mt-4 text-[15.5px] md:text-[16px] leading-relaxed text-gray-300">
                            New here? Start from a film you know:{' '}
                            {known.map((f, i) => (
                                <span key={f._id}>
                                    {i > 0 && ' · '}
                                    <button type="button" onClick={() => choose('like', f._id, { up: true })} className="italic text-gray-100 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white transition-colors">{f.title}</button>
                                </span>
                            ))}
                        </p>
                    )}
                </section>

                {/* the board: what's showing, as the answer to a search (how it was read), every gold word changeable */}
                <div id="board" className="mt-10 md:mt-12 scroll-mt-24">
                    <Letterboard lines={lines} label={boardLabel} version={`${key}|${total}`} reducedMotion={reducedMotion} chosen={any} onReset={reset} />
                </div>

                {/* a search's note, right under the board: how it was read, what couldn't be used, the way out */}
                {searchShown && (
                    <SearchResults
                        reading={reading}
                        total={ready && !wall.failed ? total : null}
                        feelFailed={ready && wall.notes?.feelFailed}
                        sure={ready ? wall.notes?.feelSure || 0 : 0}
                        basis={ready ? wall.notes?.feelBasis : null}
                        onPlain={(q) => { setReading(null); choose('q', q); }}
                        onRetry={askBoard}
                        onClose={() => setReading(null)}
                        reducedMotion={reducedMotion}
                    />
                )}

                {/* the box of letters: the choices as pictures, open from the start */}
                {wall.facets && (
                    <div id="ways-in" className="scroll-mt-24">
                        {trayOpen ? (
                            <Tray sel={sel} tab={trayTab} onTab={setTrayTab} first={!any} total={ready && !wall.failed ? total : null} multi={MULTI} onShow={toWall} onHide={() => setTrayOpen(false)} titles={PICKER_TITLES} picker={pickerFor} />
                        ) : (
                            // folded: one bar of the tray's tabs, each opening it on that tab
                            <div className="mt-6 md:mt-8 flex flex-wrap items-center gap-2 px-4 md:px-5 py-3 rounded-2xl bg-[#0b0a09] ring-1 ring-white/10">
                                <span className="mr-1.5 font-label text-[11.5px] md:text-[12px] tracking-[0.16em] uppercase text-gold">Choose by</span>
                                {STEPS.map((s) => (
                                    <button key={s.id} type="button" onClick={() => openPicker(s.id)} className="rounded-full px-3 py-1.5 ring-1 ring-white/15 font-label text-[12px] md:text-[12.5px] tracking-[0.12em] uppercase text-gray-200 hover:ring-gold/60 hover:text-white hover:bg-gold/10 transition-colors">
                                        {s.tab}{sel[s.id] && <span aria-label=" (chosen)" className="ml-1.5 text-gold">•</span>}
                                    </button>
                                ))}
                                <button type="button" onClick={() => setTrayOpen(true)} aria-expanded="false" className="ml-auto inline-flex items-center gap-1.5 min-h-9 font-label text-[12px] md:text-[12.5px] tracking-[0.14em] uppercase text-gray-400 hover:text-white transition-colors">
                                    Show filters <span aria-hidden="true" className="text-gold">▾</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {ready && <Banner selected={wall.selected} />}
                {/* only the films viewers described that way: say so, and the way back to all of them */}
                {ready && wall.notes?.sureOnly && (
                    <p className="mt-10 text-center text-[15px] md:text-[16px] text-gray-300">
                        Only the {total === 1 ? 'film' : `${total} films`} viewers called {feelSaid}.{' '}
                        <button type="button" onClick={() => choose('sure', '')} className="font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold-light underline decoration-gold/40 underline-offset-4 hover:text-white">Show all of them again</button>
                    </p>
                )}

                {/* the foyer wall */}
                <div id="the-wall" className="scroll-mt-24" />
                {wall.key === null ? (
                    <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16" aria-hidden="true">
                        <div className="md:col-span-2 lg:row-span-2 aspect-video lobby-frame opacity-60" />
                        {Array.from({ length: 5 }, (_, i) => <div key={i} className="aspect-[16/10] lobby-frame opacity-60" />)}
                    </div>
                ) : ready && wall.failed ? (
                    <div className="mt-16">
                        <Intertitle still kicker="The projector stopped" title="The films couldn’t be reached">
                            <button type="button" onClick={() => setAttempt((a) => a + 1)} className="mt-6 px-5 py-2.5 font-label text-[13px] tracking-[0.14em] uppercase ring-1 ring-gold/60 text-gold-light hover:bg-gold hover:text-black transition-colors">
                                Try again
                            </button>
                        </Intertitle>
                    </div>
                ) : ready && total === 0 ? (
                    <div className="mt-16">
                        <Intertitle still kicker="Nothing showing" title={sel.q && chosen.length <= 1 ? `No film or name matches “${sel.q}”` : 'Nothing fits all of that'}>
                            {/* a word that names nothing may describe something: the board can read it */}
                            {sel.q && (
                                <button type="button" onClick={() => askBoard(sel.q)} className="mt-6 inline-flex items-center gap-2 min-h-11 px-5 bg-gold text-black font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase hover:bg-gold-light transition-colors">
                                    Find films that are “{sel.q}” <span aria-hidden="true">→</span>
                                </button>
                            )}
                            {nearly.length ? <p className="mt-4 text-gray-300">But some films come close: they miss one word.</p> : (
                                <>
                                    <p className="mt-4 text-gray-300">Take something down:</p>
                                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                                        {chosen.map((c) => (
                                            <button key={c.id} type="button" onClick={() => drop(c.id)} className="px-3 py-2 font-label text-[12px] tracking-[0.14em] uppercase ring-1 ring-white/20 text-gray-200 hover:ring-white/50 hover:text-white">
                                                − {c.text}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </Intertitle>
                        {nearly.length > 0 && <Nearly rows={nearly} empty reducedMotion={reducedMotion} />}
                    </div>
                ) : (
                    <div className={`mt-16 md:mt-20 transition-opacity duration-200 ${changing ? 'opacity-25' : ''}`}>
                        <FoyerWall
                            key={wall.key}
                            films={wall.films}
                            sort={sort}
                            plainCanon={sort === 'acclaimed' && !any}
                            decadeRanked={sort === 'acclaimed' && !!oneDecade && !sel.q}
                            decadeCounts={decadeCounts}
                            onDirector={onDirector}
                            onMovement={onMovement}
                            reducedMotion={reducedMotion}
                            split={feelSplit}
                            end={ready && !hasMore ? (
                                <Intertitle kicker={total === 1 ? 'That’s the one.' : `That’s all ${total}.`} title="The End">
                                    {nextDecade && (
                                        <button type="button" onClick={() => choose('decade', nextDecade.value, { up: true })} className="mt-5 font-label text-[13px] tracking-[0.14em] uppercase text-gray-200 hover:text-white">
                                            The {nextDecade.value}s{picked.country.length ? ` in ${countryText}` : ''}: {nextDecade.n} {nextDecade.n === 1 ? 'film' : 'films'} →
                                        </button>
                                    )}
                                </Intertitle>
                            ) : null}
                        />
                        {hasMore && <div ref={sentinel} className="h-px" aria-hidden="true" />}
                        {nearly.length > 0 && <Nearly rows={nearly} reducedMotion={reducedMotion} />}
                    </div>
                )}
            </div>
            {projector && <ProjectorPick query={pickQuery} onClose={closeProjector} />}
        </div>
    );
};

export default Explore;
