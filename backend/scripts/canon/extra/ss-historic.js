/**
 * Sight and Sound — top tens of the earlier decennial Greatest Films polls:
 * critics' 1952, 1962, 1972, 1982, 1992, 2002 and directors' 1992, 2002.
 *
 * Source: the BFI's per-poll archive pages (/sight-and-sound/polls/greatest-films-all-time/<year>),
 * which give director, country and year for each film — unlike Wikipedia's or the old
 * old.bfi.org.uk/sightandsound/polls/topten/ pages, which list titles and surnames only.
 * Format: "=7. Battleship Potemkin" then "Sergei Eisenstein, Soviet Union 1925".
 *
 * Each page has sections: the critics' top ten, (1992/2002) the directors' top ten,
 * "top ten directors" lists and "Runners up" — only the two film top tens are kept,
 * ranks ≤ 10 (ties can take a list to 12 films). The 2002 joint entry
 * "The Godfather and The Godfather Part II" (1972/1974) becomes two entries.
 *
 * robots.txt: www.bfi.org.uk serves none (404) → allowed.
 *
 * Usage: node scripts/canon/collectExtra.js --only ss-historic
 */
import path from 'path';
import { fetchCached, pageLines, parseRankedLines, expandPairs, toEntry } from './ss2012-critics.js';

export const SOURCE = {
  id: 'ss-historic',
  label: 'Sight and Sound — Greatest Films polls 1952–2002 (top tens)',
  short: 'S&S 1952–2002',
  url: 'https://www.bfi.org.uk/sight-and-sound/polls/greatest-films-all-time/1952',
  family: 'all-time-poll',
  kind: 'ranked-historic',
  size: 10,
  eligible: { from: 1895, to: 2001 }
};

const POLLS = [1952, 1962, 1972, 1982, 1992, 2002];
// the 1992 page credits La strada as "Federico Fellini, Italy" with no year
const YEAR_FIXES = { 'La strada': 1954 };
const pageUrl = (y) => `https://www.bfi.org.uk/sight-and-sound/polls/greatest-films-all-time/${y}`;

export async function collect({ rawDir }) {
  const dir = path.join(rawDir, SOURCE.id);
  const out = [];
  for (const pollYear of POLLS) {
    const lines = pageLines(await fetchCached(dir, `bfi-${pollYear}.html`, pageUrl(pollYear)));
    // section of each line: critics until a heading says otherwise
    let section = 'critics';
    const sections = lines.map((l) => {
      if (l.length < 80) {
        if (/top ten directors|runners.up/i.test(l)) section = null;
        else if (/directors[’']?\s*(top ten|poll)/i.test(l)) section = 'directors';
        else if (/critics[’']?\s*(top ten|poll)|top ten films|ten best films/i.test(l)) section = 'critics';
      }
      return section;
    });
    const rows = expandPairs(parseRankedLines(lines, { requireYear: false, maxRank: 10, keepLine: (i) => !!sections[i] }));
    for (const r of rows) {
      const who = sections[r.line];
      if (!r.credit.year && YEAR_FIXES[r.title]) r.credit.year = YEAR_FIXES[r.title];
      out.push(toEntry(SOURCE.id, r, `#${r.rank} in the ${pollYear} ${who}' poll`, { pollYear, poll: who }));
    }
  }
  return out;
}
