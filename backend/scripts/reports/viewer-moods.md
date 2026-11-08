# Moods from what viewers said: dry run

Built 2026-11-08 07:23. Nothing in the database was changed.

**The rule:** a film has a mood when at least **3 different viewers** used one of that mood's words (**2** on a film fewer than 50 viewers tagged at all), and they are at least **3%** of the viewers who tagged the film. The words are in `data/moods/synonyms.json`.

## Coverage

| | Films |
|---|---|
| In the atlas (with a TMDB id) | 1118 |
| Matched to MovieLens | 1086 |
| Tagged by at least one viewer | 1057 |
| **With at least one mood** | **496** (44%) |
| With moods before (assigned by AI in earlier sessions) | 159 |

## Films per mood

Moods with fewer than 10 films would be hidden from Explore's picker until there's more evidence.

| Mood | Films | Strongest examples (viewers) |
|---|---|---|
| atmospheric | 161 | Lost in Translation (133), Blade Runner (129), 2001: A Space Odyssey (119), Spirited Away (118) |
| melancholic | 106 | Eternal Sunshine of the Spotless Mind (188), Lost in Translation (124), Her (124), Pan's Labyrinth (74) |
| surreal | 97 | Eternal Sunshine of the Spotless Mind (300), Mulholland Drive (169), Amélie (144), Pan's Labyrinth (132) |
| slow | 78 | 2001: A Space Odyssey (88), No Country for Old Men (52), Blade Runner (44), Under the Skin (37) |
| psychological | 70 | Memento (261), The Silence of the Lambs (251), Requiem for a Dream (156), The Shining (139) |
| tense | 70 | The Silence of the Lambs (162), Whiplash (114), No Country for Old Men (103), Rear Window (91) |
| contemplative | 67 | Lost in Translation (57), 2001: A Space Odyssey (54), Stalker (53), Before Sunrise (45) |
| dreamlike | 64 | Spirited Away (153), Eternal Sunshine of the Spotless Mind (119), Mulholland Drive (93), Memento (87) |
| bleak | 63 | Requiem for a Dream (161), Oldboy (54), Children of Men (41), One Flew Over the Cuckoo's Nest (32) |
| whimsical | 62 | Amélie (200), The Grand Budapest Hotel (153), Eternal Sunshine of the Spotless Mind (115), Moonrise Kingdom (112) |
| funny | 60 | The Grand Budapest Hotel (100), The Wolf of Wall Street (81), Fargo (74), Pulp Fiction (74) |
| romantic | 59 | Amélie (156), Eternal Sunshine of the Spotless Mind (131), Call Me by Your Name (65), Her (58) |
| enigmatic | 43 | Mulholland Drive (49), Eyes Wide Shut (29), Barton Fink (24), The Hunt (22) |
| existential | 33 | Her (141), Blade Runner (129), 2001: A Space Odyssey (120), Stalker (71) |
| lyrical | 30 | Lost in Translation (12), Mirror (12), The Virgin Suicides (11), Wings of Desire (10) |
| fragmented | 19 | Memento (324), Pulp Fiction (281), Eternal Sunshine of the Spotless Mind (195), Mulholland Drive (103) |
| warm | 17 | Amélie (174), My Neighbor Totoro (82), It's a Wonderful Life (44), Everything Everywhere All at Once (38) |
| intimate | 15 | In the Mood for Love (19), The Tree of Life (13), Persona (8), Yi Yi (8) |
| austere | 13 | Stalker (9), Elephant (8), Dogville (4), Harakiri (4) |
| poetic *(hidden)* | 9 | Wings of Desire (21), Crouching Tiger, Hidden Dragon (12), Mirror (10), You Were Never Really Here (7) |
| minimalist *(hidden)* | 5 | Before Sunset (26), Before Sunrise (24), There Will Be Blood (17), A Man Escaped (3) |

## Flagged words: left out unless you move them in

"Would add" is how many films would gain the suggested mood if the word counted for it.

