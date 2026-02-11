import TagChip from './TagChip';

const DECADES = [1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

const FilterPanel = ({
    allTags = [],
    allGenres = [],
    selectedTags = [],
    onTagToggle,
    filters,
    onFilterChange,
    onSearch
}) => {
    return (
        <div className="sticky top-24 w-80 pr-8 space-y-10">
            {/* Search */}
            <div>
                <h3 className="font-serif text-xl text-gray-100 mb-4">Search</h3>
                <form onSubmit={onSearch} className="space-y-3">
                    <input
                        type="text"
                        name="search"
                        value={filters.search}
                        onChange={onFilterChange}
                        placeholder="Title or keyword..."
                        className="w-full px-4 py-3 bg-surface border border-white/10 text-gray-200 placeholder-muted focus:outline-none focus:border-accent-primary/50"
                    />
                </form>
            </div>

            {/* Genre Filter */}
            {allGenres.length > 0 && (
                <div>
                    <h3 className="font-serif text-xl text-gray-100 mb-4">Genre</h3>
                    <select
                        name="genre"
                        value={filters.genre}
                        onChange={onFilterChange}
                        className="w-full px-4 py-3 bg-surface border border-white/10 text-gray-200 focus:outline-none focus:border-accent-primary/50"
                    >
                        <option value="">All Genres</option>
                        {allGenres.map((genre) => (
                            <option key={genre} value={genre}>
                                {genre}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Decade Filter */}
            <div>
                <h3 className="font-serif text-xl text-gray-100 mb-4">Decade</h3>
                <select
                    name="decade"
                    value={filters.decade}
                    onChange={onFilterChange}
                    className="w-full px-4 py-3 bg-surface border border-white/10 text-gray-200 focus:outline-none focus:border-accent-primary/50"
                >
                    <option value="">All Decades</option>
                    {DECADES.map((decade) => (
                        <option key={decade} value={decade}>
                            {decade}s
                        </option>
                    ))}
                </select>
            </div>

            {/* Director Filter */}
            <div>
                <h3 className="font-serif text-xl text-gray-100 mb-4">Director</h3>
                <input
                    type="text"
                    name="director"
                    value={filters.director}
                    onChange={onFilterChange}
                    placeholder="Director name..."
                    className="w-full px-4 py-3 bg-surface border border-white/10 text-gray-200 placeholder-muted focus:outline-none focus:border-accent-primary/50"
                />
            </div>

            {/* Tags Filter */}
            {allTags.length > 0 && (
                <div>
                    <h3 className="font-serif text-xl text-gray-100 mb-4">Mood & Style</h3>
                    <div className="flex flex-wrap gap-2">
                        {allTags.map((tag) => (
                            <TagChip
                                key={tag}
                                tag={tag}
                                isActive={selectedTags.includes(tag)}
                                onClick={onTagToggle}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Apply Button */}
            <button
                onClick={onSearch}
                className="w-full py-3 bg-accent-primary/10 border border-accent-primary/30 text-accent-primary tracking-wide uppercase text-sm hover:bg-accent-primary/20 transition-colors"
            >
                Apply Filters
            </button>
        </div>
    );
};

export default FilterPanel;
