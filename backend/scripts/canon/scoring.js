/**
 * How canon evidence becomes a standing.
 *
 * 1. Each citation gets a strength: the source's weight × how high the film
 *    sits on it (#1 on a poll counts more than #240; a Palme d'Or more than a
 *    jury prize; membership lists are flat).
 * 2. Citations are grouped into families of sources that measure the same
 *    thing — all-time polls, peer polls, year-end consensus, prizes … A film
 *    earns a family's credit once, from its best citation there, with a small
 *    bonus for showing up on more of that family's lists, and every family is
 *    capped. Five year-end lists that draw on the same critics can't add up to
 *    five times one opinion.
 * 3. Eligibility: a film can only be judged by lists it could have been on.
 *    A 2021 film can't appear in the 2012 poll or BBC's 2016 list, and even
 *    where it technically could (the 2025 TSPDT), an all-time poll takes a
 *    film seriously only after years of settling — so those lists count as
 *    available in proportion to the time the film has had (full after 20
 *    years). The evidence a film *could* have earned is smaller, and its score
 *    is lifted in proportion (dampened, so a recent film doesn't leapfrog the
 *    classics on one good year).
 *
 * 4. Two standings come out of this, each fair in its own way:
 *    - canon: how proven a film is. No recency lift. All-time and peer polls
 *      weigh most; year-end lists and prizes — the first verdict, not the
 *      lasting one — count for less; and a film earns an endurance bonus for
 *      every further decade in which the great polls have placed it (Tokyo
 *      Story has been in them since the 1970s; Parasite since 2022).
 *    - standing: how it stands among films of its own time, with the lift for
 *      recent films. Used to rank a film within its decade.
 *
 * The results are numbers for ordering only. Pages show what it stands for —
 * the strongest citation and the film's place in the atlas — never the number.
 */

// how much one citation from each source counts, before rank
export const WEIGHT = {
  'ss2022-critics': 3.0, 'ss2022-directors': 2.5, 'ss2012-critics': 2.2, 'ss2012-directors': 1.8, 'ss-historic': 2.0,
  'tspdt-1000': 2.5, 'rosenbaum-1000': 1.5, 'bbc-21c': 2.0, 'bbc-foreign': 2.0, 'bbc-women': 1.6, 'ss-docs': 2.0,
  'nyt-21c': 2.2, 'busan-asian100': 2.0,
  criticstop10: 2.2, 'ss-yearend': 2.0, 'cahiers-top10': 1.8, 'kinema-junpo': 1.8,
  criterion: 1.2, 'festival-awards': 2.0, 'ebert-great': 1.0
};

// the most a family can contribute, however many of its lists a film is on
export const FAMILY_CAP = {
  'all-time-poll': 9.0, 'peer-poll': 4.5, 'year-end': 3.5, 'regional-poll': 2.0,
  prize: 2.5, institution: 1.2, critic: 1.0
};

// list depth for sources whose entries don't say it
const DEPTH = { criticstop10: 50, 'ss-yearend': 50, 'cahiers-top10': 10, 'kinema-junpo': 10, 'ss-historic': 10 };

const ASIA = /japan|china|hong kong|taiwan|korea|india|iran|thailand|philippines|indonesia|malaysia|singapore|vietnam|cambodia|sri lanka|bangladesh|pakistan|kazakhstan|kyrgyz|mongolia|israel|lebanon|turkey|iraq|syria|palestin|afghanistan|nepal|bhutan|tajik|uzbek|georgia|armenia/i;

// How high a film sits on one list, 0–1
const placement = (e, src) => {
  if (e.awardWeight != null) return e.awardWeight;
  if (!e.rank) return 0.55;                                    // membership: Criterion, Rosenbaum, Ebert
  const n = src.size || DEPTH[e.source] || 100;
  const pos = Math.min(1, (e.rank - 1) / n);
  if (src.kind === 'ranked-yearly') return 0.3 + 0.7 * (1 - pos) ** 1.5;
  if (src.kind === 'ranked-historic') return 0.6 + 0.4 * (1 - pos);
  return 0.35 + 0.65 * (1 - pos) ** 1.3;
};

// CriticsTop10's years before 1970 come from the Film Daily newspaper poll — a mainstream
// consensus (1939's #1 is Goodbye, Mr. Chips) — so they count for half
const discount = (e) => (e.source === 'criticstop10' && (e.listYear || e.year) < 1970 ? 0.5 : 1);

