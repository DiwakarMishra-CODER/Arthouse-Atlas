/**
 * The blind judging of the feel ranking: does sorting by feel put films that fit the description
 * first, or would the canon's own order have done as well?
 *
 *   node scripts/nlsearch/judgeSheet.js --model=<id>     writes the owner's sheet (outside the repo) and judging-key.json
 *   node scripts/nlsearch/judgeSheet.js --score=<answers.json>   precision@5 for both orders, into EVALUATION.md's notes
 *
 * For every request in the test set with feel words (31), the films its reading's filters allow are put
 * in two orders: by feel (services/feel.js) and the canon's (most acclaimed first). The top 5 of each,
 * mixed and shuffled, go on the sheet, and the owner marks each film as fitting the request or not
 * (or doesn't know it), without being told which order chose it. Viewers' tags are not shown (the
 * feel ranking reads them, so showing them would lean the judging its way): only the still, the
 * title, the year, the director and the first sentence of the synopsis.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { loadCatalogue, applyFilters, sortCards } from '../../services/catalogue.js';
import { vocabularyOf, checkReading } from '../../services/understand.js';
import { embedFeel, rankByFeel } from '../../services/feel.js';
import Movie from '../../models/Movie.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(HERE, '../../.env') });
const KEY = path.join(HERE, 'judging-key.json');
const SHEET = path.resolve(HERE, '../../../../feel-judging.html');
const TOP = 5;
const arg = (name) => process.argv.find((x) => x.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || null;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slug = (model) => model.replace(/[^a-z0-9.]+/gi, '-');

// a seeded shuffle, so the sheet is the same each time it's written
const shuffle = (xs, seed) => {
  const h = (s) => parseInt(crypto.createHash('sha1').update(s).digest('hex').slice(0, 8), 16);
  return [...xs].sort((a, b) => h(seed + a._id) - h(seed + b._id));
};

const write = async (model) => {
  const set = JSON.parse(fs.readFileSync(path.join(HERE, 'testset.json'), 'utf8'));
  const readings = JSON.parse(fs.readFileSync(path.join(HERE, 'readings', `${slug(model)}.json`), 'utf8')).answers;
  await mongoose.connect(process.env.MONGODB_URI);
  const catalogue = await loadCatalogue();
  const extra = new Map((await Movie.find({}).select('synopsis editorial.hook').lean()).map((m) => [String(m._id), m]));
  await mongoose.disconnect();
  const vocab = vocabularyOf(catalogue);

  const key = { model, top: TOP, writtenAt: new Date().toISOString(), requests: [] };
  const blocks = [];
  for (const r of set.requests.filter((x) => x.expect.feel)) {
    const a = readings[r.id];
    if (!a?.raw) continue;
    const reading = checkReading(a.raw, r.text, { cards: catalogue.cards, vocab });
    if (!reading.feel.length) { key.requests.push({ id: r.id, text: r.text, skipped: 'the reading found no feel words' }); continue; }
    const f = reading.filters;
    const allowed = sortCards(applyFilters(catalogue.cards, { country: f.country, decade: f.decade, years: f.years, director: f.director, movement: f.movement, genre: f.genre, length: f.length }), 'acclaimed');
    const canon = allowed.slice(0, TOP);
    const feel = rankByFeel(allowed, await embedFeel(reading.feel), reading.feel).slice(0, TOP).map((x) => x.card);
    await wait(1500);
    const films = shuffle([...new Map([...canon, ...feel].map((c) => [c._id, c])).values()], r.id);
    key.requests.push({ id: r.id, text: r.text, feelWords: reading.feel, allowed: allowed.length, canon: canon.map((c) => c._id), feel: feel.map((c) => c._id) });
    blocks.push({ r, films });
    process.stdout.write(`${r.id} `);
  }
  fs.writeFileSync(KEY, `${JSON.stringify(key, null, 2)}\n`);

  const card = (r, c) => {
    const m = extra.get(c._id);
    const line = ((m?.synopsis || m?.editorial?.hook || '').match(/^.*?[.!?](\s|$)/) || [''])[0];
    return `<div class="film" data-r="${r.id}" data-f="${c._id}">
      ${c.still ? `<img src="${esc(c.still.replace(/\/t\/p\/[^/]+\//, '/t/p/w300/'))}" alt="" loading="lazy">` : '<div class="noimg"></div>'}
      <div class="t">${esc(c.title)} <span>${esc(c.year || '')}${c.directors[0] ? ` · ${esc(c.directors[0])}` : ''}</span></div>
      <div class="s">${esc(line)}</div>
      <div class="b"><button data-v="1">Fits</button><button data-v="0">Doesn’t</button><button data-v="-">Don’t know it</button></div>
    </div>`;
  };
  const total = blocks.reduce((t, b) => t + b.films.length, 0);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Feel judging</title>
<style>
body{margin:0;background:#14110e;color:#eee6d6;font:16px/1.5 Georgia,serif}
header{position:sticky;top:0;background:#14110eee;padding:14px 20px;border-bottom:1px solid #3a332a;z-index:2;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
main{max-width:1180px;margin:0 auto;padding:20px}
h1{font-size:20px;margin:0}.intro{max-width:760px;color:#cbbfa9}
section{margin:34px 0 10px}h2{font-size:22px;margin:0 0 4px}h2 small{font:13px/1 system-ui;color:#9c8f79;letter-spacing:.06em;text-transform:uppercase;margin-right:8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:14px;margin-top:12px}
.film{background:#efe6d3;color:#1c1915;border-radius:7px;overflow:hidden;display:flex;flex-direction:column;outline:3px solid transparent}
.film img,.noimg{width:100%;aspect-ratio:16/9;object-fit:cover;background:#2a241d;display:block}
.t{padding:8px 10px 0;font-weight:bold;font-size:15px;line-height:1.25}.t span{font-weight:normal;color:#6b6152;font-size:13px}
.s{padding:4px 10px 8px;font-size:13px;color:#3a342b;flex:1}
.b{display:flex;border-top:1px solid #d5c8ad}.b button{flex:1;border:0;background:none;padding:9px 2px;font:13px system-ui;cursor:pointer;color:#3a342b}
.b button+button{border-left:1px solid #d5c8ad}
.film[data-v="1"]{outline-color:#2f7d4a}.film[data-v="1"] [data-v="1"]{background:#2f7d4a;color:#fff}
.film[data-v="0"]{outline-color:#b4372f}.film[data-v="0"] [data-v="0"]{background:#b4372f;color:#fff}
.film[data-v="-"]{opacity:.6}.film[data-v="-"] [data-v="-"]{background:#6b6152;color:#fff}
#copy{font:14px system-ui;padding:8px 14px;border:0;border-radius:5px;background:#d9ad62;color:#14110e;cursor:pointer}
#n{font:14px system-ui;color:#cbbfa9}
</style></head><body>
<header><h1>Does it fit?</h1><span id="n"></span><button id="copy">Copy my answers</button></header>
<main><p class="intro">Each heading is something a visitor typed. Under it are films the site could show for it. For each film, press <b>Fits</b> if it matches how the request describes the film it wants, <b>Doesn’t</b> if not, or <b>Don’t know it</b> if you can’t tell. Judge only the describing words (slow, sad, funny…): every film here already matches the country, decade or director asked for. The films are in a random order, and you aren’t told which ones the AI picked. Your answers are saved in this browser as you go. When you’re done, press <b>Copy my answers</b> and paste them to me. ${blocks.length} requests, ${total} films, about 20 minutes.</p>
${blocks.map(({ r, films }) => `<section><h2><small>${r.id}</small>“${esc(r.text)}”</h2><div class="grid">${films.map((c) => card(r, c)).join('')}</div></section>`).join('\n')}
</main>
<script>
const K='feel-judging';let a={};try{a=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
const n=document.getElementById('n'),all=document.querySelectorAll('.film');
const show=()=>{let d=0;all.forEach(f=>{const v=a[f.dataset.r]?.[f.dataset.f];if(v!==undefined){f.dataset.v=v;d++}else delete f.dataset.v});n.textContent=d+' of '+all.length+' marked'};
document.addEventListener('click',e=>{const b=e.target.closest('.b button');if(!b)return;const f=b.closest('.film');(a[f.dataset.r]??={})[f.dataset.f]=b.dataset.v;try{localStorage.setItem(K,JSON.stringify(a))}catch(e){}show()});
document.getElementById('copy').onclick=async()=>{const t=JSON.stringify(a);try{await navigator.clipboard.writeText(t);document.getElementById('copy').textContent='Copied'}catch(e){prompt('Copy this:',t)}};
show();
</script></body></html>`;
  fs.writeFileSync(SHEET, html);
  console.log(`\nwrote ${SHEET} (${blocks.length} requests, ${total} films) and ${path.relative(process.cwd(), KEY)}`);
};

// precision@5 for each order, from the owner's answers ("Don't know it" left out of both counts), over
// the requests with any marks, overall and by kind (describing words only, or with filters too)
const score = (file) => {
  const answers = JSON.parse(fs.readFileSync(file, 'utf8'));
  const key = JSON.parse(fs.readFileSync(KEY, 'utf8'));
  const kinds = new Map(JSON.parse(fs.readFileSync(path.join(HERE, 'testset.json'), 'utf8')).requests.map((r) => [r.id, r.kind]));
  const judged = key.requests.filter((r) => !r.skipped && Object.keys(answers[r.id] || {}).length);
  const count = (rs, order) => rs.reduce((t, r) => {
    const marks = answers[r.id];
    r[order].forEach((id) => { if (marks[id] === '1') t.fit++; if (marks[id] === '1' || marks[id] === '0') t.known++; else t.unknown++; });
    return t;
  }, { fit: 0, known: 0, unknown: 0 });
  const pc = (t) => (t.known ? Math.round((100 * t.fit) / t.known) : null);
  const groups = { all: judged, 'feel only': judged.filter((r) => kinds.get(r.id) === 'feel'), 'feel and filters': judged.filter((r) => kinds.get(r.id) !== 'feel') };
  const out = { rater: path.basename(file, '.json'), top: key.top, requests: judged.length, of: key.requests.length, groups: {} };
  for (const [name, rs] of Object.entries(groups)) {
    const f = count(rs, 'feel'); const c = count(rs, 'canon');
    out.groups[name] = { requests: rs.length, feel: { ...f, precision: pc(f) }, canon: { ...c, precision: pc(c) } };
  }
  // sentence by sentence: which order put more fitting films in its top 5
  out.bySentence = { feel: 0, canon: 0, tie: 0 };
  for (const r of judged) {
    const p = (order) => pc(count([r], order));
    const [a, b] = [p('feel'), p('canon')];
    if (a == null || b == null) continue;
    out.bySentence[a > b ? 'feel' : a < b ? 'canon' : 'tie']++;
  }
  fs.writeFileSync(path.join(HERE, 'judging-results.json'), `${JSON.stringify(out, null, 2)}\n`);
  for (const [name, g] of Object.entries(out.groups)) console.log(`${name}: ${g.requests} requests, precision@${key.top} by feel ${g.feel.precision}% (${g.feel.fit}/${g.feel.known}), canon order ${g.canon.precision}% (${g.canon.fit}/${g.canon.known})`);
  console.log('sentence by sentence:', out.bySentence);
};

const main = async () => {
  if (arg('score')) return score(arg('score'));
  const model = arg('model');
  if (!model) throw new Error('--model=<id> (the reading the site will use) or --score=<answers.json>');
  await write(model);
};
main().catch((e) => { console.error(e); process.exit(1); });
