/**
 * Download MovieLens 32M
 *
 * Fetches ml-32m.zip (239 MB) and its published MD5 from GroupLens into
 * data/movielens/, checks the file against the MD5, and unzips it. Skips the
 * download when a zip with the right checksum is already there.
 *
 * The data is for research and non-commercial use, and any publication must
 * cite: F. Maxwell Harper and Joseph A. Konstan. 2015. The MovieLens Datasets:
 * History and Context. ACM TiiS 5, 4: 19:1–19:19. https://doi.org/10.1145/2827872
 *
 * Usage:  node scripts/recs/download.js
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { execFileSync } from 'child_process';
import { ML_URL, ML_DIR, ML_FILES } from './lib/paths.js';

const ZIP = path.join(ML_DIR, 'ml-32m.zip');
const MD5_FILE = `${ZIP}.md5`;

const md5Of = async (file) => {
  const hash = crypto.createHash('md5');
  await pipeline(fs.createReadStream(file), hash);
  return hash.digest('hex');
};

const fetchTo = async (url, dest) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
};

const main = async () => {
  fs.mkdirSync(ML_DIR, { recursive: true });

  await fetchTo(`${ML_URL}.md5`, MD5_FILE);
  const expected = fs.readFileSync(MD5_FILE, 'utf8').match(/[a-f0-9]{32}/i)?.[0].toLowerCase();
  if (!expected) throw new Error(`no checksum found in ${MD5_FILE}`);

  if (fs.existsSync(ZIP) && await md5Of(ZIP) === expected) {
    console.log('ml-32m.zip already downloaded and verified');
  } else {
    console.log(`downloading ${ML_URL} …`);
    await fetchTo(ML_URL, ZIP);
    const got = await md5Of(ZIP);
    if (got !== expected) throw new Error(`checksum mismatch: expected ${expected}, got ${got}`);
    console.log(`verified MD5 ${got}`);
  }

  execFileSync('unzip', ['-o', '-q', ZIP, '-d', ML_DIR], { stdio: 'inherit' });
  for (const f of ['ratings.csv', 'movies.csv', 'links.csv']) {
    if (!fs.existsSync(path.join(ML_FILES, f))) throw new Error(`missing ${f} after unzip`);
  }
  console.log(`unzipped → ${path.relative(process.cwd(), ML_FILES)}`);
};

main().catch((err) => { console.error(err); process.exit(1); });
