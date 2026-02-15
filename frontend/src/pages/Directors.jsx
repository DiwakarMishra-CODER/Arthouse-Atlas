import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
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
            const response = await axios.get('http://localhost:5000/api/directors');
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
            <header className="w-full px-6 md:px-16 pt-24 pb-16 flex flex-col md:flex-row justify-between items-end gap-10">
                <div className="relative">
                    <div className="absolute -left-10 top-0 w-1 h-full bg-[#d4af37]/20 hidden md:block"></div>
                    <h1 className="text-6xl md:text-8xl font-['Playfair_Display'] font-medium mb-6 leading-none text-[#fffff0]">
                        The <span className="text-[#d4af37] italic">Auteurs</span>
                    </h1>
                    <p className="text-lg md:text-xl text-[#888888] max-w-2xl font-light font-['Playfair_Display'] italic tracking-wide">
                        Visionaries who sculpted light and shadow into meaning. Explore the minds that defined the grammar of cinema.
                    </p>
                </div>

                {/* Search Box */}
                <div className="flex gap-4 items-center">
                    {/* Search Box */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search directors..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-64 px-5 py-3 bg-transparent border border-white/20 text-white placeholder-[#888888] focus:border-[#d4af37] focus:outline-none transition-colors text-sm tracking-wide"
                        />
                        <MdSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888] text-xl pointer-events-none" />
                    </div>

                    {/* Quick Select Dropdown */}
                    <div className="w-64">
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
            <main className="flex-grow px-6 md:px-16 pb-32">
                {filteredDirectors.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-xl text-gray-500">No directors found matching "{searchQuery}"</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-10 gap-y-16">
                        {filteredDirectors.map((director) => (
                            <Link
                                key={director._id}
                                to={`/directors/${director._id}`}
                                className="group relative cursor-pointer"
                            >
                                <div className="aspect-[3/4] overflow-hidden bg-[#0f0f0f] mb-6 relative border border-white/5 group-hover:border-[#d4af37]/30 transition-colors duration-500">
                                    <img
                                        alt={`Portrait of ${director.name}`}
                                        className="w-full h-full object-cover object-top grayscale contrast-125 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] scale-100 group-hover:scale-110 group-hover:contrast-110 group-hover:brightness-100"
                                        src={director.profileUrl || 'https://via.placeholder.com/400x600?text=No+Image'}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500"></div>

                                    {/* View Filmography Button */}
                                    <div className="absolute bottom-8 left-0 right-0 flex justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out">
                                        <button className="bg-[#d4af37] text-black px-8 py-3 text-[10px] font-bold tracking-[0.25em] uppercase hover:bg-white transition-colors duration-300">
                                            View Filmography
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 px-2">
                                    <div className="flex justify-between items-baseline border-b border-white/10 pb-2 group-hover:border-[#d4af37]/50 transition-colors duration-500">
                                        <h3 className="text-3xl font-['Playfair_Display'] text-[#fffff0] font-normal group-hover:text-[#d4af37] transition-colors duration-300">
                                            {director.name}
                                        </h3>
                                        <span className="text-[10px] font-mono text-[#d4af37]/70 tracking-wider">
                                            {getLifespan(director)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-[#888888] font-light leading-relaxed font-serif italic opacity-80 group-hover:opacity-100 transition-opacity line-clamp-2">
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
