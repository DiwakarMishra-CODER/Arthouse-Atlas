"""
Screens the atlas's pictures for nudity and sex scenes, so a person only has to look at the few worth a look.

Two models, because neither is enough alone. On 2026-10-24 NudeNet missed Toni Erdmann's nude lead frame (it
logged a bare belly) and CLIP scored it 0.94; CLIP alone missed Last Tango's poster, which NudeNet caught.
  - NudeNet finds exposed body parts.
  - CLIP (ViT-B-32, LAION) weighs each picture against descriptions of nudity and sex scenes and against
    descriptions of ordinary film frames, so it also catches covered scenes.
A picture is flagged when either fires. Nothing is decided here: the flags go on a numbered contact sheet for a
person to look at. What should go is added to data/blockedFrames.json, and explicit.js takes it off the site.

Light on the machine: CPU only, 2 threads, low priority, small batches. Scores are kept in
data/screen-cache/scores.json, so a re-run only looks at pictures it hasn't seen, and only flagged pictures
stay on disk.

  node scripts/media/screen/pictures.js          every picture the site shows
  python3 -I scripts/media/screen/screen.py      score the new ones, flag, write the sheet
  open scripts/reports/screen/index.html         look; add what goes to data/blockedFrames.json
  python3 -I scripts/media/screen/screen.py --done   mark this sheet looked at, so it doesn't come back
  node scripts/media/explicit.js                 then --apply
"""
import concurrent.futures as cf
import html
import json
import os
import shutil
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[3]
PICTURES = BACKEND / 'scripts/reports/screen-pictures.json'
CACHE = BACKEND / 'data/screen-cache'
SCORES = CACHE / 'scores.json'
KEPT = CACHE / 'img'  # flagged pictures only, for the sheet
OUT = BACKEND / 'scripts/reports/screen'

SIZE = {'frame': 'w780', 'poster': 'w500', 'portrait': 'h632'}
EXPOSED = {'FEMALE_BREAST_EXPOSED', 'FEMALE_GENITALIA_EXPOSED', 'MALE_GENITALIA_EXPOSED', 'BUTTOCKS_EXPOSED', 'ANUS_EXPOSED'}
NUDENET_AT = 0.25  # low on purpose: a false alarm costs a look, a miss costs a nude frame on the site
CLIP_AT = 0.25     # every confirmed picture on 2026-10-24 scored 0.29 or more, or was caught by NudeNet
NUDE = ['a naked woman', 'a naked man', 'a topless woman with bare breasts', 'a nude body', 'nudity in a film',
        'a couple having sex', 'two people making love in bed', 'a sex scene', 'a couple in bed under the sheets, naked',
        'an erotic, sexual image', 'people embracing naked', 'a woman undressing']
ORDINARY = ['a film still of people talking', 'a close-up of a face', 'a landscape', 'a city street', 'a couple kissing, fully clothed',
            'a person asleep in bed, clothed', 'people eating at a table', 'a man with his shirt off', 'people at the beach in swimsuits',
            'a crowd', 'a person walking', 'a room interior', 'a film poster with a title', 'a portrait photograph', 'a child', 'a fight',
            'a dancer', 'a painting', 'a person in a bath, shoulders only', 'a hug between friends']


def fetch(file, kind, into):
    target = into / file
    for attempt in range(4):
        try:
            with urllib.request.urlopen(f'https://image.tmdb.org/t/p/{SIZE[kind]}/{file}', timeout=30) as r:
                target.write_bytes(r.read())
            return file
        except Exception:
            time.sleep(1 + attempt)
    return None


def flagged(score):
    return score['nudenet'] >= NUDENET_AT or score['clip'] >= CLIP_AT


def to_look_at(pictures, scores):
    # flagged and not yet looked at by a person, most likely first
    return sorted(((f, scores[f]) for f in pictures if f in scores and flagged(scores[f]) and not scores[f].get('reviewed')),
                  key=lambda x: -max(x[1]['nudenet'], x[1]['clip']))


