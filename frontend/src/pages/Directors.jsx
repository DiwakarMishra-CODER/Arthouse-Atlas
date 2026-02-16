import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { MdSearch } from 'react-icons/md';
import Dropdown from '../components/Dropdown';

const Directors = () => {
    const [directors, setDirectors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        fetchDirectors();
    }, []);

    const fetchDirectors = async () => {
        try {
            const response = await api.get('/directors');
            setDirectors(response.data.data);
        } catch (error) {
            console.error('Failed to fetch directors:', error);
        } finally {
            setLoading(false);
        }
    };

    const getLifespan = (director) => {
        const birth = director.birthDate?.split('-')[0] || '?';
        const death = director.deathDate?.split('-')[0] || 'Present';
        return `${birth} — ${death}`;
    };

    // Filter directors based on search query
    const filteredDirectors = directors.filter(director =>
        director.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <div className="text-xl text-gray-400">Loading auteurs...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-[#fffff0]">
            {/* Header */}
            <header className="w-full px-6 md:px-16 pt-24 pb-8 md:pb-16 flex flex-col md:flex-row justify-between items-end gap-6 md:gap-10">
                <div className="relative w-full md:w-auto">
                    <div className="absolute -left-10 top-0 w-1 h-full bg-[#d4af37]/20 hidden md:block"></div>
                    <h1 className="text-4xl md:text-8xl font-['Playfair_Display'] font-medium mb-4 md:mb-6 leading-none text-[#fffff0]">
                        The <span className="text-[#d4af37] italic">Auteurs</span>
                    </h1>
                    <p className="text-sm md:text-xl text-[#888888] max-w-2xl font-light font-['Playfair_Display'] italic tracking-wide">
                        Visionaries who sculpted light and shadow into meaning. Explore the minds that defined the grammar of cinema.
                    </p>
                </div>

                {/* Search Box */}
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center w-full md:w-auto">
                    {/* Search Box */}
                    <div className="relative w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Search directors..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full md:w-64 px-5 py-3 bg-transparent border border-white/20 text-white placeholder-[#888888] focus:border-[#d4af37] focus:outline-none transition-colors text-sm tracking-wide"
                        />
                        <MdSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888] text-xl pointer-events-none" />
                    </div>

                    {/* Quick Select Dropdown */}
                    <div className="w-full md:w-64">
                        <Dropdown
                            options={[...directors] // Create copy to avoid mutating state
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((d) => ({ value: d._id, label: d.name }))}
                            onChange={(val) => {
                                if (val) window.location.href = `/directors/${val}`;
                            }}
                            placeholder="Jump to Director..."
                            searchable={true}
                            className="w-full"
                        />
                    </div>
                </div>
            </header>

            {/* Directors Grid */}
            <main className="flex-grow px-4 md:px-16 pb-32">
                {filteredDirectors.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-xl text-gray-500">No directors found matching "{searchQuery}"</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-x-2 gap-y-6 md:grid-cols-4 md:gap-x-10 md:gap-y-16">
                        {filteredDirectors.map((director) => (
                            <Link
                                key={director._id}
                                to={`/directors/${director._id}`}
                                className="group relative cursor-pointer md:block flex flex-col items-center"
                            >
                                <div className="w-20 h-20 rounded-full md:w-full md:h-auto md:aspect-[3/4] md:rounded-none overflow-hidden bg-[#0f0f0f] md:mb-6 relative border border-white/5 group-hover:border-[#d4af37]/30 transition-colors duration-500 mx-auto">
                                    <img
                                        alt={`Portrait of ${director.name}`}
                                        className="w-full h-full object-cover md:object-top grayscale contrast-125 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] scale-100 group-hover:scale-110 group-hover:contrast-110 group-hover:brightness-100"
                                        src={director.profileUrl || 'https://via.placeholder.com/400x600?text=No+Image'}
                                    />
                                    <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500"></div>

                                    {/* View Filmography Button (Desktop Only) */}
                                    <div className="absolute bottom-8 left-0 right-0 hidden md:flex justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out">
                                        <button className="bg-[#d4af37] text-black px-8 py-3 text-[10px] font-bold tracking-[0.25em] uppercase hover:bg-white transition-colors duration-300">
                                            View Filmography
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1 md:space-y-3 px-0 md:px-2 w-full">
                                    <div className="flex flex-col md:flex-row justify-center md:justify-between items-center md:items-baseline border-b-0 md:border-b border-white/10 md:pb-2 group-hover:border-[#d4af37]/50 transition-colors duration-500">
                                        <h3 className="text-xs md:text-3xl text-center md:text-left font-['Playfair_Display'] text-[#fffff0] font-normal group-hover:text-[#d4af37] transition-colors duration-300 line-clamp-2 md:line-clamp-none">
                                            {director.name}
                                        </h3>
                                        <span className="hidden md:inline text-[10px] font-mono text-[#d4af37]/70 tracking-wider">
                                            {getLifespan(director)}
                                        </span>
                                    </div>
                                    <p className="hidden md:block text-sm text-[#888888] font-light leading-relaxed font-serif italic opacity-80 group-hover:opacity-100 transition-opacity line-clamp-2">
                                        {director.bio?.split('.')[0] || 'A legendary filmmaker.'}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Directors;
