import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PosterCard from '../PosterCard';
import { sized } from './treatments';

/**
 * A movement's films as an index — year, title, director, country — the way
 * a programme or a retrospective catalogue lists them. Hovering a row floats
 * that film's still beside the cursor. A toggle keeps the poster grid.
 */
const FilmIndexList = ({ films, treatment }) => {
    const [view, setView] = useState('index');
    const [preview, setPreview] = useState(null);
    const previewRef = useRef(null);

    // move the preview without re-rendering the list
    const track = (e) => {
        const el = previewRef.current;
        if (!el) return;
        const x = Math.min(e.clientX + 28, window.innerWidth - el.offsetWidth - 16);
        const y = Math.max(16, e.clientY - el.offsetHeight / 2);
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    return (
        <div>
            <div className="flex items-center gap-5 text-xs tracking-[0.25em] uppercase mb-6">
                {['index', 'posters'].map((v) => (
                    <button
                        key={v}
                        onClick={() => setView(v)}
                        aria-pressed={view === v}
                        className={`pb-1 border-b transition-colors ${view === v ? 'text-white border-current' : 'text-gray-400 border-transparent hover:text-gray-300'}`}
                        style={view === v ? { color: treatment.accent } : undefined}
                    >
                        {v}
                    </button>
                ))}
            </div>

            {view === 'posters' ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
                    {films.map((film) => (
                        <div key={film._id} className="relative z-0 hover:z-50">
                            <PosterCard movie={film} />
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <ol className="border-t border-white/[0.08]" onMouseMove={track}>
                        {films.map((film) => (
                            <li key={film._id}>
                                <Link
                                    to={`/movie/${film._id}`}
                                    onMouseEnter={() => setPreview(film)}
                                    onMouseLeave={() => setPreview(null)}
                                    className="group grid grid-cols-[3.25rem_1fr] md:grid-cols-[4.5rem_1fr_13rem] items-baseline gap-x-4 py-4 md:py-5 border-b border-white/[0.08] transition-colors hover:bg-white/[0.025]"
                                >
                                    <span className="font-mono text-sm text-gray-400 transition-colors group-hover:text-[var(--accent)]" style={{ '--accent': treatment.accent }}>
                                        {film.year}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="font-serif text-xl md:text-[1.7rem] leading-tight text-gray-200 group-hover:text-white transition-colors">
                                            {film.title}
                                        </span>
                                        <span className="block md:inline md:ml-4 text-sm text-gray-500 mt-1 md:mt-0">
                                            {(film.directors || []).join(', ')}
                                        </span>
                                    </span>
                                    <span className="hidden md:block text-right text-[11px] uppercase tracking-[0.25em] text-gray-400">
                                        {film.country}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ol>

                    {/* floating still (pointer devices only) */}
                    <div
                        ref={previewRef}
                        className={`hidden md:block fixed top-0 left-0 z-50 w-[22rem] pointer-events-none transition-opacity duration-300 ${preview ? 'opacity-100' : 'opacity-0'}`}
                        aria-hidden="true"
                    >
                        {preview && (preview.stills?.[0] || preview.backdropUrl) && (
                            <div className="aspect-video overflow-hidden ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] bg-black">
                                <img
                                    src={sized(preview.stills?.[0] || preview.backdropUrl, 'w780')}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    style={{ filter: treatment.screenFilter }}
                                />
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default FilmIndexList;
