import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCsvLine, buildLookup, streamRatings } from '../../scripts/recs/lib/movielens.js';
import { createCounter, countsToJson, splitOf } from '../../scripts/recs/lib/counting.js';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'ratings.csv');

// Three catalogue films; MovieLens ids 2 and 4 are the same film, 9 isn't ours
const films = [{ tmdbId: 100, title: 'A', year: 1960 }, { tmdbId: 200, title: 'B', year: 1970 }, { tmdbId: 300, title: 'C', year: 1980 }];
const links = [{ movieId: 1, tmdbId: 100 }, { movieId: 2, tmdbId: 200 }, { movieId: 3, tmdbId: 300 }, { movieId: 4, tmdbId: 200 }, { movieId: 9, tmdbId: 999 }];
const titles = new Map([[1, { year: 1960 }], [2, { year: 1970 }], [3, { year: 1990 }], [4, { year: 1970 }]]);

const readAll = async (file, lookup) => {
  const users = [];
  await streamRatings(file, lookup, (userId, rows) => users.push({ userId, rows }));
  return users;
};

test('parseCsvLine keeps commas inside quotes', () => {
  assert.deepEqual(parseCsvLine('7,"Misérables, Les (1995)",Drama'), ['7', 'Misérables, Les (1995)', 'Drama']);
  assert.deepEqual(parseCsvLine('8,"Say ""Hi"" (2001)",Comedy'), ['8', 'Say "Hi" (2001)', 'Comedy']);
});

test('buildLookup joins on TMDB id, merges duplicate ids, flags year gaps', () => {
  const { lookup, matched, merges, yearFlags } = buildLookup(films, links, titles);
  assert.deepEqual([lookup[1], lookup[2], lookup[3], lookup[4], lookup[9]], [0, 1, 2, 1, -1]);
  assert.equal(matched.size, 3);
  assert.deepEqual(merges.map((m) => m.movieIds), [[2, 4]]);
  assert.deepEqual(yearFlags.map((y) => y.title), ['C']);
});

test('streamRatings keeps our films, one row per film, highest rating wins', async () => {
  const { lookup } = buildLookup(films, links, titles);
  const users = await readAll(FIXTURE, lookup);
  assert.deepEqual(users.map((u) => u.userId), [10, 11, 12, 13]);
  // user 12 rated film B twice (movieIds 2 and 4) and a film we don't have
  assert.deepEqual(users[2].rows, [[0, 4, 100], [1, 5, 101]]);
});

test('streamRatings refuses a file that is not sorted by user', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'recs-'));
  const file = path.join(dir, 'ratings.csv');
  fs.writeFileSync(file, 'userId,movieId,rating,timestamp\n2,1,4.0,1\n1,1,4.0,1\n');
  const { lookup } = buildLookup(films, links, titles);
  await assert.rejects(readAll(file, lookup), /not sorted by userId/);
});

test('training counts never include validation or test people', async () => {
  const { lookup } = buildLookup(films, links, titles);
  const counter = createCounter(films.length);
  for (const u of await readAll(FIXTURE, lookup)) counter.add(u.userId, u.rows);
  // group 2 is the test group, group 1 validation; everyone else (here 10 and 13) trains
  assert.deepEqual([splitOf(10), splitOf(11), splitOf(12), splitOf(13)], ['train', 'val', 'test', 'train']);

  const all = countsToJson(counter.all, films);
  assert.deepEqual(all.n, [3, 2, 3]); // a 2-star rating is not a like
  assert.deepEqual(all.pairs, [[0, 1, 2], [0, 2, 2], [1, 2, 1]]);

  const train = countsToJson(counter.train, films); // only users 10 and 13
  assert.deepEqual(train.n, [1, 1, 2]);
  assert.deepEqual(train.pairs, [[0, 1, 1], [0, 2, 1], [1, 2, 1]]);
});

test('a stale TMDB link falls back to the IMDb id, never stealing a matched MovieLens id', () => {
  const stale = [{ movieId: 1, imdbId: 11, tmdbId: 100 }, { movieId: 5, imdbId: 33, tmdbId: 777 }, { movieId: 6, imdbId: 11, tmdbId: 888 }];
  const { lookup, matched, byImdb } = buildLookup(films, stale, new Map(), new Map([[300, 33], [200, 11]]));
  assert.equal(lookup[5], 2); // film C, by IMDb
  assert.equal(lookup[1], 0); // film A keeps its TMDB match
  assert.equal(lookup[6], 1); // film B, by IMDb, on the one id still free
  assert.equal(matched.size, 3);
  assert.deepEqual(byImdb.map((m) => m.tmdbId), [200, 300]);
});
