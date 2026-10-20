/**
 * The counting at the heart of item-to-item collaborative filtering.
 *
 * For every person, take the films they loved (4 stars or more) and add 1 to
 * every pair of them. After everyone, co[i][j] is how many people loved both
 * film i and film j, and n[i] is how many loved film i at all.
 *
 * People are split by id so the evaluation never learns from the people it is
 * tested on: userId % 10 === TEST_GROUP is the test group, === 1 the validation
 * group, everyone else trains. (The first engine was tested once, on group 0.
 * This one is tested on group 2, which no version had been scored on; group 0
 * now trains.)
 */

export const LIKE = 4;
export const VALIDATION_GROUP = 1;
export const TEST_GROUP = 2;

export const splitOf = (userId) => {
  const r = userId % 10;
  return r === TEST_GROUP ? 'test' : r === VALIDATION_GROUP ? 'val' : 'train';
};

export const createCounts = (N) => ({ N, n: new Uint32Array(N), co: new Uint32Array(N * N) });

// liked: film indices, ascending
export const addLikes = (counts, liked) => {
  const { N, n, co } = counts;
  for (let a = 0; a < liked.length; a++) {
    const i = liked[a];
    n[i]++;
    const row = i * N;
    for (let b = a + 1; b < liked.length; b++) co[row + liked[b]]++;
  }
};

// One person's ratings ([filmIndex, rating, ts]) into both grids; returns what
// the caller needs to decide whether to keep them for evaluation
export const createCounter = (N) => {
  const train = createCounts(N);
  const all = createCounts(N);
  const add = (userId, rows) => {
    const liked = rows.filter((r) => r[1] >= LIKE).map((r) => r[0]);
    const split = splitOf(userId);
    addLikes(all, liked);
    if (split === 'train') addLikes(train, liked);
    return { split, liked };
  };
  return { train, all, add };
};

// Plain JSON: films by tmdbId, like counts, and only the pairs that occur (i < j)
export const countsToJson = (counts, films) => {
  const { N, n, co } = counts;
  const pairs = [];
  for (let i = 0; i < N; i++) {
    const row = i * N;
    for (let j = i + 1; j < N; j++) if (co[row + j]) pairs.push([i, j, co[row + j]]);
  }
  return { films: films.map((f) => f.tmdbId), n: Array.from(n), pairs };
};
