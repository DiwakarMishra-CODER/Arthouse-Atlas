import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCard } from '../services/catalogue.js';
import { buildFestival } from '../services/festival.js';

const film = (id, extra) => toCard({ _id: id, title: `Film ${id}`, year: 1960, directors: ['Someone'], countries: ['France'], movements: [], vote_count: 5000, ...extra });
const cards = [
    film('a', { title: 'Persona', year: 1966, directors: ['Ingmar Bergman'], countries: ['Sweden'], movements: ['European Modernism'], canonRank: 10, vote_count: 900, stills: ['https://image.tmdb.org/t/p/w780/persona.jpg'] }),
    film('b', { title: 'Wild Strawberries', year: 1957, directors: ['Ingmar Bergman'], countries: ['Sweden'], canonRank: 40, vote_count: 800 }),
    film('c', { title: 'Breathless', year: 1960, directors: ['Jean-Luc Godard'], movements: ['French New Wave'], canonRank: 30, vote_count: 3000 }),
    film('d', { title: 'The 400 Blows', year: 1959, directors: ['François Truffaut'], movements: ['French New Wave'], canonRank: 20, vote_count: 2500 }),
    film('e', { title: 'A Hidden Gem', year: 1962, directors: ['Nobody Known'], countries: ['Sweden'], vote_count: 12 }),
    film('f', { title: 'Next Up', year: 2001, directors: ['Someone Else'], vote_count: 100 }),
];
const catalogue = {
    cards,
    byId: new Map(cards.map((c) => [c._id, c])),
    directors: new Map([['ingmarbergman', { _id: 'ib', profileUrl: 'https://image.tmdb.org/t/p/original/bergman.jpg' }]]),
    movementsByTitle: new Map([['French New Wave', { _id: 'nw', tag: 'french-new-wave' }]]),
};
const user = {
    username: 'Ana',
    createdAt: new Date('2026-10-01'),
    favorites: ['b', 'gone'],
    ratings: [
        { movie: 'a', value: 5, ratedAt: new Date('2026-10-05') },
        { movie: 'c', value: 4, ratedAt: new Date('2026-10-03') },
        { movie: 'd', value: 4, ratedAt: new Date('2026-10-04') },
        { movie: 'e', value: 4, ratedAt: new Date('2026-10-02') },
    ],
    watched: ['a'],
    watchlist: ['c', 'f'],
    notFor: [],
};
const fest = buildFestival({ user, catalogue });
const award = (key) => fest.awards.find((a) => a.key === key);
const winner = (key) => award(key).nominees.find((n) => n.win);

test('your favourite film is the highest rated, chosen from the films you love, and says why', () => {
    assert.equal(winner('film').name, 'Persona');
    assert.equal(award('film').why, 'You rated it 5 out of 5.');
    assert.deepEqual(award('film').nominees.map((n) => n.name), ['Persona', 'Wild Strawberries', 'The 400 Blows', 'Breathless', 'A Hidden Gem']);
    assert.equal(award('film').nominees[1].sub, 'One of your favourites');
    assert.equal(award('film').nominees[0].s, '/persona.jpg');
});

test('your favourite director is behind the most films you love, with their page, portrait and the films', () => {
    assert.equal(winner('director').name, 'Ingmar Bergman');
    assert.equal(winner('director').sub, '2 films you love');
    assert.equal(winner('director').p, '/bergman.jpg');
    assert.equal(award('director').to, '/directors/ib');
    assert.equal(award('director').why, 'You love 2 of their films: Persona and Wild Strawberries.');
});

test('the movement, country and decade count the films you love, each against its nominees', () => {
    assert.equal(winner('movement').name, 'French New Wave');
    assert.equal(award('movement').to, '/movements/french-new-wave');
    assert.equal(winner('country').name, 'Sweden');
    assert.deepEqual(award('country').nominees.map((n) => [n.name, n.sub]), [['Sweden', '3 films you love'], ['France', '2 films you love']]);
    assert.equal(winner('decade').name, 'The 1960s');
});

test('the hidden gem is the least-seen film you love', () => {
    assert.equal(winner('gem').name, 'A Hidden Gem');
    assert.match(award('gem').why, /^Fewer people have seen it than \d in 10 films in the atlas, and you love it\.$/);
});

test('shelves skip films no longer in the atlas and carry the marks', () => {
    assert.deepEqual(fest.shelves.favourites.map((f) => f.t), ['Wild Strawberries']);
    assert.deepEqual(fest.shelves.rated.map((f) => [f.t, f.mark]), [['Persona', 5], ['The 400 Blows', 4], ['Breathless', 4], ['A Hidden Gem', 4]]);
    assert.deepEqual(fest.ballot, { rated: 4, favourites: 1, loved: 5, seen: 5, hours: 0, countries: 2, from: 1957, to: 1966 });
});

test('a new member has no awards yet, and nothing breaks', () => {
    const empty = buildFestival({ user: { username: 'New' }, catalogue });
    assert.deepEqual(empty.awards, []);
    assert.deepEqual(empty.ballot, { rated: 0, favourites: 0, loved: 0, seen: 0, hours: 0, countries: 0, from: null, to: null });
});

test('an award needs a contest: two nominees, and a winner with two films behind it', () => {
    const one = buildFestival({ user: { username: 'One', ratings: [{ movie: 'c', value: 5 }] }, catalogue });
    assert.deepEqual(one.awards, []);
    const two = buildFestival({ user: { username: 'Two', ratings: [{ movie: 'c', value: 5 }, { movie: 'd', value: 4 }] }, catalogue });
    assert.deepEqual(two.awards.map((a) => a.key), ['film']); // (one movement, one country: no contest)
});
