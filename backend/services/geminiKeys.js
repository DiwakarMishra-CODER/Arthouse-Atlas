/**
 * The Gemini keys: GEMINI_API_KEY may hold several, comma-separated (the owner's own projects). The
 * first is used; the next only when one answers that it's at its limit, and a limited key rests for
 * ten minutes before it's tried again. Any other error (a bad request, a timeout) is not a reason to
 * try another key, and is passed on.
 */
const RESTS = 10 * 60 * 1000;
const resting = new Map(); // key -> when it may be tried again

export const geminiKeys = (env = process.env) => String(env.GEMINI_API_KEY || '').split(',').map((k) => k.trim()).filter(Boolean);

// call(key) makes the request; it throws an error with `limited: true` when the key is at its limit
export const withGeminiKey = async (call, env = process.env) => {
  const keys = geminiKeys(env);
  if (!keys.length) throw Object.assign(new Error('GEMINI_API_KEY is not set'), { limited: false });
  let last = null;
  for (const key of keys) {
    if ((resting.get(key) || 0) > Date.now()) continue;
    try {
      return await call(key);
    } catch (e) {
      if (!e.limited) throw e;
      resting.set(key, Date.now() + RESTS);
      last = e;
    }
  }
  throw last || Object.assign(new Error('every Gemini key is resting at its limit'), { limited: true, status: 429 });
};
