import { useState, useRef, useEffect } from 'react';
import Dropdown from './Dropdown';

const DECADES = [1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

const FilterPanel = ({
    allTags = [],
    allGenres = [],
    allDirectors = [],
    allTitles = [],
    selectedTags = [],
    onTagToggle,
    filters,
    onFilterChange,
    onSearch,
    onClear
}) => {
    const [isMoodOpen, setIsMoodOpen] = useState(false);
    const moodDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (moodDropdownRef.current && !moodDropdownRef.current.contains(event.target)) {
                setIsMoodOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="sticky top-24 w-80 pr-8 space-y-10">
            {/* Search */}
            <div>
                <h3 className="font-serif text-xl text-gray-100 mb-4">Search</h3>
                <Dropdown
                    options={allTitles.map((t) => ({ value: t.title, label: t.title }))}
                    value={filters.search}
                    onChange={(val) => onFilterChange({ target: { name: 'search', value: val } })}
                    placeholder="Search Titles..."
                    searchable={true}
                    className="w-full"
                />
            </div>

            {/* Genre Filter */}
            {allGenres.length > 0 && (
                <div>
                    <h3 className="font-serif text-xl text-gray-100 mb-4">Genre</h3>
                    <Dropdown
                        options={allGenres.map((g) => ({ value: g, label: g }))}
                        value={filters.genre}
                        onChange={(val) => onFilterChange({ target: { name: 'genre', value: val } })}
                        placeholder="All Genres"
                        className="w-full"
                    />
                </div>
            )}

            {/* Decade Filter */}
            <div>
                <h3 className="font-serif text-xl text-gray-100 mb-4">Decade</h3>
                <Dropdown
                    options={DECADES.map((d) => ({ value: d, label: `${d}s` }))}
                    value={filters.decade}
                    onChange={(val) => onFilterChange({ target: { name: 'decade', value: val } })}
                    placeholder="All Decades"
                    className="w-full"
                />
            </div>

            {/* Director Filter */}
            {allDirectors.length > 0 && (
                <div>
                    <h3 className="font-serif text-xl text-gray-100 mb-4">Director</h3>
                    <Dropdown
                        options={allDirectors.sort().map((d) => ({ value: d, label: d }))}
                        value={filters.director}
                        onChange={(val) => onFilterChange({ target: { name: 'director', value: val } })}
                        placeholder="Search Directors..."
                        searchable={true}
                        className="w-full"
                    />
                </div>
            )}

            {/* Tags Filter (Multi-Select Dropdown) */}
            {allTags.length > 0 && (
                <div className="relative group w-full" ref={moodDropdownRef}>
                    <h3 className="font-serif text-xl text-gray-100 mb-4">Mood & Style</h3>

                    {/* The Trigger Button */}
                    <button
                        onClick={() => setIsMoodOpen(!isMoodOpen)}
                        className={`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-left flex justify-between items-center gap-2 transition-all duration-300 hover:bg-white/10 focus:outline-none focus:border-accent-primary/50 text-sm tracking-wide ${isMoodOpen ? 'border-accent-primary/50 bg-white/10' : ''}`}
                    >
                        <span className="truncate text-gray-200">
                            {selectedTags.length === 0
                                ? "Select Mood & Style"
                                : `${selectedTags.length} Selected`}
                        </span>
                        <span className={`material-icons-round text-xl text-muted transition-transform duration-300 ${isMoodOpen ? 'rotate-180' : ''}`}>
                            arrow_drop_down
                        </span>
                    </button>

                    {/* The Dropdown Panel */}
                    {isMoodOpen && (
                        <div className="absolute z-50 top-full left-0 w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
                            {allTags.sort().map((tag) => (
                                <div
                                    key={tag}
                                    onClick={() => onTagToggle(tag)}
                                    className="flex items-center px-4 py-2.5 cursor-pointer hover:bg-white/10 transition-colors group/item border-b border-white/5 last:border-0"
                                >
                                    {/* Checkbox Visual */}
                                    <div className={`
                                        w-4 h-4 border mr-3 flex items-center justify-center transition-colors rounded
                                        ${selectedTags.includes(tag) ? 'bg-accent-primary border-accent-primary' : 'border-white/30'}
                                    `}>
                                        {selectedTags.includes(tag) && <span className="material-icons-round text-[10px] text-black font-bold">check</span>}
                                    </div>

                                    {/* Label */}
                                    <span className={`text-sm ${selectedTags.includes(tag) ? 'text-accent-primary' : 'text-gray-300 group-hover/item:text-white'}`}>
                                        {tag}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Apply & Clear Buttons */}
            <div className="space-y-3">
                <button
                    onClick={onSearch}
                    className="w-full py-3 bg-accent-primary/10 border border-accent-primary/30 text-accent-primary tracking-wide uppercase text-sm hover:bg-accent-primary/20 transition-colors rounded-xl font-medium"
                >
                    Apply Filters
                </button>

                <button
                    onClick={onClear}
                    className="w-full py-3 border border-white/10 text-gray-400 tracking-wide uppercase text-sm hover:bg-white/5 hover:text-white transition-colors rounded-xl"
                >
                    Clear All
                </button>
            </div>
        </div>
    );
};

export default FilterPanel;
