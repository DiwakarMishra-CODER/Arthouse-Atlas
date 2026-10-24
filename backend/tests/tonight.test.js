import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classicsOf, roundOrder, ordinaryDaysBefore, classicFor, sundaysBefore, sundayFor } from '../services/tonight.js';

// 160 ranked films by 50 directors across eight decades and six countries, and a few the canon doesn't rank
const COUNTRIES = ['France', 'Japan', 'Italy', 'Sweden', 'United States', 'Iran'];
const pool = [
    ...Array.from({ length: 160 }, (_, i) => ({ _id: `f${i}`, canonRank: i + 1, directors: [`D${i % 50}`], year: 1920 + (i % 8) * 10, country: COUNTRIES[i % 6] })),
    ...Array.from({ length: 5 }, (_, i) => ({ _id: `u${i}`, canonRank: null, directors: ['Newcomer'], year: 2020, country: 'Chile' }))
];
const nextDay = (d) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };

test('the classics are the canon\'s best, two films a director at most, topped up to a hundred', () => {
    const classics = classicsOf(pool);
    assert.equal(classics.length, 100);
    assert.ok(classics.every((f) => f.canonRank != null));
    const per = {};
    for (const f of classics) per[f.directors[0]] = (per[f.directors[0]] || 0) + 1;
    assert.ok(Object.values(per).every((n) => n <= 2));
    // the first fifty directors' first films lead, in canon order; f50 (D0's second) comes next
    assert.deepEqual(classics.slice(0, 3).map((f) => f._id), ['f0', 'f1', 'f2']);
    assert.ok(!classics.some((f) => f._id === 'f100'), "D0's third film stays out");
});

test('a round holds every classic once, and the days next to each other share no decade, country or director', () => {
    const classics = classicsOf(pool);
    const order = roundOrder(classics, 0);
    assert.equal(new Set(order.map((f) => f._id)).size, classics.length);
    const clash = (a, b) => Math.floor(a.year / 10) === Math.floor(b.year / 10) || a.country === b.country || a.directors[0] === b.directors[0];
    const late = order.findIndex((f, i) => order.slice(Math.max(0, i - 3), i).some((r) => clash(r, f)));
    // the shuffle can run out of films that differ near a round's end, never early on
    assert.ok(late === -1 || late > classics.length - 10, `day ${late} repeats something from the days before it`);
    assert.notDeepEqual(roundOrder(classics, 1).map((f) => f._id), order.map((f) => f._id), 'each round has its own order');
});

test('Sundays and occasion days are not ordinary days', () => {
    // 2026-01-04 is a Sunday; an occasion on 01-06
    const occasions = new Set(['01-06']);
    assert.equal(ordinaryDaysBefore('2026-01-01', occasions), 0);
    assert.equal(ordinaryDaysBefore('2026-01-08', occasions), 5); // 1, 2, 3, 5, 7
});

test('the ordinary days show every classic once before any comes again', () => {
    const classics = classicsOf(pool);
    const occasions = new Set(['02-14', '03-10']);
    const rounds = new Map();
    const seen = [];
    for (let d = '2026-01-01'; seen.length < 2 * classics.length; d = nextDay(d)) {
        if (new Date(`${d}T12:00:00Z`).getUTCDay() === 0 || occasions.has(d.slice(5))) continue;
        seen.push(classicFor(classics, d, occasions, rounds)._id);
    }
    assert.equal(new Set(seen.slice(0, 100)).size, 100);
    assert.equal(new Set(seen.slice(100)).size, 100);
    assert.equal(classicFor(classics, '2026-01-01', occasions)._id, seen[0], 'the same day always gives the same film');
});

test('the Sundays show every long film once before any comes again, and an occasion keeps its Sunday', () => {
    const long = pool.slice(0, 40);
    // 2026-01-04 and 01-11 are Sundays; an occasion falls on 01-11
    const occasions = new Set(['01-11']);
    assert.equal(sundaysBefore('2026-01-18', occasions), 1);
    const rounds = new Map();
    const seen = [];
    for (let d = '2026-01-04'; seen.length < 2 * long.length; d = nextDay(nextDay(nextDay(nextDay(nextDay(nextDay(nextDay(d)))))))) {
        if (occasions.has(d.slice(5))) continue;
        seen.push(sundayFor(long, d, occasions, rounds)._id);
    }
    assert.equal(new Set(seen.slice(0, 40)).size, 40);
    assert.equal(new Set(seen.slice(40)).size, 40);
});
