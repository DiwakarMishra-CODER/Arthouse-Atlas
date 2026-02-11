const TagChip = ({ tag, isActive = false, onClick }) => {
    return (
        <button
            onClick={() => onClick && onClick(tag)}
            className={`px-4 py-2 text-sm tracking-wide transition-all ${isActive
                    ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
                } border`}
        >
            {tag}
        </button>
    );
};

export default TagChip;
