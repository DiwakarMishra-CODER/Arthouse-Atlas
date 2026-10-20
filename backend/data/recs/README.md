# Recommendation model

`neighbours.json` is what the site recommends from. For every catalogue film it holds the 50 films that loving it says most about, each with a weight and its main reason (`v` viewers, `d` director, `m` movement, `c` country, `y` decade), plus the film's canon prior (used to break ties, and as the order when there's nothing else to go on). `services/recommender.js` reads it for For You (`/api/users/recommendations`) and Double Bill (`/api/movies/:id/similar`). If the file is missing, both endpoints fall back to the old overlap scoring.

## The engine: EASE

The weights come from EASE (Harald Steck, "Embarrassingly Shallow Autoencoders for Sparse Data", The Web Conference 2019), solved exactly from MovieLens:

- `G = XᵀX + λI`, where `XᵀX` is the pair-count grid `scripts/recs/prepare.js` builds: how many people loved each film (diagonal) and each pair of films (off it).
- `P = G⁻¹`, and the weight of film i for film j is `B[i][j] = −P[i][j] / P[j][j]`, with `B[j][j] = 0`.
- In words: how much loving film i predicts loving film j, once everything else a person loved is taken into account. λ keeps thin evidence from counting for much. There is no training loop and no randomness; the solve takes about a second.

These are learned weights, not similarities: they can be negative, and they aren't symmetric. Each film keeps its 50 strongest positive weights. The weights are scaled so a typical strongest link is 1, which changes no ranking. Films MovieLens doesn't have (and films nobody in the data loved) get neighbours from content alone, and other films point to them through a weaker content link.

λ, the content weight β and the canon nudge γ were chosen on the validation group (80% of MovieLens people build the counts), then applied to counts from everyone for the shipped file; accuracy is flat across λ, so the larger count makes no practical difference.

`EVALUATION.md` and `evaluation.json` record how it was chosen and tested; `EVALUATION-v1.md` and `evaluation-v1.json` keep the first engine's report (item-to-item cosine, tested on a different group).

## Counts for the reasons: `together.json`

For You says why a film was picked in numbers where it can ("more than one in three of the 54,746 people who loved The Godfather loved this too"). `together.json` holds those counts: for each film, how many MovieLens people loved it (4 stars or more), and, for each of its links in `neighbours.json`, how many loved both. A link is kept only when 30 or more people loved both, so no number rests on a handful of people. `services/forYou.js` reads it. Rebuild with `npm run recs:together` after `recs:build`.

## Rebuilding

Rebuild after adding films or re-running the canon (the model is keyed by TMDB id and carries each film's canon rank):

```sh
cd backend
npm run recs:download   # MovieLens ml-32m, 239 MB, checksum-verified (skipped if present)
npm run recs:export     # catalogue → data/recs/work/catalogue.json (read-only)
npm run recs:prepare    # one pass over 32M ratings → pair counts + coverage report
npm run recs:evaluate   # choose the engine and settings on the validation group
npm run recs:final      # score the test group → EVALUATION.md
npm run recs:build      # → neighbours.json + spot check
npm test
```

`recs:final` is meant to run once per version of the evaluation code (`PROTOCOL_VERSION` in `scripts/recs/evaluate.js`), after that code is committed: it records the commit and a fingerprint of the code, so the report can show the test was fixed before its numbers existed. After a catalogue change, `recs:build` alone is enough to ship; re-score only with a new protocol version or a fresh test group.

`data/movielens/` and `data/recs/work/` are gitignored; only the outputs above are committed.

## Data and licence

`neighbours.json` and `together.json` are built from MovieLens ml-32m (32,000,204 ratings by 200,948 people, January 1995 – October 2023) by GroupLens Research, University of Minnesota. The dataset may be used for research and non-commercial purposes; derived data may be redistributed under the same conditions; no endorsement by the University of Minnesota or GroupLens is implied. If this site ever earns revenue, these files must be rebuilt without MovieLens or permission sought from GroupLens.

F. Maxwell Harper and Joseph A. Konstan. 2015. The MovieLens Datasets: History and Context. ACM Transactions on Interactive Intelligent Systems (TiiS) 5, 4: 19:1–19:19. https://doi.org/10.1145/2827872

Harald Steck. 2019. Embarrassingly Shallow Autoencoders for Sparse Data. In The World Wide Web Conference (WWW '19).
