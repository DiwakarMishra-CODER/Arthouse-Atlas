/**
 * Facts for every house in the Studios room (data/studios.js): its real logo and its founding.
 *
 * The logo comes from TMDB, through one of the house's own films: that film's production credits
 * carry the company's id and logo, matched by the house's exact name (a search by name finds look-alikes:
 * "The Archers" finds "The Searchers"). Labels release films rather than make them, so they're found
 * by name, exactly. The founding (the year, who founded it, and where) comes from Wikidata, through
 * the house's English Wikipedia page (`wiki`).
 *
 * Where the fetched facts are wrong or missing, data/studioFactFixes.js corrects them (applied last).
 *
 * Dry run by default (prints what it found); --write saves data/studioFacts.json.
 * With EXTRACTS=path, the Wikipedia summaries are saved there too, as sources for the houses' notes.
 *   node scripts/fetchStudioFacts.js [--write]
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import sharp from 'sharp';
import connectDB from '../config/database.js';
import Studio from '../models/Studio.js';
import { loadCatalogue } from '../services/catalogue.js';
import { buildStudios } from '../services/studios.js';
import { HOUSES, LABELS } from '../data/studios.js';
import { FIXES } from '../data/studioFactFixes.js';
import { createLimiter } from './lib/tmdbResolve.js';

dotenv.config();

const KEY = process.env.TMDB_API_KEY;
const OUT = path.resolve('data/studioFacts.json');
const WRITE = process.argv.includes('--write');
const limit = createLimiter(4);
const HEADERS = { 'User-Agent': 'ArthouseAtlas/1.0 (studio facts; a film atlas portfolio project)' };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// a GET, retried with a growing wait when the service asks us to slow down
const get = async (url, tries = 5) => {
    for (let i = 0; i < tries; i++) {
        try {
            const r = await fetch(url, { headers: HEADERS });
            if (r.status === 429 || r.status >= 500) { await wait(800 * 2 ** i); continue; }
            return r.ok ? r.json() : null;
        } catch {
            await wait(800 * 2 ** i);
        }
    }
    return null;
};
// Wikipedia and Wikidata ask to be visited one request at a time
let lastWiki = 0;
const politely = async (url) => {
    const gap = 1000 - (Date.now() - lastWiki);
    if (gap > 0) await wait(gap);
    lastWiki = Date.now();
    return get(url);
};

// the house's company on TMDB, and its logo
const companyOf = async (house, films) => {
    const names = new Set([house.name, ...(house.credits || [])].map((n) => n.toLowerCase()));
    for (const c of films.slice(0, 8)) {
        if (!c._tmdb) continue;
        const m = await get(`https://api.themoviedb.org/3/movie/${c._tmdb}?api_key=${KEY}`);
        const credits = (m?.production_companies || []).filter((p) => names.has(p.name.toLowerCase()));
        const pc = credits.find((p) => p.logo_path) || credits[0];
        if (pc) return { tmdbCompany: pc.id, logo: pc.logo_path || null };
    }
    const s = await get(`https://api.themoviedb.org/3/search/company?api_key=${KEY}&query=${encodeURIComponent(house.name)}`);
    const exact = (s?.results || []).filter((r) => names.has(r.name.toLowerCase()));
    const pc = exact.find((r) => r.logo_path) || exact[0];
    return pc ? { tmdbCompany: pc.id, logo: pc.logo_path || null } : { tmdbCompany: null, logo: null };
};

// whether a logo is drawn dark (for the projector's white) or light (made for a dark ground):
// the mean brightness of its opaque pixels
export const toneOf = async (logo) => {
    if (!logo) return null;
    try {
        const res = await fetch(`https://image.tmdb.org/t/p/w185${logo}`);
        if (!res.ok) return null;
        const { data, info } = await sharp(Buffer.from(await res.arrayBuffer())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        let sum = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += info.channels) {
            if (data[i + 3] < 128) continue;
            sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            n += 1;
        }
        return n ? (sum / n > 150 ? 'light' : 'dark') : null;
    } catch {
        return null;
    }
};

// the house's Wikipedia page and Wikidata entry: when, by whom, where
const firstId = (claims, prop) => claims[prop]?.[0]?.mainsnak?.datavalue?.value?.id || null;
const wikiOf = async (title) => {
    const sum = await politely(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
    if (!sum || sum.type === 'disambiguation' || !sum.wikibase_item) return null;
    const q = sum.wikibase_item;
    const entity = await politely(`https://www.wikidata.org/wiki/Special:EntityData/${q}.json`);
    const claims = entity?.entities?.[q]?.claims || {};
    const time = claims.P571?.[0]?.mainsnak?.datavalue?.value?.time;
    return {
        page: sum.content_urls?.desktop?.page || null,
        extract: sum.extract || '',
        founded: time ? Number(time.slice(1, 5)) : null,
        founderIds: (claims.P112 || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean),
        // where it was formed; failing that, where it has its headquarters
        placeId: firstId(claims, 'P740') || firstId(claims, 'P159'),
    };
};

// English names for Wikidata entries, fifty at a time, and where each is (for a place that's a building)
const labelsOf = async (ids) => {
    const out = new Map();
    for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50).join('|');
        const r = await politely(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${batch}&props=labels|claims&languages=en&format=json`);
        Object.entries(r?.entities || {}).forEach(([id, e]) => out.set(id, { label: e.labels?.en?.value || null, within: firstId(e.claims || {}, 'P131') }));
    }
    return out;
};
const BUILDING = /building|tower|house|street|road|avenue|centre|center|plaza|\d/i;

const run = async () => {
    await connectDB();
    const catalogue = await loadCatalogue();
    const records = await Studio.find({}).select('name featuredFilms').lean();
    const built = new Map(buildStudios({ cards: catalogue.cards, records, directors: catalogue.directors }).map((h) => [h.slug, h]));
    const houses = [...HOUSES, ...LABELS].filter((h) => built.has(h.slug));

    // the logos in parallel (TMDB copes); the Wikipedia pages one after another
    const companies = await Promise.all(houses.map((h) => limit(() => companyOf(h, built.get(h.slug).films.map((f) => catalogue.byId.get(f.id)).filter(Boolean)))));
    const found = [];
    for (const [i, h] of houses.entries()) found.push({ h, company: companies[i], wiki: h.wiki ? await wikiOf(h.wiki) : null });

    // names for the founders and places, and a building's city for a headquarters
    const ids = [...new Set(found.flatMap(({ wiki }) => (wiki ? [...wiki.founderIds, wiki.placeId].filter(Boolean) : [])))];
    const labels = await labelsOf(ids);
    const within = [...new Set([...labels.values()].map((l) => l.within).filter(Boolean))];
    const outer = await labelsOf(within);

    const facts = {};
    const extracts = {};
    for (const { h, company, wiki } of found) {
        const place = wiki?.placeId ? labels.get(wiki.placeId) : null;
        const city = place?.label && BUILDING.test(place.label) && place.within ? outer.get(place.within)?.label || null : place?.label || null;
        facts[h.slug] = {
            founded: wiki?.founded || null,
            founders: (wiki?.founderIds || []).map((id) => labels.get(id)?.label).filter((n) => n && !/^Q\d+$/.test(n)),
            place: city,
            wiki: wiki?.page || null,
            tmdbCompany: company.tmdbCompany,
            logo: company.logo,
        };
        facts[h.slug].logoTone = await toneOf(company.logo);
        Object.assign(facts[h.slug], FIXES[h.slug] || {});
        extracts[h.slug] = wiki?.extract || '';
        const f = facts[h.slug];
        console.log(`${h.slug.padEnd(22)} ${String(f.founded || '—').padEnd(5)} ${(f.place || '—').padEnd(22)} logo:${f.logo ? 'yes' : 'no '} ${f.founders.join(', ')}${wiki ? '' : '  (no Wikipedia page)'}`);
    }
    if (WRITE) {
        fs.writeFileSync(OUT, `${JSON.stringify(facts, null, 1)}\n`);
        console.log(`wrote ${OUT}`);
    }
    if (process.env.EXTRACTS) fs.writeFileSync(process.env.EXTRACTS, JSON.stringify(extracts, null, 1));
    await mongoose.disconnect();
};

run().catch(async (e) => {
    console.error(e);
    await mongoose.disconnect();
    process.exit(1);
});
