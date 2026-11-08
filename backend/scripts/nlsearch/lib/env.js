/**
 * The keys the evaluation scripts use. They read backend/.env like the server, then backend/.env.eval
 * on top when it exists (git-ignored): keys kept for testing, so a test run never spends the free
 * daily allowance the live site depends on (on 8 Nov 2026, three test runs used up Groq's day while
 * the site needed it). The live server never reads .env.eval.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
dotenv.config({ path: path.join(BACKEND, '.env') });
const EVAL = path.join(BACKEND, '.env.eval');
export const evalKeys = fs.existsSync(EVAL);
// only the keys that are filled in: an empty one leaves .env's in place
if (evalKeys) {
  for (const [k, v] of Object.entries(dotenv.parse(fs.readFileSync(EVAL)))) if (v.trim()) process.env[k] = v.trim();
}

// which keys a run is using, by name only (never a value)
export const keysNote = () => {
  const from = (k) => (evalKeys && fs.readFileSync(EVAL, 'utf8').split('\n').some((l) => l.startsWith(`${k}=`) && l.slice(k.length + 1).trim()) ? '.env.eval' : '.env');
  return ['GEMINI_API_KEY', 'GROQ_API_KEY'].map((k) => `${k} from ${process.env[k] ? from(k) : 'nowhere (not set)'}`).join(', ');
};
