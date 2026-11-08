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
import { screensFacet } from '../services/watchIndex.js';

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

// streaming in a sentence ("on MUBI", "free", "anything streaming"), as Explore's screens= and in=
const screensOf = (values, services, region) => {
  if (!values.length) return {};
  if (values.includes('any')) return { screens: 'all', in: region };
  if (values.includes('free')) return { screens: 'free', in: region };
  const ids = values.map((v) => services.find((s) => s.name === v)?.id).filter(Boolean);
  return ids.length ? { screens: ids.join(','), in: region } : {};
};

const paramsOf = (reading, movementsByTitle, services, region, feel) => {
  const f = reading.filters;
  const out = {
    country: f.country.join('|'),
    decade: f.decade.join('|'),
    since: f.years?.since ?? '',
    until: f.years?.until ?? '',
    director: f.director.join('|'),
    actor: f.actor.join('|'),
    language: f.language.join('|'),
    known: f.known,
    movement: f.movement.map((t) => movementsByTitle.get(t)?.tag).filter(Boolean).join('|'),
    genre: f.genre.join('|'),
    length: f.length.join('|'),
    like: f.like?.id || '',
    feel: feel.join('|'),
    about: reading.about.join('|'),
    ...screensOf(f.streaming, services, region),
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, String(v)]));
};

export const understand = async (req, res) => {
  const q = typeof req.body?.q === 'string' ? req.body.q.trim().replace(/\s+/g, ' ') : '';
  if (!q) return res.status(400).json({ message: 'Type what you’d like to watch' });
  if (q.length > MAX_CHARS) return res.status(400).json({ message: `Keep it under ${MAX_CHARS} characters`, fallback: true });
  // the country they'd stream in (for "on MUBI"), as the page says it
  const region = /^[A-Z]{2}$/.test(req.body?.region || '') ? req.body.region : 'US';
  const key = `${region}|${fold(q)}`;
  if (answers.has(key)) return res.json({ ...answers.get(key), cached: true });

  const day = new Date().toISOString().slice(0, 10);
  if (day !== today) { today = day; used = 0; }
  if (used >= DAILY) return res.status(503).json({ message: 'Sentence search is resting for today', fallback: true });

  try {
    const catalogue = await loadCatalogue();
    const vocab = vocabularyOf(catalogue);
    const services = screensFacet(catalogue.cards, region).services; // what streams in their country
    vocab.services = services.slice(0, 40).map((s) => s.name);
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

    // the feel words the wall is ordered by: the request's own, except a reference that was translated,
    // which its feelings stand in for ("like listening to Dillinger Escape Plan" -> intense, violent)
    const covered = (f) => reading.inferred.some((i) => fold(i.from).includes(fold(f)) || fold(f).includes(fold(i.from)));
    const feel = [...reading.feel.filter((f) => !covered(f)), ...reading.inferred.map((i) => i.value)].slice(0, 6);
    const answer = {
      offTopic: reading.offTopic,
      params: paramsOf(reading, catalogue.movementsByTitle, services, region, feel),
      like: reading.filters.like, // { id, title, year }, for the board's words
      feel,
      about: reading.about, // what it should be about: orders the wall too
      inferred: reading.inferred, // [{ value, from }]: what a reference was read as, for the page to say so
      unplaced: reading.unplaced.filter((u) => !covered(u)), // (a reference that was translated was used)
      // nothing the board can show, but not off-topic either ("films"): the whole atlas
      empty: !reading.offTopic && !anyFilter(reading.filters) && !feel.length && !reading.about.length,
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
