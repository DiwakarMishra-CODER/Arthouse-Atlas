import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useNavigationType, useSearchParams } from 'react-router-dom';
import { MdArrowBack, MdMovieFilter } from 'react-icons/md';
import { moviesAPI } from '../services/api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import Letterboard from '../components/explore/Letterboard';
import FoyerWall from '../components/explore/FoyerWall';
import Banner from '../components/explore/Banner';
import Intertitle from '../components/explore/Intertitle';
import SearchBox from '../components/explore/SearchBox';
import ProjectorPick from '../components/explore/ProjectorPick';
import { PickerPanel } from '../components/explore/pickers/parts';
import PlacePicker from '../components/explore/pickers/PlacePicker';
import TimePicker from '../components/explore/pickers/TimePicker';
import MakerPicker from '../components/explore/pickers/MakerPicker';
import MovementPicker from '../components/explore/pickers/MovementPicker';
import MoodPicker from '../components/explore/pickers/MoodPicker';
import GenrePicker from '../components/explore/pickers/GenrePicker';
import LengthPicker from '../components/explore/pickers/LengthPicker';
import OrderPicker from '../components/explore/pickers/OrderPicker';
import { LENGTH_WORDS } from '../components/explore/words';
import { usePageTitle } from '../hooks/usePageTitle';

