/**
 * The 20 canon sources, as the site shows them (About: the lists): each one's family, kind, depth,
 * name and website, written to data/listSources.json. The server reads that file rather than the
 * collector modules here, which it never needs. Run again whenever a source is added.
 *   node scripts/canon/exportListSources.js
 */
import fs from 'fs';
import path from 'path';
import { loadSources } from './registry.js';

const sources = await loadSources();
const out = Object.fromEntries(Object.entries(sources).map(([id, s]) => [id, {
    family: s.family, kind: s.kind || 'membership', size: s.size || null, label: s.label, url: s.url || null,
}]));
const file = path.resolve('data/listSources.json');
fs.writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`);
console.log(`wrote ${Object.keys(out).length} sources to ${file}`);
