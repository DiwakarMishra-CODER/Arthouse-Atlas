/**
 * Moods for the films nobody has tagged, learned from the ones that were.
 *
 * The curators tagged 159 films with five moods each (editorial.tags). For any
 * other film, each source below gives one piece of evidence per mood: the share
 * of related hand-tagged films that carry it, smoothed toward the mood's base
 * rate and written as a lift in log-odds (0 means no evidence either way).
 *
 *   viewers    the film's MovieLens neighbours (EASE weights in data/recs/neighbours.json), both directions
 *   diffusion  the same graph walked further, K = (I − αS)⁻¹ with S the symmetric-normalised
 *              viewer graph, so a film reaches hand-tagged films through untagged ones
 *   director   the director's other hand-tagged films
 *   movement   hand-tagged films of the same movement
 *   keywords   the 15 hand-tagged films sharing the most TMDB keywords, rarer keywords counting more
 *   synopsis   the 15 hand-tagged films whose TMDB synopsis reads most alike (TF-IDF cosine)
 *   genre      hand-tagged films sharing a genre
 *   lexicon    yes/no: a TMDB keyword names the mood outright ("surrealism", "slow cinema")
 *
 * A logistic regression over (film, mood) pairs, with one intercept per mood and
 * one slope per source shared by every mood, turns the evidence into the chance
 * the curators would have tagged that mood: the confidence that gets stored.
 *
 * Untagged films sit further from the hand-tagged ones than those do from each
 * other (their MovieLens evidence is about a third as strong), so the regression
 * learns, and is tested, on thinned evidence: each graph source sees a random
 * share of the hand tags, sized so the evidence looks like an untagged film's
 * (keepRates). Content sources are learned from all 159 in use, so they aren't thinned.
 */
import { MOODS } from '../../../services/moodService.js';

export { MOODS };
const M = MOODS.length;

export const SOURCES = ['viewers', 'diffusion', 'director', 'movement', 'keywords', 'synopsis', 'genre'];
const GRAPH = new Set(['viewers', 'diffusion', 'director', 'movement']); // thinned to match untagged films
const SMOOTHING = { viewers: 3, diffusion: 1, director: 2, movement: 4, keywords: 2, synopsis: 2, genre: 10 };
export const SETTINGS = { graphAlpha: 0.8, knn: 15, lambda: 1, draws: 2, smoothing: SMOOTHING };

// TMDB keywords that name a mood outright. The regression decides how much a hit counts.
export const LEXICON = {
  surreal: ['surrealism', 'surreal', 'surrealistic', 'surreal comedy', 'absurdism', 'absurd'],
  dreamlike: ['dreams', 'dream', 'dreamlike', 'dream sequence', 'dream within a dream', 'dream like experience', 'daydream', 'daydreaming'],
  slow: ['slow cinema', 'contemplative cinema', 'meditative', 'long take'],
  contemplative: ['contemplative cinema', 'meditative', 'meditation', 'introspective', 'introspection', 'philosophical', 'philosophy'],
  minimalist: ['minimalism', 'minimalist'],
  existential: ['existentialism', 'existential crisis', 'existentialist', 'existential drama', 'philosophical', 'absurdism'],
  melancholic: ['melancholy', 'loneliness', 'grief', 'loss of loved one', 'mourning'],
  bleak: ['depressing', 'bleak', 'despair'],
  psychological: ['psychological drama', 'psychological thriller', 'psychological', 'mental illness', 'paranoia', 'obsession'],
  fragmented: ['nonlinear timeline', 'nonlinear narrative', 'avant-garde', 'avant garde', 'experimental film', 'experimental', 'experimental cinema', 'essay film'],
  poetic: ['poetry', 'poetic', 'poetic documentary', 'lyrical'],
  enigmatic: ['ambiguous', 'mysterious', 'enigma', 'ambiguity', 'open ending']
};

