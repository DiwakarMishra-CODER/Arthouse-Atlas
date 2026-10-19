/**
 * Sight and Sound — the annual critics' poll of the year's best films
 * (published each December; top 10–12 up to 2013, 20–30 in 2014–17, 50 from 2019).
 *
 * Sources, per year (see YEARS):
 *   2009–2011  old.bfi.org.uk (the pre-2012 BFI site, still online): poll introductions
 *              with the top 10/12. robots.txt there doesn't disallow /sightandsound/.
 *   2012       www.bfi.org.uk/sight-and-sound/best-films-2012 (top 11 with ties)
 *   2013–2019  yearendlists.com's transcriptions of the S&S poll. The BFI's own ranked
 *              pages for these years are gone or don't carry the ranking as text: 2013's
 *              "10 best films" page shows only editors' picks, 2018's stories.bfi.org.uk
 *              page is an Airtable embed, 2019's page lists votes but no ranking, and no
 *              2014–2017 ranked page could be found (slug guesses and searches failed).
 *              robots.txt (yearendlists.com) only disallows /search.
 *   2020–2025  www.bfi.org.uk "The 50 best films of <year>" pages.
 *
 * BFI formats (CMS body HTML via initialPageState, or the old site's markup):
 *   "50. The Worst Person in the World" / "=38. Earth Mama" / "1 The Master" / "5= Title"
 *   or a bare "=6" line then the title; then "Director(s), Country[, Country…]" (no year).
 * yearendlists: <li value="N"> … <div class="book-title">Title</div><div class="book-author">Director</div>
 *
 * Entries carry listYear and yearTolerance 1 (festival films can date from the year before);
 * `year` is set to listYear as the best available hint.
 *
 * Usage: node scripts/canon/collectExtra.js --only ss-yearend
 */
import path from 'path';
import { fetchCached, pageLines, parseRankedLines, splitTitle, splitDirectors, text, toEntry } from './ss2012-critics.js';

export const SOURCE = {
  id: 'ss-yearend',
  label: "Sight and Sound — critics' poll of the year's best films",
  short: 'S&S year-end',
  url: 'https://www.bfi.org.uk/sight-and-sound/articles/type/polls',
  family: 'year-end',
  kind: 'ranked-yearly',
  size: 50,
  eligible: { from: 2009, to: 2025 }
};

const yel = (slug) => ({ host: 'yel', url: `https://www.yearendlists.com/${slug}` });
export const YEARS = {
  2009: { host: 'bfi', url: 'http://old.bfi.org.uk/sightandsound/exclusive/films_of_2009_intro.php' },
  2010: { host: 'bfi', url: 'http://old.bfi.org.uk/sightandsound/polls/films-of-2010-intro.php' },
  2011: { host: 'bfi', url: 'http://old.bfi.org.uk/sightandsound/feature/49804' },
  2012: { host: 'bfi', url: 'https://www.bfi.org.uk/sight-and-sound/best-films-2012' },
  2013: yel('2013/sight-sound-top-10-films-of-2013'),
  2014: yel('2014/sight-sound-top-20-films-of-2014'),
  2015: yel('2015/sight-sound-top-20-films-of-2015'),
  2016: yel('2016/sight-sound-top-30-films-of-2016'),
  2017: yel('2017/sight-sound-poll-top-26-films-of-2017'),
  2018: yel('2018/sight-sound-poll-best-films-of-2018'),
  2019: yel('2019/sight-sound-the-50-best-films-of-2019'),
  2020: { host: 'bfi', url: 'https://www.bfi.org.uk/best-films-2020' },
  2021: { host: 'bfi', url: 'https://www.bfi.org.uk/sight-and-sound/polls/50-best-films-2021' },
  2022: { host: 'bfi', url: 'https://www.bfi.org.uk/sight-and-sound/polls/50-best-films-2022' },
  2023: { host: 'bfi', url: 'https://www.bfi.org.uk/sight-and-sound/polls/50-best-films-2023' },
  2024: { host: 'bfi', url: 'https://www.bfi.org.uk/sight-and-sound/polls/50-best-films-2024' },
  2025: { host: 'bfi', url: 'https://www.bfi.org.uk/sight-and-sound/polls/50-best-films-2025' }
};

const parseBFIYear = (html) => {
  const rows = parseRankedLines(pageLines(html), { requireYear: false, maxRank: 60 });
  const seen = new Set();
  return rows.filter((r) => { const k = r.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
};

const parseYEL = (html) => {
  const list = (html.match(/<ol[\s\S]*?<\/ol>/) || [''])[0];
  return (list.match(/<li value="\d+">[\s\S]*?<\/li>/g) || []).map((li) => {
    const rank = parseInt(li.match(/value="(\d+)"/)[1], 10);
    const title = text((li.match(/class="book-title">([\s\S]*?)<\/div>/) || [])[1] || '');
    const dir = text((li.match(/class="book-author">([\s\S]*?)<\/div>/) || [])[1] || '');
    return { rank, ...splitTitle(title), credit: { directors: dir ? splitDirectors(dir) : [], country: null, originalTitle: null } };
  }).filter((r) => r.title);
};

export async function collect({ rawDir }) {
  const dir = path.join(rawDir, SOURCE.id);
  const out = [];
  for (const [y, src] of Object.entries(YEARS)) {
    const listYear = parseInt(y, 10);
    let html;
    try {
      html = await fetchCached(dir, `${src.host}-${listYear}.html`, src.url);
    } catch (err) {
      console.warn(`  ss-yearend ${listYear}: ${err.message}`);
      continue;
    }
    const rows = src.host === 'yel' ? parseYEL(html) : parseBFIYear(html);
    rows.sort((a, b) => a.rank - b.rank);
    for (const r of rows) {
      out.push(toEntry(SOURCE.id, { ...r, credit: { ...r.credit, year: listYear } }, `#${r.rank} of ${listYear}`,
        { listYear, yearTolerance: 1 }));
    }
  }
  return out;
}
