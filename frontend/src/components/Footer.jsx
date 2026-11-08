import { Link } from 'react-router-dom';

/**
 * The foot of every page: whose atlas it is, the way to About and the lists, the credit TMDB asks for,
 * and the maker's other site, Starweave (who influenced whom in indie music), as a record: its sleeve is
 * Starweave's own map, and the disc slides out and turns when pointed at, its label in Starweave's colours.
 */

const STARWEAVE = 'https://starweaves.vercel.app';

const Footer = () => (
    <footer className="relative z-10 border-t border-white/[0.08] mt-10">
        <div className="max-w-7xl mx-auto px-4 md:px-10 py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex flex-col gap-2 font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">
                <div>Arthouse Atlas <span className="text-gray-600">·</span> by <Link to="/about" className="text-gray-200 underline decoration-white/40 underline-offset-4 hover:text-white">Diwakar Mishra</Link></div>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <Link to="/about" className="min-h-11 inline-flex items-center hover:text-white">About</Link>
                    <Link to="/about#lists" className="min-h-11 inline-flex items-center hover:text-white">The 20 lists</Link>
                    <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="min-h-11 inline-flex items-center hover:text-white">Pictures from TMDB</a>
                </div>
            </div>

            <a href={STARWEAVE} target="_blank" rel="noreferrer" className="also-record group flex items-center gap-5 self-start md:self-auto max-w-md rounded-2xl pl-3 pr-5 py-3 bg-white/[0.035] ring-1 ring-white/10 hover:ring-gold/60 hover:bg-white/[0.06] focus-visible:ring-gold transition">
                <span aria-hidden="true" className="also-record__art relative flex-shrink-0 w-[76px] h-[76px] mr-8">
                    <span className="also-record__slide absolute top-[3px] left-[6px] w-[70px] h-[70px]">
                        <span className="also-record__disc block w-full h-full rounded-full" />
                    </span>
                    <img src="/elsewhere/starweave.jpg" alt="" width="240" height="240" loading="lazy" className="relative w-full h-full object-cover rounded-[3px] ring-1 ring-white/15 shadow-[4px_0_14px_rgba(0,0,0,0.6)]" />
                </span>
                <span className="min-w-0">
                    <span className="block font-label text-[11.5px] tracking-[0.16em] uppercase text-gold">Also by Diwakar Mishra</span>
                    <span className="block mt-0.5 font-serif text-[1.6rem] leading-tight text-white">Starweave</span>
                    <span className="block mt-0.5 font-serif text-[15px] leading-snug text-gray-300">Who influenced whom in indie music, every link sourced <span aria-hidden="true" className="text-gold">↗</span></span>
                </span>
            </a>
        </div>
    </footer>
);

export default Footer;
