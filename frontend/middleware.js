/**
 * Link previews. WhatsApp, LinkedIn, Slack, X, iMessage and the rest build a shared link's preview
 * from the page's HTML without running its JavaScript, so every link would otherwise show the
 * site's own title and picture. This Vercel middleware runs before a film's, director's, movement's
 * or studio's page (and the main rooms') is served, and puts that page's own title, one line about
 * it and its picture into the HTML (the block between <!-- meta --> and <!-- /meta --> in
 * index.html). The page itself is the same single-page app as ever.
 *
 * The titles, lines and pictures come from public/meta/*.json, written from the database by
 * backend/scripts/exportMeta.js. A key it doesn't know (or any failure) serves the page unchanged.
 */

export const config = {
    matcher: [
        '/movie/:key', '/directors', '/directors/:key', '/movements', '/movements/:key',
        '/studios', '/studios/:key', '/explore', '/recommendations', '/about',
    ],
};

const SITE = 'Arthouse Atlas';
const PICTURE = 'https://image.tmdb.org/t/p/w1280';

// the rooms, as they introduce themselves
const ROOMS = {
    explore: ['Explore the films', 'Every film in the atlas, in canon order: narrow it by movement, decade, country, length, genre, mood or director, or start from a film you love.'],
    directors: ['Directors', 'Every director in the atlas, their films rolling through the projector’s gate.'],
    movements: ['Movements', 'The movements of arthouse cinema, from the silent avant-garde to now, each with its films.'],
    studios: ['Studios', 'The houses behind the films (studios, producers and labels), as a backlot seen from a crane.'],
    recommendations: ['For you', 'Films picked for you from the ones you loved, learned from 32 million ratings by real viewers.'],
    about: ['About', 'Why the atlas was made, how a film earns its place, the lists it’s built from, and how For You works.'],
};
// the pages with one subject each, and the file that names them
const SUBJECTS = { movie: 'films', directors: 'directors', movements: 'movements', studios: 'studios' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// a picture's address from the stored path: TMDB's at a size previews like, ours on this site,
// and the site's own picture when there's none
export const pictureOf = (src, origin) => {
    if (!src) return `${origin}/og/arthouse-atlas.jpg`;
    if (/^https?:\/\//.test(src)) return src;
    return src.startsWith('/stills/') ? `${origin}${src}` : `${PICTURE}${src}`;
};

// the preview's tags, as they go into the page's <head>
export const previewTags = ({ title, line, picture, url }) => [
    `<title>${esc(title)} · ${SITE}</title>`,
    `<meta name="description" content="${esc(line)}" />`,
    `<meta property="og:site_name" content="${SITE}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(line)}" />`,
    `<meta property="og:image" content="${esc(picture)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
].join('\n    ');

export const withPreview = (html, preview) => html.replace(/<!-- meta -->[\s\S]*?<!-- \/meta -->/, `<!-- meta -->\n    ${previewTags(preview)}\n    <!-- /meta -->`);

// what a page's address names: [title, line, picture], or null for the site's own
export const subjectOf = async (url, load) => {
    const [, room, key] = url.pathname.split('/');
    if (key && SUBJECTS[room]) {
        const all = await load(`/meta/${SUBJECTS[room]}.json`);
        return all[decodeURIComponent(key)] || null;
    }
    if (!key && ROOMS[room]) return [...ROOMS[room], null];
    return null;
};

export default async function middleware(request) {
    const url = new URL(request.url);
    const shell = () => fetch(new URL('/index.html', url.origin));
    try {
        const subject = await subjectOf(url, async (file) => (await fetch(new URL(file, url.origin))).json());
        const page = await shell();
        if (!subject || !page.ok) return page;
        const [title, line, picture] = subject;
        const html = withPreview(await page.text(), { title, line, picture: pictureOf(picture, url.origin), url: url.href });
        return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' } });
    } catch {
        return shell();
    }
}