/**
 * Explore: the cinema foyer.
 *
 * The letterboard says, in plain words, what's showing, and it is the only control: every
 * word you can change sits in a gold slot, dashed while it's a blank ("FROM [ANYWHERE]"),
 * lit once chosen; tap one to open its picker. Every choice is
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
const FILTERS = ['q', 'country', 'decade', 'director', 'movement', 'mood', 'genre', 'length', 'like', 'from'];
const MOODS = ['contemplative', 'melancholic', 'dreamlike', 'surreal', 'intimate', 'existential', 'psychological', 'minimalist', 'slow', 'austere', 'poetic', 'lyrical', 'enigmatic', 'fragmented', 'bleak'];
const PICKER_TITLES = {
    country: 'From where', decade: 'When it was made', director: 'Who made it', movement: 'Which movement',
    mood: 'How it feels', genre: 'What kind of film', length: 'How long', sort: 'In what order',
};
const ORDER_WORDS = { acclaimed: 'most acclaimed first', oldest: 'oldest first', newest: 'newest first', surprise: 'in a surprise order', closest: 'closest first' };

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

// what the board tries out, in turn, to show what its gold words do: two places, two kinds of film,
// two more places… Only words that fit in their blank, so nothing else on the board moves, and
// only words that change what's showing (not a kind most films are). Places are paired across the
// list (the most films with the fourth most, and so on), so the two in a turn are far apart.
const tryoutsFrom = (facets, total) => {
    const fit = (list, blank, words = (v) => v) => (list || [])
        .filter((o) => o.n > 0 && o.n <= total / 2 + 100 && words(o.value).length <= blank.length)
        .sort((a, b) => b.n - a.n)
        .map((o) => ({ text: words(o.value), n: o.n }));
    const places = fit(facets.country, 'anywhere', countryWords);
    const kinds = fit(facets.genre, 'genre').filter((o) => o.n <= total / 2);
    const pairs = (list) => {
        const out = [];
        for (let i = 0; i + 3 < list.length && out.length < 3; i++) out.push([list[i], list[i + 3]]);
        if (!out.length && list.length >= 2) out.push([list[0], list[1]]);
        return out;
    };
    const p = pairs(places);
    const k = kinds.length >= 2 ? [[kinds[0], kinds[1]]] : [];
    const out = [];
    for (let i = 0; i < Math.max(p.length, k.length); i++) {
        if (p[i]) out.push({ id: 'country', picks: p[i] });
        if (k[i]) out.push({ id: 'genre', picks: k[i] });
    }
    return out;
};
// a turn of the board: the board as it is, then the first word tried, then the second (ms)
const TRY_REST = 2400;
const TRY_HOLD = 1400;

// a new shuffle (kept in the URL, so the same shuffle comes back with Back)
const newSeed = () => String(Math.floor(Math.random() * 1e9));

const readNote = (key) => {
    try { return JSON.parse(sessionStorage.getItem(`explore:${key}`) || 'null'); } catch { return null; }
};

// the address keeps only what differs from the default order (closest when the wall starts from a film)
const tidyOrder = (next) => {
    const started = next.has('like') || next.has('from');
    const sort = next.get('sort');
    if ((sort === 'closest' && started) || (sort === 'acclaimed' && !started) || (sort === 'closest' && !started)) next.delete('sort');
    if (sort !== 'surprise' && next.get('sort') !== 'surprise') next.delete('seed');
    return next;
};

const Explore = () => {
    const [params, setParams] = useSearchParams();
    const navigation = useNavigationType();
    const location = useLocation();
    const navigate = useNavigate();
    // back to wherever you came from (or home, when Explore is where you arrived)
    const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/'));
    const reducedMotion = useMotionPreference();
    usePageTitle('Explore the films', 'Every film in the atlas, in canon order: narrow it by movement, decade, country, length, genre, mood or director, or start from a film you love.');
    const oldLink = fromOldLink(params);

    const sel = useMemo(() => Object.fromEntries([...FILTERS, 'sort', 'seed'].map((k) => [k, params.get(k) || ''])), [params]);
    const started = Boolean(sel.like || sel.from);
    const sort = sel.sort || (started ? 'closest' : 'acclaimed');
    const query = useMemo(() => Object.fromEntries(Object.entries(sel).filter(([, v]) => v)), [sel]);
    const key = useMemo(() => new URLSearchParams(query).toString(), [query]);
    // what the projector picks from: what's showing, in any order
    const pickQuery = useMemo(() => {
        const { sort: _sort, seed: _seed, ...rest } = query;
        return rest;
    }, [query]);

    const [wall, setWall] = useState({ key: null, films: [], total: 0, facets: null, selected: {}, notes: null });
    const [picker, setPicker] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [start, setStart] = useState(null);
    const [projector, setProjector] = useState(false);
    // the line for newcomers shows until you've chosen something once (remembered on this device)
    const [knowsTheWay, setKnowsTheWay] = useState(() => {
        try { return localStorage.getItem('explore:knows-the-way') === '1'; } catch { return false; }
    });
    // until a word has been opened, the board tries its gold words out by itself (see tryoutsFrom),
    // while it's on screen and nobody's hand is on it
    const [beat, setBeat] = useState(0);
    const [held, setHeld] = useState(false);
    const [boardSeen, setBoardSeen] = useState(true);
    const [opened, setOpened] = useState(false);
    const board = useRef(null);
    const restoreY = useRef(null);
    const sentinel = useRef(null);
    const restoring = navigation === 'POP';
    const openPicker = useCallback((id) => { setPicker(id); setOpened(true); }, []);

    useEffect(() => {
        const el = board.current;
        if (!el) return undefined;
        const io = new IntersectionObserver(([entry]) => setBoardSeen(entry.isIntersecting), { threshold: 0.5 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

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
        moviesAPI.explore({ ...query, page: 1, limit })
            .then((r) => {
                if (gone) return;
                restoreY.current = note ? note.y : null;
                setWall({ key, films: r.data.films, total: r.data.total, facets: r.data.facets, selected: r.data.selected || {}, notes: r.data.notes });
            })
            .catch(() => { if (!gone) setWall((w) => ({ ...w, key, films: [], total: 0, facets: w.facets, failed: true })); });
        return () => { gone = true; };
    }, [key, query, restoring, oldLink, attempt]);

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
        moviesAPI.explore({ ...query, page, limit: PAGE, facets: '0' })
            .then((r) => setWall((w) => {
                if (w.key !== key) return w;
                const have = new Set(w.films.map((f) => f._id));
                return { ...w, films: [...w.films, ...r.data.films.filter((f) => !have.has(f._id))] };
            }))
            .catch(() => {})
            .finally(() => setLoadingMore(false));
    }, [loadingMore, wall.films.length, query, key]);
    useEffect(() => {
        if (!hasMore || !sentinel.current) return undefined;
        const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) loadMore(); }, { rootMargin: '1200px 0px' });
        io.observe(sentinel.current);
        return () => io.disconnect();
    }, [hasMore, loadMore]);

    // Esc closes a picker
    useEffect(() => {
        if (!picker) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') setPicker(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [picker]);

    // change one word on the board (from a card, also go back up to the board to see it change)
    const choose = useCallback((k, v, { up = false } = {}) => {
        const next = new URLSearchParams(params);
        if (v === '' || v === null || v === undefined) next.delete(k);
        else next.set(k, String(v));
        if (k === 'sort' && v === 'surprise') next.set('seed', newSeed());
        // a film to start from replaces the search, the other film, and the order
        if ((k === 'like' || k === 'from') && v) {
            next.delete(k === 'like' ? 'from' : 'like');
            ['q', 'sort', 'seed'].forEach((p) => next.delete(p));
        }
        // choosing "most acclaimed" on a wall that starts from a film has to say so (its default is closest)
        if (k === 'sort' && v === 'acclaimed' && (next.has('like') || next.has('from'))) { next.set('sort', 'acclaimed'); next.delete('seed'); }
        else tidyOrder(next);
        setParams(next);
        setPicker(null);
        if (!knowsTheWay) {
            setKnowsTheWay(true);
            try { localStorage.setItem('explore:knows-the-way', '1'); } catch { /* storage blocked: it just shows again next time */ }
        }
        if (up) window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    }, [params, setParams, reducedMotion, knowsTheWay]);
    const reset = () => { setParams(new URLSearchParams()); setPicker(null); };
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
    }), [choose]);
    const closeProjector = useCallback(() => setProjector(false), []);
    const decadeCounts = useMemo(() => new Map((facets.decade || []).map((d) => [d.value, d.n])), [facets.decade]);

    // ---- the board's words: plain words in white, and what you can change in gold slots ----
    // (dashed while a blank to fill, lit once chosen)
    const ready = wall.key === key;
    const changing = wall.key !== null && !ready;
    const movementTitle = wall.selected.movement?.title || facets.movement?.find((m) => m.tag === sel.movement)?.value || sel.movement;
    const startTitle = wall.selected.start?.title;
    const directorName = wall.selected.director?.name || sel.director;
    const any = FILTERS.some((k) => sel[k]);
    const total = wall.total;
    const word = (id, text) => ({ id, text });
    const control = (id, text, label, extra = {}) => ({ id, text, control: true, label, onClick: () => openPicker(id), onRemove: () => choose(id, ''), ...extra });
    const blank = (id, text, label) => ({ id, text, control: true, blank: true, label, onClick: () => openPicker(id) });

    // the word the board is trying out just now, and what would be showing with it
    const tryouts = useMemo(() => (wall.facets?.country ? tryoutsFrom(wall.facets, total) : []), [wall.facets, total]);
    const trying = !reducedMotion && ready && !wall.failed && !any && !knowsTheWay && !opened && !picker && !held && boardSeen && tryouts.length > 0;
    const turn = tryouts.length ? tryouts[Math.floor(beat / 3) % tryouts.length] : null;
    const tryout = trying && beat % 3 > 0 ? { id: turn.id, ...turn.picks[(beat % 3) - 1] } : null;
    const tried = (id, text) => (tryout?.id === id ? text : undefined);
    useEffect(() => {
        if (!trying) return undefined;
        const t = setTimeout(() => setBeat((b) => b + 1), beat % 3 === 0 ? TRY_REST : TRY_HOLD);
        return () => clearTimeout(t);
    }, [trying, beat]);

    const countText = wall.key === null || wall.failed ? '· · ·' : !any ? `all ${total} films` : `${total} ${total === 1 ? 'film' : 'films'}`;
    const big = [{ ...word('count', countText), tryout: tryout && `${tryout.n} ${tryout.n === 1 ? 'film' : 'films'}` }];
    if (sel.q) big.push(word('q-w', 'matching'), control('q', `“${sel.q}”`, `Search: ${sel.q}`, { onClick: focusSearch }));
    if (started) big.push(word('like-w', 'like'), control(sel.like ? 'like' : 'from', startTitle || '…', `Starting from ${startTitle || 'a film'}`, { onClick: focusSearch }));
    const medium = [
        word('country-w', 'from'),
        sel.country ? control('country', countryWords(sel.country), `Country: ${sel.country}`) : { ...blank('country', 'anywhere', 'Country: anywhere'), tryout: tried('country', tryout?.text) },
        ...(sel.decade
            ? [word('decade-w', 'made in the'), control('decade', `${sel.decade}s`, `Decade: the ${sel.decade}s`)]
            : [word('decade-w', 'made'), blank('decade', 'any time', 'Decade: any time')]),
        word('director-w', 'by'),
        sel.director ? control('director', directorName, `Director: ${directorName}`) : blank('director', 'anyone', 'Director: anyone'),
    ];
    const list = [
        sel.movement ? control('movement', movementTitle, `Movement: ${movementTitle}`) : blank('movement', 'movement', 'Movement: any'),
        sel.mood ? control('mood', sel.mood, `Mood: ${sel.mood}`) : blank('mood', 'mood', 'Mood: any'),
        sel.genre ? control('genre', sel.genre, `Genre: ${sel.genre}`) : { ...blank('genre', 'genre', 'Genre: any'), tryout: tried('genre', tryout?.text) },
        sel.length ? control('length', LENGTH_WORDS[sel.length] || sel.length, `Length: ${LENGTH_WORDS[sel.length]}`) : blank('length', 'length', 'Length: any'),
    ];
    const lines = [
        { size: 'small', phrases: [{ id: 'now', text: ready && !wall.failed && total === 0 ? 'Nothing showing' : 'Now showing' }] },
        { size: 'big', phrases: big },
        { size: 'medium', phrases: medium },
        { size: 'list', phrases: list },
        { size: 'sort', phrases: [control('sort', ORDER_WORDS[sort], `Order: ${ORDER_WORDS[sort]}`, { onRemove: null })] },
    ];
    // what's chosen, in words: the board's label for screen readers, and the empty wall's ways out
    const chosen = [
        sel.q && { id: 'q', text: `matching “${sel.q}”` },
        started && { id: sel.like ? 'like' : 'from', text: `like ${startTitle || 'that film'}` },
        sel.country && { id: 'country', text: `from ${countryWords(sel.country)}` },
        sel.decade && { id: 'decade', text: `made in the ${sel.decade}s` },
        sel.director && { id: 'director', text: `by ${directorName}` },
        sel.movement && { id: 'movement', text: movementTitle },
        sel.mood && { id: 'mood', text: sel.mood },
        sel.genre && { id: 'genre', text: sel.genre },
        sel.length && { id: 'length', text: LENGTH_WORDS[sel.length] },
    ].filter(Boolean);
    const boardLabel = `Now showing: ${[countText, ...chosen.map((c) => c.text)].join(', ')}, ${ORDER_WORDS[sort]}.`;

    // the nearest decade that has films, for the end of a wall
    const nextDecade = sel.decade && facets.decade?.filter((d) => d.n > 0 && String(d.value) !== sel.decade)
        .sort((a, b) => Math.abs(a.value - sel.decade) - Math.abs(b.value - sel.decade) || b.value - a.value)[0];
    const known = start?.known?.slice(0, 3) || [];

    if (oldLink) return <Navigate to={`/explore?${oldLink.toString()}`} replace />;

    return (
        <div className="relative min-h-screen pt-36 md:pt-32 pb-32">
            <h1 className="sr-only">Explore the atlas</h1>
            <button type="button" onClick={goBack} className="font-label absolute top-24 left-4 md:left-10 z-20 flex items-center gap-2 text-xs tracking-[0.14em] uppercase text-gray-300 hover:text-white transition-colors">
                <MdArrowBack aria-hidden="true" /> Back
            </button>
            <div className="max-w-7xl mx-auto px-4 md:px-14">
                {/* a hand on the board (or the keyboard in it) stops it trying words out */}
                <div
                    ref={board}
                    onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHeld(true); }}
                    onPointerLeave={() => setHeld(false)}
                    onFocus={() => setHeld(true)}
                    onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false); }}
                >
                    <Letterboard lines={lines} label={boardLabel} version={`${key}|${total}|${beat}`} reducedMotion={reducedMotion} chosen={any} onReset={reset} />
                </div>

                {/* ask for anything, or let the projector choose; and, until you've chosen something
                    once, a line for someone who knows no names yet */}
                <div className="mt-8 md:mt-10 max-w-3xl mx-auto">
                    <div className="flex items-end gap-3 md:gap-5">
                        <div className="flex-1 min-w-0">
                            <SearchBox value={sel.q} start={start} onSearch={(q) => choose('q', q)} on={searchOn} />
                        </div>
                        <button type="button" onClick={() => setProjector(true)} className="flex-shrink-0 mb-1 inline-flex items-center gap-2 px-3 md:px-4 py-2.5 ring-1 ring-gold/50 text-gold font-label text-[12px] tracking-[0.14em] uppercase hover:bg-gold hover:text-black transition-colors">
                            <MdMovieFilter aria-hidden="true" className="text-base" /> <span className="hidden sm:inline">Pick one for me</span><span className="sm:hidden">Pick one</span>
                        </button>
                    </div>
                    {!any && !knowsTheWay && known.length > 0 && (
                        <p className="mt-4 text-[16px] leading-relaxed text-gray-400">
                            New here? Start from a film you know:{' '}
                            {known.map((f, i) => (
                                <span key={f._id}>
                                    {i > 0 && ' · '}
                                    <button type="button" onClick={() => choose('like', f._id, { up: true })} className="italic text-gray-100 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white transition-colors">{f.title}</button>
                                </span>
                            ))}
                        </p>
                    )}
                </div>

                {picker && wall.facets && (
                    <PickerPanel title={PICKER_TITLES[picker] || ''} onClose={() => setPicker(null)}>
                        {picker === 'country' && <PlacePicker options={facets.country} value={sel.country} onPick={(v) => choose('country', v)} />}
                        {picker === 'decade' && <TimePicker options={facets.decade} value={sel.decade} onPick={(v) => choose('decade', v)} />}
                        {picker === 'director' && <MakerPicker options={facets.director} value={sel.director} onPick={(v) => choose('director', v)} />}
                        {picker === 'movement' && <MovementPicker options={facets.movement} value={sel.movement} onPick={(v) => choose('movement', v)} />}
                        {picker === 'mood' && <MoodPicker options={facets.mood} value={sel.mood} onPick={(v) => choose('mood', v)} notes={wall.notes?.moodFilms} />}
                        {picker === 'genre' && <GenrePicker options={facets.genre} value={sel.genre} onPick={(v) => choose('genre', v)} />}
                        {picker === 'length' && <LengthPicker options={facets.length} value={sel.length} onPick={(v) => choose('length', v)} />}
                        {picker === 'sort' && <OrderPicker value={sort} started={started} onPick={(v) => choose('sort', v)} />}
                    </PickerPanel>
                )}

                {ready && <Banner selected={wall.selected} />}

                {/* the foyer wall */}
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
                        <Intertitle still kicker="Nothing showing" title="Nothing fits all of that">
                            <p className="mt-4 text-gray-300">Take something down:</p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                {chosen.map((c) => (
                                    <button key={c.id} type="button" onClick={() => choose(c.id, '')} className="px-3 py-2 font-label text-[12px] tracking-[0.14em] uppercase ring-1 ring-white/20 text-gray-200 hover:ring-white/50 hover:text-white">
                                        − {c.text}
                                    </button>
                                ))}
                            </div>
                        </Intertitle>
                    </div>
                ) : (
                    <div className={`mt-16 md:mt-20 transition-opacity duration-200 ${changing ? 'opacity-25' : ''}`}>
                        <FoyerWall
                            key={wall.key}
                            films={wall.films}
                            sort={sort}
                            plainCanon={sort === 'acclaimed' && !any}
                            decadeCounts={decadeCounts}
                            onDirector={onDirector}
                            onMovement={onMovement}
                            reducedMotion={reducedMotion}
                            end={ready && !hasMore ? (
                                <Intertitle kicker={total === 1 ? 'That’s the one.' : `That’s all ${total}.`} title="The End">
                                    {nextDecade && (
                                        <button type="button" onClick={() => choose('decade', nextDecade.value, { up: true })} className="mt-5 font-label text-[13px] tracking-[0.14em] uppercase text-gray-200 hover:text-white">
                                            The {nextDecade.value}s{sel.country ? ` in ${countryWords(sel.country)}` : ''}: {nextDecade.n} {nextDecade.n === 1 ? 'film' : 'films'} →
                                        </button>
                                    )}
                                </Intertitle>
                            ) : null}
                        />
                        {hasMore && <div ref={sentinel} className="h-px" aria-hidden="true" />}
                    </div>
                )}
            </div>
            {projector && <ProjectorPick query={pickQuery} onClose={closeProjector} />}
        </div>
    );
};

export default Explore;
