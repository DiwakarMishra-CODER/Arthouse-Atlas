/**
 * Why a film was picked, in plain words, from the engine's own reasons (see
 * backend/controllers/recsController.js). "Loved" is only ever said of films you loved; the
 * numbers are only quoted when MovieLens has enough people to say them (30 or more who loved
 * both). The same fact is said a different way from pick to pick (how much likelier than most
 * people its fans are to love it, how many of them did, or, when it's striking, what share),
 * so a page of picks doesn't read like one sentence over and over. Rounding never flatters:
 * 3.6 times is "more than three times".
 */

const FRACTIONS = [[3, 4], [2, 3], [1, 2], [1, 3], [1, 4], [1, 5], [1, 10]];
const WORDS = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten' };

// 0.46 -> "nearly half", 0.34 -> "one in three"
export const fractionWords = (both, loved) => {
    const r = both / loved;
    if (!(r >= 0.08)) return null;
    let best = FRACTIONS[0];
    for (const f of FRACTIONS) if (Math.abs(r - f[0] / f[1]) < Math.abs(r - best[0] / best[1])) best = f;
    const [a, b] = best;
    const exact = a / b;
    const near = r < exact - 0.015 ? 'nearly ' : r > exact + 0.015 ? 'more than ' : '';
    if (a === 1 && b === 2) return `${near}half`;
    return `${near}${WORDS[a]} in ${WORDS[b]}`;
};

// 2.1 -> "twice", 3.6 -> "more than three times", 14 -> "14 times"
const timesWords = (x) => {
    const k = Math.floor(x);
    const word = k === 2 ? 'twice' : `${WORDS[k] || k} times`;
    return x - k < 0.15 ? word : `more than ${word}`;
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const surname = (name) => name.split(/\s+/).slice(-1)[0];

// "Because you loved Tokyo Story" / "Because you watched Persona" / "Because Persona is on your watchlist"
export const becauseWords = (how, title) => {
    if (how === 'watched') return `Because you watched ${title}`;
    if (how === 'watchlist') return `Because ${title} is on your watchlist`;
    return `Because you loved ${title}`;
};

// 1 in how many, never flattering: a share of 0.29 is "1 in 4", not "1 in 3"
const oneIn = (share) => Math.max(2, Math.ceil(1 / share - 0.05));
// how rare a film is among everyone, to a round number that never makes it sound rarer
const rarely = (n) => {
    const step = n < 20 ? 1 : n < 100 ? 5 : n < 1000 ? 10 : 100;
    return (Math.floor(n / step) * step).toLocaleString();
};

// "people who loved X loved this": the true things the counts allow, said one of four ways.
// `turn` rotates which way comes first, so neighbouring picks read differently.
const viewersWords = (t, together, turn) => {
    if (!together) return `People who loved ${t} loved this too.`;
    const { loved, both, pickLoved, people } = together;
    const share = both / loved;
    const base = pickLoved && people ? pickLoved / people : 0;
    const lift = base ? share / base : 0;
    const fraction = fractionWords(both, loved);
    const ways = {
        // a film few people love, loved by many of your film's fans
        contrast: base && base <= 0.05 && lift >= 6 && share >= 0.08 && (() => {
            const k = oneIn(share);
            return `Only 1 in ${rarely(1 / base)} people loved it, but ${k === 2 ? 'half' : `1 in ${k}`} of those who loved ${t} did.`;
        })(),
        count: `Loved by ${both.toLocaleString()} people who also loved ${t}.`,
        likely: lift >= 2 && lift < 10 && `People who loved ${t} are ${timesWords(lift)} as likely as most people to love this.`,
        share: share >= 0.3 && fraction && `${cap(fraction)} of the ${loved.toLocaleString()} people who loved ${t} loved this too.`,
    };
    const can = ['contrast', 'count', 'likely', 'share'].filter((way) => ways[way]);
    return ways[can[turn % can.length]];
};

// the line of evidence under a pick; `turn` (its place among the picks) chooses how it's said
export const evidenceWords = (because, { turn = 0 } = {}) => {
    if (!because?.film) return 'One of the most acclaimed films in the atlas.';
    const t = because.film.title;
    if (because.reason === 'viewers') return viewersWords(t, because.together, turn);
    if (because.reason === 'director' && because.shared?.director) return `By ${because.shared.director}, who made ${t}.`;
    if (because.reason === 'movement' && because.shared?.movement) return `From the same movement as ${t}: ${because.shared.movement}.`;
    if (because.reason === 'country' && because.shared?.country) return `Also from ${because.shared.country === 'United States of America' ? 'the United States' : because.shared.country}, like ${t}.`;
    if (because.reason === 'decade' && because.shared?.decade) return `Also from the ${because.shared.decade}s, like ${t}.`;
    return `People who loved ${t} loved this too.`;
};

// "And because you loved In the Mood for Love."
export const alsoWords = (also) => {
    const a = also?.[0];
    if (!a?.film) return null;
    return `${becauseWords(a.how, a.film.title).replace('Because', 'And because')}.`;
};

// a small true fact about the two films (never the reason itself)
export const factWords = (shared) => {
    if (!shared) return null;
    if (shared.director) return `Also by ${surname(shared.director)}`;
    if (shared.movement) return 'Same movement';
    if (shared.country) return `Also from ${shared.country === 'United States of America' ? 'the US' : shared.country}`;
    if (shared.decade) return `Also ${shared.decade}s`;
    return null;
};
