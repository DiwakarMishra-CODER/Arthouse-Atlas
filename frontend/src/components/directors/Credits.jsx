import { memo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MdArrowOutward } from 'react-icons/md';

/**
 * Every director as a film's end credits: the film on the left, the director on the right, dot
 * leaders between ("Seven Samurai ……… Akira Kurosawa"), so someone who knows a film finds the
 * person. The line passing the gate (a band a little under halfway down the screen) is lit, and the
 * screen plays it. The gate is watched here and reported up; nothing here re-renders as it moves.
 *
 * sections: from arrange() / narrow() · by: the arrangement · onGate(key, el) · onOpen(event, key)
 */

const Credits = memo(({ sections, by, onGate, onOpen }) => {
    useEffect(() => {
        const lines = document.querySelectorAll('[data-credit]');
        if (!lines.length) return undefined;
        const io = new IntersectionObserver((entries) => {
            const at = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
            if (at) onGate(at.target.dataset.credit, at.target);
        }, { rootMargin: '-46% 0px -53% 0px' });
        lines.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [sections, onGate]);

    return sections.map((s) => (
        <section key={s.key} id={`d-${s.key}`} data-section data-key={s.key} className="credit-block pt-14 first:pt-4">
            <h2 className="mb-5 flex items-baseline gap-4">
                <span className="font-label text-[12px] md:text-[13px] tracking-[0.3em] uppercase text-gold">{s.title}</span>
                {s.tag && <Link to={`/movements/${s.tag}`} aria-label={`The ${s.title} room`} className="text-gray-500 hover:text-gold transition-colors"><MdArrowOutward /></Link>}
                <span className="flex-1 h-px bg-white/10" />
                <span className="font-label text-[12px] tracking-[0.14em] text-gray-500">{s.places.length}</span>
            </h2>
            <ol>
                {s.places.map((p) => {
                    const k = `${s.key}|${p.d.id}`;
                    const film = by === 'acclaim' && p.ranked ? p.ranked : p.found || p.film;
                    return (
                        <li key={k}>
                            <Link
                                to={`/directors/${p.d.id}`}
                                data-credit={k}
                                onClick={(e) => onOpen(e, k)}
                                className="credit-line flex items-baseline gap-3 py-[7px] md:py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-light"
                            >
                                <span className="credit-film min-w-0 max-w-[48%] truncate font-serif italic text-[15px] md:text-[17px] text-gray-400">{film?.t || '—'}</span>
                                <span aria-hidden="true" className="credit-leader flex-1 min-w-6" />
                                <span className="credit-name shrink-0 font-serif text-[17px] md:text-[21px] text-white">{p.d.n}</span>
                                {by === 'acclaim' && (
                                    <span className="shrink-0 w-11 md:w-14 text-right font-label text-[11px] md:text-[12px] tracking-[0.1em] text-gray-500">{p.rank ? `No. ${p.rank}` : ''}</span>
                                )}
                            </Link>
                        </li>
                    );
                })}
            </ol>
        </section>
    ));
});

export default Credits;
