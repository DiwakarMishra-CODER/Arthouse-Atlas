/**
 * The feel ranking of natural-language search: the films that fit a search's filters, in order of how
 * well they fit its feel words ("slow", "sad", "set in winter"), never filtered by them. Two signals:
 *
 *  1. What viewers said, first: a film whose MovieLens viewers used the same word, or one the mood
 *     table counts as the same feeling ("sad": melancholy, heartbreaking; data/moods/synonyms.json):
 *     films matching more of the feel words first, then by how many viewers said it. Direct evidence, worked out here without the API, and
 *     the words each result shows ("viewers said: melancholy, sad").
 *  2. The embedding: the feel words against each film's own (what viewers called it, and its
 *     synopsis). On its own it mostly finds similar stories (the synopsis outweighs the feel: it put
 *     Videodrome 14th for "funny"), so it only orders the films viewers described that way among
 *     themselves. The films no viewer described that way follow in the order given (the canon's),
 *     behind a divider on the page; only when no film at all has viewers' words for it does the
 *     embedding order everything, and the page says so.
 *  3. What it should be about ("grief", "a heist", "set in Tokyo"): the films TMDB tags with it (or
 *     whose viewers name it) come first, and the rest by how close their story is, since a synopsis is
 *     exactly what says what a film is about (where it says little about how it feels).
 *
 * The films are embedded once (scripts/nlsearch/feelIndex.js -> data/feel/index.json); a search costs
 * one call for its feel words, and the same words are never asked twice.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { withGeminiKey } from './geminiKeys.js';

export const EMBED_MODEL = 'gemini-embedding-2';
export const EMBED_DIMS = 256;
const FEEL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/feel');

const unit = (v) => {
  const n = Math.hypot(...v) || 1;
  return Float32Array.from(v, (x) => x / n);
};
// a unit vector as signed bytes, base64 (and back)
export const toBytes = (v) => Buffer.from(Int8Array.from(unit(v), (x) => Math.max(-127, Math.min(127, Math.round(x * 127)))).buffer).toString('base64');
export const fromBytes = (b64) => {
  const b = Buffer.from(b64, 'base64');
  return unit(Array.from(new Int8Array(b.buffer, b.byteOffset, b.length)));
};
export const cosine = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

export const embedBatch = async (texts, { task = 'RETRIEVAL_QUERY', env = process.env, timeoutMs = 15000 } = {}) => {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    // (with several keys, the next one only when one is at its limit: services/geminiKeys.js)
    return await withGeminiKey(async (key) => {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents`, {
        method: 'POST',
        signal: ctl.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ requests: texts.map((text) => ({ model: `models/${EMBED_MODEL}`, content: { parts: [{ text }] }, taskType: task, outputDimensionality: EMBED_DIMS })) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(body.error?.message?.slice(0, 200) || `HTTP ${res.status}`), { limited: res.status === 429 });
      return body.embeddings.map((e) => e.values);
    }, env);
  } finally {
    clearTimeout(timer);
  }
};

// the index, read once
let loaded = null;
export const feelIndex = () => {
  if (loaded) return loaded;
  const file = path.join(FEEL_DIR, 'index.json');
  if (!fs.existsSync(file)) return null;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const tags = JSON.parse(fs.readFileSync(path.join(FEEL_DIR, 'tags.json'), 'utf8')).films;
  const moods = JSON.parse(fs.readFileSync(path.join(FEEL_DIR, '../moods/synonyms.json'), 'utf8')).moods;
  loaded = {
    films: new Map(Object.entries(raw.films).map(([id, f]) => [id, fromBytes(f.v)])),
    tagsOf: new Map(Object.entries(tags).map(([id, f]) => [id, f.tags.map(([t]) => t)])),
    countsOf: new Map(Object.entries(tags).map(([id, f]) => [id, f.tags])), // [[word, viewers]], most first
    kin: kinOf(moods),
  };
  return loaded;
};

// ---------------------------------------------------------------------------
// which of a film's viewers' words matched the feel, without the API
// ---------------------------------------------------------------------------
// a rough stem: "sadness", "sad" -> "sad"; "melancholy", "melancholic" -> "melanchol"
export const stem = (w) => {
  let s = w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const end of ['ness', 'ing', 'ic', 'ed', 'ly', 'y', 's']) {
    if (s.endsWith(end) && s.length - end.length >= 3) { s = s.slice(0, -end.length); break; }
  }
  return s;
};
const stemsOf = (phrase) => String(phrase).toLowerCase().split(/[^a-z\u00c0-\u024f]+/).filter((w) => w.length >= 3).map(stem);
const phraseOf = (s) => stemsOf(s).join(' ');
// words that say nothing about a feeling on their own ("set in winter" is about winter; "a movie that
// feels like…" is about whatever follows), compared as stems so every form of them is caught
const PLAIN = new Set(['set', 'film', 'films', 'movie', 'movies', 'cinema', 'something', 'anything', 'feel', 'feels', 'feeling',
  'about', 'with', 'very', 'kind', 'like', 'from', 'that', 'this', 'the', 'and', 'one', 'thing', 'want', 'watch', 'watching',
  'listening', 'listen', 'make', 'makes', 'makes', 'really', 'bit', 'some', 'kind', 'sort', 'type', 'story', 'stories'].map(stem));
// a feel word is matched word by word only when it's short ("sad", "set in winter"): in a sentence
// ("a movie that feels like listening to…"), single words match unrelated tags, so only whole feelings count
const WORDS_MAX = 2;
// a phrase -> every phrase the mood table counts as the same feeling, whole phrases only
// ("sad": melancholy, heartbreaking; "slow": slow burn, but never "burned" on its own)
export const kinOf = (moods) => {
  const kin = new Map();
  for (const [mood, words] of Object.entries(moods)) {
    const family = new Set([mood, ...words].map(phraseOf).filter(Boolean));
    for (const p of family) kin.set(p, new Set([...(kin.get(p) || []), ...family]));
  }
  return kin;
};
// what a feel word matches in viewers' words: the word itself anywhere in a tag ("winter" in "winter
// landscape"), or a whole tag the mood table counts as the same feeling
const wantedOf = (feelWords, kin) => {
  const words = new Set(feelWords.flatMap((f) => {
    const content = stemsOf(f).filter((w) => w.length >= 3 && !PLAIN.has(w));
    return content.length <= WORDS_MAX ? content : [];
  }));
  const phrases = new Set(feelWords.flatMap((f) => [phraseOf(f), ...stemsOf(f)]).flatMap((p) => [...(kin.get(p) || [])]));
  return (tag) => stemsOf(tag).some((w) => words.has(w)) || phrases.has(phraseOf(tag));
};
// a film's viewers' words that match the feel words: one for each feeling it matches first (so a film
// called both "disturbing" and "violent" shows both), then the rest, most used first
export const matchedWords = (feelWords, filmTags, kin, max = 2) => {
  const out = [];
  for (const f of feelWords) {
    const hit = filmTags.find(wantedOf([f], kin));
    if (hit && !out.includes(hit)) out.push(hit);
  }
  for (const t of filmTags.filter(wantedOf(feelWords, kin))) if (!out.includes(t)) out.push(t);
  return out.slice(0, max);
};
// what it's about: a subject's own words (its plain words aside) all in one of a film's TMDB tags or
// viewers' words ("set in Tokyo": "tokyo, japan"; "a heist": "heist", "bank heist")
const subjectIn = (subject, tags) => {
  const want = stemsOf(subject).filter((w) => w.length >= 3 && !PLAIN.has(w) && !SUBJECT_PLAIN.has(w));
  if (!want.length) return null;
  return tags.find((t) => { const have = new Set(stemsOf(t)); return want.every((w) => have.has(w)); }) || null;
};
const SUBJECT_PLAIN = new Set(['about', 'set', 'place', 'takes', 'take', 'where', 'who', 'man', 'woman', 'people', 'person'].map(stem));
export const subjectsMatched = (aboutWords, tags) => {
  const out = [];
  for (const a of aboutWords) { const t = subjectIn(a, tags); if (t && !out.includes(t)) out.push(t); }
  return out;
};

// how many of the feel words a film's viewers used (a film matching "disturbing" and "violent" fits
// "violent, intense, bleak, disturbing" better than one matching "bleak" alone, however strongly)
export const feelingsMatched = (feelWords, filmTags, kin) => feelWords.filter((f) => filmTags.some(wantedOf([f], kin))).length;
// how strongly a film's viewers said it: each matching word counts by how many said it, against the
// film's most-used word (so a film tagged by few viewers isn't drowned out by a famous one), up to 1
export const viewerEvidence = (feelWords, counts, kin) => {
  if (!counts?.length) return 0;
  const wanted = wantedOf(feelWords, kin);
  const top = counts[0][1];
  return Math.min(1, counts.filter(([t]) => wanted(t)).reduce((sum, [, n]) => sum + n / top, 0));
};
// what viewers said outweighs a close story: full evidence is worth more than the whole spread of
// embedding scores within a wall (about 0.05 to 0.1)
const EVIDENCE_WEIGHT = 0.15;
// the feel words put the way each film's own text begins, so the two are compared like for like; a
// subject goes in plainly, as a synopsis would say it
export const queryText = (words, about = []) => [words.length ? `Viewers called it: ${words.join(', ')}.` : '', about.length ? `A film about ${about.join(', ')}.` : ''].filter(Boolean).join(' ');

// a search's feel words as one embedding; the same words are asked once (kept for the server's life)
const asked = new Map();
export const embedFeel = async (words, { about = [], ...opts } = {}) => {
  const phrase = queryText(words, about).toLowerCase();
  if (asked.has(phrase)) return asked.get(phrase);
  const [v] = await embedBatch([phrase], { task: 'RETRIEVAL_QUERY', ...opts });
  const vec = unit(v);
  if (asked.size > 2000) asked.delete(asked.keys().next().value);
  asked.set(phrase, vec);
  return vec;
};

// The cards in order of feel: first the films viewers described that way (`sure`), strongest evidence
// first (the embedding breaking near-ties), then the rest in the order given; when no film has viewers'
// words for it, everything by the embedding instead. `query` may be null (the embedding couldn't be
// reached): the viewers' evidence still orders what it can.
export const rankByFeel = (cards, query, feelWords, index = feelIndex(), aboutWords = []) => {
  const scored = cards.map((c, i) => {
    const v = query && index?.films.get(c._id);
    const evidence = index && feelWords.length ? viewerEvidence(feelWords, index.countsOf.get(c._id), index.kin) : 0;
    const breadth = evidence ? feelingsMatched(feelWords, index.tagsOf.get(c._id) || [], index.kin) : 0;
    const tagged = aboutWords.length ? subjectsMatched(aboutWords, [...(c._keywords || []), ...(index?.tagsOf.get(c._id) || [])]) : [];
    return { c, i, evidence, breadth: breadth + tagged.length, tagged, story: v ? cosine(query, v) : null };
  });
  const sure = scored.filter((x) => x.evidence > 0 || x.tagged.length > 0);
  const rest = scored.filter((x) => x.evidence === 0 && !x.tagged.length);
  // more of the feelings and subjects first, then how strongly viewers said it (the story breaking near-ties)
  sure.sort((a, b) => (b.breadth - a.breadth) || ((b.story ?? 0) + EVIDENCE_WEIGHT * b.evidence) - ((a.story ?? 0) + EVIDENCE_WEIGHT * a.evidence) || (a.i - b.i));
  // the rest: by story when there's a subject (a synopsis says what a film is about) or no evidence at all;
  // otherwise as given (the canon's order: a story says little about how a film feels)
  if (!sure.length || aboutWords.length) rest.sort((a, b) => ((b.story ?? -Infinity) - (a.story ?? -Infinity)) || (a.i - b.i));
  return [...sure, ...rest].map(({ c, evidence, tagged, story }) => ({
    card: c,
    sure: evidence > 0 || tagged.length > 0,
    score: story,
    matched: index && feelWords.length ? matchedWords(feelWords, index.tagsOf.get(c._id) || [], index.kin) : [],
    tagged,
  }));
};
