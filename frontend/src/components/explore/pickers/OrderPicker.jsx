/**
 * In what order: plates for each way of running the wall, with a line on what it means.
 * "Closest first" only exists when the wall starts from a film.
 */
const ORDERS = [
    ['closest', 'Closest first', 'The films most like the one you started from'],
    ['acclaimed', 'Most acclaimed first', 'The canon’s own order'],
    ['oldest', 'Oldest first', 'From the silents on'],
    ['newest', 'Newest first', 'From this year back'],
    ['surprise', 'In a surprise order', 'Shuffled; choose it again to shuffle again'],
];

const OrderPicker = ({ value, onPick, started }) => (
    <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ORDERS.filter(([k]) => k !== 'closest' || started).map(([k, label, line]) => {
            const active = k === value;
            return (
                <li key={k}>
                    <button type="button" onClick={() => onPick(k)} aria-pressed={active} className={`w-full h-full text-left px-4 py-4 ring-1 transition-colors ${active ? 'ring-gold bg-gold/[0.06]' : 'ring-white/10 hover:ring-white/30'}`}>
                        <span className={`block font-serif text-[1.2rem] leading-tight ${active ? 'text-gold-light' : 'text-gray-100'}`}>{k === 'surprise' && active ? 'Shuffle again' : label}</span>
                        <span className="mt-1 block text-[14px] text-gray-400">{line}</span>
                    </button>
                </li>
            );
        })}
    </ul>
);

export default OrderPicker;
