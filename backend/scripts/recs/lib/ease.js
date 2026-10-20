/**
 * EASE — Harald Steck, "Embarrassingly Shallow Autoencoders for Sparse Data",
 * The Web Conference (WWW) 2019.
 *
 * For every film i, a weight for every other film j: how much loving i predicts
 * loving j, once everything else a person loved is taken into account. It is
 * one exact solve — no training loop, no randomness:
 *
 *   G = XᵀX + λI    XᵀX is the pair-count grid prepare.js already builds: on the
 *                   diagonal, how many people loved each film; off it, how many
 *                   loved both. λ keeps thin evidence from counting for much.
 *   P = G⁻¹
 *   B[i][j] = −P[i][j] / P[j][j], and B[j][j] = 0   (a film may not predict itself)
 *
 * A person's score for film j is the sum of B[i][j] over the films i they loved.
 * Note the orientation: row i holds what loving i says about every other film.
 *
 * The weights are divided by one constant (the median of each film's strongest
 * weight), so that 1 means "a typical strongest link". That changes no ranking,
 * and lets the content blend, the rounding in the shipped file and the reason
 * labels mean the same thing whatever λ is.
 */

export const gramOf = (counts, lambda) => {
  if (!(lambda > 0)) throw new Error('EASE needs λ > 0');
  const N = counts.films.length;
  const G = new Float64Array(N * N);
  for (let i = 0; i < N; i++) G[i * N + i] = counts.n[i] + lambda;
  for (const [i, j, co] of counts.pairs) {
    G[i * N + j] = co;
    G[j * N + i] = co;
  }
  return G;
};

// Gauss–Jordan elimination. G is symmetric positive definite (every pivot is at
// least λ), so it needs no row swaps; a pivot that isn't positive means bad input.
export const invertSPD = (A, n) => {
  const M = Float64Array.from(A);
  const I = new Float64Array(n * n);
  for (let i = 0; i < n; i++) I[i * n + i] = 1;
  for (let c = 0; c < n; c++) {
    const co = c * n;
    const pivot = M[co + c];
    if (!(pivot > 0)) throw new Error(`matrix is not positive definite (pivot ${pivot} at ${c})`);
    const inv = 1 / pivot;
    for (let k = 0; k < n; k++) { M[co + k] *= inv; I[co + k] *= inv; }
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const ro = r * n;
      const f = M[ro + c];
      if (!f) continue;
      for (let k = 0; k < n; k++) { M[ro + k] -= f * M[co + k]; I[ro + k] -= f * I[co + k]; }
    }
  }
  return I;
};

// The weight matrix (row i = seed i), scaled so a typical strongest link is 1
export const easeWeights = (counts, lambda) => {
  const N = counts.films.length;
  const P = invertSPD(gramOf(counts, lambda), N);
  const B = new Float64Array(N * N);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) B[i * N + j] = i === j ? 0 : -P[i * N + j] / P[j * N + j];
  }
  const tops = [];
  for (let i = 0; i < N; i++) {
    let m = 0;
    for (let j = 0; j < N; j++) m = Math.max(m, B[i * N + j]);
    if (m > 0) tops.push(m);
  }
  tops.sort((a, b) => a - b);
  const scale = tops.length ? tops[Math.floor(tops.length / 2)] : 1;
  for (let k = 0; k < B.length; k++) B[k] /= scale;
  return { B, scale };
};
