import { Link } from 'react-router-dom';

const HeroCollage = ({ movies = [] }) => {
    // Use first 3 movies for collage
    const displayMovies = movies.slice(0, 3);

    if (displayMovies.length === 0) {
        return null;
    }

    return (
        <div className="relative w-full h-[600px] flex items-center justify-center">
            {/* Overlapping Posters */}
            <div className="relative w-[500px] h-[500px]">
                {displayMovies.map((movie, index) => (
                    <Link
                        key={movie._id || index}
                        to={`/movie/${movie._id}`}
                        className="absolute w-64 aspect-poster rounded-sm overflow-hidden shadow-2xl hover:scale-105 transition-transform duration-300 cursor-pointer"
                        style={{
                            transform: `rotate(${(index - 1) * 8}deg) translateX(${(index - 1) * 100}px) translateY(${index * 20}px)`,
                            zIndex: displayMovies.length - index,
                        }}
                    >
                        {movie.posterUrl ? (
                            <img
                                src={movie.posterUrl}
                                alt={movie.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-surface flex items-center justify-center text-muted">
                                No Image
                            </div>
                        )}
                    </Link>
                ))}
            </div>

            {/* Headline & Tags */}
            <div className="absolute right-0 max-w-md">
                <h2 className="font-serif text-6xl leading-tight text-gray-100 mb-6">
                    Cinema that <br />
                    <span className="text-accent-primary italic">lingers</span>
                </h2>
                <p className="text-muted text-lg mb-8 leading-relaxed">
                    Discover arthouse films through mood, style, and cinematic language—not algorithms.
                </p>
                <div className="flex flex-wrap gap-3">
                    {['melancholic', 'dreamlike', 'contemplative', 'poetic'].map((tag) => (
                        <span
                            key={tag}
                            className="px-4 py-2 bg-white/5 border border-white/10 text-sm text-gray-300 tracking-wide"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HeroCollage;
