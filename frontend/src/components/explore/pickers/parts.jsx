import { useEffect, useRef } from 'react';

/**
 * What every picker shares: the panel it opens in (under the board on a desktop, a sheet
 * rising from the bottom on a phone; focus moves in when it opens and back when it closes),
 * the "take it off" choice, and the type-to-narrow field.
 */

export const PickerPanel = ({ title, onClose, children }) => {
    const panel = useRef(null);
    useEffect(() => {
        const opener = document.activeElement;
        panel.current?.focus({ preventScroll: true });
        return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); };
    }, []);
    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/70 md:hidden" onClick={onClose} aria-hidden="true" />
            <section
                ref={panel}
                tabIndex={-1}
                role="dialog"
                aria-label={title}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[82vh] overflow-y-auto overscroll-contain rounded-t-2xl bg-[#0b0a09] ring-1 ring-white/10 px-5 pt-5 pb-8 outline-none md:static md:z-auto md:mt-6 md:max-h-none md:overflow-visible md:rounded-none md:px-8 md:pt-6 md:pb-8 md:shadow-[0_30px_70px_-30px_rgba(0,0,0,0.95)]"
            >
                <div className="flex items-center justify-between gap-4 mb-5">
                    <h2 className="font-label text-[13px] tracking-[0.14em] uppercase text-gold">{title}</h2>
                    <button type="button" onClick={onClose} className="font-label text-[13px] tracking-[0.14em] uppercase text-gray-300 hover:text-white px-2 py-1">Done</button>
                </div>
                {children}
            </section>
        </>
    );
};

// the picker's first choice: none at all ("Everywhere", "Anyone"). It's how a choice comes off the board.
export const Clear = ({ label, onClick, active }) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`mb-5 inline-flex items-center gap-2.5 pl-2.5 pr-4 py-1.5 rounded-full ring-1 font-label text-[12px] tracking-[0.14em] uppercase transition-colors ${active ? 'ring-gold/70 bg-gold/10 text-gold-light' : 'ring-white/25 text-gray-200 hover:ring-gold/60 hover:text-gold-light'}`}
    >
        <span aria-hidden="true" className={`w-3.5 h-3.5 rounded-full ring-1 flex items-center justify-center ${active ? 'ring-gold-light' : 'ring-white/40'}`}>
            {active && <span className="w-1.5 h-1.5 rounded-full bg-gold-light" />}
        </span>
        {label}
    </button>
);

export const Filter = ({ value, onChange, placeholder }) => (
    <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full md:w-80 mb-5 bg-transparent border-b border-white/20 focus:border-gold outline-none py-2 text-[17px] text-gray-100 placeholder:text-gray-500 [&::-webkit-search-cancel-button]:appearance-none"
    />
);
