import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sized } from '../movements/treatments';

/**
 * The film's credits as the foot of its poster prints them: the billing block. Condensed capitals,
 * the roles small and the names large, run together on centred lines: who's in it, who made the
 * music, cut it, shot it, wrote it (and what it was based on), whose production, and last and
 * largest, who directed it. Under it, the plain facts and where to watch it. Its poster stands
 * beside it as a one-sheet. Lines are set one after another as it comes into view.
 */

const COUNTRY = { 'United States of America': 'United States', 'United Kingdom': 'United Kingdom' };
const SOURCE = { Novel: 'the novel by', Book: 'the book by', Play: 'the play by', 'Short Story': 'the story by', 'Comic Book': 'the comic by', Author: 'the work of' };
// names never break inside themselves: "Ulla Ryghe" stays on one line
const whole = (n, k) => <span key={k} className="whitespace-nowrap">{n}</span>;
const and = (names) => names.flatMap((n, i) => [i === 0 ? null : i === names.length - 1 ? ' and ' : ', ', whole(n, i)]).filter(Boolean);
// (with real spaces round the dot, so a long line can break there)
const dots = (names) => names.flatMap((n, i) => [i === 0 ? null : <Fragment key={`d${i}`}> <span aria-hidden="true" className="text-gray-500">·</span> </Fragment>, whole(n, i)]).filter(Boolean);

// a line of the block: [role, names] pairs, the role small and the names large
const Line = ({ parts, i, reducedMotion, big = false }) => (
    <motion.p
        className="leading-[1.35]"
        initial={reducedMotion ? false : { opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5, delay: 0.1 + i * 0.12, ease: [0.2, 0.7, 0.2, 1] }}
    >
        {parts.map(([role, names], k) => (
            <Fragment key={k}>
                {k > 0 && <> <span aria-hidden="true" className="mx-1 md:mx-2 text-gray-600">·</span> </>}
                {role && <span className="mr-1.5 md:mr-2 align-middle whitespace-nowrap text-[11px] md:text-[12px] tracking-[0.2em] text-gray-400">{role}</span>}
                <span className={`align-middle tracking-[0.06em] text-white ${big ? 'text-[26px] md:text-[40px]' : 'text-[17px] md:text-[22px]'}`}>{names}</span>
            </Fragment>
        ))}
    </motion.p>
);

const BillingBlock = ({ movie, light, providers, reducedMotion }) => {
    const directors = movie.directors || [];
    const writers = movie.writers || [];
    const wrote = writers.filter((w) => ['Screenplay', 'Writer'].includes(w.job)).map((w) => w.name);
    const story = writers.filter((w) => ['Story', 'Original Story'].includes(w.job)).map((w) => w.name);
    const source = writers.find((w) => SOURCE[w.job]);
    // "written and directed by" when the director wrote it alone
    const auteur = directors.length === 1 && wrote.length === 1 && wrote[0] === directors[0];
    const director = directors.length
        ? directors.map((d, i) => (i === 0 && movie.directorId
            ? <Link key={d} to={`/directors/${movie.directorId}`} className="whitespace-nowrap underline decoration-1 underline-offset-[6px] hover:text-gold-light" style={{ textDecorationColor: `${light}99` }}>{d}</Link>
            : <Fragment key={d}>{i > 0 && ' and '}{whole(d, d)}</Fragment>))
        : null;

    const lines = [
        movie.cast?.length && [['starring', dots(movie.cast.slice(0, 4).map((c) => c.name))]],
        [movie.composers?.length && ['music by', and(movie.composers.slice(0, 2))], movie.editors?.length && ['edited by', and(movie.editors)]].filter(Boolean),
        movie.cinematographers?.length && [['photographed by', and(movie.cinematographers.slice(0, 2))]],
        [source && [`based on ${SOURCE[source.job]}`, whole(source.name)], story.length && ['story by', and(story)]].filter(Boolean),
        !auteur && wrote.length && [['written by', and(wrote.slice(0, 3))]],
        movie.productionCompanies?.length && [['a', whole(`${movie.productionCompanies[0]} production`)]],
    ].filter((l) => l && l.length);
    const facts = [COUNTRY[movie.country] || movie.country, movie.year, movie.runtime && `${movie.runtime} minutes`, movie.languages?.length && `in ${movie.languages.slice(0, 2).join(' and ')}`].filter(Boolean);

    return (
        <section aria-label="Credits" className="pt-16 md:pt-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
                {movie.posterUrl && (
                    <motion.div
                        className="lg:col-span-3 justify-self-center w-40 md:w-52 lg:w-full max-w-[240px]"
                        initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {/* the one-sheet, lit from in front by the film's own light */}
                        <img src={sized(movie.posterUrl, 'w500')} alt={`${movie.title}: its poster`} className="w-full ring-1 ring-white/10" style={{ boxShadow: `0 30px 70px rgba(0,0,0,0.7), 0 0 90px ${light}22` }} />
                    </motion.div>
                )}

                <div className={`${movie.posterUrl ? 'lg:col-span-9' : 'lg:col-span-12'} text-center font-label uppercase`}>
                    <div className="space-y-2.5 md:space-y-3">
                        {lines.map((parts, i) => <Line key={i} parts={parts} i={i} reducedMotion={reducedMotion} />)}
                        {director && <div className="pt-2"><Line parts={[[auteur ? 'written and directed by' : 'directed by', director]]} i={lines.length} reducedMotion={reducedMotion} big /></div>}
                    </div>
                    <motion.div
                        className="mt-6 md:mt-8 text-[12px] md:text-[13px] tracking-[0.2em] text-gray-300"
                        initial={reducedMotion ? false : { opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.6, delay: 0.25 + (lines.length + 1) * 0.12 }}
                    >
                        {facts.join('  ·  ')}
                        {movie.originalTitle && movie.originalTitle !== movie.title && (
                            <span className="block mt-2 normal-case tracking-normal font-serif italic text-[17px] text-gray-300">Original title: {movie.originalTitle}</span>
                        )}
                    </motion.div>

                    {(providers === null || providers.length > 0) && (
                        <div className="mt-9 md:mt-10 normal-case">
                            <div className="font-label uppercase text-[12px] tracking-[0.14em] text-gray-400 mb-3">Where to watch it</div>
                            {providers === null ? (
                                <div className="mx-auto animate-pulse h-9 w-40 bg-white/5" />
                            ) : (
                                <div className="flex flex-wrap justify-center gap-2">
                                    {providers.map((p) => (
                                        <a
                                            key={p.provider_id}
                                            href={`https://www.google.com/search?q=Watch+${encodeURIComponent(movie.title)}+on+${encodeURIComponent(p.provider_name)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 pr-3 bg-white/[0.04] ring-1 ring-white/10 hover:ring-white/30 transition-colors"
                                        >
                                            <img src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt="" className="w-8 h-8 object-cover" />
                                            <span className="font-sans text-xs text-gray-200 whitespace-nowrap">{p.provider_name}</span>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default BillingBlock;
