import { useState, useRef, useEffect } from 'react';
import { MdArrowDropDown, MdCheck } from 'react-icons/md';

const Dropdown = ({
    options = [],
    value,
    onChange,
    placeholder = 'Select...',
    searchable = false,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter options if searchable
    const filteredOptions = searchable
        ? options.filter((opt) =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : options;

    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-left flex justify-between items-center gap-2 transition-all duration-300 hover:bg-white/10 focus:outline-none focus:border-accent-primary/50 text-sm tracking-wide ${isOpen ? 'border-accent-primary/50 bg-white/10' : ''
                    }`}
            >
                <span className={selectedOption ? 'text-gray-200' : 'text-muted'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <MdArrowDropDown className={`text-xl text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full lg:left-0 left-auto right-0 mt-2 w-full lg:min-w-[200px] max-h-60 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50 flex flex-col animate-in fade-in zoom-in-95 duration-200">

                    {/* Search Input (if enabled) */}
                    {searchable && (
                        <div className="p-2 border-b border-white/10 bg-white/5">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded text-sm text-white placeholder-muted focus:border-accent-primary/50 focus:outline-none"
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Options List */}
                    <div className="overflow-y-auto custom-scrollbar flex-1">
                        {/* Reset Option (if value exists) */}
                        {value && (
                            <button
                                type="button"
                                onClick={() => {
                                    onChange('');
                                    setIsOpen(false);
                                    setSearchQuery('');
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm text-muted hover:text-white hover:bg-white/10 transition-colors border-b border-white/5"
                            >
                                Clear Selection
                            </button>
                        )}

                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                        setSearchQuery('');
                                    }}
                                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/10 flex items-center justify-between ${value === option.value
                                        ? 'bg-accent-primary/10 text-accent-primary'
                                        : 'text-gray-300'
                                        }`}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {value === option.value && (
                                        <MdCheck className="text-sm" />
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-sm text-muted text-center italic">
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dropdown;
