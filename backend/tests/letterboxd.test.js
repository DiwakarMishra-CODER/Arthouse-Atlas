import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, normTitle, matcher, planFrom, marksFrom } from '../scripts/users/letterboxd.js';

const films = [
    { _id: 'a', title: 'Three Colors: Blue', altTitles: ['Three Colours: Blue', 'Trois couleurs : Bleu'], year: 1993 },
    { _id: 'b', title: 'Casablanca', year: 1943 },
    { _id: 'c', title: 'Nosferatu', year: 1922 },
    { _id: 'd', title: 'The Seventh Seal', originalTitle: 'Det sjunde inseglet', year: 1957 },
    { _id: 'e', title: 'Persona', year: 1966 },
];

test('a CSV keeps commas, quotes and line breaks inside quoted fields', () => {
    const rows = parseCsv('Date,Name,Bio\r\n2023-07-29,"Paris, Texas","He said ""no""\nthen left"\r\n');
    assert.deepEqual(rows, [{ Date: '2023-07-29', Name: 'Paris, Texas', Bio: 'He said "no"\nthen left' }]);
});

test('titles match without accents, case, punctuation or a leading article; another title counts; a year either way', () => {
    assert.equal(normTitle('Le Mépris'), normTitle('mepris'));
    const { find } = matcher(films);
    assert.equal(find('Three Colours: Blue', 1993)?._id, 'a');
    assert.equal(find('Casablanca', 1942)?._id, 'b');
    assert.equal(find('Seventh Seal', 1957)?._id, 'd');
    assert.equal(find('Nosferatu', 2024), null, 'a remake is another film');
});

test('the plan: ratings at least one star, the watchlist less what has been seen, favourites the five-star films and the top four', () => {
    const plan = planFrom({
        films,
        ratings: [
            { Date: '2024-01-02', Name: 'Three Colours: Blue', Year: '1993', Rating: '5', 'Letterboxd URI': 'u/a' },
            { Date: '2023-05-01', Name: 'Casablanca', Year: '1942', Rating: '0.5', 'Letterboxd URI': 'u/b' },
        ],
        watched: [{ Date: '2023-05-01', Name: 'Casablanca', Year: '1942', 'Letterboxd URI': 'u/b' }, { Date: '2022-01-01', Name: 'Persona', Year: '1966', 'Letterboxd URI': 'u/e' }],
        watchlist: [{ Date: '2023-01-01', Name: 'Persona', Year: '1966' }, { Date: '2023-02-01', Name: 'The Seventh Seal', Year: '1957' }, { Date: '2023-03-01', Name: 'Nosferatu', Year: '2024' }],
        profile: { 'Favorite Films': 'u/e, u/z' },
    });
    assert.deepEqual(plan.ratings.map((r) => [r.id, r.value]), [['a', 5], ['b', 1]]);
    assert.deepEqual(plan.watchlist.map((r) => r.id), ['d']);
    assert.deepEqual(plan.favorites.map((r) => r.id), ['a', 'e']);
    assert.deepEqual(plan.topFourNotHere, ['u/z']);
    assert.equal(plan.nearMisses.length, 1);
});

test("the account's marks: oldest first, and its own not-for-me marks kept less what it has now seen", () => {
    const plan = {
        ratings: [{ id: 'a', value: 5, date: '2024-01-02' }, { id: 'b', value: 3, date: '2023-05-01' }],
        watched: [{ id: 'b', date: '2023-05-01' }, { id: 'e', date: '2022-01-01' }],
        watchlist: [{ id: 'd', date: '2023-02-01' }],
        favorites: [{ id: 'a', date: '2024-01-02' }],
    };
    const marks = marksFrom(plan, { notFor: ['c', 'e'] });
    assert.deepEqual(marks.ratings.map((r) => r.movie), ['b', 'a']);
    assert.equal(marks.ratings[1].ratedAt.toISOString(), '2024-01-02T12:00:00.000Z');
    assert.deepEqual(marks.watched, ['e', 'b']);
    assert.deepEqual(marks.notFor, ['c']);
});
