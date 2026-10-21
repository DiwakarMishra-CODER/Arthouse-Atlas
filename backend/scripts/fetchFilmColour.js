/**
 * Which of the atlas's films are in black and white, from Wikidata (a film's "color", P462), matched
 * by its TMDB id (P4947). A still can't say: TMDB's backdrops are sometimes colourised, tinted or
 * desaturated, so one picture gets about one film in ten wrong (Citizen Kane in colour, Caché in black
 * and white). A film filmed in both (Wings of Desire, Andrei Rublev) is "both"; one Wikidata doesn't
 * know is left out.
 *
 * Dry run by default (prints the counts); --write saves data/filmColour.json ({ tmdbId: 'bw' |
 * 'colour' | 'both' }), which the Studios room reads for each house's style.
 *   node scripts/fetchFilmColour.js [--write]
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import { loadCatalogue } from '../services/catalogue.js';

dotenv.config();

const OUT = path.resolve('data/filmColour.json');
const WRITE = process.argv.includes('--write');
const SPARQL = 'https://query.wikidata.org/sparql';
const HEADERS = { 'User-Agent': 'ArthouseAtlas/1.0 (film colour; a film atlas portfolio project)', Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' };
const BW = 'http://www.wikidata.org/entity/Q838368';
const COLOUR = 'http://www.wikidata.org/entity/Q22006653';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// one batch of TMDB ids -> their films' colours, retried with a growing wait when asked to slow down
const colours = async (ids, tries = 5) => {
    const query = `SELECT ?tmdb ?color WHERE { VALUES ?tmdb { ${ids.map((id) => `"${id}"`).join(' ')} } ?f wdt:P4947 ?tmdb ; wdt:P462 ?color . }`;
    for (let i = 0; i < tries; i++) {
        try {
            const r = await fetch(SPARQL, { method: 'POST', headers: HEADERS, body: new URLSearchParams({ query }) });
            if (r.status === 429 || r.status >= 500) { await wait(1500 * 2 ** i); continue; }
            if (!r.ok) return [];
            return (await r.json()).results.bindings.map((b) => [b.tmdb.value, b.color.value]);
        } catch {
            await wait(1500 * 2 ** i);
        }
    }
    return [];
};

const run = async () => {
    await connectDB();
    const { cards } = await loadCatalogue();
    const ids = [...new Set(cards.map((c) => c._tmdb).filter(Boolean).map(String))];
    const found = new Map();
    for (let i = 0; i < ids.length; i += 200) {
        for (const [tmdb, color] of await colours(ids.slice(i, i + 200))) {
            const was = found.get(tmdb) || new Set();
            was.add(color === BW ? 'bw' : color === COLOUR ? 'colour' : 'other');
            found.set(tmdb, was);
        }
        await wait(1000);
    }
    const out = {};
    for (const [tmdb, set] of found) {
        const bw = set.has('bw');
        const colour = set.has('colour') || set.has('other');
        out[tmdb] = bw && colour ? 'both' : bw ? 'bw' : 'colour';
    }
    const count = (v) => Object.values(out).filter((x) => x === v).length;
    console.log(`${ids.length} films: ${count('bw')} black and white, ${count('colour')} colour, ${count('both')} both, ${ids.length - found.size} unknown`);
    if (WRITE) {
        const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => Number(a) - Number(b)));
        fs.writeFileSync(OUT, `${JSON.stringify(sorted, null, 1)}\n`);
        console.log(`wrote ${OUT}`);
    }
    await mongoose.disconnect();
};

run().catch(async (e) => {
    console.error(e);
    await mongoose.disconnect();
    process.exit(1);
});
