
import { useState, useEffect } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PosterCard from '../components/PosterCard';

const Studios = () => {
    const [studios, setStudios] = useState([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const fetchStudios = async () => {
            try {
                const response = await api.get('/studios');
                setStudios(response.data);
            } catch (error) {
                console.error('Failed to fetch studios:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudios();
    }, []);



    // Strict Fan Effect Helper (Centered Stack)
    // Strict Fan Effect Helper (Centered Stack - Compact)


    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="text-accent-primary animate-pulse font-serif text-xl">Loading Collections...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-[#fffff0] font-sans selection:bg-accent-primary selection:text-black">

            <main className="pt-0 md:pt-32 pb-20 px-0 md:px-6 max-w-7xl mx-auto">

                {/* MOBILE VIEW (Mini-Gallery) */}
                <div className="md:hidden min-h-screen bg-black pt-28 pb-10 px-4 overflow-x-hidden">
                    <div className="flex flex-col gap-8">
                        {studios.map((studio) => (
                            <div
                                key={studio._id}
                                className="relative w-full h-80 rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-2xl flex flex-col"
                            >
                                {/* Background Image (Dimmed) */}
                                {studio.featuredFilms && studio.featuredFilms[0] && (
                                    <img
                                        src={studio.featuredFilms[0].posterUrl}
                                        alt=""
                                        className="absolute inset-0 w-full h-full object-cover opacity-20 z-0 pointer-events-none"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80 z-0 pointer-events-none"></div>

                                {/* Studio Title */}
                                <div className="relative z-10 pt-6 text-center">
                                    <h3 className="text-[#C5A059] font-cinzel text-xl font-bold tracking-widest drop-shadow-md">
                                        {studio.name}
                                    </h3>
                                </div>

                                {/* Clickable Posters (The Core) */}
                                <div className="relative z-20 flex-1 flex items-center justify-center gap-3 px-2">
                                    {studio.featuredFilms.slice(0, 4).map((film, idx) => (
                                        <Link
                                            key={idx}
                                            to={`/movie/${film.movieId?._id || film.movieId}`}
                                            className="block transition-transform active:scale-95 hover:scale-105"
                                        >
                                            <div className="w-16 aspect-[2/3] rounded shadow-md border border-white/20 overflow-hidden">
                                                <img
                                                    src={film.posterUrl || film.movieId?.posterUrl}
                                                    alt={film.title || film.movieId?.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </Link>
                                    ))}
                                </div>

                                {/* Description (Bottom) */}
                                <div className="relative z-10 mt-auto pb-6 px-6 text-center">
                                    <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">
                                        {studio.curatorNote || studio.tagline || "A collection of cinematic excellence."}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* Mobile Load More */}
                        <div className="text-center mt-4 text-gray-500 text-xs tracking-widest uppercase">
                            End of Collection
                        </div>
                    </div>
                </div>

                {/* DESKTOP VIEW */}
                <div className="hidden md:block">
                    {/* Hero Header */}
                    <header className="mb-16 relative">
                        <div className="absolute -top-10 -left-10 w-64 h-64 bg-accent-primary/20 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                        <div className="relative z-10">
                            <p className="text-accent-primary font-medium tracking-widest text-xs uppercase mb-3">Directory</p>
                            <h1 className="text-5xl md:text-7xl font-light tracking-tighter text-white mb-6">
                                The Studios <span className="font-serif italic text-accent-primary">Collection</span>
                            </h1>
                            <p className="text-xl text-gray-400 max-w-2xl font-light">
                                Cinema is not just made; it is chosen. Discover the curators, archivists, and risk-takers who champion the boldest voices in film. From the guardians of the avant-garde to the powerhouses redefining the modern classic.
                            </p>
                        </div>
                    </header>

                    {/* Grid - Strict 2 Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 pb-20">
                        {studios.map((studio) => (
                            <div key={studio._id} className="group relative h-[600px] w-full bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden hover:border-accent-primary/50 transition-colors duration-500">

                                {/* 1. TEXT LAYER (Anchored Top-Left) - High Z-Index */}
                                <div className="absolute top-0 left-0 p-8 z-50 max-w-sm pointer-events-none">
                                    <h3 className="text-4xl font-serif font-bold text-white mb-3 tracking-wide drop-shadow-lg italic">
                                        {studio.name}
                                    </h3>
                                    <p className="text-lg font-serif italic text-accent-primary/90 mb-6">
                                        "{studio.tagline}"
                                    </p>

                                </div>

                                {/* 2. IMAGE LAYER (Anchored Bottom-Right) */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none z-10"></div>

                                {/* 2. IMAGE WRAPPER (Centered & Pushed/Lowered) */}
                                {/* 2. IMAGE WRAPPER (Centered & Pushed/Lowered) - New Sibling Blur Logic */}
                                <div className="absolute inset-0 flex items-center justify-center z-20 mt-16 pointer-events-auto">
                                    <div className="flex items-center justify-center -space-x-12 group/stack px-4 py-8">
                                        {studio.featuredFilms.slice(0, 4).map((film, idx) => (
                                            <Link
                                                key={idx}
                                                to={`/movie/${film.movieId}`}
                                                className={`
                                                    /* 1. LAYOUT & SHAPE (Applied to Link) */
                                                    block relative w-36 h-56 rounded-lg shadow-2xl border border-white/10
                                                    transition-all duration-500 ease-out cursor-pointer overflow-hidden

                                                    /* 2. FAN POSITIONING (Alternating Tilt) */
                                                    ${idx % 2 === 0 ? '-rotate-3 translate-y-2' : 'rotate-3 -translate-y-2'}

                                                    /* 3. GROUP BLUR (Dim others) */
                                                    group-hover/stack:blur-[2px]
                                                    group-hover/stack:brightness-50
                                                    group-hover/stack:scale-95
                                                    group-hover/stack:grayscale-[60%]

                                                    /* 4. SELF FOCUS (Highlight Me) */
                                                    /* Use !filter-none to NUKE all filters instantly */
                                                    hover:!filter-none
                                                    hover:!opacity-100
                                                    hover:!scale-110
                                                    hover:!z-50
                                                    hover:!rotate-0
                                                    hover:!translate-y-0
                                                    hover:shadow-[0_0_30px_rgba(212,175,53,0.4)]
                                                    hover:border-accent-primary
                                                    /* Speed up the "Focus" transition */
                                                    hover:duration-200
                                                `}
                                            >
                                                <img
                                                    src={film.posterUrl}
                                                    alt={film.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. CURATOR NOTE (Slide Up from Bottom) */}
                                <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/95 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-50">
                                    <p className="text-sm text-gray-300 border-l-2 border-accent-primary pl-4 line-clamp-3 leading-relaxed">
                                        {studio.curatorNote}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Load More */}
                    <div className="mt-12 text-center pb-20">
                        <button className="inline-flex items-center gap-2 text-gray-400 hover:text-accent-primary transition-colors text-sm font-medium tracking-wide uppercase">
                            Load More Studios
                            <span className="text-lg">↓</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Studios;
