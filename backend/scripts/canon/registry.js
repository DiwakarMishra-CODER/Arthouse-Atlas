/**
 * Every canon source the atlas reads, in one place.
 *
 * The original six live in sources.js and go through fetchSources.js /
 * parseSources.js. Newer sources are self-contained collectors in extra/,
 * each exporting SOURCE (its metadata) and collect() (fetch + parse). The
 * resolver and the scorer read this registry, so a new collector in extra/
 * is picked up without touching them.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { SOURCES } from './sources.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const EXTRA_DIR = path.join(__dirname, 'extra');

// collector modules in extra/, by source id
export const loadExtras = async () => {
  if (!fs.existsSync(EXTRA_DIR)) return {};
  const files = fs.readdirSync(EXTRA_DIR).filter((f) => f.endsWith('.js'));
  const mods = await Promise.all(files.map((f) => import(pathToFileURL(path.join(EXTRA_DIR, f)).href)));
  return Object.fromEntries(mods.filter((m) => m.SOURCE?.id).map((m) => [m.SOURCE.id, m]));
};

// id → metadata, original six and extras together
export const loadSources = async () => {
  const extras = await loadExtras();
  return { ...SOURCES, ...Object.fromEntries(Object.entries(extras).map(([id, m]) => [id, m.SOURCE])) };
};
