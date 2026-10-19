/**
 * Build the home page's world map: the countries, and which of them each of
 * the catalogue's countries lights.
 *
 * Copies Natural Earth's 1:110m country shapes (via world-atlas) to the
 * frontend, and writes how the catalogue's country names map onto them —
 * including countries that no longer exist: the Soviet Union lights its fifteen
 * successor states, Yugoslavia its seven, Czechoslovakia two. Hong Kong is too
 * small for this scale and is drawn as a lit disc at its coordinates.
 *
 * Output (frontend/public/atlas/): countries.json (TopoJSON), regions.json
 * Run once, or when the catalogue gains a country:  node scripts/buildAtlasMap.js
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const countries = require('world-atlas/countries-110m.json');

const OUT = path.resolve('../frontend/public/atlas');

// catalogue country → the map shapes it lights (by Natural Earth name); unlisted names map to themselves
const REGIONS = {
  'Soviet Union': ['Russia', 'Ukraine', 'Belarus', 'Georgia', 'Armenia', 'Azerbaijan', 'Kazakhstan', 'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Tajikistan', 'Moldova', 'Lithuania', 'Latvia', 'Estonia'],
  Yugoslavia: ['Serbia', 'Croatia', 'Slovenia', 'Bosnia and Herz.', 'Montenegro', 'Macedonia', 'Kosovo'],
  Czechoslovakia: ['Czechia', 'Slovakia'],
  'Palestinian Territory': ['Palestine']
};
// too small to appear at 1:110m: drawn as a disc [longitude, latitude]
const POINTS = { 'Hong Kong': [114.17, 22.32] };

const shapeNames = new Set(countries.objects.countries.geometries.map((g) => g.properties.name));
const unknown = Object.values(REGIONS).flat().filter((n) => !shapeNames.has(n));
if (unknown.length) throw new Error(`Not in the map: ${unknown.join(', ')}`);

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'countries.json'), JSON.stringify(countries));
fs.writeFileSync(path.join(OUT, 'regions.json'), JSON.stringify({ regions: REGIONS, points: POINTS }));
const size = (f) => `${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0)} KB`;
console.log(`countries.json ${size('countries.json')} · regions.json ${size('regions.json')} · ${shapeNames.size} shapes`);
