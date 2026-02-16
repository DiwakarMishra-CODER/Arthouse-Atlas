import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import PosterCard from '../components/PosterCard';

const DirectorDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [director, setDirector] = useState(null);
    const [films, setFilms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDirector();
    }, [id]);

    const fetchDirector = async () => {
        try {
            const response = await api.get(`/directors/${id}`);
            setDirector(response.data.data);
            setFilms(response.data.data.films || []);
        } catch (error) {
            console.error('Failed to fetch director:', error);
        } finally {
            setLoading(false);
        }
    };

    const getLifespan = () => {
        if (!director) return '';
        const birth = director.birthDate?.split('-')[0] || '?';
        const death = director.deathDate?.split('-')[0] || 'Present';
        return `${birth} – ${death}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center bg-[#050505]">
                <div className="text-xl text-gray-400">Loading...</div>
            </div>
        );
    }

    if (!director) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center bg-[#050505]">
                <div className="text-xl text-gray-400">Director not found</div>
            </div>
        );
    }

    return (
        <>
            {/* MOBILE VIEW (Floating Portrait) */}
            <div className="md:hidden min-h-screen bg-black text-white pb-12 font-sans">
                {/* Header (Atmosphere) */}
                <div className="relative w-full h-[30vh] overflow-hidden">
                    {director.profileUrl ? (
                        <img
                            src={director.profileUrl}
                            alt="Backdrop"
                            className="w-full h-full object-cover blur-sm opacity-50"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-b from-[#1a1a1a] via-black to-black" />
                    )}
                    {/* Back Button */}
                    <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 bg-black/50 rounded-full text-white z-20 backdrop-blur-sm">
                        <span className="material-icons-round">arrow_back</span>
                    </button>
                </div>

                {/* Floating Portrait */}
                <div className="relative -mt-20 z-10 flex justify-center">
                    <img
                        src={director.profileUrl || 'https://via.placeholder.com/400x600?text=No+Image'}
                        alt={director.name}
                        className="w-40 h-40 rounded-full border-2 border-[#C5A059] shadow-2xl object-cover"
                    />
                </div>

                {/* Info Section */}
                <div className="flex flex-col items-center px-6 mt-6 text-center">
                    <h1 className="text-4xl font-serif text-white mb-2 leading-tight">{director.name}</h1>
                    <div className="text-[#C5A059] text-sm tracking-widest uppercase mb-6 font-medium">
                        {getLifespan()}
                        {director.placeOfBirth && ` • ${director.placeOfBirth.split(',').pop().trim()}`}
                    </div>
                    <div className="text-gray-400 text-sm leading-relaxed line-clamp-6">
                        {director.bio || 'No biography available.'}
                    </div>
                </div>

                {/* Filmography Section */}
                <div className="mt-8">
                    <h3 className="text-xl font-serif text-white mb-4 px-6 border-l-2 border-[#C5A059] mx-6">Essential Films</h3>
                    {films.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 px-2">
                            {films.map(film => (
                                <div key={film._id} className="relative z-0 hover:z-50">
                                    <PosterCard movie={film} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center text-sm py-8">No films available</p>
                    )}
                </div>
            </div>

            {/* DESKTOP VIEW */}
            <div className="hidden md:block min-h-screen text-[#E5E5E5] font-sans">
                {/* Hero Section */}
                <header className="relative w-full h-[85vh] flex items-end justify-center pb-24 overflow-hidden">
                    <img
                        alt={`Cinematic backdrop for ${director.name}`}
                        className="absolute inset-0 w-full h-full object-cover object-top opacity-60"
                        style={{ filter: 'brightness(0.6) contrast(1.1)' }}
                        src={director.backdropUrl || director.profileUrl || 'https://via.placeholder.com/1920x1080'}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/60 via-[#050505]/20 to-[#050505]"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent h-2/3 bottom-0"></div>

                    <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
                        <h1 className="font-['Playfair_Display'] text-6xl md:text-8xl lg:text-9xl font-bold text-white mb-6 drop-shadow-2xl tracking-tighter">
                            {director.name.split(' ')[0]}{' '}
                            <span className="text-[#d4af37] italic font-serif">
                                {director.name.split(' ').slice(1).join(' ')}
                            </span>
                        </h1>
                        <div className="flex items-center justify-center space-x-4 text-[#d4af37]/80 text-sm md:text-base tracking-[0.2em] uppercase font-medium">
                            <span>{getLifespan()}</span>
                            <span className="w-1 h-1 bg-[#d4af37] rounded-full"></span>
                            <span>{director.placeOfBirth?.split(',').pop()?.trim() || 'Unknown'}</span>
                            <span className="w-1 h-1 bg-[#d4af37] rounded-full"></span>
                            <span>Master Director</span>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-grow max-w-7xl mx-auto px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-16">
                    {/* Left Column - Bio & Style */}
                    <section className="lg:col-span-4 space-y-16 ">{/* Biography */}
                        <div>
                            <h3 className="text-3xl text-white mb-8 border-l-2 border-[#d4af37] pl-6 py-2 font-['Playfair_Display']">
                                Biography
                            </h3>
                            <div className="space-y-6 text-gray-400 leading-relaxed font-light text-base">
                                {director.bio ? (
                                    director.bio.split('\n\n').slice(0, 3).map((paragraph, idx) => (
                                        <p key={idx}>{paragraph}</p>
                                    ))
                                ) : (
                                    <p>No biography available.</p>
                                )}
                            </div>
                        </div>

                        {/* Style & Influence */}
                        {director.keyStyles && director.keyStyles.length > 0 && (
                            <div>
                                <h3 className="font-['Playfair_Display'] text-2xl text-white mb-8 border-l-2 border-[#d4af37] pl-6 py-2">
                                    Style & Influence
                                </h3>
                                <ul className="space-y-8">
                                    {director.keyStyles.map((style, idx) => (
                                        <li key={idx} className="group">
                                            <div className="flex items-baseline mb-2">
                                                <span className="material-icons text-[#d4af37] mr-3 text-lg group-hover:text-white transition-colors">
                                                    auto_awesome
                                                </span>
                                                <h4 className="font-bold text-white text-lg tracking-wide">
                                                    {style}
                                                </h4>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Awards */}
                        {director.awards && director.awards.length > 0 && (
                            <div className="pt-8 border-t border-white/10">
                                <div className="flex flex-wrap gap-3">
                                    {director.awards.map((award, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-block px-4 py-1.5 bg-[#121212] border border-white/10 text-xs font-medium uppercase tracking-widest text-[#A3A3A3] hover:border-[#d4af37]/50 hover:text-[#d4af37] transition-all cursor-default"
                                        >
                                            {award}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Right Column - Essential Films */}
                    <section className="lg:col-span-8 pl-0 lg:pl-12 border-l-0 lg:border-l border-white/5">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="font-['Playfair_Display'] text-4xl text-white">
                                Essential Films
                            </h3>
                        </div>


                        {films.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {films.map((film) => (
                                    <div key={film._id} className="relative hover:z-50">
                                        <PosterCard movie={film} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-xl text-gray-500 mb-4">No films in database yet</p>
                                <p className="text-sm text-gray-600">
                                    Films from this director will appear here once added to the collection.
                                </p>
                            </div>
                        )}
                    </section>
                </main>
            </div>
        </>
    );
};

export default DirectorDetail;
