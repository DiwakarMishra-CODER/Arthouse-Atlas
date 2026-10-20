import { Link } from 'react-router-dom';
import { sized } from '../movements/treatments';

/**
 * A lobby card: the framed still a cinema hung in its foyer. Here: the film's own
 * image (never a poster when a still exists), its title and its original title,
 * who made it (tap the name to see all their films), when, where and how long,
 * its movement, and one line about it. With no still it falls back to the
 * backdrop, then the poster, then the title set on the dark, so a card is never
 * a hole.
 *
 * The still strikes on like a projector lamp when the card arrives (index: its
 * place in the batch, for the stagger).
 */

const COUNTRY = { 'United States of America': 'United States', 'United Kingdom': 'United Kingdom' };

const LobbyCard = ({ film, index = 0, onDirector, onMovement }) => {
    const still = film.still && sized(film.still, 'w780');
    const to = `/movie/${film._id}`;
    const facts = [film.year, COUNTRY[film.country] || film.country, film.runtime && `${film.runtime} min`].filter(Boolean);
    const line = film.hook
        || (film.provenanceCount ? `Cited by ${film.provenanceCount} ${film.provenanceCount === 1 ? 'poll or prize' : 'polls and prizes'}` : 'Chosen by the atlas');
    return (
        <article className="group">
            <Link to={to} aria-label={`${film.title}${film.year ? ` (${film.year})` : ''}`} className="lobby-lamp relative block aspect-video overflow-hidden bg-[#0c0c0c] ring-1 ring-white/10 group-hover:ring-white/30 transition-shadow" style={{ '--i': index }}>
                {still ? (
                    <img src={still} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover max-w-none transition-transform duration-[4000ms] ease-out group-hover:scale-[1.05]" />
                ) : film.posterUrl ? (
                    <>
                        <img src={sized(film.posterUrl, 'w342')} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover max-w-none blur-xl opacity-40 scale-110" />
                        <img src={sized(film.posterUrl, 'w342')} alt="" loading="lazy" decoding="async" className="absolute inset-y-0 left-1/2 -translate-x-1/2 h-full w-auto max-w-none" />
                    </>
                ) : (
                    <span className="absolute inset-0 flex items-center justify-center p-6 text-center font-serif text-2xl text-gray-300">{film.title}</span>
                )}
                <span aria-hidden="true" className="absolute inset-0 bg-grain opacity-60" />
                {film.canonRank && (
                    <span className="absolute left-2.5 top-2.5 px-2 py-1 bg-black/70 backdrop-blur-[2px] font-label text-[12px] tracking-[0.14em] text-gold" title={`Number ${film.canonRank} in the atlas's canon`}>
                        № {film.canonRank}
                    </span>
                )}
            </Link>
            <div className="mt-3">
                <Link to={to} className="font-serif text-[1.3rem] leading-tight text-white hover:text-gold-light transition-colors">{film.title}</Link>
                {film.originalTitle && <div className="mt-0.5 text-sm italic text-gray-500 truncate">{film.originalTitle}</div>}
                {film.directors?.length > 0 && (
                    <div className="mt-1 text-sm text-gray-400">
                        by{' '}
                        {film.directors.map((d, i) => (
                            <span key={d}>
                                {i > 0 && (i === film.directors.length - 1 ? ' & ' : ', ')}
                                <button type="button" onClick={() => onDirector(d)} className="text-gray-200 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white transition-colors">{d}</button>
                            </span>
                        ))}
                    </div>
                )}
                <div className="mt-1.5 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gray-500">{facts.join(' · ')}</div>
                {film.movements?.[0] && (
                    <button type="button" onClick={() => onMovement(film.movements[0])} className="mt-1 block font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-left text-gold hover:text-gold-light transition-colors">{film.movements[0]}</button>
                )}
                <p className="mt-2 text-sm leading-relaxed text-gray-400 line-clamp-2">{line}</p>
            </div>
        </article>
    );
};

export default LobbyCard;
