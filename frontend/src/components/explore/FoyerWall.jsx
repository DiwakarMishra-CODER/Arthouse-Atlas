import { useEffect, useRef } from 'react';
import LobbyFrame from './LobbyFrame';
import Intertitle from './Intertitle';

/**
 * The foyer wall. The films hang in groups of six, the way a foyer hangs its lobby cards:
 * one large case with two beside it and three beneath, mirrored from one group to the next,
 * so the wall has a rhythm instead of a grid. The first film of a group takes the large case,
 * so the order holds (in the canon's order, that's each group's most acclaimed).
 *
 * Between reels, a silent film's title card says where you are: in time order, each decade;
 * in the canon's own order with nothing chosen, the ranks that follow. Each case's light
 * strikes on as it comes into view (one observer for the whole wall, and the "lit" mark is
 * a data attribute, so nothing re-renders).
 */

const GROUP = 6;
const REEL = 24;

const chunk = (list, n) => {
    const out = [];
    for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
    return out;
};

// the wall in sections: a decade at a time (time order), reels of the canon (its own order,
// nothing chosen), or one run
const sectionsOf = (films, sort, plainCanon, decadeCounts) => {
    if (sort === 'oldest' || sort === 'newest') {
        const out = [];
        for (const f of films) {
            const decade = f.decade ?? (f.year ? Math.floor(f.year / 10) * 10 : null);
            const last = out[out.length - 1];
            if (last && last.decade === decade) last.films.push(f);
            else out.push({ key: `d${decade}`, decade, films: [f] });
        }
        return out.map((s) => ({
            ...s,
            title: s.decade ? `The ${s.decade}s` : 'Undated',
            kicker: decadeCounts?.get(s.decade) ? `${decadeCounts.get(s.decade)} ${decadeCounts.get(s.decade) === 1 ? 'film' : 'films'}` : null,
        }));
    }
    if (sort === 'acclaimed' && plainCanon) {
        return chunk(films, REEL).map((reel, i) => {
            const ranks = reel.map((f) => f.canonRank).filter(Boolean);
            return {
                key: `r${i}`,
                films: reel,
                // the first reel needs no card: the board already says "most acclaimed first"
                title: i && ranks.length ? `№ ${ranks[0]} to ${ranks[ranks.length - 1]}` : null,
                kicker: i ? 'Further down the canon' : null,
            };
        });
    }
    return [{ key: 'all', films }];
};

// lg: explicit places, so a mirrored group can't be shuffled by the grid's auto-placement
const PLACE = {
    plain: ['lg:col-start-1 lg:row-start-1', 'lg:col-start-3 lg:row-start-1', 'lg:col-start-3 lg:row-start-2'],
    mirror: ['lg:col-start-2 lg:row-start-1', 'lg:col-start-1 lg:row-start-1', 'lg:col-start-1 lg:row-start-2'],
};

const Group = ({ films, mirror, frame }) => {
    if (films.length === 1) {
        return <div className="w-full max-w-4xl mx-auto">{frame(films[0], 0, { size: 'large' })}</div>;
    }
    if (films.length === 2) {
        return <div className="grid md:grid-cols-2 gap-x-8 gap-y-16">{films.map((f, i) => frame(f, i))}</div>;
    }
    const place = mirror ? PLACE.mirror : PLACE.plain;
    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-6 lg:gap-x-8 gap-y-14 lg:gap-y-10 md:[&>*:last-child:nth-child(even)]:col-span-2 lg:[&>*:last-child:nth-child(even)]:col-span-1">
            {films.map((f, i) => frame(f, i, {
                size: i === 0 ? 'large' : 'small',
                compact: i === 1 || i === 2,
                className: [i === 0 ? 'md:col-span-2 lg:row-span-2' : '', place[i] || ''].join(' '),
            }))}
        </div>
    );
};

const FoyerWall = ({ films, sort, plainCanon, decadeCounts, onDirector, onMovement, pickedId, reducedMotion, end = null }) => {
    const wall = useRef(null);

    // each case (and title card) lights as it comes into view; with reduced motion, all at once
    useEffect(() => {
        const root = wall.current;
        if (!root) return undefined;
        const dark = [...root.querySelectorAll('[data-film]:not([data-lit]), .intertitle-card:not([data-lit])')];
        if (reducedMotion || typeof IntersectionObserver === 'undefined') {
            dark.forEach((el) => { el.dataset.lit = '1'; });
            return undefined;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                e.target.dataset.lit = '1';
                io.unobserve(e.target);
            });
        }, { threshold: 0.2 });
        dark.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [films, sort, reducedMotion, end]);

    const frame = (film, i, opts = {}) => (
        <LobbyFrame
            key={film._id}
            film={film}
            index={i}
            onDirector={onDirector}
            onMovement={onMovement}
            picked={film._id === pickedId}
            reducedMotion={reducedMotion}
            {...opts}
        />
    );

    let n = 0; // groups so far, to mirror every other one
    return (
        <div ref={wall} className="flex flex-col gap-20 md:gap-24">
            {sectionsOf(films, sort, plainCanon, decadeCounts).map((section) => (
                <section key={section.key} className="flex flex-col gap-16 md:gap-20" aria-label={section.title || undefined}>
                    {section.title && <Intertitle kicker={section.kicker} title={section.title} />}
                    {chunk(section.films, GROUP).map((group) => {
                        const mirror = n++ % 2 === 1;
                        return <Group key={group[0]._id} films={group} mirror={mirror} frame={frame} />;
                    })}
                </section>
            ))}
            {end}
        </div>
    );
};

export default FoyerWall;
