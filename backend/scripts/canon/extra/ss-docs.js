/**
 * Sight and Sound — Critics' 50 Greatest Documentaries of All Time (August 2014,
 * 237 critics, curators and academics).
 *
 * Source: the BFI page for the critics' list. The poll also canvassed ~100
 * filmmakers, but no separate filmmakers' ranking is on the current BFI site (the
 * interactive "greatest-docs-full-poll" page it linked to is gone), so every entry
 * here is from the critics' list; `detail` says so.
 *
 * Format: "=12. Grizzly Man" then "Werner Herzog, USA 2005"; ties at 47 run the list
 * to 56 films. Odd credits handled: "(Khaneh siah ast) Forough Farrokhzad, Iran 1963"
 * (original title first), "Paul Almond (Seven Up!) then Michael Apted, UK 1964-ongoing",
 * "Patricio Guzmán, Chile/Cuba 1975-78" (first year kept).
 *
 * robots.txt: www.bfi.org.uk serves none (404) → allowed.
 *
 * Usage: node scripts/canon/collectExtra.js --only ss-docs
 */
import path from 'path';
import { fetchCached, pageLines, parseRankedLines, toEntry } from './ss2012-critics.js';

export const SOURCE = {
  id: 'ss-docs',
  label: "Sight and Sound — Critics' 50 Greatest Documentaries of All Time (2014)",
  short: 'S&S docs 2014',
  url: 'https://www.bfi.org.uk/sight-and-sound/critics-50-greatest-documentaries-all-time',
  family: 'all-time-poll',
  kind: 'ranked',
  size: 50,
  eligible: { from: 1895, to: 2013 }
};

export async function collect({ rawDir }) {
  const dir = path.join(rawDir, SOURCE.id);
  const lines = pageLines(await fetchCached(dir, 'critics-50-greatest-documentaries.html', SOURCE.url));
  const start = lines.findIndex((l) => /^The top 50$/i.test(l));
  const stop = lines.findIndex((l, i) => i > start && /browse all the votes/i.test(l));
  const rows = parseRankedLines(lines, { requireYear: true, maxRank: 50, keepLine: (i) => i > start && (stop < 0 || i < stop) });
  return rows.map((r) => toEntry(SOURCE.id, r, `#${r.rank} (2014 critics' documentary poll)`));
}
