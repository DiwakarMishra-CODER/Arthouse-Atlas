/**
 * Moods from what viewers said: the pure part of scripts/moods/fromTags.js (tested in
 * tests/viewerMoods.test.js).
 *
 * MovieLens viewers tag films in their own words ("melancholy", "slow", "dreamlike"). A film has a
 * mood when enough different viewers used one of that mood's words (data/moods/synonyms.json),
 * and they're a fair share of everyone who tagged the film, so the most-tagged films don't collect
 * every mood. One viewer is counted once per mood however many of its words they used. Nothing is
 * guessed: a film without that evidence has no mood.
 */

// a tag as viewers' spellings differ: lower case, curly quotes straightened, underscores and runs of
// spaces made single spaces, stray punctuation off the ends
export const normalizeTag = (tag) => String(tag)
  .normalize('NFKC')
  .toLowerCase()
  .replace(/[‘’]/g, "'")
  .replace(/[_\s]+/g, ' ')
  .replace(/^[\s"'.,;:!?()-]+|[\s"'.,;:!?()-]+$/g, '')
  .trim();

// the rule: 3 or more different viewers, and at least 3% of the film's taggers. A film few viewers
// tagged at all (under 50: most of the atlas's older and rarer films) needs 2: MovieLens viewers
// watch mainstream films, and three of them rarely describe Late Spring.
export const RULE = { minViewers: 3, minShare: 0.03, thin: { below: 50, minViewers: 2 } };

const needed = (rule, taggers) => (rule.thin && taggers < rule.thin.below ? rule.thin.minViewers : rule.minViewers);

// word -> mood, from the synonym table's moods ({ mood: [words] })
export const wordIndex = (moods) => {
  const index = new Map();
  for (const [mood, words] of Object.entries(moods)) {
    for (const w of words) {
      const key = normalizeTag(w);
      if (index.has(key) && index.get(key) !== mood) throw new Error(`"${w}" is listed under both ${index.get(key)} and ${mood}`);
      index.set(key, mood);
    }
  }
  return index;
};

/**
 * A film's moods from its tags.
 * tagUsers: Map(normalized tag -> Set of viewer ids); taggers: how many viewers tagged the film at all.
 * Returns [{ mood, viewers, share, words: [[word, viewers]…] }], most viewers first.
 */
export const moodsFor = (tagUsers, taggers, index, rule = RULE) => {
  const byMood = new Map(); // mood -> { users: Set, words: [[word, n]] }
  for (const [tag, users] of tagUsers) {
    const mood = index.get(tag);
    if (!mood) continue;
    const m = byMood.get(mood) || { users: new Set(), words: [] };
    users.forEach((u) => m.users.add(u));
    m.words.push([tag, users.size]);
    byMood.set(mood, m);
  }
  const out = [];
  for (const [mood, { users, words }] of byMood) {
    const viewers = users.size;
    const share = taggers ? viewers / taggers : 0;
    if (viewers >= needed(rule, taggers) && share >= rule.minShare) {
      out.push({ mood, viewers, share, words: words.sort((a, b) => b[1] - a[1]) });
    }
  }
  return out.sort((a, b) => b.viewers - a.viewers || a.mood.localeCompare(b.mood));
};

// the same, but every mood any viewer's word points to, passed or not (for the report: what just missed)
export const moodEvidence = (tagUsers, index) => {
  const byMood = new Map();
  for (const [tag, users] of tagUsers) {
    const mood = index.get(tag);
    if (!mood) continue;
    const set = byMood.get(mood) || new Set();
    users.forEach((u) => set.add(u));
    byMood.set(mood, set);
  }
  return new Map([...byMood].map(([m, s]) => [m, s.size]));
};
