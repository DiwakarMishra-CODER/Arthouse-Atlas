// accents off, lower case: how pickers match what you type
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// how a country is written on screen
export const countryName = (c) => (c === 'United States of America' ? 'United States' : c);

export const filmsWord = (n) => `${n} ${n === 1 ? 'film' : 'films'}`;
