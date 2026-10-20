/**
 * A cinema ticket's punched notches: the half-circles either side of its perforation,
 * cut with a mask. Shared by the box office's ticket (home) and Explore's genre tickets.
 *
 * at: where the perforation runs, as a CSS x position ('calc(100% - 74px)', '100%', '0')
 */
export const notches = (at, r = 9) => `radial-gradient(circle ${r}px at ${at} 0, transparent 98%, #000 100%), radial-gradient(circle ${r}px at ${at} 100%, transparent 98%, #000 100%)`;

export const notched = (at, r) => {
    const mask = notches(at, r);
    return { WebkitMaskImage: mask, WebkitMaskComposite: 'source-in', maskImage: mask, maskComposite: 'intersect' };
};
