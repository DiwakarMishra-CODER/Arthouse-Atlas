import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';
import { userAPI, recsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMovie } from '../context/MovieContext';
import { useMotionPreference } from '../hooks/useMotionPreference';
import TheScreen from '../components/foryou/TheScreen';
import ColdScreen from '../components/foryou/ColdScreen';
import FocusReel from '../components/foryou/FocusReel';
import QuickRate from '../components/foryou/QuickRate';
import { sized } from '../components/movements/treatments';
import { usePageTitle } from '../hooks/usePageTitle';

/**
 * For You: the focus puller's monitor. The room is seen through a lens, and the lens is your
 * taste: a film you loved stands sharp in the foreground with your pick far behind it; the
 * focus ring turns from one film's tape mark to the other's, focus racks from near to far and
 * the camera dollies in until the pick fills the screen, with why it was picked in plain words
 * (whose fans loved it, and how many of them; the same director; the same movement). Below,
 * every pick on reels with a shallow depth of field, one reel for each film of yours that led
 * to them; the films it's working from; and films most people have seen, to sharpen it.
 *
 * Someone it knows nothing about starts with the screen out of focus and a deck of films most
 * people have seen: three "loved it"s and it pulls focus onto their first pick. It works signed
 * out (ratings stay in the browser and travel with each request) and keeps them on sign-in.
 */

const HOW = { loved: 'Loved', watched: 'Watched · counts half', watchlist: 'On your watchlist · counts half' };

