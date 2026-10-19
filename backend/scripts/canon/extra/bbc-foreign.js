/**
 * BBC Culture — "The 100 Greatest Foreign-Language Films" (October 2018,
 * 209 critics from 43 countries).
 *
 * Source: the original BBC Culture article (English Wikipedia's article on the
 * poll only tabulates the top 10). Same countdown layout as bbc-21c:
 *   "100. Landscape in the Mist (Theo Angelopoulos, 1988)"
 * The article gives English titles only, so originalTitle stays null.
 *
 * robots.txt (bbc.com): /culture/article/ is allowed for generic crawlers.
 */
import path from 'path';
import { fetchCached, parseBBCList } from './bbc-21c.js';

export const SOURCE = {
  id: 'bbc-foreign',
  label: 'BBC Culture — The 100 Greatest Foreign-Language Films (2018)',
  short: 'BBC foreign-language',
  url: 'https://www.bbc.com/culture/article/20181029-the-100-greatest-foreign-language-films',
  family: 'all-time-poll',
  kind: 'ranked',
  size: 100,
  eligible: { from: 1895, to: 2018 }
};

export async function collect({ rawDir }) {
  const html = await fetchCached(path.join(rawDir, SOURCE.id), 'bbc.html', SOURCE.url);
  const entries = parseBBCList(html, SOURCE.id, 2018);
  if (entries.length < 100) throw new Error(`${SOURCE.id}: parsed only ${entries.length} entries — page layout changed?`);
  return entries;
}
