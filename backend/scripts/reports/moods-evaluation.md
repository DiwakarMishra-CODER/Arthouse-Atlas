# Moods from the hand-tagged films: validation

Built 2026-10-20T12:19:58.123Z. 159 films carry five hand-picked moods each; every one was held out in turn and predicted by a model trained without it.

**Threshold: 0.775**: the lowest confidence with precision ≥ 0.82 on both thinned (matched) and full (rich) evidence. Choosing it that way, cross-validated over films (chosen on 4/5, scored on 1/5): precision **0.83** matched / **0.81** rich, recall 0.15 / 0.21 (fold thresholds 0.775, 0.725, 0.75, 0.775, 0.8).

| at the threshold | precision | recall | moods per film | films with ≥1 mood |
|---|---|---|---|---|
| matched (evidence thinned like an untagged film's) | 0.86 | 0.14 | 0.84 | 54% |
| rich (same model, all the film's evidence) | 0.84 | 0.20 | 1.20 | 66% |
| plain (trained and tested unthinned, for reference) | 0.84 | 0.18 | 1.09 | 63% |
| old keyword tagger (taggingService) | 0.59 | 0.21 | 1.79 | – |

Log-loss per (film, mood): matched 0.508, rich 0.493, plain 0.494, base rates alone 0.603.
Keep rates (matched regime): viewers 0.35, diffusion 0.66, director 0.27, movement 0.32.
Slopes (trained on all 159): viewers 0.366, diffusion 4.172, director 0.266, movement 0.356, keywords 0.666, synopsis 0.43, genre 1.394, lexicon 1.25.

## Per mood at the threshold

Small counts make single-mood precision noisy: a mood predicted for 3 films per run is judged on ~3 films.

| mood | matched P | matched R | films per run | rich P | rich R | films per run |
|---|---|---|---|---|---|---|
| contemplative | 0.87 | 0.08 | 6 | 0.85 | 0.16 | 12.4 |
| melancholic | 0.82 | 0.19 | 17.4 | 0.76 | 0.27 | 26.8 |
| dreamlike | 0.62 | 0.06 | 4.2 | 0.60 | 0.07 | 5 |
| surreal | 0.88 | 0.23 | 11.2 | 0.84 | 0.28 | 14 |
| intimate | 0.88 | 0.29 | 30.4 | 0.87 | 0.34 | 36.4 |
| existential | 0.81 | 0.10 | 8.6 | 0.74 | 0.17 | 16.2 |
| psychological | 0.87 | 0.27 | 20.2 | 0.91 | 0.38 | 27.2 |
| minimalist | 1.00 | 0.06 | 1.2 | 1.00 | 0.11 | 2.4 |
| slow | 0.89 | 0.06 | 1.8 | 0.75 | 0.12 | 4 |
| austere | 0.56 | 0.02 | 1.8 | 0.61 | 0.03 | 2.6 |
| poetic | 0.73 | 0.03 | 2.2 | 0.63 | 0.05 | 3.8 |
| lyrical | 0.96 | 0.18 | 13.8 | 0.91 | 0.28 | 22.4 |
| enigmatic | 0.92 | 0.28 | 12.2 | 0.92 | 0.28 | 12 |
| fragmented | 0.00 | 0.00 | 0.4 | – | 0.00 | 0 |
| bleak | 0.79 | 0.05 | 2.8 | 0.83 | 0.11 | 6 |

## Precision against threshold

| threshold | matched P | matched R | films with ≥1 mood | rich P | rich R | films with ≥1 mood |
|---|---|---|---|---|---|---|
| 0.5 | 0.68 | 0.50 | 100% | 0.69 | 0.55 | 100% |
| 0.525 | 0.69 | 0.47 | 99% | 0.71 | 0.52 | 100% |
| 0.55 | 0.71 | 0.43 | 98% | 0.73 | 0.49 | 99% |
| 0.575 | 0.73 | 0.40 | 97% | 0.74 | 0.46 | 97% |
| 0.6 | 0.75 | 0.37 | 95% | 0.76 | 0.44 | 96% |
| 0.625 | 0.77 | 0.34 | 93% | 0.77 | 0.41 | 93% |
| 0.65 | 0.78 | 0.31 | 89% | 0.78 | 0.37 | 91% |
| 0.675 | 0.79 | 0.28 | 84% | 0.79 | 0.34 | 89% |
| 0.7 | 0.80 | 0.23 | 79% | 0.81 | 0.30 | 84% |
| 0.725 | 0.82 | 0.20 | 71% | 0.81 | 0.26 | 77% |
| 0.75 | 0.84 | 0.17 | 63% | 0.82 | 0.23 | 72% |
| 0.775 | 0.86 | 0.14 | 54% | 0.84 | 0.20 | 66% |
| 0.8 | 0.86 | 0.12 | 46% | 0.85 | 0.17 | 60% |
| 0.825 | 0.87 | 0.09 | 37% | 0.87 | 0.14 | 49% |
| 0.85 | 0.88 | 0.07 | 29% | 0.89 | 0.12 | 43% |
| 0.875 | 0.87 | 0.05 | 20% | 0.90 | 0.09 | 32% |
| 0.9 | 0.86 | 0.04 | 15% | 0.88 | 0.06 | 23% |
| 0.925 | 0.84 | 0.02 | 12% | 0.86 | 0.04 | 14% |
| 0.95 | 0.84 | 0.01 | 6% | 0.88 | 0.02 | 9% |

## Spot checks (held out; moods at or above the threshold)

**Tokyo Story**: hand: contemplative, melancholic, intimate, minimalist, slow
- matched: contemplative 0.84; top three contemplative 0.84, intimate 0.76, melancholic 0.70
- rich: contemplative 0.90, intimate 0.81, melancholic 0.81

**Mulholland Drive**: hand: dreamlike, surreal, enigmatic, psychological, fragmented
- matched: surreal 0.81; top three surreal 0.81, psychological 0.64, enigmatic 0.60
- rich: surreal 0.92

**Stalker**: hand: slow, contemplative, existential, enigmatic, austere
- matched: existential 0.81; top three existential 0.81, contemplative 0.65, austere 0.64
- rich: existential 0.80, contemplative 0.78

**Persona**: hand: psychological, enigmatic, austere, fragmented, intimate
- matched: dreamlike 0.83; top three dreamlike 0.83, intimate 0.61, melancholic 0.60
- rich: dreamlike 0.84

**In the Mood for Love**: hand: melancholic, lyrical, intimate, poetic, dreamlike
- matched: intimate 0.81; top three intimate 0.81, melancholic 0.73, lyrical 0.68
- rich: intimate 0.86, melancholic 0.81

**Eraserhead**: hand: surreal, bleak, dreamlike, psychological, austere
- matched: enigmatic 0.97, surreal 0.84; top three enigmatic 0.97, surreal 0.84, psychological 0.70
- rich: enigmatic 0.99, surreal 0.91, psychological 0.83

**Jeanne Dielman, 23, quai du Commerce, 1080 Bruxelles**: hand: slow, minimalist, austere, psychological, contemplative
- matched: (none); top three intimate 0.70, melancholic 0.62, contemplative 0.49
- rich: (none)

**8½**: hand: dreamlike, surreal, fragmented, psychological, lyrical
- matched: (none); top three lyrical 0.76, melancholic 0.71, intimate 0.62
- rich: lyrical 0.83, melancholic 0.81

**Bicycle Thieves**: hand: intimate, melancholic, austere, minimalist, existential
- matched: intimate 0.85; top three intimate 0.85, melancholic 0.66, existential 0.62
- rich: intimate 0.89

**Taste of Cherry**: hand: contemplative, existential, minimalist, slow, austere
- matched: intimate 0.78; top three intimate 0.78, contemplative 0.58, existential 0.54
- rich: intimate 0.81, contemplative 0.79, minimalist 0.78

**Bringing Up Baby**: hand: lyrical, surreal, intimate, dreamlike, psychological
- matched: lyrical 0.95, intimate 0.89, surreal 0.81; top three lyrical 0.95, intimate 0.89, surreal 0.81
- rich: lyrical 0.98, intimate 0.93, surreal 0.93, psychological 0.89

**Come and See**: hand: bleak, psychological, existential, austere, fragmented
- matched: (none); top three austere 0.67, existential 0.65, contemplative 0.48
- rich: (none)

## Lexicon hits among hand-tagged films

contemplative 3/6 · melancholic 10/16 · dreamlike 6/8 · surreal 12/16 · existential 4/5 · psychological 10/13 · minimalist 1/1 · slow 3/4 · poetic 1/1 · enigmatic 5/8 · fragmented 3/6 · bleak 1/2
