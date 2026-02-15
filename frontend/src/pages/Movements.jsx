import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MdArrowOutward } from 'react-icons/md';
import { motion, useScroll, useTransform } from 'framer-motion';
import PosterCard from '../components/PosterCard';

const Movements = () => {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef(null);
    const [activeSection, setActiveSection] = useState(0);

    useEffect(() => {
        const fetchMovements = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/movements');
                setMovements(response.data);
            } catch (error) {
                console.error('Failed to fetch movements:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMovements();
    }, []);

    // Handle scroll spy for active section
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const index = Math.round(container.scrollTop / window.innerHeight);
            setActiveSection(index);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [loading]);

    if (loading) {
        return (
            <div className="h-screen w-full bg-black flex items-center justify-center">
                <div className="text-primary text-2xl font-serif animate-pulse">Loading Museum...</div>
            </div>
        );
    }

    return (
        <div className="relative h-screen overflow-hidden text-white selection:bg-primary selection:text-black">

            {/* Fixed Sidebar Navigation (Desktop) */}
            <nav className="fixed left-8 top-[55%] -translate-y-1/2 z-50 hidden lg:flex flex-col gap-3">
                <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/20 -z-10"></div>
                {movements.map((movement, index) => (
                    <button
                        key={movement._id}
                        onClick={() => {
                            containerRef.current.scrollTo({
                                top: index * window.innerHeight,
                                behavior: 'smooth'
                            });
                        }}
                        className={`group flex items-center justify-center transition-all duration-300 relative ${activeSection === index ? 'scale-110' : 'hover:scale-105'
                            }`}
                        aria-label={`Go to ${movement.title}`}
                    >
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 font-mono text-sm ${activeSection === index
                            ? 'border-primary bg-primary/20 text-primary shadow-[0_0_20px_rgba(212,175,53,0.6)] font-bold'
                            : 'border-white/30 bg-black/50 text-white/70 hover:border-primary hover:text-primary hover:bg-white/10'
                            }`}>
                            {index + 1}
                        </div>
                    </button>
                ))}
            </nav>

            {/* Scroll Containner */}
            <main
                ref={containerRef}
                className="h-screen w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
            >
                {movements.map((movement, index) => (
                    <section
                        key={movement._id}
                        className="h-screen w-full snap-start relative flex items-center justify-center overflow-hidden"
                    >
                        {/* Immersive Background */}
                        <div className="absolute inset-0 z-0">
                            <motion.div
                                initial={{ scale: 1.1 }}
                                whileInView={{ scale: 1.0 }}
                                transition={{ duration: 10, ease: "linear" }}
                                className="w-full h-full"
                            >
                                <img
                                    src={movement.backdropUrl || 'https://via.placeholder.com/1920x1080'}
                                    alt={movement.title}
                                    className="w-full h-full object-cover filter brightness-[0.3] contrast-125 saturate-0"
                                />
                            </motion.div>

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-black/90" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />

                            {/* Color Accent Tint */}
                            <div
                                className="absolute inset-0 mix-blend-overlay opacity-30"
                                style={{ backgroundColor: movement.colorCode }}
                            />
                        </div>

                        {/* Content Container - Grid Refactor */}
                        <div className="relative z-10 h-full w-full pl-24 pr-8 lg:pl-32 pt-24">
                            <div className="container mx-auto h-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

                                {/* Zone 1: Title & Vibe (Left Side - Cols 1-7) */}
                                <div className="col-span-1 lg:col-span-7 flex flex-col justify-center h-full relative z-20">
                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.8, delay: 0.2 }}
                                    >
                                        {/* Header Block */}
                                        <div className="mb-8">
                                            <div className="flex items-center gap-4 text-primary tracking-widest uppercase mb-4 text-sm font-medium">
                                                <span>{movement.era}</span>
                                                <span className="w-12 h-px bg-primary/50"></span>
                                                <span>Movement No. {index + 1}</span>
                                            </div>

                                            {/* Title - strictly relative with break-words */}
                                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold text-white leading-tight drop-shadow-lg mb-4 break-words max-w-4xl">
                                                {movement.title}
                                            </h1>

                                        </div>

                                        {/* Description Card - strictly relative flow */}
                                        <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-8 rounded-xl max-w-xl shadow-2xl relative z-30">
                                            <p className="text-2xl font-serif italic text-white mb-6 leading-relaxed">
                                                "{movement.vibe}"
                                            </p>
                                            <div className="h-px w-full bg-gradient-to-r from-white/20 to-transparent mb-6"></div>
                                            <p className="text-gray-300 font-light leading-relaxed text-lg mb-6">
                                                {movement.philosophy}
                                            </p>

                                            {/* Tags Row */}
                                            <div className="flex flex-wrap gap-2">
                                                {movement.visualSignatures.map((sig, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-3 py-1 border border-white/20 rounded-full text-xs uppercase tracking-wider text-gray-400"
                                                    >
                                                        {sig}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Zone 2: The Details (Right Side - Cols 8-12) */}
                                <motion.div
                                    initial={{ opacity: 0, x: 50 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.8, delay: 0.4 }}
                                    className="col-span-1 lg:col-span-5 flex flex-col justify-center gap-12 border-l border-white/10 pl-12"
                                >
                                    {/* Key Directors */}
                                    <div>
                                        <h3 className="text-primary font-serif italic text-xl mb-4">
                                            Key Figures
                                        </h3>
                                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-lg">
                                            {(movement.keyDirectors || []).map((director, idx) => (
                                                <span key={idx} className="flex items-center">
                                                    {director.directorId ? (
                                                        <Link
                                                            to={`/directors/${director.directorId}`}
                                                            className="group flex items-center gap-1 text-accent-primary border-b border-accent-primary/30 hover:border-accent-primary hover:text-white transition-all duration-300 font-serif italic"
                                                        >
                                                            {director.name}
                                                            <MdArrowOutward className="text-xs opacity-50 group-hover:opacity-100 transition-opacity" />
                                                        </Link>
                                                    ) : (
                                                        <span className="text-accent-primary cursor-default font-serif italic hover:text-white transition-colors">
                                                            {director.name}
                                                        </span>
                                                    )}

                                                    {/* Separator Dot (if not last) */}
                                                    {idx < movement.keyDirectors.length - 1 && (
                                                        <span className="text-gray-700 mx-2 text-xs">•</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Essential Collection */}
                                    <div>
                                        <h3 className="text-primary font-serif italic text-xl mb-6">
                                            Essential Collection
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {movement.essentialFilms.map((film, idx) => {
                                                // Construct compatible movie object for PosterCard
                                                const movieData = {
                                                    // Prefer populated movie data if available
                                                    ...(film.movieId && typeof film.movieId === 'object' ? film.movieId : {}),
                                                    // Fallbacks/Overwrites from local movement data
                                                    _id: film.movieId?._id || film.movieId || `missing-${idx}`, // Ensure ID for keys/links
                                                    title: film.title || film.movieId?.title,
                                                    year: film.year || film.movieId?.year,
                                                    posterUrl: film.posterUrl || film.movieId?.posterUrl,
                                                    // Ensure directors is an array if missing from populated data
                                                    directors: film.movieId?.directors || []
                                                };

                                                return (
                                                    <div key={idx} className="relative z-0 hover:z-50 transition-all duration-300">
                                                        {film.movieId ? (
                                                            <PosterCard movie={movieData} />
                                                        ) : (
                                                            /* Fallback for unlinked films - keep visual consistency but disabled */
                                                            <div className="aspect-[2/3] bg-white/5 border border-white/10 rounded-lg overflow-hidden flex flex-col items-center justify-center opacity-50">
                                                                <span className="text-3xl mb-2">🎞️</span>
                                                                <span className="text-xs text-center px-2 text-white/50">{film.title}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </motion.div>

                            </div>
                        </div>
                    </section>
                ))}
            </main>
        </div>
    );
};

export default Movements;
