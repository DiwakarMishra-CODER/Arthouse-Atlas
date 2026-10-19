/**
 * BBC Culture — "The 100 greatest films directed by women" (November 2019,
 * 368 critics from 84 countries).
 *
 * Source: the original BBC Culture article (no Wikipedia tabulation exists).
 * Same countdown layout as bbc-21c:
 *   "100. The Kids are All Right (Lisa Cholodenko, 2010)"
 *
 * robots.txt (bbc.com): /culture/article/ is allowed for generic crawlers.
 */
import path from 'path';
import { fetchCached, parseBBCList } from './bbc-21c.js';

export const SOURCE = {
  id: 'bbc-women',
  label: 'BBC Culture — The 100 Greatest Films Directed by Women (2019)',
  short: 'BBC films by women',
  url: 'https://www.bbc.com/culture/article/20191125-the-100-greatest-films-directed-by-women-poll',
  family: 'all-time-poll',
  kind: 'ranked',
  size: 100,
  eligible: { from: 1895, to: 2019 }
};

export async function collect({ rawDir }) {
  const html = await fetchCached(path.join(rawDir, SOURCE.id), 'bbc.html', SOURCE.url);
  const entries = parseBBCList(html, SOURCE.id, 2019);
  if (entries.length < 100) throw new Error(`${SOURCE.id}: parsed only ${entries.length} entries — page layout changed?`);
  return entries;
}
