import { sized } from '../movements/treatments';

/**
 * A director's images, running past behind them like reels.
 *
 * Their stills fill a few columns that scroll endlessly — alternate columns
 * in opposite directions, each at its own speed — dimmed and graded down so
 * the portrait and name in front stay the subject. Each column holds its
 * images twice over, so the loop has no seam. Stills hold still under
 * reduced motion.
 */
const StillDrift = ({ images, columns = 4 }) => {
    if (images.length < 3) return null;
    const cols = Array.from({ length: columns }, (_, c) => {
        // every column gets a different run through the same images
        const own = images.map((_, i) => images[(i * (c + 2) + c) % images.length]);
        return [...own, ...own];
    });

    return (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-[-10%] flex gap-4 rotate-[-6deg] opacity-[0.5]">
                {cols.map((col, c) => (
                    <div
                        key={c}
                        className="flex-1 flex flex-col gap-4 still-drift"
                        style={{ animationDuration: `${70 + c * 17}s`, animationDirection: c % 2 ? 'reverse' : 'normal' }}
                    >
                        {col.map((src, i) => (
                            <img key={`${c}-${i}`} src={sized(src, 'w500')} alt="" className="w-full aspect-video object-cover grayscale contrast-[1.15]" />
                        ))}
                    </div>
                ))}
            </div>
            {/* the room darkens towards the subject */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_75%_at_30%_50%,rgba(5,5,5,0.7),rgba(5,5,5,0.55)_55%,rgba(5,5,5,0.85)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050505] to-transparent" />
        </div>
    );
};

export default StillDrift;
