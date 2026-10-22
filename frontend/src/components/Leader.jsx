/**
 * The site's loader: an Academy leader, the countdown at the head of a reel. A hand sweeps round
 * the dial once a second with a gold trail behind it, and 3, 2, 1 count down in turn, while the
 * page's film is threaded. Only a rotation and opacities move (each layer is painted once). With
 * reduced motion it holds still. `label` says what's coming, in plain words.
 */
const Leader = ({ label = 'Loading', size = 84, className = '' }) => (
    <div role="status" className={`flex flex-col items-center gap-4 ${className}`}>
        <div aria-hidden="true" className="relative rounded-full overflow-hidden bg-[#0d0c0b] ring-1 ring-white/25" style={{ width: size, height: size }}>
            {/* the sweep: a trail of light behind the hand, turning */}
            <span className="leader-spin absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_250deg,rgba(217,173,98,0.35)_355deg,rgba(217,173,98,0.6)_360deg)]" />
            <span className="leader-spin absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2 origin-bottom bg-gold/80" />
            {/* the dial */}
            <span className="absolute inset-[14%] rounded-full ring-1 ring-white/20" />
            <span className="absolute left-1/2 top-0 bottom-0 w-px bg-white/15" />
            <span className="absolute top-1/2 left-0 right-0 h-px bg-white/15" />
            {/* the count */}
            <span className="absolute inset-0 flex items-center justify-center font-label text-[1.6rem] leading-none text-[#f1ece2]">
                <span className="leader-num absolute">3</span>
                <span className="leader-num absolute [animation-delay:1s]">2</span>
                <span className="leader-num absolute [animation-delay:2s]">1</span>
            </span>
        </div>
        <span className="font-label text-[12px] tracking-[0.14em] uppercase text-gray-300">{label}</span>
    </div>
);

export default Leader;
