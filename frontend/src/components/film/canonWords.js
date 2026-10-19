/**
 * The canon in plain words, shared by the film page's marquee and the home page.
 *
 * ordinal(3) → "3rd"; citation(provenanceEntry) → { name, place }: which list,
 * and what it says of the film ("Sight and Sound · critics' poll", "#4 · 2022").
 */

export const ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

export const yearIn = (s = '') => (s.match(/(\d{4})/) || [])[1];
export const rankIn = (p) => p.rank || Number((p.detail || '').match(/#\s?(\d+)/)?.[1]) || null;

// each citation in plain words: which list, and what it says
export const citation = (p) => {
    const r = rankIn(p);
    const y = yearIn(p.detail);
    const n = (x) => (r ? `#${r}${x || ''}` : (p.detail || ''));
    switch (p.source) {
        case 'ss2022-critics': return { name: "Sight and Sound · critics' poll", place: n(' · 2022') };
        case 'ss2022-directors': return { name: "Sight and Sound · directors' poll", place: n(' · 2022') };
        case 'ss2012-critics': return { name: "Sight and Sound · critics' poll", place: n(' · 2012') };
        case 'ss2012-directors': return { name: "Sight and Sound · directors' poll", place: n(' · 2012') };
        case 'ss-historic': return { name: `Sight and Sound · ${/director/i.test(p.detail) ? 'directors' : 'critics'}' poll`, place: n(` · ${p.pollYear || y || ''}`) };
        case 'ss-yearend': return { name: 'Sight and Sound · best of the year', place: r === 1 ? `Best film of ${y}` : `#${r} of ${y}` };
        case 'ss-docs': return { name: 'Sight and Sound · greatest documentaries', place: n() };
        case 'criticstop10': {
            const lists = (p.detail || '').match(/(\d+) critics/)?.[1];
            return { name: "Critics' top-ten lists", place: `${r === 1 ? `Best of ${y}` : `#${r} of ${y}`}${lists ? ` · ${lists} lists` : ''}` };
        }
        case 'tspdt-1000': return { name: 'They Shoot Pictures · top 1,000', place: n() };
        case 'criterion': return { name: 'The Criterion Collection', place: (p.detail || '').replace(/^Spine\s*/i, 'Spine ') };
        case 'cahiers-top10': return { name: 'Cahiers du Cinéma · top ten', place: `#${r} of ${y}` };
        case 'festival-awards': {
            const [prize, where] = (p.detail || '').split(' · ');
            return { name: where || 'Festival prize', place: prize };
        }
        case 'bbc-21c': return { name: 'BBC · best of the 21st century', place: n() };
        case 'bbc-foreign': return { name: 'BBC · greatest foreign-language films', place: n() };
        case 'bbc-women': return { name: 'BBC · greatest films by women', place: n() };
        case 'nyt-21c': return { name: 'New York Times · best of the 21st century', place: n() };
        case 'busan-asian100': return { name: "Busan · Asian cinema's hundred", place: n() };
        case 'kinema-junpo': return { name: 'Kinema Junpo · Japan', place: `#${r} of ${y}` };
        case 'rosenbaum-1000': return { name: "Jonathan Rosenbaum's essential films", place: /top|\*/i.test(p.detail || '') ? 'His top hundred' : 'Essential' };
        case 'ebert-great': return { name: "Roger Ebert's Great Movies", place: 'Read his essay' };
        default: return { name: p.label || p.source, place: p.detail || '' };
    }
};

// one line for a film that has no hook of its own: its strongest citation
export const citationLine = (p) => {
    if (!p) return null;
    const c = citation(p);
    return `${c.name} — ${c.place}`;
};
