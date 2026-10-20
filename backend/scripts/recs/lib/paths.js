/**
 * Where the recommendation pipeline keeps its files.
 *
 *   data/movielens/   the MovieLens download (gitignored, ~1 GB unzipped)
 *   data/recs/work/   intermediate counts and evaluation users (gitignored)
 *   data/recs/        what ships: neighbours.json, evaluation.json, EVALUATION.md
 *   scripts/reports/  human-readable reports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BACKEND = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const ML_URL = 'https://files.grouplens.org/datasets/movielens/ml-32m.zip';
export const ML_DIR = path.join(BACKEND, 'data', 'movielens');
export const ML_FILES = path.join(ML_DIR, 'ml-32m');
export const RECS_DIR = path.join(BACKEND, 'data', 'recs');
export const WORK_DIR = path.join(RECS_DIR, 'work');
export const REPORTS_DIR = path.join(BACKEND, 'scripts', 'reports');
export const ENV_FILE = path.join(BACKEND, '.env');

export const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export const writeJson = (p, data, indent) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, indent));
};