def score_new(new, pictures):
    import numpy as np
    import open_clip
    import torch
    from nudenet import NudeDetector
    from PIL import Image

    torch.set_num_threads(2)
    detector = NudeDetector()
    model, _, prep = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k', device='cpu')
    model.eval()
    with torch.no_grad():
        text = model.encode_text(open_clip.get_tokenizer('ViT-B-32')(NUDE + ORDINARY)).float()
    text = (text / text.norm(dim=-1, keepdim=True)).numpy()

    scores = {}
    KEPT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        for start in range(0, len(new), 64):
            batch = new[start:start + 64]
            with cf.ThreadPoolExecutor(8) as ex:
                got = [f for f in ex.map(lambda f: fetch(f, pictures[f]['kind'], tmp), batch) if f]
            for i in range(0, len(got), 16):
                chunk = got[i:i + 16]
                with torch.no_grad():
                    emb = model.encode_image(torch.stack([prep(Image.open(tmp / f).convert('RGB')) for f in chunk])).float()
                emb = (emb / emb.norm(dim=-1, keepdim=True)).numpy()
                logits = 100 * emb @ text.T
                nude, ordinary = logits[:, :len(NUDE)], logits[:, len(NUDE):]
                # the likeliest kind of nudity or sex against all the ordinary frames together
                clip = 1 / (1 + np.exp(-(nude.max(1) - np.log(np.exp(ordinary).sum(1)))))
                for f, c in zip(chunk, clip):
                    parts = detector.detect(str(tmp / f))
                    exposed = max([d['score'] for d in parts if d['class'] in EXPOSED], default=0.0)
                    scores[f] = {'nudenet': round(float(exposed), 3), 'clip': round(float(c), 4)}
                    if flagged(scores[f]):
                        shutil.copy(tmp / f, KEPT / f)
                for f in chunk:
                    (tmp / f).unlink()
            print(f'  {min(start + 64, len(new))}/{len(new)}', flush=True)
    return scores


def write_sheet(flags, pictures):
    OUT.mkdir(parents=True, exist_ok=True)
    cards = ''.join(
        f'<figure><span>{n}</span><img src="{os.path.relpath(KEPT / f, OUT)}" loading="lazy">'
        f'<figcaption><b>{html.escape("; ".join(pictures[f]["where"]))}</b><br>NudeNet {s["nudenet"]} · CLIP {s["clip"]}</figcaption></figure>'
        for n, (f, s) in enumerate(flags, 1))
    css = ('body{background:#111;color:#ddd;font:14px system-ui;margin:16px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}'
           'figure{margin:0;position:relative}figure span{position:absolute;top:4px;left:4px;background:#d9ad62;color:#000;font:600 15px system-ui;padding:1px 7px;border-radius:3px}'
           'img{width:100%;height:150px;object-fit:contain;background:#000}figcaption{font-size:12px;color:#aaa;margin-top:4px}b{color:#eee;font-weight:500}')
    (OUT / 'index.html').write_text(
        f'<!doctype html><meta charset=utf-8><title>Screen: {len(flags)} to look at</title><style>{css}</style>'
        f'<h2>{len(flags)} pictures to look at</h2><p>Most likely first. Add the ones that should go to data/blockedFrames.json.</p>'
        f'<div class=g>{cards}</div>')
    json.dump([{'n': n, 'file': f, 'where': pictures[f]['where'], **s} for n, (f, s) in enumerate(flags, 1)],
              open(BACKEND / 'scripts/reports/screen-flags.json', 'w'), indent=1)


def main():
    os.nice(15)
    if not PICTURES.exists():
        sys.exit('no picture list: run node scripts/media/screen/pictures.js first')
    pictures = json.loads(PICTURES.read_text())
    CACHE.mkdir(parents=True, exist_ok=True)
    scores = json.loads(SCORES.read_text()) if SCORES.exists() else {}
    if '--done' in sys.argv:
        for f, _ in to_look_at(pictures, scores):
            scores[f]['reviewed'] = True
        SCORES.write_text(json.dumps(scores))
        return print('marked the sheet looked at')
    new = [f for f in pictures if f not in scores]
    print(f'{len(pictures)} pictures, {len(new)} not screened before')
    if new:
        scores.update(score_new(new, pictures))
        SCORES.write_text(json.dumps(scores))
    flags = to_look_at(pictures, scores)
    write_sheet(flags, pictures)
    print(f'{len(flags)} flagged → {OUT.relative_to(BACKEND)}/index.html')


if __name__ == '__main__':
    main()
