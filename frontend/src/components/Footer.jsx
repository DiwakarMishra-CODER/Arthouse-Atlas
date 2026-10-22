import { Link } from 'react-router-dom';

/**
 * The foot of every page: whose atlas it is, the way to About and the lists, and the credit TMDB asks for.
 */
const Footer = () => (
    <footer className="relative z-10 border-t border-white/[0.08] mt-10">
        <div className="max-w-7xl mx-auto px-4 md:px-10 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">
            <div>Arthouse Atlas <span className="text-gray-600">·</span> by <Link to="/about" className="text-gray-200 underline decoration-white/40 underline-offset-4 hover:text-white">Diwakar Mishra</Link></div>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
                <Link to="/about" className="min-h-11 inline-flex items-center hover:text-white">About</Link>
                <Link to="/about#lists" className="min-h-11 inline-flex items-center hover:text-white">The 20 lists</Link>
                <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="min-h-11 inline-flex items-center hover:text-white">Pictures from TMDB</a>
            </div>
        </div>
    </footer>
);

export default Footer;
