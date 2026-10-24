/**
 * The pictures kept off the site (nudity and sex scenes), from data/blockedFrames.json:
 * explicit.js takes them out of the catalogue, and addStills.js never adds them back.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const BLOCKED = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data/blockedFrames.json');

export const fileOf = (url) => (url ? url.split('/').pop() : null);

// every entry: { file, film, id }: the TMDB file, and the film (or director) it was taken off
export const blockedPictures = () => (fs.existsSync(BLOCKED) ? JSON.parse(fs.readFileSync(BLOCKED, 'utf8')).pictures : []);
