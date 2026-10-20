/**
 * Where the mood scripts read from and write to.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BACKEND = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(BACKEND, '.env') });

export const MOODS_DIR = path.join(BACKEND, 'data/moods');
export const KEYWORDS_FILE = path.join(MOODS_DIR, 'tmdb-keywords.json'); // TMDB keywords per tmdbId (fetchKeywords.js)
export const EVAL_FILE = path.join(MOODS_DIR, 'evaluation.json');        // the validation and the chosen threshold (evaluate.js)
export const NEIGHBOURS_FILE = path.join(BACKEND, 'data/recs/neighbours.json');
export const REPORTS = path.join(BACKEND, 'scripts/reports');
export const BACKUPS = path.join(BACKEND, 'data/backups');

export const FILM_FIELDS = 'title year tmdbId directors genres keywords movements synopsis runtime editorial.tags canonRank';

export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

export const loadKeywords = () => {
  if (!fs.existsSync(KEYWORDS_FILE)) throw new Error(`${path.relative(BACKEND, KEYWORDS_FILE)} missing: run node scripts/moods/fetchKeywords.js`);
  return readJson(KEYWORDS_FILE).films;
};

export const loadNeighbours = () => readJson(NEIGHBOURS_FILE).films;

export const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
