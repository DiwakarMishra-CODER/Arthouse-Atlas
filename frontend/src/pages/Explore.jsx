import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigationType, useSearchParams } from 'react-router-dom';
import { moviesAPI } from '../services/api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import Letterboard from '../components/explore/Letterboard';
import LobbyCard from '../components/explore/LobbyCard';
import ArtistCredits from '../components/explore/ArtistCredits';
import SearchBox from '../components/explore/SearchBox';
import {
    PickerPanel, CountryPicker, DecadePicker, DirectorPicker, MovementPicker, MoodPicker, GenrePicker, LengthPicker, SortPicker,
} from '../components/explore/Pickers';
import { LENGTH_WORDS } from '../components/explore/words';

/**
 * Explore: the cinema foyer.
 *
 * A letterboard says, in plain words, what's showing ("NOW SHOWING · 23 FILMS FROM
 * JAPAN, MADE IN THE 1950s · MOST ACCLAIMED FIRST"); its gold words are the
 * filters, and the plain buttons under it add more. Below, the films hang as lobby
 * cards, each crediting who made it. The canon's order is the default.
 *
 * The URL is the selection, so a wall can be shared and Back steps through your
 * choices. Coming back from a film lands on the same wall at the same place: the
 * page notes how many cards were loaded and where you were, per selection.
 */

const PAGE = 24;
const FILTERS = ['q', 'country', 'decade', 'director', 'movement', 'mood', 'genre', 'length'];
const MOODS = ['contemplative', 'melancholic', 'dreamlike', 'surreal', 'intimate', 'existential', 'psychological', 'minimalist', 'slow', 'austere', 'poetic', 'lyrical', 'enigmatic', 'fragmented', 'bleak'];
const ADDABLE = [['country', 'Country'], ['decade', 'Decade'], ['director', 'Director'], ['movement', 'Movement'], ['mood', 'Mood'], ['genre', 'Genre'], ['length', 'Length']];
const PICKER_TITLES = {
    country: 'From where', decade: 'When it was made', director: 'Who made it', movement: 'Which movement',
    mood: 'How it feels', genre: 'What kind of film', length: 'How long', sort: 'In what order',
};
const ORDER_WORDS = { acclaimed: 'most acclaimed first', oldest: 'oldest first', newest: 'newest first', surprise: 'in a surprise order' };

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

// a new shuffle (kept in the URL, so the same shuffle comes back with Back)
const newSeed = () => String(Math.floor(Math.random() * 1e9));

const readNote = (key) => {
    try { return JSON.parse(sessionStorage.getItem(`explore:${key}`) || 'null'); } catch { return null; }
};

