/**
 * Link previews. WhatsApp, LinkedIn, Slack, X, iMessage and the rest build a shared link's preview
 * from the page's HTML without running its JavaScript, so every link would otherwise show the
 * site's own title and picture. This Vercel middleware runs before a film's, director's, movement's
 * or studio's page (and the main rooms') is served, and puts that page's own title, one line about
 * it and its picture into the HTML (the block between <!-- meta --> and <!-- /meta --> in
 * index.html). The page itself is the same single-page app as ever.
 *
 * For search engines it also gives every page its canonical address (no query string; a movement
 * always at its slug) and, as schema.org data, what the page is about: a Movie on a film's page, a
 * Person on a director's, the WebSite on the home page.
 *
 * The titles, lines and pictures come from public/meta/*.json, written from the database by
 * backend/scripts/exportMeta.js. A key it doesn't know (or any failure) serves the page unchanged.
 */

export const config = {
    matcher: [
        '/', '/movie/:key', '/directors', '/directors/:key', '/movements', '/movements/:key',
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
// structured data, safe inside a <script>: no "<" can close it early
const ldScript = (ld) => `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;

// a picture's address from the stored path: TMDB's at a size previews like, ours on this site,
// and the site's own picture when there's none
export const pictureOf = (src, origin) => {
    if (!src) return `${origin}/og/arthouse-atlas.jpg`;
    if (/^https?:\/\//.test(src)) return src;
    return src.startsWith('/stills/') ? `${origin}${src}` : `${PICTURE}${src}`;
};

// a page's one address: no query string, no trailing slash, and a movement at its slug
export const canonicalOf = (url, facts) => {
    const [, room] = url.pathname.split('/');
    if (room === 'movements' && facts?.s) return `${url.origin}/movements/${encodeURIComponent(facts.s)}`;
    return `${url.origin}${url.pathname.replace(/\/+$/, '') || '/'}`;
};

// what the page is about, for search engines: a film or a director, from its exported facts
export const structuredData = (room, { title, line, picture, url }, facts) => {
    if (room === 'movie' && facts?.n) {
        return {
            '@context': 'https://schema.org', '@type': 'Movie', name: facts.n, url, image: picture, description: line,
            ...(facts.y ? { dateCreated: String(facts.y) } : {}),
            ...(facts.d?.length ? { director: facts.d.map((name) => ({ '@type': 'Person', name })) } : {}),
            ...(facts.c ? { countryOfOrigin: { '@type': 'Country', name: facts.c } } : {}),
        };
    }
    if (room === 'directors') return { '@context': 'https://schema.org', '@type': 'Person', name: title, url, description: line, jobTitle: 'Film director' };
    return null;
};

// the preview's tags, as they go into the page's <head>
export const previewTags = ({ title, line, picture, url, ld = null }) => [
    `<title>${esc(title)} · ${SITE}</title>`,
    `<meta name="description" content="${esc(line)}" />`,
    `<meta property="og:site_name" content="${SITE}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(line)}" />`,
    `<meta property="og:image" content="${esc(picture)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<link rel="canonical" href="${esc(url)}" />`,
    ...(ld ? [ldScript(ld)] : []),
].join('\n    ');

export const withPreview = (html, preview) => html.replace(/<!-- meta -->[\s\S]*?<!-- \/meta -->/, `<!-- meta -->\n    ${previewTags(preview)}\n    <!-- /meta -->`);

// what a page's address names: [title, line, picture, facts], or null for the site's own
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
    const served = (html) => new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' } });
    try {
        // the home page keeps the site's own preview, and gains its address and the site's name
        if (url.pathname === '/') {
            const page = await shell();
            if (!page.ok) return page;
            const home = `${url.origin}/`;
            const tags = [`<link rel="canonical" href="${esc(home)}" />`, ldScript({ '@context': 'https://schema.org', '@type': 'WebSite', name: SITE, url: home })];
            return served((await page.text()).replace('<!-- /meta -->', `${tags.join('\n    ')}\n    <!-- /meta -->`));
        }
        const subject = await subjectOf(url, async (file) => (await fetch(new URL(file, url.origin))).json());
        const page = await shell();
        if (!subject || !page.ok) return page;
        const [title, line, picture, facts] = subject;
        const preview = { title, line, picture: pictureOf(picture, url.origin), url: canonicalOf(url, facts) };
        preview.ld = structuredData(url.pathname.split('/')[1], preview, facts);
        return served(withPreview(await page.text(), preview));
    } catch {
        return shell();
    }
}
