# Picture screen

Checks every picture the site can show for nudity and sex scenes, so a person only looks at the few worth a look. Run it after a catalogue expansion or `addStills.js`: new frames aren't checked otherwise.

Two models, because neither is enough alone. NudeNet finds exposed body parts. CLIP (ViT-B-32) weighs each picture against descriptions of nudity and sex and against ordinary film frames, so it also catches covered scenes. On the first run (2026-10-24, 7,758 pictures), NudeNet missed Toni Erdmann's nude lead frame and CLIP caught it; CLIP missed Last Tango's poster and NudeNet caught it. NudeNet alone flagged 142 pictures, of which about 9 were real. So the models only flag; a person decides.

## Run

```sh
python3 -m venv ~/.venvs/screen && ~/.venvs/screen/bin/pip install -r scripts/media/screen/requirements.txt
node scripts/media/screen/pictures.js                     # every picture the site shows, blocked ones left out
~/.venvs/screen/bin/python -I scripts/media/screen/screen.py   # scores new pictures only, writes the sheet
open scripts/reports/screen/index.html                    # numbered; add what should go to data/blockedFrames.json
~/.venvs/screen/bin/python -I scripts/media/screen/screen.py --done   # mark the sheet looked at
node scripts/media/explicit.js                            # dry run; then --apply (backs up first)
node scripts/buildMosaic.js && node scripts/exportMeta.js # the home wall and link previews
```

It runs on the CPU with 2 threads at low priority, so the machine stays usable; a full first pass takes about 20 minutes. The models download once (about 0.6 GB in `~/.cache/huggingface`); delete that and the venv afterwards if space matters. Scores are cached in `data/screen-cache/`, so later runs only look at new pictures.