| Word | Viewers / films using it | Could mean | Would add | Why it is flagged |
|---|---|---|---|---|
| dark | 1243 / 72 | bleak | +33 bleak | too vague: dark comedy, dark lighting, dark themes |
| loneliness | 732 / 104 | melancholic | +22 melancholic | a theme more than a feeling |
| mystery | 694 / 54 | enigmatic | +20 enigmatic | usually the genre (a whodunit), not an enigmatic film |
| intense | 623 / 28 | tense | +10 tense | often emotional intensity, not suspense |
| comedy | 473 / 58 | funny | +12 funny | the genre, which the genre filter already covers |
| weird | 428 / 37 | surreal | +3 surreal | odd is not always surreal |
| hallucinatory | 425 / 28 | dreamlike or surreal | +12 dreamlike | either |
| philosophy | 299 / 35 | existential or contemplative | +9 existential | as philosophical, and more often a topic |
| fairy tale | 249 / 11 | whimsical | +5 whimsical | the form of the story, not the feel |
| touching | 238 / 26 | warm | +14 warm | moving is not warm: it put Schindler's List under warm |
| love story | 205 / 24 | romantic | +6 romantic | the topic, not the feel |
| strange | 161 / 31 | surreal | +8 surreal | as weird |
| depression | 157 / 53 | melancholic or bleak | +12 melancholic | often the topic (a character's illness, the Great Depression), not the feeling |
| dreams | 100 / 18 | dreamlike | +3 dreamlike | often the topic, not the feel |
| nihilism | 94 / 36 | bleak | +5 bleak | often the topic (Everything Everywhere All at Once is about nihilism, and isn't bleak), not the feel |
| sweet | 93 / 16 | warm | +6 warm | often sarcastic, or about a character |
| absurd | 92 / 18 | surreal | +3 surreal | absurd comedy is not surreal |
| group psychology | 81 / 2 | psychological | +1 psychological | a topic |
| poetry | 66 / 26 | poetic | +5 poetic | often a film about poets |
| passionate | 63 / 24 | romantic | +11 romantic | noisy: it put Yojimbo and The Passion of Joan of Arc under romantic |
| tragic | 49 / 12 | melancholic | +2 melancholic | describes the story more than the mood |
| moral ambiguity | 36 / 9 | enigmatic | +3 enigmatic | a theme, not an enigmatic film |
| gloomy | 22 / 13 | bleak or melancholic | +2 bleak | between the two |
| disjointed | 19 / 5 | fragmented | +1 fragmented | often a complaint about editing |
| mysterious | 17 / 9 | enigmatic | +1 enigmatic | closer to enigmatic than 'mystery', still not the same |
| slow motion | 12 / 9 | slow | +1 slow | a camera technique, not pacing |
| not funny | 10 / 6 | funny | +1 funny | says the opposite |
| psychologist | 8 / 8 | psychological | +0 psychological | a character |
| magical | 4 / 4 | whimsical | +1 whimsical | usually about magic in the story |

## The owner's corrections

Moods the viewers' words gave a film that the owner judged wrong, and took off:

- **Requiem for a Dream**: not romantic (viewers tagged "romance" for its couple; nothing about it is romantic; owner, 2026-11-08)
- **The Piano Teacher**: not romantic (not romantic; owner, 2026-11-08)
- **Adaptation.**: not romantic (a love story in it, not a romantic film; owner, 2026-11-08)

## The old moods beside what viewers said

Of the 795 moods the AI gave 159 films: **144 (18%) are confirmed** by viewers, and **572 (72%) have no viewer saying anything like them**. The rest had some viewers, but not enough.

Some films where the old moods and the viewers disagree:

- **Citizen Kane** (1941): old fragmented, psychological, melancholic, existential, enigmatic · viewers: atmospheric (36), enigmatic (14), melancholic (14) · not backed: fragmented, psychological, existential
- **Apocalypse Now** (1979): old dreamlike, bleak, psychological, existential, surreal · viewers: surreal (73), psychological (40), atmospheric (10) · not backed: dreamlike, bleak, existential
- **2001: A Space Odyssey** (1968): old slow, enigmatic, contemplative, austere, existential · viewers: existential (120), atmospheric (119), surreal (98), slow (88), contemplative (54), enigmatic (12) · not backed: austere
- **Taxi Driver** (1976): old psychological, bleak, existential, intimate, fragmented · viewers: atmospheric (71), psychological (51), bleak (29) · not backed: existential, intimate, fragmented
- **Three Colors: Blue** (1993): old melancholic, intimate, contemplative, psychological, poetic · viewers: atmospheric (11), contemplative (8), lyrical (2) · not backed: melancholic, intimate, psychological, poetic
- **Spirited Away** (2001): old dreamlike, surreal, lyrical, intimate, poetic · viewers: dreamlike (153), atmospheric (118), surreal (113), whimsical (67) · not backed: lyrical, intimate, poetic
- **The 400 Blows** (1959): old intimate, melancholic, lyrical, poetic, contemplative · viewers: contemplative (11), lyrical (3), warm (3) · not backed: intimate, melancholic, poetic
- **The Wages of Fear** (1953): old bleak, existential, psychological, austere, intimate · viewers: tense (6), existential (5), psychological (2) · not backed: bleak, austere, intimate
- **North by Northwest** (1959): old lyrical, psychological, surreal, enigmatic, dreamlike · viewers: tense (22), funny (19) · not backed: lyrical, psychological, surreal, enigmatic, dreamlike
- **Ali: Fear Eats the Soul** (1974): old melancholic, intimate, austere, bleak, contemplative · viewers: contemplative (2), melancholic (2) · not backed: intimate, austere, bleak
- **The Godfather** (1972): old melancholic, psychological, intimate, bleak, lyrical · viewers: atmospheric (76), melancholic (32) · not backed: psychological, intimate, bleak, lyrical
- **Some Like It Hot** (1959): old lyrical, intimate, psychological, surreal, melancholic · viewers: romantic (10) · not backed: lyrical, intimate, psychological, surreal, melancholic
