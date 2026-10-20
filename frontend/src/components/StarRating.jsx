import { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { useMovie } from '../context/MovieContext';

export default function StarRating({ movie }) {
    const { getMovieRating, setMovieRating } = useMovie();
    const movieId = movie._id || movie.id;
    const currentRating = getMovieRating(movieId);
    const [hoveredRating, setHoveredRating] = useState(0);

    return (
        <div className="mt-6 w-full">
            {/* Mobile: compact centered row. Desktop: full-width justified to match poster */}
            <div className="flex gap-3 justify-center md:justify-between items-center md:w-full max-w-[180px] md:max-w-none mx-auto md:mx-0">
                {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoveredRating || currentRating) >= star;
                    return (
                        <button
                            key={star}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setMovieRating(movie, star);
                            }}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            className="transition-transform hover:scale-110 focus:outline-none"
                            aria-label={`Rate ${star} out of 5`}
                        >
                            <FaStar
                                className={`text-2xl md:text-3xl transition-colors duration-200 ${isFilled ? 'text-gold' : 'text-white/40'
                                    }`}
                            />
                        </button>
                    );
                })}
            </div>

            {/* Rating label */}
            {currentRating > 0 && (
                <p className="text-center md:text-left mt-2 text-[12px] font-label text-gold uppercase tracking-[0.14em]">
                    Rated {currentRating} / 5
                </p>
            )}
        </div>
    );
}