const ForYou = () => {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { ratings, setMovieRating, notFor, toggleNotFor, isInWatchlist, toggleWatchlist } = useMovie();
    const reducedMotion = useMotionPreference();
    usePageTitle('For you', 'Films picked for you from the ones you loved, learned from 32 million ratings by real viewers.');
    const location = useLocation();
    const navigate = useNavigate();
    const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/'));

    const [data, setData] = useState({ ready: false, recommendations: [], basedOn: { films: [] } });
    const [failed, setFailed] = useState(false);
    const [nonce, setNonce] = useState(0);
    const [starters, setStarters] = useState([]);
    const [skipped, setSkipped] = useState([]);
    // each visit picks up the screen one pick on from where the last visit left it (the screen
    // remembers where it was)
    const [firstShot] = useState(() => {
        try { return (Number(localStorage.getItem('foryou:shot')) || 0) + 1; } catch { return 0; }
    });
    const [startedCold, setStartedCold] = useState(false);

    // signed out, the engine is told your ratings and set-asides with every request
    const previewBody = useMemo(
        () => (isAuthenticated ? null : { ratings: ratings.map((r) => ({ id: r.id, value: r.rating })), notFor }),
        [isAuthenticated, ratings, notFor],
    );

    useEffect(() => {
        if (authLoading) return undefined;
        let gone = false;
        const t = setTimeout(() => {
            (previewBody ? recsAPI.preview(previewBody) : userAPI.getRecommendations())
                .then((r) => {
                    if (gone) return;
                    const basedOn = r.data.basedOn || { films: [] };
                    setData({ ready: true, recommendations: r.data.recommendations || [], basedOn });
                    if (!basedOn.films?.length) setStartedCold(true);
                    setFailed(false);
                })
                .catch(() => { if (!gone) setFailed(true); });
        }, previewBody ? 250 : 0);
        return () => { gone = true; clearTimeout(t); };
    }, [authLoading, previewBody, nonce]);

    useEffect(() => {
        let gone = false;
        recsAPI.starters().then((r) => { if (!gone) setStarters(r.data.starters || []); }).catch(() => {});
        return () => { gone = true; };
    }, []);

    // what you can do with a pick; signed in, the account answers, so ask again once it has
    const refresh = () => setNonce((n) => n + 1);
    const act = {
        canList: isAuthenticated,
        listed: (id) => isInWatchlist(id),
        watchlist: (film) => toggleWatchlist(film),
        rate: async (film, n) => { await setMovieRating(film, n); if (isAuthenticated) refresh(); },
        notFor: async (film) => { await toggleNotFor(film); if (isAuthenticated) refresh(); },
    };

    const picks = data.recommendations;
    const loved = ratings.filter((r) => r.rating >= 4);
    const cold = data.ready && (!data.basedOn.films?.length || (startedCold && loved.length < 3));
    const deck = starters.filter((f) => !ratings.some((r) => r.id === f._id) && !notFor.includes(f._id) && !skipped.includes(f._id));
    const skip = (f) => setSkipped((s) => [...s, f._id]);
    const lovedFilm = loved[loved.length - 1]?.movie;
    const lovedTitles = loved.map((r) => r.movie?.title).filter(Boolean);
    // the deep, out-of-focus shot a newcomer starts with: three of the deck's films, as light
    const deckStills = deck.slice(0, 3).map((f) => f.still).filter(Boolean);

    // every pick, gathered under the film of yours that led to it
    const groups = [];
    const groupOf = new Map();
    picks.forEach((p) => {
        const k = p.because?.film?._id || 'canon';
        if (!groupOf.has(k)) {
            const g = { key: k, seed: p.because?.film || null, how: p.because?.how, picks: [] };
            groupOf.set(k, g);
            groups.push(g);
        }
        groupOf.get(k).picks.push(p);
    });

    return (
        <div className="own-transitions relative min-h-screen pt-36 md:pt-32 pb-32">
            <h1 className="sr-only">For you: films picked from the ones you loved</h1>
            <button type="button" onClick={goBack} className="font-label absolute top-24 left-4 md:left-10 z-20 flex items-center gap-2 text-xs tracking-[0.14em] uppercase text-gray-300 hover:text-white transition-colors">
                <MdArrowBack aria-hidden="true" /> Back
            </button>
            <div className="max-w-6xl mx-auto px-4 md:px-10">
                {failed && !data.ready ? (
                    <div className="py-24 text-center">
                        <p className="font-serif text-3xl text-gray-100">The lens wouldn’t focus just now.</p>
                        <button type="button" onClick={refresh} className="mt-6 px-5 py-2.5 ring-1 ring-gold/60 text-gold-light font-label text-[13px] tracking-[0.14em] uppercase hover:bg-gold hover:text-black transition-colors">Try again</button>
                    </div>
                ) : !data.ready ? (
                    <div aria-busy="true" className="aspect-[4/5] sm:aspect-video lg:aspect-[2.39/1] ring-1 ring-white/10 bg-[#0d0c0b] flex items-center justify-center">
                        <span className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">Finding your films…</span>
                    </div>
                ) : cold ? (
                    <>
                        <ColdScreen loved={lovedTitles} stills={deckStills} lovedStill={lovedFilm?.still || lovedFilm?.posterUrl} />
                        <section className="mt-12">
                            <h2 className="font-serif text-[1.9rem] md:text-[2.4rem] leading-tight text-white">Films most people have seen</h2>
                            <p className="mt-1 mb-7 text-[16px] text-gray-400">Say which ones you loved. Skip any you haven’t seen.</p>
                            <QuickRate films={deck} onLoved={(f) => act.rate(f, 5)} onNotFor={(f) => act.notFor(f)} onSkip={skip} reducedMotion={reducedMotion} />
                        </section>
                    </>
                ) : (
                    <TheScreen picks={picks} start={firstShot} act={act} reducedMotion={reducedMotion} />
                )}

                {!isAuthenticated && loved.length > 0 && (
                    <p className="mt-10 text-center text-[16px] text-gray-300">
                        <Link to="/login" state={{ from: location.pathname }} className="text-gold-light underline decoration-gold/40 underline-offset-4 hover:text-white">Keep these: sign in</Link>, and your films come with you.
                    </p>
                )}

                {!cold && groups.length > 0 && (
                    <section className="mt-20 md:mt-28">
                        <div className="rack-arrive">
                            <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">In focus for you</div>
                            <h2 className="relative mt-2 mb-8 md:mb-10 font-serif font-light text-[2.2rem] md:text-5xl leading-tight text-white">
                                <span aria-hidden="true" className="rack-soft absolute inset-0 blur-[8px]">Every pick, and the film that led to it</span>
                                <span className="rack-sharp block">Every pick, and the film that led to it</span>
                            </h2>
                        </div>
                        <div className="flex flex-col gap-10 md:gap-14">
                            {groups.map((g) => <FocusReel key={g.key} seed={g.seed} how={g.how} picks={g.picks} act={act} reducedMotion={reducedMotion} />)}
                        </div>
                    </section>
                )}

                {!cold && data.basedOn.films?.length > 0 && (
                    <section className="mt-20 md:mt-24">
                        <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">What it’s working from</div>
                        <h2 className="mt-2 mb-6 font-serif font-light text-[2rem] md:text-[2.6rem] leading-tight text-white">Your films</h2>
                        <ul className="flex gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]">
                            {data.basedOn.films.map((f) => (
                                <li key={f._id} className="flex-shrink-0 w-44">
                                    <Link to={`/movie/${f._id}`} aria-label={f.title} className="block aspect-video overflow-hidden ring-1 ring-white/10 bg-[#0d0c0b] hover:ring-white/30">
                                        {f.still && <img src={sized(f.still, 'w300')} alt="" loading="lazy" className="w-full h-full object-cover max-w-none" />}
                                    </Link>
                                    <div className="mt-2 text-[15px] leading-tight text-gray-100 truncate">{f.title}</div>
                                    <div className="font-label text-[11px] tracking-[0.14em] uppercase text-gray-500">{f.rating ? `${f.rating} stars` : HOW[f.how] || 'Loved'}</div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {!cold && deck.length > 0 && (
                    <section className="mt-20 md:mt-24">
                        <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">Sharpen it</div>
                        <h2 className="mt-2 font-serif font-light text-[2rem] md:text-[2.6rem] leading-tight text-white">Seen any of these?</h2>
                        <p className="mt-1 mb-7 text-[16px] text-gray-400">Every film you tell it brings your picks into sharper focus.</p>
                        <QuickRate films={deck} onLoved={(f) => act.rate(f, 5)} onNotFor={(f) => act.notFor(f)} onSkip={skip} reducedMotion={reducedMotion} />
                    </section>
                )}

                <section className="mt-24 max-w-3xl">
                    <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">How it chooses</div>
                    <p className="mt-3 text-[16px] leading-relaxed text-gray-400">
                        It learned from 32 million ratings: what people who loved one film went on to love. We tested it on 11,090 people it had never seen, giving it only the last five films each had loved. For 2 in 3, its top ten already held a film they went on to love. Asked for the exact next film they loved, out of more than 1,000, it was right more than 1 time in 3: nearly five times as often as the atlas’s old engine. Random picks manage under 1 in 100.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default ForYou;