const STOP = new Set(('a an the and or of to in on at for with by from as is are was were be been his her their its it this that he she they them who whom which what when where while after before into over under about between through during without within upon than then there here so but not no nor only own same too very can will just one two three him our your you we i me my mr mrs film story life young old man woman men women new years year day days time world home family').split(' '));

export const logit = (p) => Math.log(p / (1 - p));
export const sigmoid = (z) => 1 / (1 + Math.exp(-z));

// Small seeded generator, so every run draws the same thinning
export const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---------------------------------------------------------------------------
// Context: everything about the catalogue the sources read, computed once
// ---------------------------------------------------------------------------

// Rows of K = (I − αS)⁻¹ restricted to hand-tagged columns: diffusion weights
const diffusionKernel = (V, tagged, alpha) => {
  const N = V.length;
  const T = tagged.length;
  const inv = V.map((row) => { let s = 0; for (const w of row.values()) s += w; return s > 0 ? 1 / Math.sqrt(s) : 0; });
  const W = N + T;
  const A = new Float64Array(N * W); // [I − αS | E_tagged]
  for (let i = 0; i < N; i++) {
    A[i * W + i] = 1;
    for (const [j, w] of V[i]) A[i * W + j] -= alpha * inv[i] * w * inv[j];
  }
  tagged.forEach((j, c) => { A[j * W + N + c] = 1; });
  for (let c = 0; c < N; c++) { // Gauss–Jordan; I − αS is symmetric positive definite
    const piv = A[c * W + c];
    for (let k = c; k < W; k++) A[c * W + k] /= piv;
    for (let r = 0; r < N; r++) {
      if (r === c) continue;
      const f = A[r * W + c];
      if (!f) continue;
      for (let k = c; k < W; k++) A[r * W + k] -= f * A[c * W + k];
    }
  }
  return Array.from({ length: N }, (_, i) => tagged.map((j, c) => [j, A[i * W + N + c]]).filter(([j, v]) => j !== i && v > 1e-6));
};

export const buildContext = (films, keywordsByTmdb, neighbours, settings = SETTINGS) => {
  const N = films.length;
  const index = new Map(films.map((f, i) => [f.tmdbId, i]));
  const Y = films.map((f) => {
    const tags = (f.editorial?.tags || []).filter((t) => MOODS.includes(t));
    return tags.length ? MOODS.map((m) => (tags.includes(m) ? 1 : 0)) : null;
  });
  const tagged = films.map((_, i) => i).filter((i) => Y[i]);
  const isTagged = new Set(tagged);

  const V = Array.from({ length: N }, () => new Map());
  for (const [id, e] of Object.entries(neighbours)) {
    const i = index.get(Number(id));
    if (i == null) continue;
    for (const [to, w, why] of e.nb) {
      const j = index.get(to);
      if (j == null || why !== 'v' || !(w > 0)) continue;
      V[i].set(j, (V[i].get(j) || 0) + w);
      V[j].set(i, (V[j].get(i) || 0) + w);
    }
  }
  const KD = diffusionKernel(V, tagged, settings.graphAlpha);

  const shared = (key) => films.map((f, i) => {
    const mine = f[key] || [];
    return mine.length ? tagged.filter((j) => j !== i && (films[j][key] || []).some((x) => mine.includes(x))) : [];
  });

  const kw = films.map((f) => new Set(keywordsByTmdb[f.tmdbId] || []));
  const df = new Map();
  for (const s of kw) for (const k of s) df.set(k, (df.get(k) || 0) + 1);
  const kwSims = kw.map((mine, i) => tagged.filter((j) => j !== i).map((j) => {
    let s = 0;
    for (const k of mine) if (df.get(k) > 1 && kw[j].has(k)) s += Math.log(N / df.get(k));
    return [j, s];
  }).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]));

  const tf = films.map((f) => {
    const m = new Map();
    for (const w of (f.synopsis || '').toLowerCase().match(/[a-z']{3,}/g) || []) if (!STOP.has(w)) m.set(w, (m.get(w) || 0) + 1);
    return m;
  });
  const sdf = new Map();
  for (const m of tf) for (const w of m.keys()) sdf.set(w, (sdf.get(w) || 0) + 1);
  const vec = tf.map((m) => {
    const v = new Map();
    let norm = 0;
    for (const [w, c] of m) {
      if (sdf.get(w) < 2) continue;
      const x = (1 + Math.log(c)) * Math.log(N / sdf.get(w));
      v.set(w, x);
      norm += x * x;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [w, x] of v) v.set(w, x / norm);
    return v;
  });
  const synSims = vec.map((mine, i) => tagged.filter((j) => j !== i).map((j) => {
    let c = 0;
    for (const [w, x] of mine) { const y = vec[j].get(w); if (y) c += x * y; }
    return [j, c];
  }).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]));

  const lexHit = kw.map((mine) => MOODS.map((m) => ((LEXICON[m] || []).some((k) => mine.has(k)) ? 1 : 0)));

  return {
    films, N, Y, tagged, isTagged, settings, V, KD, kw, kwSims, synSims, lexHit,
    shared: { director: shared('directors'), movement: shared('movements'), genre: shared('genres') }
  };
};

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

