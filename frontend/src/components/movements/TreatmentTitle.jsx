import { treatmentFor, displayTitle } from './treatments';

/**
 * A movement's name, typeset the way that cinema set its own titles.
 * size: 'card' (the wall) · 'teaser' (next reel) · 'display' (the title card)
 */

const SIZE = {
    card: 'text-[1.55rem] md:text-[1.9rem]',
    teaser: 'text-4xl md:text-6xl',
    display: 'text-[2.8rem] sm:text-6xl md:text-7xl lg:text-[6.5rem]'
};
// slow cinema is set small on purpose; restraint is the treatment
const SMALL = {
    card: 'text-[11px] md:text-xs',
    teaser: 'text-sm md:text-lg',
    display: 'text-3xl md:text-5xl'
};
const COLLAGE = [
    { cls: 'bg-[#f1ead8] text-black font-serif italic', rot: '-rotate-3', move: 'group-hover:-translate-x-2 group-hover:-translate-y-1' },
    { cls: 'bg-black text-white font-oswald uppercase ring-1 ring-white/30', rot: 'rotate-2', move: 'group-hover:translate-x-3' },
    { cls: 'bg-[#e8d44d] text-black font-courier', rot: '-rotate-1', move: 'group-hover:-translate-y-2' },
    { cls: 'bg-white text-black font-sans font-black uppercase', rot: 'rotate-3', move: 'group-hover:translate-x-2 group-hover:translate-y-2' }
];

const TreatmentTitle = ({ movement, size = 'card', as: Tag = 'h3', center = false }) => {
    const t = treatmentFor(movement);
    const title = displayTitle(movement);
    const sz = SIZE[size];
    const words = title.split(/\s+/);
    const justify = center ? 'justify-center' : '';

    switch (t.key) {
        case 'expressionist':
            return (
                <Tag className={`font-serif italic font-bold uppercase leading-[0.88] tracking-tight text-[#efe9da] -skew-x-12 -rotate-[4deg] ${center ? 'origin-center' : 'origin-left'} [text-shadow:6px_6px_0_rgba(0,0,0,0.9)] ${sz}`}>
                    {title}
                </Tag>
            );

        case 'constructivist':
            return (
                <div className={`flex ${justify}`}>
                    <div className="-rotate-[7deg] origin-left">
                        <Tag className={`font-oswald font-bold uppercase leading-[0.95] tracking-[0.01em] text-black bg-[#d0201f] px-3 md:px-4 py-1 md:py-1.5 shadow-[7px_7px_0_#000] ${sz}`}>
                            {title}
                        </Tag>
                    </div>
                </div>
            );

        case 'classical':
            return (
                <div className={`flex items-center gap-4 md:gap-6 ${center || size !== 'display' ? 'justify-center' : ''}`}>
                    <span className="h-px w-8 md:w-16 bg-[#c5a059]/60 flex-shrink-0" />
                    <Tag className={`font-cinzel uppercase tracking-[0.18em] text-[#d8b878] text-center leading-tight ${size === 'card' ? 'text-lg md:text-xl' : sz}`}>
                        {title}
                    </Tag>
                    <span className="h-px w-8 md:w-16 bg-[#c5a059]/60 flex-shrink-0" />
                </div>
            );

        case 'nouvelle':
            return (
                <Tag className={`flex flex-wrap gap-1.5 md:gap-2 ${justify} ${sz}`}>
                    {words.map((w, i) => {
                        const box = t.boxes[i % t.boxes.length];
                        return (
                            <span key={i} className="font-sans font-extrabold lowercase leading-none tracking-tight px-2 md:px-3 py-1 md:py-1.5" style={{ backgroundColor: box.bg, color: box.fg }}>
                                {w}
                            </span>
                        );
                    })}
                </Tag>
            );

        case 'neorealist':
            return (
                <Tag className={`font-courier text-[#e8e2d4] leading-tight ${center ? 'text-center' : ''} ${size === 'card' ? 'text-xl md:text-2xl' : sz}`}>
                    {title}
                    <span className="text-[#bfb39b]/70">.</span>
                </Tag>
            );

        case 'contemplative':
            return (
                <Tag className={`font-serif font-light uppercase tracking-[0.5em] text-gray-300 text-center ${SMALL[size]}`}>
                    {title}
                </Tag>
            );

        case 'neon':
            return (
                <Tag
                    className={`font-oswald font-semibold uppercase tracking-[0.04em] leading-[0.95] ${center ? 'text-center' : ''} ${sz}`}
                    style={{ color: t.accent, textShadow: `0 0 10px ${t.accent}cc, 0 0 28px ${t.accent}88, 0 0 60px ${t.accent}44` }}
                >
                    {title}
                </Tag>
            );

        case 'raw':
            return (
                <Tag className={`font-mono uppercase tracking-[0.12em] text-white leading-tight ${center ? 'text-center' : ''} ${size === 'card' ? 'text-lg md:text-xl' : sz}`}>
                    <span className="text-[#ff3b30] mr-2">■</span>{title}
                </Tag>
            );

        case 'collage':
            return (
                <Tag className={`flex flex-wrap items-center gap-1 ${justify} ${sz}`}>
                    {words.map((w, i) => {
                        const s = COLLAGE[i % COLLAGE.length];
                        return (
                            <span key={i} className={`inline-block px-2 py-0.5 leading-none shadow-[3px_3px_0_rgba(0,0,0,0.6)] transition-transform duration-500 motion-reduce:transition-none ${s.cls} ${s.rot} ${s.move}`}>
                                {w}
                            </span>
                        );
                    })}
                </Tag>
            );

        default:
            return <Tag className={`font-serif font-bold text-white ${sz}`}>{title}</Tag>;
    }
};

export default TreatmentTitle;
