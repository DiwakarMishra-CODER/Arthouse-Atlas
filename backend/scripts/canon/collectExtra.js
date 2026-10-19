/**
 * Run the collectors in extra/ and write each source's entries to data/canon/<id>.json.
 *
 * Collectors cache their raw downloads under data/canon/raw/<id>/, so a re-run
 * only fetches what's new.
 *
 * Usage:  node scripts/canon/collectExtra.js [--only id1,id2]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadExtras } from './registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'canon');
const RAW_DIR = path.join(DATA_DIR, 'raw');

const args = process.argv.slice(2);
const i = args.indexOf('--only');
const ONLY = i >= 0 ? args[i + 1].split(',') : [];

const main = async () => {
  const extras = await loadExtras();
  for (const [id, mod] of Object.entries(extras)) {
    if (ONLY.length && !ONLY.includes(id)) continue;
    try {
      const entries = await mod.collect({ rawDir: RAW_DIR });
      fs.writeFileSync(path.join(DATA_DIR, `${id}.json`), JSON.stringify(entries, null, 1));
      console.log(`✓ ${id.padEnd(18)} ${String(entries.length).padStart(5)} entries`);
    } catch (err) {
      console.error(`✗ ${id}: ${err.message}`);
    }
  }
};

main();
