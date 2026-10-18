/**
 * Fetch canon source pages into a raw directory (default: backend/data/canon/raw,
 * gitignored). Polite: one request at a time, identified UA, 2s between hits.
 *
 * Usage:  node scripts/canon/fetchSources.js [--raw <dir>] [--only tspdt-1000,criterion]
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { SOURCES, AWARDS_SPARQL } from './sources.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const argValue = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const RAW_DIR = argValue('--raw') || path.join(__dirname, '..', '..', 'data', 'canon', 'raw');
const ONLY = (argValue('--only') || '').split(',').filter(Boolean);

const UA = 'ArthouseAtlas-canon-research/0.1 (personal non-commercial project; cinephile catalogue)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  for (const [id, src] of Object.entries(SOURCES)) {
    if (ONLY.length && !ONLY.includes(id)) continue;
    const dest = path.join(RAW_DIR, src.raw);
    try {
      let res;
      if (src.sparql) {
        res = await axios.get(src.url, {
          params: { query: AWARDS_SPARQL },
          headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' },
          responseType: 'text', timeout: 120000
        });
      } else {
        res = await axios.get(src.url, { headers: { 'User-Agent': UA }, responseType: 'text', maxRedirects: 5, timeout: 60000 });
      }
      fs.writeFileSync(dest, res.data);
      console.log(`✓ ${id.padEnd(18)} ${(res.data.length / 1024).toFixed(0).padStart(5)} KB → ${path.relative(process.cwd(), dest)}`);
    } catch (err) {
      console.error(`✗ ${id}: ${err.response?.status || ''} ${err.message}`);
    }
    await sleep(2000);
  }
};

main();
