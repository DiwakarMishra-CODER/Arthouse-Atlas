// Down to a film's "where to watch" section, from the dock or the opening's last card. The section
// hears that you arrived and sweeps its projector beam across once, so the eye lands on it.
export const WATCH_ARRIVE = 'aa:watch-arrive';

// past the opening: to how viewers described it, or (a film viewers said too little about) where to watch
export const goPastOpening = () => {
    const cards = document.getElementById('viewers');
    if (!cards) { goToWatch(); return; }
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    cards.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
};

export const goToWatch = () => {
    const section = document.getElementById('watch');
    if (!section) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    window.dispatchEvent(new Event(WATCH_ARRIVE));
};
