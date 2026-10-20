/**
 * A silent film's title card. Between the reels of the wall it says where you are (a decade,
 * a run of the canon); at the end of the wall it says The End; on an empty wall, that nothing
 * fits. On the wall its words strike on like the frames' lamps as it comes into view; `still`
 * shows them at once.
 */

const Rule = () => (
    <svg aria-hidden="true" viewBox="0 0 120 10" className="mx-auto w-28 h-2.5 text-gold/70" fill="none" stroke="currentColor">
        <path d="M0 5h48M72 5h48" strokeWidth="0.8" />
        <path d="M60 1l4 4-4 4-4-4z" fill="currentColor" stroke="none" />
    </svg>
);

const Intertitle = ({ kicker, title, children, still = false, className = '' }) => (
    <div className={`intertitle-card relative mx-auto w-full max-w-3xl px-8 py-10 md:py-12 text-center ${still ? 'intertitle-static' : ''} ${className}`}>
        <div className="intertitle-text">
            <Rule />
            {kicker && <div className="mt-4 font-label text-[12px] tracking-[0.14em] uppercase text-gray-400">{kicker}</div>}
            <div className="mt-2 font-serif italic text-[2.1rem] md:text-5xl leading-tight text-white">{title}</div>
            {children}
            <div className="mt-5"><Rule /></div>
        </div>
    </div>
);

export default Intertitle;
