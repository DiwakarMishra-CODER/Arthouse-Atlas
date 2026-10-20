import { Link } from 'react-router-dom';
import { MdArrowOutward } from 'react-icons/md';
import TreatmentTitle from '../movements/TreatmentTitle';
import { sized } from '../movements/treatments';

/**
 * When the wall is one director's films, or one movement's, they get their
 * credit above it: the person's portrait, dates and birthplace, or the
 * movement's name set in its own type, its years and line, and the way to their
 * own page.
 */

const ArtistCredits = ({ director, movement }) => {
    if (!director && !movement) return null;
    return (
        <div className="mt-10 md:mt-14 flex flex-col gap-8">
            {director && (
                <div className="flex items-center gap-5 md:gap-7">
                    <div className="w-20 h-20 md:w-28 md:h-28 flex-shrink-0 overflow-hidden ring-1 ring-white/15 bg-[#141414]">
                        {director.portrait
                            ? <img src={sized(director.portrait, 'w185')} alt="" className="w-full h-full object-cover grayscale" />
                            : <span className="w-full h-full flex items-center justify-center font-serif text-3xl text-gray-500">{director.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('')}</span>}
                    </div>
                    <div className="min-w-0">
                        <div className="font-mono text-[10px] md:text-[11px] tracking-[0.3em] uppercase text-[#c5a059]">Directed by</div>
                        <h2 className="mt-1 font-serif text-3xl md:text-5xl text-white leading-tight">{director.name}</h2>
                        <div className="mt-2 font-mono text-[10px] md:text-[11px] tracking-[0.15em] uppercase text-gray-400">
                            {[director.born && `${director.born}–${director.died || ''}`, director.place?.split(',')[0], `${director.films} ${director.films === 1 ? 'film' : 'films'} in the atlas`].filter(Boolean).join(' · ')}
                        </div>
                        {director.id && (
                            <Link to={`/directors/${director.id}`} className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.2em] uppercase text-gray-200 hover:text-white">
                                Their retrospective <MdArrowOutward />
                            </Link>
                        )}
                    </div>
                </div>
            )}
            {movement && (
                <div>
                    <div className="font-mono text-[10px] md:text-[11px] tracking-[0.3em] uppercase text-[#c5a059] mb-4">The movement</div>
                    <TreatmentTitle movement={{ title: movement.title, tag: movement.tag }} size="teaser" as="h2" />
                    <div className="mt-4 font-mono text-[10px] md:text-[11px] tracking-[0.15em] uppercase text-gray-400">
                        {[movement.era, `${movement.films} ${movement.films === 1 ? 'film' : 'films'} in the atlas`].filter(Boolean).join(' · ')}
                    </div>
                    {movement.tagline && <p className="mt-2 max-w-2xl text-gray-300">{movement.tagline}</p>}
                    {movement.tag && (
                        <Link to={`/movements/${movement.tag}`} className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.2em] uppercase text-gray-200 hover:text-white">
                            The full story <MdArrowOutward />
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
};

export default ArtistCredits;
