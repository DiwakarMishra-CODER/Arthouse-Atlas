/**
 * @desc    A sentence typed into Explore's search ("sad Japanese films from the 60s"), read into the
 *          board's own words: the filters as Explore's address takes them, the feel words that will
 *          order the wall, and what couldn't be placed. Read by a language model and checked by the
 *          server (services/understand.js); the model's own words never reach the page.
 * @route   POST /api/movies/understand   { q }
 * @access  Public (limited per visitor, and in total per day)
 *
 * Kind to the free tiers it runs on: the same sentence is read once (kept for the server's life),
 * each visitor gets 20 sentences in 10 minutes, and past the day's cap (NL_DAILY_CAP, under the
 * providers') sentences go to the ordinary search. When the first model fails or takes over 3
 * seconds, the second is asked; when both fail, the page runs the ordinary search (`fallback`).
 */
import rateLimit from 'express-rate-limit';
import { loadCatalogue } from '../services/catalogue.js';
import { MODELS, MAX_CHARS, vocabularyOf, askModel, checkReading, anyFilter, fold } from '../services/understand.js';

// chosen by the evaluation (scripts/nlsearch/EVALUATION.md): Gemini reads best (95% on the test set)
// but its free tier sometimes queues for 10 seconds or more; Groq is fast (under a second) but reads
// feel-only requests worse. So Gemini first, and Groq when Gemini hasn't answered in 3 seconds:
// 92% read right on the test set, half the answers in under 2 seconds, nearly all under 4.
// Either can be changed without a deploy.
const FIRST = process.env.NL_MODEL || 'gemini-3.5-flash-lite';
const SECOND = process.env.NL_SECOND_MODEL || 'openai/gpt-oss-120b';
const TIMEOUTS = [3000, 5000]; // the first model's wait, then the second's
const DAILY = Number(process.env.NL_DAILY_CAP || 600);

export const understandLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'That’s a lot of questions: the ordinary search is still there', fallback: true },
});

const answers = new Map(); // folded sentence -> answer
let today = '';
let used = 0;

const paramsOf = (reading, movementsByTitle) => {
  const f = reading.filters;
  const out = {
    country: f.country.join('|'),
    decade: f.decade.join('|'),
    since: f.years?.since ?? '',
    until: f.years?.until ?? '',
    director: f.director.join('|'),
    movement: f.movement.map((t) => movementsByTitle.get(t)?.tag).filter(Boolean).join('|'),
    genre: f.genre.join('|'),
    length: f.length.join('|'),
    like: f.like?.id || '',
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, String(v)]));
};

export const understand = async (req, res) => {
  const q = typeof req.body?.q === 'string' ? req.body.q.trim().replace(/\s+/g, ' ') : '';
  if (!q) return res.status(400).json({ message: 'Type what you’d like to watch' });
  if (q.length > MAX_CHARS) return res.status(400).json({ message: `Keep it under ${MAX_CHARS} characters`, fallback: true });
  const key = fold(q);
  if (answers.has(key)) return res.json({ ...answers.get(key), cached: true });

  const day = new Date().toISOString().slice(0, 10);
  if (day !== today) { today = day; used = 0; }
  if (used >= DAILY) return res.status(503).json({ message: 'Sentence search is resting for today', fallback: true });

  try {
    const catalogue = await loadCatalogue();
    const vocab = vocabularyOf(catalogue);
    let reading = null; let by = null;
    const order = [FIRST, SECOND].filter((m, i, all) => MODELS[m] && all.indexOf(m) === i);
    for (const [i, model] of order.entries()) {
      used++;
      try {
        const { raw } = await askModel(model, q, vocab, { timeoutMs: TIMEOUTS[i] ?? 5000 });
        reading = checkReading(raw, q, { cards: catalogue.cards, vocab });
        by = model;
        break;
      } catch (e) {
        console.error(`understand: ${model} failed: ${e.message}`);
      }
    }
    if (!reading) return res.status(503).json({ message: 'The board couldn’t read that just now', fallback: true });

    const answer = {
      offTopic: reading.offTopic,
      params: paramsOf(reading, catalogue.movementsByTitle),
      like: reading.filters.like, // { id, title, year }, for the board's words
      feel: reading.feel,
      unplaced: reading.unplaced,
      // nothing the board can show, but not off-topic either ("films"): the whole atlas
      empty: !reading.offTopic && !anyFilter(reading.filters) && !reading.feel.length,
      by: MODELS[by].label,
    };
    if (answers.size > 2000) answers.delete(answers.keys().next().value);
    answers.set(key, answer);
    res.json(answer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'The board couldn’t read that just now', fallback: true });
  }
};
