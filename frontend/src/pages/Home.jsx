import { Link } from 'react-router-dom';

import HeroFeature from '../components/HeroFeature';
import PosterCard from '../components/PosterCard';
import LoadingSkeleton from '../components/LoadingSkeleton';

const Home = () => {

    return (
        <div className="min-h-screen pt-24">
            {/* Hero Section */}
            <div className="relative w-full mb-24">
                <HeroFeature />
            </div>

            {/* MANIFESTO SECTION - Replaces Recently Added */}
            <section className="relative py-32 px-4 md:px-0 border-y border-white/5">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* LEFT: The Question */}
                    <div className="relative">
                        {/* Decorative background element */}
                        <span className="absolute -top-20 -left-10 text-[12rem] font-serif text-white/5 select-none pointer-events-none leading-none">?</span>

                        <h2 className="relative z-10 text-4xl md:text-7xl font-cinzel text-primary tracking-tighter mb-6 leading-tight">
                            What is an <br />
                            <span className="text-accent-primary">Arthouse Movie?</span>
                        </h2>
                        <p className="font-mono text-primary/60 text-sm tracking-[0.2em] uppercase pl-2 border-l border-primary/30">
                            /ärt-hous/ • noun
                        </p>
                    </div>

                    {/* RIGHT: The Answer */}
                    <div className="relative">
                        <div className="absolute -inset-4 bg-primary/5 rounded-lg blur-xl -z-10"></div>
                        <div className="border-l-2 border-primary pl-8 md:pl-12 py-4">
                            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed font-serif">
                                <span className="text-accent-primary font-bold italic">Cinema as high art.</span> A rejection of the formulaic in favor of the visionary.
                            </p>
                            <p className="mt-6 text-lg text-gray-400 leading-relaxed font-light">
                                It is a medium where the director is the sole author, using film not just to tell a story, but to provoke, challenge, and explore the human condition. From the surrealism of the avant-garde to the quietude of slow cinema.
                            </p>
                        </div>
                    </div>

                </div>
            </section>

            {/* THE THREE PILLARS NAVIGATION */}
            <section className="relative py-20 px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 h-[80vh] min-h-[500px] max-h-[700px]">

                    {/* PILLAR 1: DIRECTORS */}
                    <Link to="/directors" className="group relative w-full h-full overflow-hidden rounded-3xl border border-white/10 hover:border-primary/50 transition-colors duration-500">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059&auto=format&fit=crop')] bg-cover bg-center transition-all duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"></div>
                        <div className="absolute inset-0 bg-black/60 group-hover:bg-black/30 transition-colors duration-700"></div>

                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                            <h3 className="text-3xl md:text-4xl font-cinzel mb-2 tracking-wider">
                                <span className="text-white">The</span> <span className="text-[#C5A059] group-hover:text-white transition-colors duration-500">Auteurs</span>
                            </h3>
                            <p className="text-gray-400 font-serif italic opacity-80 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                Visionaries who define the medium.
                            </p>
                        </div>
                    </Link>

                    {/* PILLAR 2: MOVEMENTS */}
                    <Link to="/movements" className="group relative w-full h-full overflow-hidden rounded-3xl border border-white/10 hover:border-primary/50 transition-colors duration-500">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2525&auto=format&fit=crop')] bg-cover bg-center transition-all duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"></div>
                        <div className="absolute inset-0 bg-black/60 group-hover:bg-black/30 transition-colors duration-700"></div>

                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                            <h3 className="text-3xl md:text-4xl font-cinzel mb-2 tracking-wider">
                                <span className="text-white">The</span> <span className="text-[#C5A059] group-hover:text-white transition-colors duration-500">Movements</span>
                            </h3>
                            <p className="text-gray-400 font-serif italic opacity-80 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                Waves that rippled through history.
                            </p>
                        </div>
                    </Link>

                    {/* PILLAR 3: LABELS */}
                    <Link to="/studios" className="group relative w-full h-full overflow-hidden rounded-3xl border border-white/10 hover:border-primary/50 transition-colors duration-500">
                        {/* TODO: To use your own custom collage of studio logos for this card:
                            1. Place your image file in frontend/public/images/
                            2. Change the URL below to: bg-[url('/images/your-collage-name.jpg')]
                        */}
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center transition-all duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"></div>
                        <div className="absolute inset-0 bg-black/60 group-hover:bg-black/30 transition-colors duration-700"></div>

                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                            <h3 className="text-3xl md:text-4xl font-cinzel mb-2 tracking-wider">
                                <span className="text-white">The</span> <span className="text-[#C5A059] group-hover:text-white transition-colors duration-500">Studios</span>
                            </h3>
                            <p className="text-gray-400 font-serif italic opacity-80 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                Institutions preserving the craft.
                            </p>
                        </div>
                    </Link>

                </div>
            </section>

            <style jsx>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default Home;
