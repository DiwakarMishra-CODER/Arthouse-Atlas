import { MdArrowOutward } from 'react-icons/md';
import { MAKER, MAKER_ALSO, MAKER_LINKS } from './maker';

/**
 * The credits: who made the atlas, and where everything in it comes from, set like a film's last
 * title card.
 */

const Credits = () => (
    <section aria-labelledby="credits" className="pt-28 md:pt-40 pb-16">
        <div className="max-w-4xl mx-auto px-4 md:px-10 text-center">
            <div className="font-label text-[12px] tracking-[0.3em] uppercase text-gold">Credits</div>
            <div className="mt-6 font-label text-[13px] tracking-[0.3em] uppercase text-gray-400">An atlas by</div>
            <h2 id="credits" className="scroll-mt-40 mt-2 font-serif font-light text-5xl md:text-7xl leading-none text-white">{MAKER}</h2>
            <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-1">
                {MAKER_LINKS.map(([label, href]) => (
                    <a key={label} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 min-h-11 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase text-gold hover:text-gold-light">
                        {label} <MdArrowOutward aria-hidden="true" />
                    </a>
                ))}
            </div>
            <p className="mt-5 font-serif text-[1.1rem] md:text-[1.2rem] text-gray-300">
                {MAKER_ALSO.lead}{' '}
                <a href={MAKER_ALSO.href} target="_blank" rel="noreferrer" className="text-gold underline decoration-gold/40 underline-offset-4 hover:text-gold-light hover:decoration-gold-light">{MAKER_ALSO.name}</a>{MAKER_ALSO.rest}
            </p>

            <dl className="mt-14 grid sm:grid-cols-2 gap-x-12 gap-y-6 text-left max-w-3xl mx-auto">
                {[
                    ['Pictures and film data', 'TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.'],
                    ['Ratings and viewers’ tags, for For You and the moods', 'MovieLens, from GroupLens at the University of Minnesota.'],
                    ['The map', 'Natural Earth.'],
                    ['The ranking', 'The 20 lists above, from Sight and Sound to the Criterion Collection.'],
                    ['Type', 'Newsreader and Oswald.'],
                    ['Made with', 'React, Node, Express and MongoDB.'],
                ].map(([dt, dd]) => (
                    <div key={dt}>
                        <dt className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">{dt}</dt>
                        <dd className="mt-1 font-serif text-[1.05rem] leading-snug text-gray-200">{dd}</dd>
                    </div>
                ))}
            </dl>
        </div>
    </section>
);

export default Credits;