const Explore = () => {
    const [params, setParams] = useSearchParams();
    const navigation = useNavigationType();
    const reducedMotion = useMotionPreference();
    const oldLink = fromOldLink(params);

    const sel = useMemo(() => Object.fromEntries([...FILTERS, 'sort', 'seed'].map((k) => [k, params.get(k) || ''])), [params]);
    const sort = sel.sort || 'acclaimed';
    const query = useMemo(() => Object.fromEntries(Object.entries(sel).filter(([, v]) => v)), [sel]);
    const key = useMemo(() => new URLSearchParams(query).toString(), [query]);

    const [wall, setWall] = useState({ key: null, films: [], total: 0, facets: null, selected: {}, notes: null });
    const [picker, setPicker] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const restoreY = useRef(null);
    const sentinel = useRef(null);
    const restoring = navigation === 'POP';

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
        const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) loadMore(); }, { rootMargin: '900px 0px' });
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
    const choose = (k, v, { up = false } = {}) => {
        const next = new URLSearchParams(params);
        if (v === '' || v === null || v === undefined) next.delete(k);
        else next.set(k, String(v));
        if (k === 'sort') {
            if (v === 'surprise') next.set('seed', newSeed());
            else next.delete('seed');
            if (v === 'acclaimed') next.delete('sort');
        }
        setParams(next);
        setPicker(null);
        if (up) window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    };
    const reset = () => { setParams(new URLSearchParams()); setPicker(null); };

    // ---- the board's words ----
    const ready = wall.key === key;
    const changing = wall.key !== null && !ready;
    const facets = wall.facets || {};
    const movementTitle = wall.selected.movement?.title || facets.movement?.find((m) => m.tag === sel.movement)?.title || facets.movement?.find((m) => m.tag === sel.movement)?.value || sel.movement;
    const any = FILTERS.some((k) => sel[k]);
    const total = wall.total;
    const control = (id, text, label, extra = {}) => ({ id, text, control: true, label, onClick: () => setPicker(id), onRemove: () => choose(id, ''), ...extra });
    const sentence = [{ id: 'count', text: wall.key === null || wall.failed ? '· · ·' : !any ? `all ${total} films` : `${total} ${total === 1 ? 'film' : 'films'}` }];
    if (sel.country) sentence.push(control('country', `from ${countryWords(sel.country)}`, `Country: ${sel.country}`));
    if (sel.decade) sentence.push(control('decade', `made in the ${sel.decade}s`, `Decade: the ${sel.decade}s`));
    if (sel.director) sentence.push(control('director', `by ${wall.selected.director?.name || sel.director}`, `Director: ${sel.director}`));
    if (sel.q) sentence.push(control('q', `matching “${sel.q}”`, `Search: ${sel.q}`, { onClick: () => document.getElementById('explore-search')?.focus() }));
    const listed = [
        sel.movement && control('movement', movementTitle, `Movement: ${movementTitle}`),
        sel.mood && control('mood', sel.mood, `Mood: ${sel.mood}`),
        sel.genre && control('genre', sel.genre, `Genre: ${sel.genre}`),
        sel.length && control('length', LENGTH_WORDS[sel.length] || sel.length, `Length: ${LENGTH_WORDS[sel.length]}`),
    ].filter(Boolean).flatMap((p, i) => (i ? [{ id: `dot${i}`, text: '·' }, p] : [p]));
    const lines = [
        { size: 'small', phrases: [{ id: 'now', text: ready && !wall.failed && total === 0 ? 'Nothing showing' : 'Now showing' }] },
        { size: 'big', phrases: sentence },
        ...(listed.length ? [{ size: 'medium', phrases: listed }] : []),
        { size: 'sort', phrases: [control('sort', ORDER_WORDS[sort], `Order: ${ORDER_WORDS[sort]}`, { onRemove: null })] },
    ];
    const boardLabel = `Now showing: ${[sentence, listed].flat().map((p) => p.text).filter((t) => t !== '·').join(', ')}, ${ORDER_WORDS[sort]}.`;

    // the nearest decade that has films, for the end of a wall
    const nextDecade = sel.decade && facets.decade?.filter((d) => d.n > 0 && String(d.value) !== sel.decade)
        .sort((a, b) => Math.abs(a.value - sel.decade) - Math.abs(b.value - sel.decade) || b.value - a.value)[0];

    if (oldLink) return <Navigate to={`/explore?${oldLink.toString()}`} replace />;

    return (
        <div className="min-h-screen pt-28 md:pt-32 pb-32">
            <h1 className="sr-only">Explore the atlas</h1>
            <div className="max-w-7xl mx-auto px-4 md:px-14">
                <Letterboard lines={lines} label={boardLabel} version={`${key}|${total}`} reducedMotion={reducedMotion} />

                {/* more to put on the board, and the search */}
                <div className="mt-6 md:mt-8 flex flex-col-reverse md:flex-row md:items-center gap-4 md:gap-6">
                    <div className="flex flex-wrap items-center gap-2">
                        {ADDABLE.filter(([k]) => !sel[k]).map(([k, label]) => (
                            <button key={k} type="button" onClick={() => setPicker(picker === k ? null : k)} aria-expanded={picker === k} className={`px-3 py-2 font-mono text-[11px] tracking-[0.18em] uppercase ring-1 transition-colors ${picker === k ? 'ring-[#e2b866] text-[#f6d796]' : 'ring-white/15 text-gray-300 hover:ring-white/40 hover:text-white'}`}>
                                + {label}
                            </button>
                        ))}
                        {any && (
                            <button type="button" onClick={reset} className="px-2 py-2 font-mono text-[11px] tracking-[0.18em] uppercase text-gray-500 hover:text-white">Show everything</button>
                        )}
                    </div>
                    <div className="md:ml-auto">
                        <SearchBox value={sel.q} onSearch={(q) => choose('q', q)} onDirector={(d) => choose('director', d)} />
                    </div>
                </div>

                {picker && wall.facets && (
                    <PickerPanel title={PICKER_TITLES[picker] || ''} onClose={() => setPicker(null)}>
                        {picker === 'country' && <CountryPicker options={facets.country} value={sel.country} onPick={(v) => choose('country', v)} />}
                        {picker === 'decade' && <DecadePicker options={facets.decade} value={sel.decade} onPick={(v) => choose('decade', v)} />}
                        {picker === 'director' && <DirectorPicker options={facets.director} value={sel.director} onPick={(v) => choose('director', v)} />}
                        {picker === 'movement' && <MovementPicker options={facets.movement} value={sel.movement} onPick={(v) => choose('movement', v)} />}
                        {picker === 'mood' && <MoodPicker options={facets.mood} value={sel.mood} onPick={(v) => choose('mood', v)} notes={wall.notes?.moodFilms} />}
                        {picker === 'genre' && <GenrePicker options={facets.genre} value={sel.genre} onPick={(v) => choose('genre', v)} />}
                        {picker === 'length' && <LengthPicker options={facets.length} value={sel.length} onPick={(v) => choose('length', v)} />}
                        {picker === 'sort' && <SortPicker value={sort} onPick={(v) => choose('sort', v)} />}
                    </PickerPanel>
                )}

                {ready && <ArtistCredits director={wall.selected.director} movement={wall.selected.movement} />}

                {/* the lobby wall */}
                {wall.key === null ? (
                    <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12" aria-hidden="true">
                        {Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-video bg-white/[0.03] ring-1 ring-white/5" />)}
                    </div>
                ) : ready && wall.failed ? (
                    <div className="mt-14 text-center">
                        <p className="font-serif text-2xl md:text-3xl text-gray-200">The films couldn’t be reached just now.</p>
                        <button type="button" onClick={() => setAttempt((a) => a + 1)} className="mt-5 px-4 py-2.5 font-mono text-[11px] tracking-[0.2em] uppercase ring-1 ring-[#e2b866]/60 text-[#f6d796] hover:bg-[#e2b866] hover:text-black transition-colors">
                            Try again
                        </button>
                    </div>
                ) : ready && total === 0 ? (
                    <div className="mt-14 text-center">
                        <p className="font-serif text-2xl md:text-3xl text-gray-200">Nothing fits all of that.</p>
                        <p className="mt-2 text-gray-400">Take something down:</p>
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                            {[...sentence, ...listed].filter((p) => p.control).map((p) => (
                                <button key={p.id} type="button" onClick={() => choose(p.id, '')} className="px-3 py-2 font-mono text-[11px] tracking-[0.18em] uppercase ring-1 ring-white/15 text-gray-300 hover:ring-white/40 hover:text-white">
                                    − {p.text}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        <div key={wall.key} className={`mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12 transition-opacity duration-200 ${changing ? 'opacity-25' : ''}`}>
                            {wall.films.map((film, i) => (
                                <LobbyCard
                                    key={film._id}
                                    film={film}
                                    index={reducedMotion ? 0 : i % PAGE}
                                    onDirector={(d) => choose('director', d, { up: true })}
                                    onMovement={(m) => choose('movement', facets.movement?.find((x) => x.value === m)?.tag || m, { up: true })}
                                />
                            ))}
                        </div>
                        {hasMore && <div ref={sentinel} className="h-px" aria-hidden="true" />}
                        {ready && !hasMore && (
                            <div className="mt-16 text-center font-mono text-[11px] tracking-[0.25em] uppercase text-gray-500">
                                {total === 1 ? 'That’s the one.' : `That’s all ${total}.`}
                                {nextDecade && (
                                    <button type="button" onClick={() => choose('decade', nextDecade.value, { up: true })} className="block mx-auto mt-3 text-gray-300 hover:text-white">
                                        The {nextDecade.value}s{sel.country ? ` in ${countryWords(sel.country)}` : ''}: {nextDecade.n} {nextDecade.n === 1 ? 'film' : 'films'} →
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Explore;