export const strengthOf = (e, src) => +((WEIGHT[e.source] ?? src.weight ?? 1) * placement(e, src) * discount(e)).toFixed(2);

// Could this film have appeared on this source at all?
export const eligibleFor = (film, src, id) => {
  const y = film.year;
  if (id === 'kinema-junpo') return /japan/i.test(film.country || '');
  if (id === 'busan-asian100') return ASIA.test(film.country || '') && (!y || y <= 2014);
  if (!src.eligible || !y) return true;
  return y >= src.eligible.from && y <= src.eligible.to;
};

// Independent all-time polls agreeing is the canon itself, so agreement there counts for more;
// year-end lists share their critics, so past the best one the rest add little
const AGREEMENT = { 'all-time-poll': [0.65, 0.45], 'peer-poll': [0.55, 0.35] };

const familyScore = (strengths, cap, fam) => {
  const [second, rest] = AGREEMENT[fam] || [0.3, 0.15];
  const [a = 0, b = 0, ...more] = [...strengths].sort((x, y) => y - x);
  return Math.min(cap, a + second * b + rest * more.reduce((x, y) => x + y, 0));
};

const ALL_FAMILIES = Object.values(FAMILY_CAP).reduce((a, b) => a + b, 0);

// how much each kind of evidence counts towards the all-time canon
const CANON_WEIGHT = {
  'all-time-poll': 1.0, 'peer-poll': 0.9, 'regional-poll': 0.8, critic: 0.7, institution: 0.7,
  'year-end': 0.55, prize: 0.55
};

// the year each poll was taken, for endurance (ss-historic entries carry their own)
const POLL_YEAR = {
  'ss2022-critics': 2022, 'ss2022-directors': 2022, 'ss2012-critics': 2012, 'ss2012-directors': 2012,
  'tspdt-1000': 2025, 'rosenbaum-1000': 2004, 'bbc-21c': 2016, 'bbc-foreign': 2018, 'bbc-women': 2019,
  'nyt-21c': 2025, 'ss-docs': 2014, 'busan-asian100': 2015
};

// decades in which the great polls placed the film, beyond the first
const endurance = (evidence, sources) => {
  const decades = new Set(evidence
    .filter((x) => ['all-time-poll', 'peer-poll', 'regional-poll'].includes(sources[x.source]?.family))
    .map((x) => x.pollYear || POLL_YEAR[x.source])
    .filter(Boolean)
    .map((y) => Math.floor(y / 10)));
  return Math.min(3, 0.6 * Math.max(0, decades.size - 1));
};

// how far a list could really have reached this film: lists that canonise slowly need time
const SLOW = new Set(['all-time-poll', 'peer-poll', 'regional-poll', 'critic']);
const opportunity = (film, src) => {
  if (!SLOW.has(src.family) || !film.year || !src.eligible) return 1;
  const settled = src.eligible.to + 1 - film.year;
  return Math.min(1, Math.max(0.15, settled / 20));
};

/**
 * evidence: [{ source, strength, pollYear? }] for one film; sources: id → metadata.
 * Returns { raw, available, score (the canon), standing (for ranking within a decade) }.
 */
export const scoreFilm = (film, evidence, sources) => {
  const byFamily = {};
  for (const x of evidence) {
    const fam = sources[x.source]?.family || 'institution';
    (byFamily[fam] ||= []).push(x.strength);
  }
  const families = Object.entries(byFamily).map(([fam, xs]) => [fam, familyScore(xs, FAMILY_CAP[fam] ?? 1, fam)]);
  const raw = families.reduce((sum, [, v]) => sum + v, 0);
  const canon = families.reduce((sum, [fam, v]) => sum + v * (CANON_WEIGHT[fam] ?? 0.7), 0) + endurance(evidence, sources);

  // what each family could have given this film, at the best reach any of its lists had
  const reach = {};
  for (const [id, src] of Object.entries(sources)) {
    if (!eligibleFor(film, src, id)) continue;
    reach[src.family] = Math.max(reach[src.family] || 0, opportunity(film, src));
  }
  const available = Object.entries(reach).reduce((sum, [fam, r]) => sum + (FAMILY_CAP[fam] ?? 0) * r, 0) || ALL_FAMILIES;
  const lift = Math.min(1.5, (ALL_FAMILIES / available) ** 0.5);

  return { raw: +raw.toFixed(2), available: +available.toFixed(2), score: +canon.toFixed(2), standing: +(raw * lift).toFixed(2) };
};
