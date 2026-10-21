import { motion } from 'framer-motion';

/**
 * A row of choices set like the figures in a printed programme: each a large light numeral (its count)
 * over its name in small capitals, the one chosen lit, a gold rule sliding under it as the choice
 * moves. items: [{ key, label, count }] · value · onChange(key) · layoutId: the sliding rule's own
 * name · tabs: the choices are tabs (a shelf), not plain buttons · size: 'lg' | 'md' · onHover(key | null)
 */
const Picker = ({ items, value, onChange, onHover, layoutId, tabs = false, size = 'lg', label }) => (
    <div role={tabs ? 'tablist' : 'group'} aria-label={label} className={`flex flex-wrap border-b border-white/[0.08] ${size === 'lg' ? 'gap-x-9 md:gap-x-14' : 'gap-x-7 md:gap-x-10'} gap-y-2`}>
        {items.map(({ key, label: name, count }) => {
            const on = key === value;
            return (
                <button
                    key={key}
                    type="button"
                    role={tabs ? 'tab' : undefined}
                    aria-selected={tabs ? on : undefined}
                    aria-pressed={tabs ? undefined : on}
                    onClick={() => onChange(key)}
                    onMouseEnter={onHover ? () => onHover(key) : undefined}
                    onMouseLeave={onHover ? () => onHover(null) : undefined}
                    className="group relative flex flex-col items-start pt-1 pb-3.5 text-left"
                >
                    {count != null && (
                        <span className={`font-serif font-light leading-none [font-variant-numeric:lining-nums_tabular-nums] transition-colors ${size === 'lg' ? 'text-[2.3rem] md:text-[2.9rem]' : 'text-[1.7rem] md:text-[2.1rem]'} ${on ? 'text-gold-light' : 'text-gray-500 group-hover:text-gray-300'}`}>
                            {count}
                        </span>
                    )}
                    <span className={`mt-2 font-label text-[12px] md:text-[13px] tracking-[0.14em] uppercase whitespace-nowrap transition-colors ${on ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{name}</span>
                    {on && <motion.span layoutId={layoutId} aria-hidden="true" className="absolute left-0 right-0 -bottom-px h-[2px] bg-gold" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                </button>
            );
        })}
    </div>
);

export default Picker;
