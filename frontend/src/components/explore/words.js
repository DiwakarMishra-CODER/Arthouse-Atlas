// The plain words the foyer uses for lengths and orders (shared by the pickers and the board)
export const LENGTH_WORDS = { short: 'Under 90 minutes', standard: '90 minutes to 2 hours', long: '2 to 3 hours', epic: 'Over 3 hours' };
export const SORT_WORDS = { acclaimed: 'Most acclaimed first', oldest: 'Oldest first', newest: 'Newest first', surprise: 'Surprise me' };

// the ways in, in the board's order, as the tray names them and asks for them in turn
export const STEPS = [
    { id: 'country', tab: 'Where' },
    { id: 'decade', tab: 'When' },
    { id: 'director', tab: 'Who' },
    { id: 'movement', tab: 'Movement' },
    { id: 'mood', tab: 'Mood' },
    { id: 'genre', tab: 'Genre' },
    { id: 'length', tab: 'Length' },
    { id: 'screens', tab: 'Streaming' },
];
