/**
 * The trail: which page sits at each step of this tab's history, so a Back button can name the page
 * it goes back to. React Router numbers every history entry (history.state.idx); each page records
 * its address and title at its own number (usePageTitle does it), and the page before this one is
 * simply the number before. Kept in sessionStorage, so it survives a reload; arriving from another
 * site, there's no page before, and Back goes up a room instead.
 */

const KEY = 'trail';
const read = () => {
    try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch { return {}; }
};
const here = () => window.history.state?.idx;

// this page, at its place in the trail
export const markPage = (page) => {
    const i = here();
    if (i == null) return;
    const trail = read();
    trail[i] = page;
    try { sessionStorage.setItem(KEY, JSON.stringify(trail)); } catch { /* storage off: Back still works, unnamed */ }
};

// the page before this one in this tab, or null
export const previousPage = () => {
    const i = here();
    return i > 0 ? read()[i - 1] || null : null;
};
