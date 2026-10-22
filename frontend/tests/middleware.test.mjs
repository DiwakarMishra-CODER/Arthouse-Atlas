// The link-preview middleware, run against the real index.html and the exported meta files, with
// the network replaced by the files on disk.  Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import middleware, { pictureOf, withPreview } from '../middleware.js';

const root = new URL('../', import.meta.url);
const SHELL = fs.readFileSync(new URL('index.html', root), 'utf8');
const films = JSON.parse(fs.readFileSync(new URL('public/meta/films.json', root), 'utf8'));
const movements = JSON.parse(fs.readFileSync(new URL('public/meta/movements.json', root), 'utf8'));
const studios = JSON.parse(fs.readFileSync(new URL('public/meta/studios.json', root), 'utf8'));
const directors = JSON.parse(fs.readFileSync(new URL('public/meta/directors.json', root), 'utf8'));

// the site's files, served from disk
const serve = ({ broken = false } = {}) => {
    globalThis.fetch = async (input) => {
        const { pathname } = new URL(input);
        if (pathname === '/index.html') return new Response(SHELL, { status: 200, headers: { 'content-type': 'text/html' } });
        if (broken) throw new Error('network down');
        const file = new URL(`public${pathname}`, root);
        return fs.existsSync(file) ? new Response(fs.readFileSync(file)) : new Response('not found', { status: 404 });
    };
};
const page = async (path, options) => {
    serve(options);
    const res = await middleware(new Request(`https://arthouse-atlas.vercel.app${path}`));
    return { status: res.status, html: await res.text() };
};
const tag = (html, property) => html.match(new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`))?.[1];
const canonical = (html) => html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
const data = (html) => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || 'null');

test("a film's link shows its title, its line and its picture", async () => {
    const [id, [title, line, picture]] = Object.entries(films).find(([, f]) => f[2]);
    const { status, html } = await page(`/movie/${id}`);
    assert.equal(status, 200);
    assert.match(html, new RegExp(`<title>${title.replace(/[()]/g, '\\$&')} · Arthouse Atlas</title>`));
    assert.equal(tag(html, 'og:title'), title.replace(/&/g, '&amp;').replace(/"/g, '&quot;'));
    assert.equal(tag(html, 'og:image'), `https://image.tmdb.org/t/p/w1280${picture}`);
    assert.ok(line.length > 0 && tag(html, 'og:description').length > 0);
    assert.equal(tag(html, 'og:url'), `https://arthouse-atlas.vercel.app/movie/${id}`);
    assert.equal((html.match(/<title>/g) || []).length, 1, 'one title only');
    assert.match(html, /<script type="module"/, 'the app itself is still on the page');
});

test('a director, a movement (by slug) and a studio each get their own', async () => {
    const [did, [dname]] = Object.entries(directors)[0];
    assert.equal(tag((await page(`/directors/${did}`)).html, 'og:title'), dname.replace(/&/g, '&amp;').replace(/"/g, '&quot;'));
    const [slug, [mtitle]] = Object.entries(movements).find(([k]) => !/^[a-f0-9]{24}$/.test(k));
    assert.equal(tag((await page(`/movements/${slug}`)).html, 'og:title'), mtitle);
    const [sslug, [sname]] = Object.entries(studios)[0];
    assert.equal(tag((await page(`/studios/${sslug}`)).html, 'og:title'), sname.replace(/&/g, '&amp;'));
});

test('a room gets its own title and the site picture', async () => {
    const { html } = await page('/about');
    assert.equal(tag(html, 'og:title'), 'About');
    assert.equal(tag(html, 'og:image'), 'https://arthouse-atlas.vercel.app/og/arthouse-atlas.jpg');
});

test("an address it doesn't know, or a failure, serves the page unchanged", async () => {
    assert.equal((await page('/movie/000000000000000000000000')).html, SHELL);
    assert.equal((await page('/movie/6953c208df81e631d5708e39', { broken: true })).html, SHELL);
});

test('pictures: TMDB at preview size, our own stills on this site, the site picture when there is none', () => {
    assert.equal(pictureOf('/abc.jpg', 'https://x.app'), 'https://image.tmdb.org/t/p/w1280/abc.jpg');
    assert.equal(pictureOf('/stills/l-avventura.jpg', 'https://x.app'), 'https://x.app/stills/l-avventura.jpg');
    assert.equal(pictureOf(null, 'https://x.app'), 'https://x.app/og/arthouse-atlas.jpg');
});

test('what goes into the page is escaped', () => {
    const html = withPreview(SHELL, { title: 'A "Film" & <Co>', line: 'x', picture: 'p', url: 'u' });
    assert.match(html, /<meta property="og:title" content="A &quot;Film&quot; &amp; &lt;Co&gt;" \/>/);
});

test("search engines: a film's page has its one address and says it's a Movie, by whom and when", async () => {
    const [id, [, , , facts]] = Object.entries(films).find(([, f]) => f[3]?.d?.length && f[3]?.y);
    const { html } = await page(`/movie/${id}?ref=somewhere`);
    assert.equal(canonical(html), `https://arthouse-atlas.vercel.app/movie/${id}`, 'no query string');
    assert.equal(tag(html, 'og:url'), canonical(html));
    const ld = data(html);
    assert.equal(ld['@type'], 'Movie');
    assert.equal(ld.name, facts.n, 'its own title, without the year');
    assert.equal(ld.dateCreated, String(facts.y));
    assert.deepEqual(ld.director.map((d) => d.name), facts.d);
});

test('search engines: a movement reached by its id points to its slug; a director is a Person; a room has no data', async () => {
    const [mid, [, , , mfacts]] = Object.entries(movements).find(([k]) => /^[a-f0-9]{24}$/.test(k));
    assert.equal(canonical((await page(`/movements/${mid}`)).html), `https://arthouse-atlas.vercel.app/movements/${mfacts.s}`);
    const [did, [dname]] = Object.entries(directors)[0];
    const person = data((await page(`/directors/${did}`)).html);
    assert.equal(person['@type'], 'Person');
    assert.equal(person.name, dname);
    const about = (await page('/about/')).html;
    assert.equal(canonical(about), 'https://arthouse-atlas.vercel.app/about', 'no trailing slash');
    assert.equal(data(about), null);
});

test('search engines: the home page keeps its own preview and gains its address and the site name', async () => {
    const { status, html } = await page('/');
    assert.equal(status, 200);
    assert.equal(canonical(html), 'https://arthouse-atlas.vercel.app/');
    assert.deepEqual(data(html), { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Arthouse Atlas', url: 'https://arthouse-atlas.vercel.app/' });
    assert.equal(tag(html, 'og:title'), tag(SHELL, 'og:title'), 'the site preview is untouched');
});

test('the sitemap lists every page once, a movement only at its slug', () => {
    const xml = fs.readFileSync(new URL('public/sitemap.xml', root), 'utf8');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    assert.equal(new Set(locs).size, locs.length, 'no page twice');
    const slugs = Object.keys(movements).filter((k) => !/^[a-f0-9]{24}$/.test(k));
    assert.equal(locs.length, 7 + Object.keys(films).length + Object.keys(directors).length + slugs.length + Object.keys(studios).length);
    assert.ok(locs.every((l) => l.startsWith('https://arthouse-atlas.vercel.app/')));
    assert.ok(!locs.some((l) => /\/movements\/[a-f0-9]{24}$/.test(l)));
    assert.match(fs.readFileSync(new URL('public/robots.txt', root), 'utf8'), /Sitemap: https:\/\/arthouse-atlas\.vercel\.app\/sitemap\.xml/);
});
