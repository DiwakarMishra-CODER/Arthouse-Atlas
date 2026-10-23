// The plain words the foyer uses for lengths and orders (shared by the pickers and the board)
export const LENGTH_WORDS = { short: 'Under 90 minutes', standard: '90 minutes to 2 hours', long: '2 to 3 hours', epic: 'Over 3 hours' };
export const SORT_WORDS = { acclaimed: 'Most acclaimed first', oldest: 'Oldest first', newest: 'Newest first', surprise: 'Surprise me' };

// the ways in, in the board's order, as the tray names them and asks for them in turn
export const STEPS = [
    { id: 'country', tab: 'Where', ask: 'Where from?' },
    { id: 'decade', tab: 'When', ask: 'And when?' },
    { id: 'director', tab: 'Who', ask: 'And by whom?' },
    { id: 'movement', tab: 'Movement', ask: 'Which movement?' },
    { id: 'mood', tab: 'Mood', ask: 'How should it feel?' },
    { id: 'genre', tab: 'Genre', ask: 'What kind of film?' },
    { id: 'length', tab: 'Length', ask: 'How long?' },
];
