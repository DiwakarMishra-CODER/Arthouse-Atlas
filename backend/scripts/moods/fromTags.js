/**
 * Moods from what viewers said: every film's moods worked out from the tags MovieLens viewers wrote
 * (data/movielens/ml-32m/tags.csv), with the words that count for each mood in
 * data/moods/synonyms.json and the rule in lib/viewerMoods.js.
 *
 *   node scripts/moods/fromTags.js            dry run: reads only, writes the report and the plan
 *
 * Writes:
 *   scripts/reports/viewer-moods.md          what it found, mood by mood, and what the flagged words would add
 *   scripts/reports/viewer-moods-plan.json   every film's moods with their evidence (not committed)
 *   ../../mood-spot-check.html               the owner's spot check: films they've rated, outside the repo
 *
 * The database is only read here. Applying the moods (with a backup first) is a later step.
 * MovieLens films are matched to the atlas the way the recommender does it (scripts/recs/lib/movielens.js):
 * by TMDB id, then by the cached IMDb id. MovieLens data: GroupLens Research, University of Minnesota,
 * non-commercial use with credit.
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import mongoose from 'mongoose';
import { BACKEND, REPORTS, MOODS_DIR, readJson } from './lib/data.js';
import { normalizeTag, wordIndex, moodsFor, moodEvidence, RULE } from './lib/viewerMoods.js';
import { parseCsvLine, loadLinks, loadMovieTitles, buildLookup, imdbNumber } from '../recs/lib/movielens.js';
import Movie from '../../models/Movie.js';
import User from '../../models/User.js';

const ML = path.join(BACKEND, 'data/movielens/ml-32m');
const OWNER = '69538572eba7cf3b66674d0c'; // the maker's account (as the example night uses it)
const SITE = 'https://arthouse-atlas.vercel.app';
// a sheet for some moods only (moods added after the first spot check):
//   --check=funny,warm --sample=12 --sheet=mood-spot-check-2.html
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const CHECK = arg('check') ? new Set(arg('check').split(',')) : null;
// or only the mood calls a change added: --since=<an earlier viewer-moods-plan.json>
const SINCE = arg('since') ? new Set(readJson(arg('since')).films.flatMap((f) => f.moods.map((m) => `${f._id}|${m.mood}`))) : null;
const SHEET = path.resolve(BACKEND, '../..', arg('sheet') || 'mood-spot-check.html');
const SAMPLE = Number(arg('sample')) || 36; // 30 to judge, and a few to swap in for films skipped
const THIN = 10; // a mood with fewer films than this is hidden from the picker

const pct = (a, b) => `${((100 * a) / b).toFixed(0)}%`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stillOf = (f) => {
  const s = f.stills?.[0] || f.backdropUrl || f.posterUrl;
  if (!s) return null;
  if (s.startsWith('/stills/')) return `${SITE}${s}`;
  return s.replace(/\/t\/p\/(original|w\d+)\//, '/t/p/w500/');
};
// a small seeded shuffle, so the same films come up for the spot check every run
const shuffled = (list, seed = 7) => {
  let t = seed;
  const rand = () => { t = (t * 1103515245 + 12345) % 2147483648; return t / 2147483648; };
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};

const main = async () => {
  const table = readJson(path.join(MOODS_DIR, 'synonyms.json'));
  const index = wordIndex(table.moods);
  const moods = Object.keys(table.moods);

  await mongoose.connect(process.env.MONGODB_URI);
  const films = (await Movie.find({ tmdbId: { $ne: null } }).select('title year tmdbId stills backdropUrl posterUrl editorial.tags').lean())
    .map((f) => ({ ...f, _id: String(f._id) }));
  const owner = await User.findById(OWNER).select('ratings watched favorites').lean();
  await mongoose.disconnect();

  // MovieLens films onto the atlas's
  const links = loadLinks(path.join(ML, 'links.csv'));
  const titles = loadMovieTitles(path.join(ML, 'movies.csv'));
  const imdbCache = readJson(path.join(BACKEND, 'data/recs/work/imdb-ids.json'));
  const imdbOf = new Map(Object.entries(imdbCache).map(([t, id]) => [Number(t), imdbNumber(id)]));
  const { lookup, matched } = buildLookup(films, links, titles, imdbOf);

  // every film's tags: who used which word, and how many viewers tagged it at all
  const tagUsers = films.map(() => new Map());
  const taggers = films.map(() => new Set());
  const wordUsers = new Map(); // flagged and counted words across the atlas, for the report
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(ML, 'tags.csv')) });
  let header = true;
  for await (const line of rl) {
    if (header) { header = false; continue; }
    const [user, movieId, raw] = parseCsvLine(line);
    const i = lookup[Number(movieId)] ?? -1;
    if (i < 0) continue;
    const tag = normalizeTag(raw);
    if (!tag) continue;
    taggers[i].add(user);
    const users = tagUsers[i].get(tag) || new Set();
    users.add(user);
    tagUsers[i].set(tag, users);
  }

  // every film's moods, and what it would take for the flagged words to count
  // the owner's corrections: a mood the words gave a film that doesn't fit it
  const removed = new Set((table.overrides?.remove || []).map((o) => `${o.film}|${o.mood}`));
  const result = films.map((f, i) => ({
    film: f,
    taggers: taggers[i].size,
    moods: moodsFor(tagUsers[i], taggers[i].size, index).filter((m) => !removed.has(`${f._id}|${m.mood}`)),
  }));
  const withMood = result.filter((r) => r.moods.length);
  const perMood = Object.fromEntries(moods.map((m) => [m, result.filter((r) => r.moods.some((x) => x.mood === m))]));
  const flagged = table.flagged.map((fl) => {
    const key = normalizeTag(fl.word);
    let viewers = 0; let filmsUsing = 0; let gain = 0;
    const into = fl.could_be[0];
    result.forEach((r, i) => {
      const users = tagUsers[i].get(key);
      if (!users) return;
      viewers += users.size; filmsUsing++;
      if (!into) return;
      const tryIndex = new Map(index); tryIndex.set(key, into);
      const before = r.moods.some((m) => m.mood === into);
      const after = moodsFor(tagUsers[i], r.taggers, tryIndex).some((m) => m.mood === into);
      if (after && !before) gain++;
    });
    return { ...fl, viewers, films: filmsUsing, into, gain };
  });
  // the old moods (assigned by AI in earlier sessions) beside what viewers said
  const old = result.filter((r) => r.film.editorial?.tags?.length);
  let oldConfirmed = 0; let oldTotal = 0; let oldNoEvidence = 0;
  const disagreements = [];
  for (const r of old) {
    const viewerMoods = new Set(r.moods.map((m) => m.mood));
    const evidence = moodEvidence(tagUsers[films.indexOf(r.film)], index);
    for (const t of r.film.editorial.tags) {
      oldTotal++;
      if (viewerMoods.has(t)) oldConfirmed++;
      else if (!evidence.get(t)) oldNoEvidence++;
    }
    const missing = r.film.editorial.tags.filter((t) => !viewerMoods.has(t));
    if (missing.length && r.moods.length) disagreements.push({ r, missing });
  }

  // --- the plan (every film's moods and their evidence) ---
  fs.writeFileSync(path.join(REPORTS, 'viewer-moods-plan.json'), JSON.stringify({
    builtAt: new Date().toISOString(), rule: RULE,
    films: result.filter((r) => r.moods.length).map((r) => ({ _id: r.film._id, title: r.film.title, year: r.film.year, taggers: r.taggers, moods: r.moods.map(({ mood, viewers, words }) => ({ mood, viewers, words: words.slice(0, 4) })) })),
  }, null, 1));

  // --- the report ---
  const lines = [];
  const say = (s = '') => lines.push(s);
  say('# Moods from what viewers said: dry run');
  say();
  say(`Built ${new Date().toISOString().slice(0, 16).replace('T', ' ')}. Nothing in the database was changed.`);
  say();
  say(`**The rule:** a film has a mood when at least **${RULE.minViewers} different viewers** used one of that mood's words (**${RULE.thin.minViewers}** on a film fewer than ${RULE.thin.below} viewers tagged at all), and they are at least **${RULE.minShare * 100}%** of the viewers who tagged the film. The words are in \`data/moods/synonyms.json\`.`);
  say();
  say('## Coverage');
  say();
  say('| | Films |');
  say('|---|---|');
  say(`| In the atlas (with a TMDB id) | ${films.length} |`);
  say(`| Matched to MovieLens | ${matched.size} |`);
  say(`| Tagged by at least one viewer | ${result.filter((r) => r.taggers).length} |`);
  say(`| **With at least one mood** | **${withMood.length}** (${pct(withMood.length, films.length)}) |`);
  say(`| With moods before (assigned by AI in earlier sessions) | ${old.length} |`);
  say();
  say('## Films per mood');
  say();
  say(`Moods with fewer than ${THIN} films would be hidden from Explore's picker until there's more evidence.`);
  say();
  say('| Mood | Films | Strongest examples (viewers) |');
  say('|---|---|---|');
  for (const m of [...moods].sort((a, b) => perMood[b].length - perMood[a].length)) {
    const top = perMood[m].map((r) => [r.film.title, r.moods.find((x) => x.mood === m).viewers]).sort((a, b) => b[1] - a[1]).slice(0, 4);
    say(`| ${m}${perMood[m].length < THIN ? ' *(hidden)*' : ''} | ${perMood[m].length} | ${top.map(([t, n]) => `${t} (${n})`).join(', ')} |`);
  }
  say();
  say('## Flagged words: left out unless you move them in');
  say();
  say('"Would add" is how many films would gain the suggested mood if the word counted for it.');
  say();
  say('| Word | Viewers / films using it | Could mean | Would add | Why it is flagged |');
  say('|---|---|---|---|---|');
  for (const f of [...flagged].sort((a, b) => b.viewers - a.viewers)) {
    say(`| ${f.word} | ${f.viewers} / ${f.films} | ${f.could_be.join(' or ') || '(no mood)'} | ${f.into ? `+${f.gain} ${f.into}` : '–'} | ${f.why} |`);
  }
  say();
  say("## The owner's corrections");
  say();
  say('Moods the viewers\' words gave a film that the owner judged wrong, and took off:');
  say();
  for (const o of table.overrides?.remove || []) say(`- **${o.title}**: not ${o.mood} (${o.why}; ${o.by}, ${o.on})`);
  say();
  say('## The old moods beside what viewers said');
  say();
  say(`Of the ${oldTotal} moods the AI gave ${old.length} films: **${oldConfirmed} (${pct(oldConfirmed, oldTotal)}) are confirmed** by viewers, and **${oldNoEvidence} (${pct(oldNoEvidence, oldTotal)}) have no viewer saying anything like them**. The rest had some viewers, but not enough.`);
  say();
  say('Some films where the old moods and the viewers disagree:');
  say();
  for (const { r, missing } of disagreements.slice(0, 12)) {
    say(`- **${r.film.title}** (${r.film.year}): old ${r.film.editorial.tags.join(', ')} · viewers: ${r.moods.map((m) => `${m.mood} (${m.viewers})`).join(', ')} · not backed: ${missing.join(', ')}`);
  }
  fs.writeFileSync(path.join(REPORTS, 'viewer-moods.md'), `${lines.join('\n')}\n`);

  // --- the spot check: films the owner has rated, watched or loved, that got a mood ---
  const seen = new Set([...(owner?.ratings || []).map((r) => String(r.movie)), ...(owner?.watched || []).map(String), ...(owner?.favorites || []).map(String)]);
  // (for a sheet of some moods only: films with one of them, seen or not, those seen first)
  const judged = (r) => r.moods.filter((m) => (!CHECK || CHECK.has(m.mood)) && (!SINCE || !SINCE.has(`${r.film._id}|${m.mood}`)));
  const pool = CHECK || SINCE
    ? [...shuffled(withMood.filter((r) => judged(r).length && seen.has(r.film._id))), ...shuffled(withMood.filter((r) => judged(r).length && !seen.has(r.film._id)))]
    : shuffled(withMood.filter((r) => seen.has(r.film._id)));
  const sample = pool.slice(0, SAMPLE);
  const cards = sample.map((r, n) => `
    <article class="film" data-id="${r.film._id}">
      ${stillOf(r.film) ? `<img src="${esc(stillOf(r.film))}" alt="" loading="lazy">` : '<div class="noimg"></div>'}
      <div class="body">
        <h2><span class="n">${n + 1}</span> ${esc(r.film.title)} <span class="year">${r.film.year || ''}</span>${seen.has(r.film._id) ? '' : ' <span class="year">(not marked as seen)</span>'}</h2>
        ${judged(r).map((m) => `
        <div class="mood" data-mood="${m.mood}">
          <div><b>${m.mood}</b> <span class="ev">${m.viewers} viewers: ${m.words.slice(0, 4).map(([w, c]) => `${esc(w)} ${c}`).join(', ')}</span></div>
          <div class="btns"><button data-v="yes">✓ fits</button><button data-v="no">✗ doesn't</button></div>
        </div>`).join('')}
        <div class="missing"><span>Missing an obvious mood?</span> ${moods.filter((m) => !r.moods.some((x) => x.mood === m)).map((m) => `<button class="chip" data-miss="${m}">${m}</button>`).join(' ')}</div>
        <button class="skip">I can't judge this one</button>
      </div>
    </article>`).join('');
  fs.writeFileSync(SHEET, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mood spot check</title><style>
:root{color-scheme:dark}body{margin:0;background:#0b0a09;color:#eee;font:16px/1.5 system-ui,sans-serif}
header{position:sticky;top:0;z-index:2;background:#0b0a09ee;border-bottom:1px solid #333;padding:14px 18px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
h1{font-size:18px;margin:0}.count{color:#d9ad62}main{max-width:860px;margin:0 auto;padding:18px}
.intro{color:#bbb;max-width:700px}.film{display:grid;grid-template-columns:220px 1fr;gap:16px;margin:18px 0;padding:14px;border:1px solid #2a2a2a;border-radius:12px;background:#121110}
.film.skipped{opacity:.35}.film img,.noimg{width:220px;aspect-ratio:16/9;object-fit:cover;border-radius:8px;background:#222}
h2{font-size:19px;margin:0 0 8px}.year{color:#888;font-weight:400}.n{color:#d9ad62;margin-right:4px}
.mood{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 0;border-top:1px solid #222}.ev{color:#999;font-size:14px}
button{font:inherit;color:#ddd;background:#1d1b19;border:1px solid #3a3a3a;border-radius:8px;padding:5px 10px;cursor:pointer}
.btns button.on[data-v=yes]{background:#2f6b3a;border-color:#4c9}.btns button.on[data-v=no]{background:#7a2b2b;border-color:#e66}
.missing{margin-top:10px;font-size:14px;color:#aaa}.chip{font-size:13px;padding:2px 8px;margin:3px 2px}.chip.on{background:#d9ad62;color:#000}
.skip{margin-top:10px;font-size:13px;color:#999}#copy{background:#d9ad62;color:#000;border:none;font-weight:600}
@media(max-width:640px){.film{grid-template-columns:1fr}.film img,.noimg{width:100%}}
</style></head><body>
<header><h1>Mood spot check</h1><span class="count" id="count"></span><button id="copy">Copy my answers</button></header>
<main><p class="intro">${CHECK ? `Only the new moods (${[...CHECK].join(', ')}) are asked about here. ` : ''}${SINCE ? 'Only the moods the latest change added are asked about here. ' : ''}These are films you've rated or marked as watched${CHECK || SINCE ? ' first, then a few others' : ''}. For each mood, say whether it fits the film as you remember it: the grey words are what viewers wrote. Tap a chip if an obvious mood is missing. Skip any film you can't judge. Aim for at least 20 films; 30 is better. Your answers are kept in this browser as you go. When you're done, press <b>Copy my answers</b> and paste them into the chat.</p>
${cards}
</main><script>
const KEY='${path.basename(SHEET, '.html')}';const state=JSON.parse(localStorage.getItem(KEY)||'{}');
const save=()=>{localStorage.setItem(KEY,JSON.stringify(state));count()};
const count=()=>{const done=Object.values(state).filter(f=>f.skip||Object.keys(f.moods||{}).length).length;document.getElementById('count').textContent=done+' films done'};
document.querySelectorAll('.film').forEach(el=>{const id=el.dataset.id;const f=state[id]||(state[id]={moods:{},missing:[]});
 el.querySelectorAll('.mood').forEach(m=>{const mood=m.dataset.mood;m.querySelectorAll('.btns button').forEach(b=>{if(f.moods[mood]===b.dataset.v)b.classList.add('on');b.onclick=()=>{f.moods[mood]=b.dataset.v;m.querySelectorAll('.btns button').forEach(x=>x.classList.toggle('on',x===b));save()}})});
 el.querySelectorAll('.chip').forEach(c=>{if(f.missing.includes(c.dataset.miss))c.classList.add('on');c.onclick=()=>{const i=f.missing.indexOf(c.dataset.miss);i<0?f.missing.push(c.dataset.miss):f.missing.splice(i,1);c.classList.toggle('on');save()}});
 const s=el.querySelector('.skip');if(f.skip)el.classList.add('skipped');s.onclick=()=>{f.skip=!f.skip;el.classList.toggle('skipped',f.skip);save()};});
document.getElementById('copy').onclick=async()=>{const out=JSON.stringify(state);try{await navigator.clipboard.writeText(out);alert('Copied. Paste it into the chat.')}catch{prompt('Copy this:',out)}};
count();
</script></body></html>
`);

  console.log(`films ${films.length} · matched ${matched.size} · with a mood ${withMood.length} · old moods confirmed ${oldConfirmed}/${oldTotal}`);
  console.log(`spot check: ${pool.length} of your films have a mood; ${sample.length} in the sheet`);
  console.log(`wrote ${path.relative(BACKEND, path.join(REPORTS, 'viewer-moods.md'))}, the plan, and ${SHEET}`);
};

main().catch((err) => { console.error(err); process.exit(1); });
