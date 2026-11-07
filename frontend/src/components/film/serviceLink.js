// A service's own search for a film, where we know the address works: on a phone these open the
// service's app. TMDB doesn't give a link to the film's own page on each service (JustWatch keeps
// those for its partners), so a service not listed here opens TMDB's listing instead, whose "Watch
// now" buttons go straight to the film.
//
// Each was checked by hand in November 2026 with a real title (the search ran, or the address held
// through the service's sign-in). Left out because the address didn't search, or couldn't be
// checked from India: MUBI, Kanopy, the Criterion Channel, JioHotstar, Plex, Hulu, Disney+, Max,
// Peacock, Paramount+, Tubi, Pluto TV.
const SEARCH = [
    // Prime Video, Amazon Video, and the channels watched inside Prime Video (Curzon, Arthaus+…)
    [/amazon/i, 'https://www.primevideo.com/search/ref=atv_nb_sug?ie=UTF8&phrase='],
    // the Apple TV store, Apple TV+, and the channels watched inside the Apple TV app
    [/apple tv/i, 'https://tv.apple.com/search?term='],
    [/^netflix/i, 'https://www.netflix.com/search?q='],
    [/^google play/i, 'https://play.google.com/store/search?c=movies&q='],
    [/^youtube/i, 'https://www.youtube.com/results?search_query='],
    [/^hoopla/i, 'https://www.hoopladigital.com/search?scope=everything&type=direct&q='],
    [/^bfi player/i, 'https://player.bfi.org.uk/search?q='],
];

export const serviceLink = (name, title) => {
    const hit = SEARCH.find(([re]) => re.test(name));
    return hit && title ? `${hit[1]}${encodeURIComponent(title)}` : null;
};