const vote = (ctx, pairs) => {
  const v = new Float64Array(M);
  let mass = 0;
  for (const [j, w] of pairs) {
    mass += w;
    const y = ctx.Y[j];
    for (let m = 0; m < M; m++) if (y[m]) v[m] += w;
  }
  return { v, mass };
};

const nearest = (sims, ok, k) => {
  const out = [];
  for (const [j, s] of sims) { if (ok(j)) { out.push([j, s]); if (out.length === k) break; } }
  const top = out[0]?.[1] || 1;
  return out.map(([j, s]) => [j, s / top]);
};

const evidence = {
  viewers: (ctx, i, ok) => vote(ctx, [...ctx.V[i]].filter(([j]) => ctx.isTagged.has(j) && ok(j))),
  diffusion: (ctx, i, ok) => vote(ctx, ctx.KD[i].filter(([j]) => ok(j))),
  director: (ctx, i, ok) => vote(ctx, ctx.shared.director[i].filter(ok).map((j) => [j, 1])),
  movement: (ctx, i, ok) => vote(ctx, ctx.shared.movement[i].filter(ok).map((j) => [j, 1])),
  genre: (ctx, i, ok) => vote(ctx, ctx.shared.genre[i].filter(ok).map((j) => [j, 1])),
  keywords: (ctx, i, ok) => vote(ctx, nearest(ctx.kwSims[i], ok, ctx.settings.knn)),
  synopsis: (ctx, i, ok) => vote(ctx, nearest(ctx.synSims[i], ok, ctx.settings.knn))
};

// Feature rows for film i, one per mood. `usable(j)`: may hand-tagged film j's tags be used
// (never i's own). `keep`: per graph source, the random share of hand tags it may see (or none).
export const featurize = (ctx, i, usable, keep = null) => {
  let n = 0;
  const count = new Float64Array(M);
  for (const j of ctx.tagged) {
    if (j === i || !usable(j)) continue;
    n++;
    for (let m = 0; m < M; m++) count[m] += ctx.Y[j][m];
  }
  const base = Array.from(count, (c) => (c + 1) / (n + 2));
  const lifts = SOURCES.map((s) => {
    const k = keep?.[s];
    const { v, mass } = evidence[s](ctx, i, (j) => j !== i && usable(j) && (!k || k.has(j)));
    const a = ctx.settings.smoothing[s];
    return base.map((b, m) => logit((v[m] + a * b) / (mass + a)) - logit(b));
  });
  return MOODS.map((_, m) => [...lifts.map((l) => l[m]), ctx.lexHit[i][m], ...MOODS.map((__, q) => (q === m ? 1 : 0))]);
};
const NSLOPES = SOURCES.length + 1;
export const FEATURE_NAMES = [...SOURCES, 'lexicon'];

