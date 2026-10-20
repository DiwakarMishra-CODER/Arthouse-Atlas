import { Link } from 'react-router-dom';
import { MdArrowOutward } from 'react-icons/md';
import TreatmentTitle from '../movements/TreatmentTitle';
import { sized } from '../movements/treatments';

/**
 * When the wall is one artist's, the foyer hangs their banner across it, over their best
 * still: a director's retrospective (portrait, name, years, birthplace), a movement in its
 * own title type, or the film the wall starts from ("Films like Parasite"), with what the
 * links are honestly made of.
 */

const Backdrop = ({ still, focus }) => (
    <>
        {still && <img src={sized(still, 'w1280')} alt="" className="absolute inset-0 w-full h-full object-cover max-w-none opacity-60" style={focus ? { objectPosition: focus } : undefined} />}
        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,#050505_0%,rgba(5,5,5,0.92)_38%,rgba(5,5,5,0.55)_70%,rgba(5,5,5,0.35)_100%)]" />
        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(0deg,#050505,transparent_45%)]" />
        <span aria-hidden="true" className="absolute inset-0 still-grain opacity-80" />
    </>
);

const Kicker = ({ children }) => <div className="font-label text-[12px] tracking-[0.14em] uppercase text-gold">{children}</div>;

const More = ({ to, children }) => (
    <Link to={to} className="mt-4 inline-flex items-center gap-1.5 font-label text-[13px] tracking-[0.14em] uppercase text-gray-100 hover:text-gold-light transition-colors">
        {children} <MdArrowOutward aria-hidden="true" />
    </Link>
);

const Banner = ({ selected = {} }) => {
    const { start, director, movement } = selected;
    if (!start && !director && !movement) return null;

    let still = null;
    let focus = null;
    let body;
    if (start) {
        still = start.kind === 'like' ? start.image : null;
        body = (
            <div className="flex items-center gap-5 md:gap-8">
                {start.kind === 'from' && start.poster && <img src={start.poster} alt="" className="w-20 md:w-28 flex-shrink-0 ring-1 ring-white/15 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.9)]" />}
                <div className="min-w-0">
                    <Kicker>{start.kind === 'from' ? 'Not in the atlas: a way in' : 'Starting from a film'}</Kicker>
                    <h2 className="mt-2 font-serif font-light text-4xl md:text-6xl leading-[1.02] text-white">
                        Films like <span className="italic">{start.title}</span>
                    </h2>
                    <p className="mt-3 max-w-2xl text-[17px] text-gray-300 leading-relaxed">
                        {start.viewers
                            ? `People who loved ${start.title} tended to love these too, more than most viewers do: learned from 32 million MovieLens ratings.`
                            : `Films that share its director or its movement (MovieLens has no ratings for it yet).`}
                    </p>
                    {start.kind === 'like' && start.id && <More to={`/movie/${start.id}`}>{start.title}</More>}
                </div>
            </div>
        );
    } else if (director) {
        still = director.still;
        body = (
            <div className="flex items-center gap-5 md:gap-8">
                <div className="w-24 h-28 md:w-36 md:h-44 flex-shrink-0 overflow-hidden ring-1 ring-white/20 bg-[#141414] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.95)]">
                    {director.portrait
                        ? <img src={sized(director.portrait, 'w342')} alt="" className="w-full h-full object-cover grayscale" />
                        : <span className="w-full h-full flex items-center justify-center font-serif text-4xl text-gray-400">{director.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('')}</span>}
                </div>
                <div className="min-w-0">
                    <Kicker>A retrospective</Kicker>
                    <h2 className="mt-2 font-serif font-light text-4xl md:text-6xl leading-[1.02] text-white">{director.name}</h2>
                    <div className="mt-3 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gray-300">
                        {[`${director.films} ${director.films === 1 ? 'film' : 'films'} here`, director.born && `${director.born}–${director.died || ''}`, director.place?.split(',')[0]].filter(Boolean).join(' · ')}
                    </div>
                    {director.id && <More to={`/directors/${director.id}`}>Their page</More>}
                </div>
            </div>
        );
    } else {
        still = movement.still;
        focus = movement.focus;
        body = (
            <div className="min-w-0">
                <Kicker>A movement</Kicker>
                <div className="mt-3"><TreatmentTitle movement={{ title: movement.title, tag: movement.tag }} size="teaser" as="h2" /></div>
                <div className="mt-4 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gray-300">
                    {[movement.era, `${movement.films} ${movement.films === 1 ? 'film' : 'films'} here`].filter(Boolean).join(' · ')}
                </div>
                {movement.tagline && <p className="mt-2 max-w-2xl text-[17px] text-gray-300">{movement.tagline}</p>}
                {movement.tag && <More to={`/movements/${movement.tag}`}>The full story</More>}
            </div>
        );
    }

    return (
        <section className="relative mt-12 md:mt-16 overflow-hidden ring-1 ring-white/10 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.95)]">
            <Backdrop still={still} focus={focus} />
            <div className="relative px-6 py-10 md:px-12 md:py-14">{body}</div>
        </section>
    );
};

export default Banner;
