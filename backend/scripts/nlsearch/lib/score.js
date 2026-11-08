/**
 * Scoring a checked reading against the test set's answer (testset.json, fixed before any model ran).
 *
 * A reading is right when every filter the answer names is set as it says, nothing else is set
 * (beyond the answer's `allow`), feel words are there when the answer expects them, and anything
 * unplaceable is reported as unplaced. Two readings that pick exactly the same films count as the
 * same answer for time ("before 1950" as a span or as the decades 1910s to 1940s).
 *
 * Answer forms: a value (exactly that), a list (any of these, at least one), { each: [...] }
 * (exactly these, all of them), years { since, until }. `alsoRight`: other complete answers.
 * Pure; tested in tests/understand.test.js.
 */
import { applyFilters } from '../../../services/catalogue.js';
import { normalizeName } from '../../../services/nameUtils.js';

export const FIELDS = ['country', 'director', 'actor', 'language', 'movement', 'genre', 'length', 'streaming', 'like'];

const shape = (g) => (g == null ? null : Array.isArray(g) ? { any: g } : typeof g === 'object' && g.each ? { each: g.each } : { each: [g] });
const same = (field) => (a, b) => (field === 'director' || field === 'like' ? normalizeName(String(a)) === normalizeName(String(b)) : String(a) === String(b));
const setsMatch = (field, want, got) => {
  const eq = same(field);
  if (want.any) return got.length > 0 && got.every((x) => want.any.some((y) => eq(x, y)));
  return got.length === want.each.length && want.each.every((y) => got.some((x) => eq(x, y)));
};
const gotOf = (reading, field) => {
  const v = reading.filters[field];
  if (field === 'like') return v ? [v.title] : [];
  return Array.isArray(v) ? v : [];
};
const hasTime = (f) => (f.decade?.length > 0) || Boolean(f.years);
const ids = (cards, decade, years) => new Set(applyFilters(cards, { decade, years }).map((c) => c._id));
const sameFilms = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

// one expected answer against one reading: { right, wrong: [what was off] }
const against = (expect, allow, reading, cards) => {
  const wrong = [];
  if (expect.offTopic) return { right: reading.offTopic === true, wrong: reading.offTopic ? [] : ['not declined'] };
  if (reading.offTopic) return { right: false, wrong: ['declined a real request'] };

  for (const field of FIELDS) {
    const want = shape(expect[field]);
    const got = gotOf(reading, field);
    if (!want) { if (got.length && !allow.includes(field)) wrong.push(`${field} set but not asked (${got.join(', ')})`); continue; }
    if (!setsMatch(field, want, got)) wrong.push(`${field}: wanted ${JSON.stringify(expect[field])}, got ${JSON.stringify(got)}`);
  }

  // time, compared by the films it picks
  const wantTime = expect.decade != null || expect.years != null;
  const gotTime = hasTime(reading.filters);
  const decadeWant = shape(expect.decade);
  if (decadeWant?.any) {
    if (!setsMatch('decade', decadeWant, reading.filters.decade) || reading.filters.years) wrong.push(`time: wanted ${JSON.stringify(expect.decade)}`);
  } else if (wantTime) {
    const want = ids(cards, decadeWant?.each || [], expect.years || '');
    const got = ids(cards, reading.filters.decade, reading.filters.years);
    if (!gotTime || !sameFilms(want, got)) wrong.push(`time: wanted ${JSON.stringify({ decade: expect.decade, years: expect.years })}, got ${JSON.stringify({ decade: reading.filters.decade, years: reading.filters.years })}`);
  } else if (gotTime && !allow.includes('decade')) wrong.push(`time set but not asked (${JSON.stringify({ decade: reading.filters.decade, years: reading.filters.years })})`);

  if (expect.feel && !reading.feel.length && !reading.inferred?.length) wrong.push('no feel words');
  if (expect.about && !reading.about?.length) wrong.push('no subject words');
  // lesser known ("underrated", "hidden gems")
  if (expect.lesserKnown && reading.filters.known !== 'less') wrong.push('lesser known not set');
  if (!expect.lesserKnown && reading.filters.known && !allow.includes('known')) wrong.push('lesser known set but not asked');
  if (expect.unplaced && !reading.unplaced.length) wrong.push('nothing reported as unplaced');
  return { right: wrong.length === 0, wrong };
};

export const scoreReading = (request, reading, cards) => {
  const allow = request.allow || [];
  const tries = [request.expect, ...(request.alsoRight || [])].map((e) => against(e, allow, reading, cards));
  const best = tries.find((t) => t.right) || tries[0];
  return {
    right: best.right,
    wrong: best.wrong,
    // not wrong, but worth counting: words reported that the answer didn't expect
    extraFeel: !request.expect.feel && !allow.includes('feel') && (reading.feel?.length > 0 || reading.inferred?.length > 0),
    extraUnplaced: !request.expect.unplaced && reading.unplaced?.length > 0,
    // a filter set that nobody asked for (drift)
    drift: best.wrong.some((w) => w.includes('set but not asked')),
  };
};