// The evidence an untagged film really has, compared with a hand-tagged film's (its own tags
// hidden), gives each graph source the share of hand tags to keep when training and testing.
export const keepRates = (ctx) => {
  const untagged = ctx.films.map((_, i) => i).filter((i) => !ctx.Y[i]);
  const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; };
  const rates = {};
  for (const s of SOURCES) {
    if (!GRAPH.has(s)) continue;
    const t = ctx.tagged.map((h) => evidence[s](ctx, h, (j) => j !== h).mass);
    const u = untagged.map((i) => evidence[s](ctx, i, () => true).mass);
    if (s === 'director' || s === 'movement') {
      // match how often the source has anything to say: P(any of k films kept) = 1 − (1 − r)^k
      const target = u.filter((x) => x > 0).length / u.length;
      let lo = 0;
      let hi = 1;
      for (let it = 0; it < 50; it++) {
        const r = (lo + hi) / 2;
        const avail = t.reduce((a, k) => a + (k > 0 ? 1 - (1 - r) ** k : 0), 0) / t.length;
        if (avail > target) hi = r; else lo = r;
      }
      rates[s] = Math.min(1, (lo + hi) / 2);
    } else {
      rates[s] = Math.min(1, median(u) / median(t));
    }
  }
  return rates;
};

export const drawKeep = (ctx, rates, rand) => Object.fromEntries(Object.entries(rates)
  .map(([s, r]) => [s, r >= 1 ? null : new Set(ctx.tagged.filter(() => rand() < r))]));

// ---------------------------------------------------------------------------
// The regression
// ---------------------------------------------------------------------------

// L2-penalised logistic regression by Newton's method; slopes shrink by λ, intercepts barely
export const fitLogistic = (X, y, lambda = SETTINGS.lambda) => {
  const d = X[0].length;
  let w = new Float64Array(d);
  const pen = (a) => (a < NSLOPES ? lambda : 0.01);
  for (let it = 0; it < 50; it++) {
    const g = new Float64Array(d);
    const H = Array.from({ length: d }, () => new Float64Array(d));
    for (let r = 0; r < X.length; r++) {
      const x = X[r];
      const nz = [];
      for (let a = 0; a < d; a++) if (x[a]) nz.push(a);
      let z = 0;
      for (const a of nz) z += x[a] * w[a];
      const p = sigmoid(z);
      const e = p - y[r];
      const q = p * (1 - p);
      for (const a of nz) {
        g[a] += e * x[a];
        for (const b of nz) H[a][b] += q * x[a] * x[b];
      }
    }
    for (let a = 0; a < d; a++) { g[a] += pen(a) * w[a]; H[a][a] += pen(a); }
    const A = H.map((row, a) => [...row, g[a]]);
    for (let c = 0; c < d; c++) {
      let p = c;
      for (let r = c + 1; r < d; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]];
      for (let r = 0; r < d; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        if (f) for (let k = c; k <= d; k++) A[r][k] -= f * A[c][k];
      }
    }
    const step = A.map((row, a) => row[d] / row[a]);
    w = w.map((v, a) => v - step[a]);
    if (Math.max(...step.map(Math.abs)) < 1e-8) break;
  }
  return Array.from(w);
};

// Train on a set of hand-tagged films: each contributes `draws` thinned copies of its rows
export const train = (ctx, trainSet, rates, rand, draws = SETTINGS.draws) => {
  const X = [];
  const y = [];
  for (const g of trainSet) {
    for (let d = 0; d < draws; d++) {
      const keep = rates ? drawKeep(ctx, rates, rand) : null;
      featurize(ctx, g, (j) => j !== g && trainSet.has(j), keep).forEach((x, m) => { X.push(x); y.push(ctx.Y[g][m]); });
    }
  }
  return fitLogistic(X, y, ctx.settings.lambda);
};

export const predict = (w, rows) => rows.map((x) => sigmoid(x.reduce((s, v, k) => s + v * w[k], 0)));
