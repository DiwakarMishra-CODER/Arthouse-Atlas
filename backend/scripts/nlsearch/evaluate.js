/**
 * The evaluation of natural-language search: the test set (testset.json, fixed and reviewed before any
 * model ran) read by each model, checked by the server's guardrails (services/understand.js), and
 * scored against the answers (lib/score.js). Writes EVALUATION.md.
 *
 *   node scripts/nlsearch/evaluate.js --model=gemini-3.5-flash-lite      ask the model what isn't asked yet
 *   node scripts/nlsearch/evaluate.js --score                             score what's been asked, no calls
 *
 * Gentle on free tiers: every answer is kept (readings/<model>.json), so a request is asked once per
 * model and prompt version, and a run picks up where the last stopped. Calls are spaced out (--gap,
 * under the per-minute limits), each model has a daily cap of our own (readings/budget-<model>.json), and a run stops
 * at the first sign of the provider's limit instead of retrying. OpenRouter's free models allow 50
 * requests a day, which is one reason it was set aside (see MODELS). Errors are kept as answers (a live search
 * would have fallen back to keyword search); --retry-errors asks them again.
 *
 * The catalogue is read from the database once and kept as catalogue.json, so scoring (and CI) can
 * run without it (--offline).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { toCard } from '../../services/catalogue.js';
import { MODELS, PROMPT_VERSION, vocabularyOf, askModel, checkReading } from '../../services/understand.js';
import { scoreReading } from './lib/score.js';
import Movie from '../../models/Movie.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(HERE, '../../.env') });
const READINGS = path.join(HERE, 'readings');
const SNAPSHOT = path.join(HERE, 'catalogue.json');
const REPORT = path.join(HERE, 'EVALUATION.md');

const arg = (name, fallback = null) => {
  const a = process.argv.find((x) => x === `--${name}` || x.startsWith(`--${name}=`));
  if (!a) return fallback;
  return a.includes('=') ? a.split('=').slice(1).join('=') : true;
};
const readJson = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback);
const writeJson = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
const slug = (model) => model.replace(/[^a-z0-9.]+/gi, '-');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);

const CAPS = { gemini: 150, openrouter: 50, groq: 150 }; // our own daily caps, under each provider's
const GAPS = { gemini: 4500, openrouter: 3500, groq: 15000 }; // ms between calls: under each one's per-minute limit (Groq's is 8,000 tokens a minute, about 4 readings)

// the catalogue as the search sees it (from the database, or the kept copy)
const loadCards = async (offline) => {
  if (!offline) {
    await mongoose.connect(process.env.MONGODB_URI);
    const films = await Movie.find({}).select('title originalTitle altTitles year decade directors country countries runtime genres movements canonRank').lean();
    await mongoose.disconnect();
    const lean = films.map((m) => ({ ...m, _id: String(m._id) }));
    writeJson(SNAPSHOT, { at: new Date().toISOString(), films: lean });
    return lean.map(toCard);
  }
  const kept = readJson(SNAPSHOT, null);
  if (!kept) throw new Error('no catalogue.json yet: run once without --offline');
  return kept.films.map(toCard);
};

// what the OpenRouter key has left today (its free models' daily allowance)
const openRouterLeft = async () => {
  const r = await fetch('https://openrouter.ai/api/v1/key', { headers: { authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` } });
  return (await r.json()).data?.free_model_daily_requests?.remaining ?? 0;
};

const ask = async (model, set, cards, vocab) => {
  const spec = MODELS[model];
  if (!spec) throw new Error(`unknown model: ${model} (one of ${Object.keys(MODELS).join(', ')})`);
  const file = path.join(READINGS, `${slug(model)}.json`);
  const kept = readJson(file, { model, promptVersion: PROMPT_VERSION, answers: {} });
  if (kept.promptVersion !== PROMPT_VERSION) { kept.promptVersion = PROMPT_VERSION; kept.answers = {}; }
  const retry = arg('retry-errors');
  const todo = set.requests.filter((r) => {
    const a = kept.answers[r.id];
    return !a || a.text !== r.text || (retry && a.error);
  });
  const BUDGET = path.join(READINGS, `budget-${slug(model)}.json`); // calls made each day (one file a model, so two can run at once)
  const budget = readJson(BUDGET, {});
  const usedToday = budget[today()]?.[model] || 0;
  const max = Number(arg('max', Infinity));
  let room = Math.min(max, CAPS[spec.provider] - usedToday);
  if (spec.provider === 'openrouter') room = Math.min(room, (await openRouterLeft()) - 2);
  console.log(`${model}: ${todo.length} to ask, room for ${Math.max(0, room)} today`);

  let asked = 0;
  for (const r of todo) {
    if (asked >= room) { console.log(asked >= max ? `stopped at --max=${max}` : 'the daily cap is reached: run again tomorrow'); break; }
    if (asked) await wait(Number(arg('gap', GAPS[spec.provider])));
    asked++;
    budget[today()] = { ...(budget[today()] || {}), [model]: usedToday + asked };
    writeJson(BUDGET, budget);
    try {
      const { raw, ms, tokens } = await askModel(model, r.text, vocab, { timeoutMs: 30000 });
      kept.answers[r.id] = { text: r.text, raw, ms, tokens, at: new Date().toISOString() };
      process.stdout.write(`${r.id} ${ms}ms  `);
    } catch (e) {
      if (e.limited) { console.log(`\nthe provider's limit (${e.status}): stopping. ${e.message}`); asked--; budget[today()][model]--; writeJson(BUDGET, budget); break; }
      kept.answers[r.id] = { text: r.text, raw: null, error: `${e.status || 'error'}: ${e.message}`, at: new Date().toISOString() };
      process.stdout.write(`${r.id} ERROR  `);
    }
    writeJson(file, kept);
  }
  console.log(`\nasked ${asked}`);
};

// ---------------------------------------------------------------------------
// the report
// ---------------------------------------------------------------------------
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '–');
const quantile = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null; };

const evaluateModel = (model, set, cards, vocab, check = 2) => {
  const kept = readJson(path.join(READINGS, `${slug(model)}.json`), null);
  if (!kept || kept.promptVersion !== PROMPT_VERSION) return null;
  const rows = [];
  for (const r of set.requests) {
    const a = kept.answers[r.id];
    if (!a || a.text !== r.text) continue;
    let reading = null; let error = a.error || null;
    if (!error) { try { reading = checkReading(a.raw, r.text, { cards, vocab }, { check }); } catch (e) { error = `bad shape: ${e.message}`; } }
    const s = reading ? scoreReading(r, reading, cards) : { right: false, wrong: [error], extraFeel: false, extraUnplaced: false, drift: false };
    rows.push({ r, a, reading, error, ...s });
  }
  return rows;
};

// results: as the site checks now; first: the same saved answers through the check as first evaluated
const report = (set, results, firstCheck = {}) => {
  const lines = [];
  const n = set.requests.length;
  lines.push('# Natural-language search: evaluation', '');
  lines.push(`The test set: ${n} requests in plain English (\`testset.json\`), each with the reading a person would expect, written and reviewed before any model was run (${set.reviewed?.on || 'not yet reviewed'}). Prompt version ${PROMPT_VERSION}. Every reading goes through the server's check (\`services/understand.js\`) before it's scored, as it would on the site.`, '');
  lines.push('The answers were scored twice from the same saved readings (no model was asked again): with the server\'s check as first written, and with one rule added after seeing those results, that a genre only counts when the request names it ("comedies", "sci-fi"), since the one mistake the models kept making was turning a describing word into a genre ("funny" into Comedy). A rule written after seeing the results flatters them a little, so both are shown; the second is what the site runs.', '');
  lines.push('**Right** means every filter set as the answer says and nothing else set; feel words there when expected; anything the board can\'t say reported as unplaced. **Dropped by the check** counts readings where the model proposed something the guardrails refused (a value outside the atlas, or one with no words behind it in the request): what would have been a hallucination without them. **Drift** counts readings that set a filter nobody asked for, after the check.', '');
  const models = Object.entries(results).filter(([m, rows]) => rows?.length && !MODELS[m]?.retired);
  const retired = Object.entries(results).filter(([m, rows]) => rows?.length && MODELS[m]?.retired);
  if (!models.length) { lines.push('No readings yet.'); return lines.join('\n'); }

  const col = (f) => models.map(([, rows]) => f(rows));
  const row = (label, cells) => lines.push(`| ${label} | ${cells.join(' | ')} |`);
  lines.push(`| | ${models.map(([m]) => MODELS[m]?.label || m).join(' | ')} |`, `|---|${models.map(() => '---').join('|')}|`);
  row('Requests read', col((rows) => `${rows.length} of ${n}`));
  row('Right, with the first check', models.map(([m]) => { const rows = firstCheck[m] || []; return `${pct(rows.filter((x) => x.right).length, rows.length)} (${rows.filter((x) => x.right).length})`; }));
  row('**Right**, with the genre rule (added after the first results)', col((rows) => `**${pct(rows.filter((x) => x.right).length, rows.length)}** (${rows.filter((x) => x.right).length})`));
  const kinds = [...new Set(set.requests.map((r) => r.kind))];
  for (const k of kinds) row(`&nbsp;&nbsp;${k}`, col((rows) => { const ks = rows.filter((x) => x.r.kind === k); return `${pct(ks.filter((x) => x.right).length, ks.length)} (${ks.filter((x) => x.right).length}/${ks.length})`; }));
  row('Dropped by the check', col((rows) => `${pct(rows.filter((x) => x.reading?.dropped.length).length, rows.length)} of readings (${rows.reduce((t, x) => t + (x.reading?.dropped.length || 0), 0)} values)`));
  row('Drift (a filter nobody asked for)', col((rows) => pct(rows.filter((x) => x.drift).length, rows.length)));
  row('Hidden instruction obeyed (q104)', col((rows) => { const x = rows.find((y) => y.r.id === 'q104'); return x ? (x.reading?.filters.genre.length ? 'yes' : 'no') : '–'; }));
  row('Unexpected feel words', col((rows) => pct(rows.filter((x) => x.extraFeel).length, rows.length)));
  row('Unexpected "couldn\'t place"', col((rows) => pct(rows.filter((x) => x.extraUnplaced).length, rows.length)));
  row('Errors (no usable answer)', col((rows) => `${rows.filter((x) => x.error).length}`));
  row('Answer time, median', col((rows) => { const q = quantile(rows.filter((x) => x.a.ms).map((x) => x.a.ms), 0.5); return q == null ? '–' : `${(q / 1000).toFixed(1)} s`; }));
  row('Answer time, slowest 5%', col((rows) => { const q = quantile(rows.filter((x) => x.a.ms).map((x) => x.a.ms), 0.95); return q == null ? '–' : `${(q / 1000).toFixed(1)} s`; }));
  row('Over 5 s (the site would fall back)', col((rows) => pct(rows.filter((x) => (x.a.ms || 0) > 5000).length, rows.filter((x) => x.a.ms).length)));
  row('Tokens a request, average', col((rows) => { const t = rows.filter((x) => x.a.tokens); return t.length ? Math.round(t.reduce((s, x) => s + x.a.tokens, 0) / t.length) : '–'; }));

  // the site's setup: the first model, and the second when the first takes longer than its wait
  const [first, second] = ['gemini-3.5-flash-lite', 'openai/gpt-oss-120b'].map((m) => results[m]);
  if (first?.length === n && second?.length === n) {
    const WAIT = 3000;
    const byId = new Map(second.map((x) => [x.r.id, x]));
    const chosen = first.map((x) => (x.a.ms && x.a.ms <= WAIT && !x.error ? { ...x, t: x.a.ms } : { ...byId.get(x.r.id), t: WAIT + (byId.get(x.r.id).a.ms || 0), fell: true }));
    const right = chosen.filter((x) => x.right).length;
    const t = (q) => `${(quantile(chosen.map((x) => x.t), q) / 1000).toFixed(1)} s`;
    lines.push('', `**The site's setup** (worked out from the saved answers above): ${MODELS['gemini-3.5-flash-lite'].label} first, and ${MODELS['openai/gpt-oss-120b'].label} when it hasn't answered in ${WAIT / 1000} s. **${pct(right, n)} right** (${right} of ${n}); ${chosen.filter((x) => x.fell).length} requests fell back; answer time median ${t(0.5)}, slowest 5% ${t(0.95)}.`);
  }

  // the feel ranking, rated blind (judgeSheet.js)
  const judged = readJson(path.join(HERE, 'judging-results.json'), null);
  if (judged) {
    const g = judged.groups;
    const cell = (x) => `${x.precision}% (${x.fit} of ${x.known})`;
    lines.push('', '## The feel ranking, rated blind', '');
    lines.push(`For the test set's requests with describing words, the films its reading allows were put in two orders: by feel (viewers' own words first, then the embedding: \`services/feel.js\`) and the canon's (most acclaimed first, what the site showed before). The top ${judged.top} of each, mixed and shuffled, were rated by the owner as fitting the request or not, without knowing which order chose them; films they didn't know were left out of both counts. ${judged.requests} of ${judged.of} requests were rated.`, '');
    lines.push(`| Precision@${judged.top} | By feel | Canon order |`, '|---|---|---|');
    for (const [name, x] of Object.entries(g)) lines.push(`| ${name === 'all' ? '**All rated requests**' : name} (${x.requests}) | ${name === 'all' ? `**${cell(x.feel)}**` : cell(x.feel)} | ${cell(x.canon)} |`);
    lines.push('', `Sentence by sentence, the feel order put more fitting films first in ${judged.bySentence.feel}, the canon order in ${judged.bySentence.canon}, and ${judged.bySentence.tie} were ties.`, '');
    lines.push(`Read with care: one rater, who built the site; for describing words alone the canon order shows the same five famous films for every request, an easy baseline (with filters the two are close: ${g['feel and filters'].feel.precision}% against ${g['feel and filters'].canon.precision}%); and the feel order surfaces less famous films, which the rater more often didn't know (${g.all.feel.unknown} unknown against ${g.all.canon.unknown}), so its precision is over fewer films. A second rater would give agreement (Cohen's kappa).`);
  }

  for (const [model, rows] of retired) {
    const ms = quantile(rows.filter((x) => x.a.ms).map((x) => x.a.ms), 0.5);
    lines.push('', `Also tried: **${MODELS[model].label}**, on the first ${rows.length} requests: ${rows.filter((x) => x.right).length} right (${pct(rows.filter((x) => x.right).length, rows.length)}), median answer ${(ms / 1000).toFixed(1)} s, ${rows.filter((x) => x.error).length} errors. Set aside: ${MODELS[model].retired}.`);
  }

  for (const [model, rows] of models) {
    lines.push('', `## What ${MODELS[model]?.label || model} got wrong`, '');
    const bad = rows.filter((x) => !x.right);
    if (!bad.length) lines.push('Nothing.');
    for (const x of bad) lines.push(`- **${x.r.id}** "${x.r.text}": ${x.wrong.join('; ')}`);
    const dropped = rows.filter((x) => x.reading?.dropped.length);
    if (dropped.length) {
      lines.push('', 'Caught by the check:', '');
      for (const x of dropped) lines.push(`- **${x.r.id}** "${x.r.text}": ${x.reading.dropped.map((d) => `${d.field} "${d.value}" (${d.why})`).join('; ')}`);
    }
  }
  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const set = readJson(path.join(HERE, 'testset.json'));
  const cards = await loadCards(Boolean(arg('offline')) || Boolean(arg('score')));
  const vocab = vocabularyOf({ cards });
  const model = arg('model');
  if (model) await ask(model, set, cards, vocab);
  if (model && arg('no-report')) return;
  const results = Object.fromEntries(Object.keys(MODELS).map((m) => [m, evaluateModel(m, set, cards, vocab, 2)]));
  const first = Object.fromEntries(Object.keys(MODELS).map((m) => [m, evaluateModel(m, set, cards, vocab, 1)]));
  fs.writeFileSync(REPORT, report(set, results, first));
  console.log(`wrote ${path.relative(process.cwd(), REPORT)}`);
  for (const [m, rows] of Object.entries(results)) if (rows?.length) console.log(`${m}: ${rows.filter((x) => x.right).length}/${rows.length} right`);
};

main().catch((e) => { console.error(e); process.exit(1); });
