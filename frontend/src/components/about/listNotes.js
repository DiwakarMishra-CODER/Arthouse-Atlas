/**
 * The 20 lists the canon is built from, as the About room names them: each one's plain name and one
 * line on what it is. Their groups come from the ranking itself (each list's family).
 *
 * Written by Claude on 2026-10-21, for the owner's review: facts only (who votes, when, how many),
 * no judgements.
 */

// the kinds of list, as the ranking counts them (the same groups it caps), in the order shown
export const GROUPS = [
    ['all-time-poll', 'All-time polls'],
    ['peer-poll', 'Filmmakers’ polls'],
    ['regional-poll', 'Regional polls'],
    ['year-end', 'Lists of the year'],
    ['prize', 'Festival prizes'],
    ['critic', 'A critic’s canon'],
    ['institution', 'Collections'],
];
export const groupName = (family) => GROUPS.find(([k]) => k === family)?.[1] || 'Other lists';

export const LISTS = {
    'ss2022-critics': { name: 'Sight and Sound · critics’ poll, 2022', line: 'Every ten years since 1952, Sight and Sound asks critics for the greatest films ever made. In 2022, 1,639 of them voted.' },
    'ss2012-critics': { name: 'Sight and Sound · critics’ poll, 2012', line: 'The 2012 poll, the year Vertigo took first place from Citizen Kane after fifty years.' },
    'ss-historic': { name: 'Sight and Sound · the earlier polls, 1952–2002', line: 'The top tens of Sight and Sound’s first six polls, one every decade.' },
    'tspdt-1000': { name: 'They Shoot Pictures, Don’t They? · top 1,000', line: 'The 1,000 greatest films, counted from thousands of critics’ and filmmakers’ lists and updated every year.' },
    'bbc-foreign': { name: 'BBC Culture · greatest foreign-language films, 2018', line: '209 critics in 43 countries chose the 100 greatest films not in English.' },
    'bbc-21c': { name: 'BBC Culture · the 21st century’s best, 2016', line: '177 critics chose the 100 greatest films made since 2000.' },
    'bbc-women': { name: 'BBC Culture · greatest films by women, 2019', line: '368 critics from 84 countries chose the 100 greatest films directed by women.' },
    'ss-docs': { name: 'Sight and Sound · greatest documentaries, 2014', line: 'Critics and filmmakers chose the 50 greatest documentaries.' },
    'busan-asian100': { name: 'Busan · the Asian cinema 100, 2015', line: 'The Busan International Film Festival asked critics and filmmakers for the 100 greatest Asian films.' },
    'ss2022-directors': { name: 'Sight and Sound · directors’ poll, 2022', line: 'The same poll, asked of filmmakers: 480 directors voted in 2022.' },
    'ss2012-directors': { name: 'Sight and Sound · directors’ poll, 2012', line: 'In 2012, 358 directors voted, and Tokyo Story came first.' },
    'nyt-21c': { name: 'The New York Times · best of the 21st century, 2025', line: 'More than 500 directors, actors and others chose the 100 best films since 2000.' },
    criticstop10: { name: 'CriticsTop10 · the year’s best', line: 'Each year’s films, ranked by how many critics put them in their top ten.' },
    'ss-yearend': { name: 'Sight and Sound · the year’s best', line: 'Sight and Sound’s critics’ poll of each year’s best films.' },
    'cahiers-top10': { name: 'Cahiers du Cinéma · top ten of the year', line: 'The French magazine where the New Wave began has named its films of the year since 1951.' },
    'kinema-junpo': { name: 'Kinema Junpo · best ten', line: 'Japan’s oldest film magazine has named the year’s best Japanese films since 1926.' },
    'festival-awards': { name: 'The great festivals’ prizes', line: 'The top prizes at Cannes, Venice, Berlin and Locarno, and the international critics’ prize, FIPRESCI.' },
    'rosenbaum-1000': { name: 'Jonathan Rosenbaum · 1,000 essential films', line: 'The Chicago critic’s personal canon, a thousand films long.' },
    'ebert-great': { name: 'Roger Ebert · the Great Movies', line: 'The films Roger Ebert wrote a long essay on, as a great film.' },
    criterion: { name: 'The Criterion Collection', line: 'Films restored and published by the Criterion Collection, each numbered on its spine.' },
};
