import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { recsAPI, userAPI } from '../services/api';
import { useMotionPreference } from '../hooks/useMotionPreference';
import AwardsNight from '../components/profile/AwardsNight';
import DollyTrack from '../components/studios/DollyTrack';
import YourAtlas from '../components/profile/YourAtlas';
import Account from '../components/profile/Account';
import Picker from '../components/profile/Picker';
import { usePageTitle } from '../hooks/usePageTitle';

/**
 * Your profile, as your own awards night: every film you rate is a vote, and your ratings pick the
 * winners (your favourite film, director, movement, country, decade, and your hidden gem), each against
 * its nominees and said in plain words. Under it, your films, one shelf at a time, on a track you dolly
 * along. Before you've rated anything, the night says how it opens.
 */

const SHELVES = [
    ['favourites', 'Favourites', 'Films you make a favourite come here.'],
    ['rated', 'Your ratings', 'Films you rate come here, with your mark.'],
    ['watched', 'Watched', 'Films you mark as watched come here.'],
    ['watchlist', 'Watchlist', 'Films you put on your watchlist come here.'],
    ['notFor', 'Not for me', 'Films you set aside in For You come here, and For You never picks them.'],
];
const monthOf = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : null);

const Profile = () => {
    const reducedMotion = useMotionPreference();
    usePageTitle('Your profile');
    const [fest, setFest] = useState(null);
    const [failed, setFailed] = useState(false);
    const [reel, setReel] = useState([]);
    const [shelf, setShelf] = useState(null);
    // the films you've seen (rated, favourites, watched), once each, as the map wants them
    const seen = useMemo(() => {
        if (!fest) return [];
        const out = new Map();
        for (const f of [...fest.shelves.rated, ...fest.shelves.favourites, ...fest.shelves.watched]) {
            if (f.c && f.y && !out.has(f.id)) out.set(f.id, { id: f.id, t: f.t, y: f.y, c: f.c, s: f.s, d: f.d?.join(' & '), r: null });
        }
        return [...out.values()];
    }, [fest]);

    useEffect(() => {
        let gone = false;
        window.scrollTo(0, 0);
        userAPI.getFestival()
            .then((r) => {
                if (gone) return;
                setFest(r.data);
                // the first shelf with something on it
                setShelf((SHELVES.find(([k]) => r.data.shelves[k]?.length) || SHELVES[0])[0]);
                if (!r.data.awards?.length) {
                    recsAPI.starters().then((s) => {
                        if (!gone) setReel((s.data.starters || []).filter((f) => f.still).slice(0, 12).map((f) => ({ _id: f._id, title: f.title, year: f.year, s: f.still })));
                    }).catch(() => {});
                }
            })
            .catch(() => { if (!gone) setFailed(true); });
        return () => { gone = true; };
    }, []);

    if (failed) {
        return (
            <div className="min-h-screen pt-40 px-6 text-center">
                <p className="font-serif text-3xl text-gray-100">The festival office didn’t answer.</p>
                <button type="button" onClick={() => window.location.reload()} className="mt-6 font-label text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">Try again ›</button>
            </div>
        );
    }
    if (!fest) return <div className="min-h-screen pt-40 text-center font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">The festival is opening…</div>;

    const since = monthOf(fest.since);
    const { rated, favourites, hours, countries, from, to } = fest.ballot || {};
    const ballot = [
        `${rated} ${rated === 1 ? 'film' : 'films'} rated`,
        `${favourites} ${favourites === 1 ? 'favourite' : 'favourites'}`,
        hours > 0 && `${hours} ${hours === 1 ? 'hour' : 'hours'} of film`,
        countries > 0 && `${countries} ${countries === 1 ? 'country' : 'countries'}`,
        from && to && (from === to ? `${from}` : `${from}–${to}`),
        since && `member since ${since}`,
    ].filter(Boolean).join('  ·  ');

    const films = shelf ? fest.shelves[shelf] || [] : [];
    const [, , empty] = SHELVES.find(([k]) => k === shelf) || SHELVES[0];

    return (
        <div className="own-transitions relative min-h-screen pb-28">
            {/* what this page is, in one look */}
            <header className="pt-24 md:pt-28 pb-6 md:pb-8">
                <div className="max-w-7xl mx-auto px-4 md:px-10 flex items-start justify-between gap-6">
                    <div className="title-rise">
                        <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">Your profile</div>
                        <h1 className="mt-1 font-serif font-light text-[2.4rem] md:text-6xl leading-[1.05] text-white">{fest.name}’s Film Awards</h1>
                        <p className="mt-2 max-w-2xl font-serif text-lg md:text-xl leading-snug text-gray-200">Every film you rate is a vote. These are your winners: your favourite film, director, decade and more.</p>
                        <p className="mt-2 font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">{ballot}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => document.getElementById('account')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })}
                        className="shrink-0 mt-1 min-h-11 px-1 font-label text-[12px] tracking-[0.14em] uppercase text-gold hover:text-gold-light"
                    >
                        Your account ›
                    </button>
                </div>
            </header>

            <AwardsNight awards={fest.awards || []} reel={reel} reducedMotion={reducedMotion} />
            {fest.awards?.length > 0 && (
                <p className="max-w-7xl mx-auto px-4 md:px-10 mt-3 font-label text-[12px] tracking-[0.14em] uppercase text-gray-500">Films you love: the ones you rated 4 or 5, or made a favourite.</p>
            )}

            {/* your films, one shelf at a time */}
            <section className="pt-16 md:pt-24">
                <div className="max-w-7xl mx-auto px-4 md:px-10">
                    <div className="flex items-baseline gap-4">
                        <h2 className="font-serif font-light text-3xl md:text-5xl text-white">Your films</h2>
                        <span className="flex-1 h-px bg-white/10" />
                    </div>
                    <p className="mt-2 font-serif italic text-lg text-gray-300">Everything you’ve kept, one shelf at a time.</p>
                    <div className="mt-6">
                        <Picker
                            tabs
                            label="Your shelves"
                            layoutId="shelf-rule"
                            value={shelf}
                            onChange={setShelf}
                            items={SHELVES.map(([k, label]) => ({ key: k, label, count: fest.shelves[k]?.length || 0 }))}
                        />
                    </div>
                </div>
                <div className="mt-8 md:mt-10">
                    {films.length ? (
                        <DollyTrack
                            key={shelf}
                            films={films}
                            reducedMotion={reducedMotion}
                            decades={false}
                            note={(f) => (f.mark ? `Your mark: ${f.mark} of 5` : null)}
                        />
                    ) : (
                        <div className="max-w-7xl mx-auto px-4 md:px-10">
                            <div className="py-16 md:py-20 text-center ring-1 ring-white/10 bg-white/[0.02]">
                                <p className="font-serif italic text-xl md:text-2xl text-gray-200">{empty}</p>
                                <Link to="/explore" className="mt-4 inline-flex items-center min-h-11 font-label text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">Find films ›</Link>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {seen.length > 0 && <YourAtlas films={seen} reducedMotion={reducedMotion} />}
            <Account name={fest.name} onRenamed={(username) => setFest((f) => ({ ...f, name: username }))} />
        </div>
    );
};

export default Profile;
