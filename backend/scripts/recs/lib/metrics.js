/**
 * Scoring a ranked list: against the one hidden film (next film), or against
 * several (later loves, held-out loves).
 *
 *   Hit rate@10  did the hidden film make the top 10? (1 or 0, averaged over people)
 *   NDCG@10      same, but a hit at #1 counts 1, at #2 0.63, … at #10 0.29
 *                (1 / log₂(rank + 1)), so higher up is better
 *
 * Margins are 95% intervals for sampling noise: mean ± 1.96·sd/√n. To say
 * "A beats B", compare the two on the same people (a paired difference), not
 * whether their intervals overlap.
 */

export const AT = 10;

export const hitAndGain = (rankedIds, hidden) => {
  const r = rankedIds.indexOf(hidden);
  return r >= 0 && r < AT ? { hit: 1, gain: 1 / Math.log2(r + 2) } : { hit: 0, gain: 0 };
};

// Expected values for a uniformly random top 10 out of `size` candidates: the
// hidden film is equally likely to land at any rank
export const randomExpectation = (size) => {
  let gain = 0;
  for (let r = 0; r < Math.min(AT, size); r++) gain += 1 / Math.log2(r + 2);
  return { hit: Math.min(AT, size) / size, gain: gain / size };
};

// Several films to find (later loves, held-out loves). targets: a Set.
const hitsIn = (ranked, targets, k) => {
  let h = 0;
  for (let r = 0; r < Math.min(k, ranked.length); r++) if (targets.has(ranked[r])) h++;
  return h;
};
export const idealDcg = (n) => {
  let s = 0;
  for (let r = 0; r < n; r++) s += 1 / Math.log2(r + 2);
  return s;
};
export const hitRateAt = (ranked, targets, k) => (hitsIn(ranked, targets, k) > 0 ? 1 : 0);
export const precisionAt = (ranked, targets, k) => hitsIn(ranked, targets, k) / k;
// recall as Liang et al. (2018) define it: hits over the smaller of k and the number of targets
export const recallAt = (ranked, targets, k) => hitsIn(ranked, targets, k) / Math.min(k, targets.size);
export const ndcgAt = (ranked, targets, k) => {
  let dcg = 0;
  for (let r = 0; r < Math.min(k, ranked.length); r++) if (targets.has(ranked[r])) dcg += 1 / Math.log2(r + 2);
  return dcg / idealDcg(Math.min(k, targets.size));
};

// Expected values when the top k is a uniformly random draw from C candidates, T of them targets
export const randomMany = (C, T, k) => {
  const kk = Math.min(k, C);
  let miss = 1;
  for (let i = 0; i < kk; i++) {
    const f = (C - T - i) / (C - i);
    if (f <= 0) { miss = 0; break; }
    miss *= f;
  }
  const hits = (kk * T) / C;
  let dcg = 0;
  for (let r = 0; r < kk; r++) dcg += T / C / Math.log2(r + 2);
  return { hitRate: 1 - miss, precision: hits / k, recall: hits / Math.min(k, T), ndcg: dcg / idealDcg(Math.min(k, T)) };
};

export const meanMargin = (values) => {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1);
  return { mean, margin: 1.96 * Math.sqrt(variance / n), n };
};

export const pairedDiff = (a, b) => meanMargin(a.map((v, i) => v - b[i]));
