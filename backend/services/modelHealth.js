/**
 * Which model to ask first, given how they've been doing. When one fails (a timeout, an error, its
 * limit) three times in a row, it's set aside for five minutes and the next is asked straight away,
 * so a search doesn't wait out a model that's down (Gemini's free tier, when it's busy, takes 5-10
 * seconds or refuses, and every search would spend 3 seconds on it before the next model answered).
 * After the five minutes it's tried again; one answer clears it. When every model is set aside,
 * they're all tried, in order. Kept in memory: a restart starts fresh.
 */
export const FAILS_TO_REST = 3;
export const REST_MS = 5 * 60 * 1000;

export const modelHealth = ({ failsToRest = FAILS_TO_REST, restMs = REST_MS } = {}) => {
  const state = new Map(); // model -> { fails, restUntil }
  const of = (m) => state.get(m) || { fails: 0, restUntil: 0 };
  return {
    // the models to ask, in order, leaving out any that are resting (unless all are)
    order: (models, now = Date.now()) => {
      const awake = models.filter((m) => of(m).restUntil <= now);
      return awake.length ? awake : models;
    },
    failed: (m, now = Date.now()) => {
      const s = of(m);
      const fails = s.fails + 1;
      state.set(m, fails >= failsToRest ? { fails: 0, restUntil: now + restMs } : { ...s, fails });
    },
    answered: (m) => state.set(m, { fails: 0, restUntil: 0 }),
    resting: (m, now = Date.now()) => of(m).restUntil > now,
  };
};
