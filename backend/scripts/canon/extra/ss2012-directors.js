/**
 * Sight and Sound — Greatest Films of All Time 2012, directors' poll (358 directors).
 *
 * Source: the BFI's "Directors' 100 Greatest Films of All Time 2012" page.
 * Format: "=2. 2001: A Space Odyssey" then "Stanley Kubrick, 1968" (no country on
 * this page). The page ends with a "Directors' top ten directors" list, which is
 * cut off. Ties run past 100 (=91 is the last rank), so ~102 entries.
 *
 * robots.txt: www.bfi.org.uk serves none (404) → allowed.
 * Helpers are shared from ss2012-critics.js.
 *
 * Usage: node scripts/canon/collectExtra.js --only ss2012-directors
 */
import path from 'path';
import { fetchCached, pageLines, parseRankedLines, toEntry } from './ss2012-critics.js';

export const SOURCE = {
  id: 'ss2012-directors',
  label: "Sight and Sound — Greatest Films of All Time 2012 (directors' poll)",
  short: 'S&S 2012 directors',
  url: 'https://www.bfi.org.uk/sight-and-sound/polls/greatest-films-all-time/directors-100-best',
  family: 'all-time-poll',
  kind: 'ranked',
  size: 100,
  eligible: { from: 1895, to: 2011 }
};

export async function collect({ rawDir }) {
  const dir = path.join(rawDir, SOURCE.id);
  const html = await fetchCached(dir, 'directors-100-best-2012.html', SOURCE.url);
  const lines = pageLines(html);
  const stop = lines.findIndex((l) => /top ten directors/i.test(l));
  const rows = parseRankedLines(lines, { requireYear: true, maxRank: 100, keepLine: (i) => stop < 0 || i < stop });
  return rows.map((r) => toEntry(SOURCE.id, r, `#${r.rank} (2012 directors' poll)`));
}
