# Arthouse Atlas: technical overview

How the site is put together: the data, the canon engine, the recommender, the pages, and the checks behind them. For what the site is and what it looks like, see the [README](README.md).

---

## 1. Architecture

```
                        ┌──────────────────────────────────────────────┐
  browser ────────────▶ │ Vercel                                       │
                        │  middleware.js  (link previews: a film's own │
                        │                  title, line and picture)    │
                        │  React single-page app (Vite build)          │
                        └──────────────────────┬───────────────────────┘
                                               │ JSON over HTTPS (axios, JWT)
                        ┌──────────────────────▼───────────────────────┐
                        │ Render: Express API                          │
                        │  the catalogue, cached in memory             │
                        │  the recommender model, loaded from a file   │
                        └──────────────────────┬───────────────────────┘
                                               │ Mongoose
                        ┌──────────────────────▼───────────────────────┐
                        │ MongoDB Atlas                                │
                        │  movies · directors · movements · studios ·  │
                        │  users                                       │
                        └──────────────────────────────────────────────┘

  offline (backend/scripts): the canon engine, TMDB media, the MovieLens recommender,
  the home page's sprite sheets, the map's shapes, the link-preview data
```

- **Frontend:** React 19, Vite 7, Tailwind CSS 4, framer-motion 12, React Router 7, d3-geo and topojson-client. Each room of the site is one file in `frontend/src/pages/`, and its parts are in `frontend/src/components/<room>/`.
- **Backend:** Express 4 and Mongoose 8, with routes under `/api/{auth, movies, users, discover, directors, movements, studios, recs, about}`.
- **Deploys:** both sides deploy themselves on a push to `main`. Render's free instance is kept awake by an uptime monitor, so the API doesn't cold-start.

## 2. The data

| Collection | What it holds |
|---|---|
| `movies` (1,120: 1,118 films and two series the lists count as films, *Dekalog* and *Twin Peaks: The Return*, which carry `tmdbTv` in place of `tmdbId`) | Title, original title, year, directors, countries, runtime, genres; pictures (poster, backdrop, up to six stills); trailer; cast, writers, editors, cinematographers, composers, languages and tagline; the movements it belongs to; `provenance` (every list that cites it, with rank, year and strength); `canonRank` and `canonDecadeRank`; editorial text (a hook, a note, why it matters) for 159 films |
| `directors` (189) | Name, portrait, birth and death, birthplace, biography |
| `movements` (26) | Title, years, region, philosophy, visual signatures, its essential films and key directors; 7 are still happening |
| `studios` | The older studio records; the Studios room itself (62 houses) is built from the catalogue's production companies in `services/studios.js` |
| `users` | Account, favourites, watchlist, watched, ratings (1 to 5 stars, with dates), "not for me" |

**How the catalogue grows:** by one rule, applied by `scripts/catalogue/planAdditions.js`. Every film cited by two or more of the 20 sources that the canon would rank in its top 500 if it were added is a candidate. Each is checked against TMDB (a five-minute extra had stood in for *WALL·E*), mainstream ones are marked by hand (studio spectacle and franchise films stay out), and the edge cases are decided by hand. The pass on 2026-10-22 added 263 films and two series.

Coverage, counted from the live database:
- 1,118 films have a backdrop, and 1,048 have at least four distinct frames.
- 1,114 have a cast, 1,100 writers, 1,088 an editor, 1,029 a cinematographer and 769 a composer.
- All 1,120 have a language, and 744 have their original tagline.
- 1,065 have a trailer link: 1,063 play inside the page, and 2 only on YouTube itself. The other 55 films show their own frames instead.

**The catalogue in memory** (`services/catalogue.js`). A thousand-odd films fit easily in memory. So Explore's filtering, sorting, counting and search happen in plain JavaScript, not in MongoDB queries. Every count is exact, each filter's options are counted with the other filters applied, and a request takes a few milliseconds. The cache reloads every ten minutes.

## 3. The canon engine

Code: `backend/scripts/canon/`. The 20 sources are described in `backend/data/listSources.json`, and the rules are in `scoring.js`.

**Step 1. Each citation gets a strength:** `strength = weight(source) × placement × discount`.

- `weight(source)` ranges from 3.0 for the Sight and Sound critics' poll 2022 down to 1.0 for Roger Ebert's Great Movies. A few others:

  | Source | Weight |
  |---|---|
  | TSPDT, Sight and Sound directors' poll 2022 | 2.5 |
  | Sight and Sound 2012 critics, CriticsTop10, The New York Times | 2.2 |
  | Cahiers du Cinéma, Kinema Junpo | 1.8 |
  | Criterion | 1.2 |

- `placement` is between 0 and 1. With `pos = (rank − 1) / list length`:
  - Ranked polls: `0.35 + 0.65 × (1 − pos)^1.3`
  - Lists of the year: `0.3 + 0.7 × (1 − pos)^1.5`
  - Sight and Sound's historic top tens: `0.6 + 0.4 × (1 − pos)`
  - Lists without ranks: 0.55
  - Festival prizes: by the prize's own weight, so a Palme d'Or counts more than a jury prize.
- `discount` halves CriticsTop10's years before 1970. Those come from the Film Daily newspaper poll, a mainstream consensus (1939's #1 is *Goodbye, Mr. Chips*).

**Step 2. Families, capped.** A film's citations are grouped into the seven families. Within a family it gets its best strength in full, then a share of the second-best, then a smaller share of everything after that. The total can't pass the family's cap.

| Family | Second best counts | The rest count | Cap | Counts toward the canon |
|---|---|---|---|---|
| All-time polls | 0.65 | 0.45 | 9.0 | 1.0 |
| Filmmakers' polls | 0.55 | 0.35 | 4.5 | 0.9 |
| Regional poll | 0.3 | 0.15 | 2.0 | 0.8 |
| A critic's canon | 0.3 | 0.15 | 1.0 | 0.7 |
| A collection | 0.3 | 0.15 | 1.2 | 0.7 |
| Lists of the year | 0.3 | 0.15 | 3.5 | 0.55 |
| Festival prizes | 0.3 | 0.15 | 2.5 | 0.55 |

Independent all-time polls agreeing is the canon itself, so agreement counts for more there. Year-end lists share their critics, so past the best one the rest add little.

**Step 3. Staying power.** The endurance bonus is `0.6 × (decades − 1)`, up to 3, where `decades` is the number of decades in which the all-time, filmmakers' or regional polls have placed the film.

**The canon score** is `Σ family credit × family weight + endurance`. It decides `canonRank`.

**Step 4. Fair to young films (the decade ranking).**
- **Eligibility:** a film is only measured against lists it could have been on. Kinema Junpo only lists Japanese films, Busan only Asian films up to 2014, and every list has its own years.
- **Time to settle:** the slow-canonising families (all-time, filmmakers', regional, critic) count as available in proportion to how long the film has had, `min(1, max(0.15, years / 20))`.
- **The lift:** a film's raw family total is lifted by `min(1.5, √(23.7 / available))`, where 23.7 is all the family caps added together. That gives the `standing` that decides `canonDecadeRank`. The canon itself takes no such lift, so a recent film can't leapfrog the classics on one good year.
- **Where each shows:** a film page gives both ("6th of the 2020s · 422nd of 1,056 in the atlas", for Petite Maman), and each links to its list. Explore's "most acclaimed" order is the canon, except when a decade is chosen: then it follows `canonDecadeRank`, so the list matches the film pages (`sortCards` in `services/catalogue.js`).

**Results:**
- 1,056 films ranked, from 4,187 citations.
- The most cited are Citizen Kane and The Rules of the Game, 16 times each.
- The top three are Seven Samurai, Tokyo Story and Citizen Kane.
- `breakdown()` lays the canon score out family by family for the About page. It adds the families up in `scoreFilm()`'s order, so over all 1,056 ranked films it reproduces the stored score with a worst difference of 0.000, and `tests/about.test.js` checks it against `scoreFilm()`.

## 4. Today's film

Code: `backend/services/tonight.js`. It picks one film a day, the same for everyone, with a reason.
- **The pool:** the canon's top 300, plus every decade's top ten, so a strong recent film can be chosen.
- **The rules, in order:**
  1. **An occasion.** A director born or died on this day gets their strongest film, from anything in the top 600. Births come before deaths.
  2. **Sundays** get a long film, between 2½ and 3½ hours.
  3. **Otherwise,** a pick that shares no decade, country or director with the past three days'.
- **Seeded by the date,** so the choice is fixed for the day. "Another film" steps to the next varied pick.

## 5. The recommender

Code: `backend/scripts/recs/` builds the model offline, and `backend/services/recommender.js` and `forYou.js` serve it. The evaluation is in `backend/data/recs/EVALUATION.md`.

**The data:**
- MovieLens 32M (GroupLens, University of Minnesota): 32,000,204 ratings from 200,948 people, January 1995 to October 2023.
- 1,086 of the atlas's 1,118 films are matched, by TMDB id or, where MovieLens's link was stale, by IMDb id. The two series aren't in MovieLens.
- That's 3,779,709 ratings of atlas films from 191,832 people. "Loved" means 4 stars or more: 2,641,609 loves.

**The pipeline:**

| Step | Script | What it does |
|---|---|---|
| download | `npm run recs:download` | Fetches the dataset |
| export | `npm run recs:export` | Exports the catalogue for joining |
| prepare | `npm run recs:prepare` | Joins MovieLens onto the catalogue in one pass over the 32 million rows, splits people by id (80% to build, 10% to tune, 10% to test), and counts which films people loved together |
| evaluate | `npm run recs:evaluate` / `recs:final` | Measures the candidates; the final test was committed (`cab0954`) before it was run |
| build | `npm run recs:build` | Writes `data/recs/neighbours.json` |
| together | `npm run recs:together` | Counts the people who loved both films of a link (only links with 30 or more), for the reasons |
| audience | `npm run recs:audience` | Counts, for each film, how many people rated it and how many loved it (films with 30 or more raters) |

**The model:**
- **EASE** (Steck 2019), with λ = 100, chosen on the tuning group. Each film keeps its 50 strongest positive weights.
- The shipped model has 55,900 film-to-film links. 53,985 come from viewers; the other 1,915 come from a shared country (974), decade (631), movement (257) or director (53). Those cover films and pairs the ratings don't reach.

**Serving:** `score(pick) = Σ weight(your film) × link(your film → pick) / Σ weight(your film)`.
- **How much each of your films counts:**
  - a favourite, or a 4 or 5 star rating: 1
  - watched or on the watchlist: 0.5
  - a 1 to 3 star rating: 0 (it also overrides watched)
- **The answer:** For You returns 20 picks, each with the film of yours that gave the most of its score, and any other film that gave a quarter or more.
- **A film's page:** the double bill uses the same ranking with that film as the only seed.

**The reasons** are said four ways, rotated so neighbouring picks don't read alike (`frontend/src/components/foryou/whyWords.js`):
- a head-count
- how much likelier than most people
- a share, used only when it's striking
- a rarity contrast

Every number comes from `together.json`, so it's a real count of people who loved both films. Rounding never flatters: 3.6 times is "more than three times".

**How well it works.** Tested on the 1,120-film atlas, on 11,090 people who were never used to build or tune it. The measure: given the last 5 films a person loved, is the very next film they loved in the top 10?

| Method | Hit in top 10 |
|---|---|
| Random picks | 0.9% |
| Canon order | 1.6% |
| The old engine (hand-set weights) | 7.4% |
| Content only (director, movement, country, decade) | 10.8% |
| The most loved films on MovieLens | 20.9% |
| Item-kNN (the first learned engine) | 25.4% |
| **EASE, as shipped** | **34.8%** |

Two more views of the same test:
- For 66.7% of people, at least one film they went on to love was in the top 10, from just their last 5 loves.
- On the published held-out protocol (Liang et al. 2018), Recall@20 is 62.4%.

**Why it's lower than the first run.** The same committed test, run on the 855-film atlas (826 films in MovieLens, 7,110 people), gave EASE 42.1%, the most loved films 27.6%, the old engine 12.1% and random picks 1.2%. With 1,086 films to choose from and more people qualifying, every method scored lower, the baselines included, while EASE's lead held: 4.7 times the old engine (3.5 before) and about 14 points above the most loved films (14.5 before).

Every method ranks every candidate film, with no sampled metrics. The margins of error are in the report.

## 6. The pages

Each room has one physical idea from cinema, acted out with frames, the camera and the lens. A few techniques do most of the work:

- **Home: the wall** (`mosaicRenderer.js`, `scripts/buildMosaic.js`).
  - A still for each of 1,118 films is packed into one sprite sheet with sharp, at 1x and 2x, so the wall is one request.
  - The resting wall is drawn once to an off-screen canvas and laid down as a single pattern fill per frame. Only the lens under the pointer and the few tiles flickering into colour are drawn on top.
  - At the end of the dive into today's film, an `<img>` takes over the tile's exact rectangle, so the push-in is a compositor transform.
- **Home: the countdown** (`CanonCountdown.jsx`).
  - An Academy-leader sweep wipes each film in through a clip-path sector, driven by framer-motion values with no React re-render per frame.
  - Stills near the gate load at full resolution.
  - The section's height is pure CSS, so Back restores the scroll exactly.
- **Home: the map** (`atlasRenderer.js`, `atlasModel.js`, `scripts/buildAtlasMap.js`).
  - Natural Earth's 1:110m shapes via world-atlas, drawn with d3-geo on off-screen layers.
  - A country that no longer exists lights its successors (the Soviet Union lights 15).
  - Countries crossing the 180° line are re-centred, and each country is framed by its mainland, so France doesn't include French Guiana and the United States leaves out Alaska and Hawaii.
- **Home: the arthouse scene** (`ArthouseBreath.jsx`, `noteBurn.js`). A studio's note is typed, cut and burnt through on a canvas as you scroll. The four films' layers are stacked, and only the one on screen takes taps. At the end, each film's frame is shown at its own aspect ratio (1.85, 1.37, 1.66, 1.37): every frame's flex-grow is its ratio, so a row of them shares one height, and on a phone two rows of two come from the same markup (`display: contents` on the row wrappers above the phone size). The masking parts on each frame with transforms only.
- **The film page** (`components/film/`).
  - **The opening** (`TheScreen.jsx`) is a sticky stage. Its card is picked from `useScroll` progress, and each card change cuts to the next of the film's frames.
  - **The trailer** grows out of a little screen through a shared framer-motion `layoutId`, then plays in YouTube's IFrame API. Its `onError` falls back to the film's frames.
  - **The navbar** leaves while the opening runs (an element marked `data-lights-down`), and the pointer at the top edge brings it back.
  - **`ListYears.jsx`** draws its line in CSS when it comes into view.
  - **`DoubleBill.jsx`** uses a CSS animation's end as its clock, so pausing the bar pauses the bill.
- **For You** (`components/foryou/`).
  - One motion value, the playhead, drives the whole monitor. A whole number is a pick landed. In between, the focus racks and the camera dollies, and both are derived values.
  - Every pick's soft, out-of-focus picture is prepared in idle time.
  - Scrolling the page never changes the pick. The name is a lower third on the picture, and a tap opens the film.

**Performance discipline:**
- Animations move only `transform` and `opacity`, so they stay on the compositor.
- Frame timing is measured with `requestAnimationFrame` in headless Chrome over the DevTools protocol, aiming for 60 fps.
- Opacity tied to the scroll goes through `useMotionTemplate`, because Chrome mistimes the native scroll timeline framer-motion would otherwise hand it to.
- Sections whose transforms change every frame opt out of a site-wide CSS transition rule (`.own-transitions`). Otherwise each frame would start a 150 ms transition, which shows as shaking on phones.

## 7. Link previews

Services that draw a shared link's preview don't run JavaScript, so a single-page app would show the site's own title and picture for every link.

- **The middleware:** `frontend/middleware.js` runs on Vercel before a film's, director's, movement's or studio's page (and the main rooms) is served. It puts that page's own title, line and picture into the HTML, in the block between `<!-- meta -->` and `<!-- /meta -->`.
- **The data:** comes from `frontend/public/meta/*.json` (1,120 films, 189 directors, 26 movements by slug and by id, 62 studios). These are written from the database by `backend/scripts/exportMeta.js`.
- **Failure is safe:** a key it doesn't know, or any failure, serves the page unchanged.
- **Tests:** `frontend/tests/middleware.test.mjs` runs the middleware against the real `index.html` and data files.
- **In the browser,** `usePageTitle` keeps the tab's title in step with each page.

## 8. Accessibility

- axe-core finds no violations on any page at desktop (1440×900) or phone (390×844) size. That covers all 14 routes, For You with picks showing, and the signed-in profile.
- A "Skip to the page" link comes first in the tab order, and the page is a single `<main>` landmark.
- Every control has a visible focus ring.
- The standard actions use standard words and icons: Watched, Watchlist, Favourite, Rate it.
- On the film page they stay in reach through the scroll-driven opening (a docked strip on desktop, a bar along the foot on a phone).
- The scroll-driven scenes also carry their text for screen readers, and each has a "Read it as text" or reduced-motion version.

## 9. Security

- **Passwords** are hashed with bcrypt. Sessions are JWTs that last 30 days. For Google sign-in, the browser gets an access token from Google and the server checks it before trusting it. It asks Google's `tokeninfo` endpoint who the token was issued to, and refuses it unless it was issued to this site's own client ID (`GOOGLE_CLIENT_ID`), so a token from another app can't sign its user in here. It also refuses an email Google hasn't verified, since an existing account is matched by email. Only then does it read the name and picture from `userinfo` (`googleProblem` in `services/account.js`).
- **Rate limits:**
  - signing in, joining, Google sign-in, and changing the password or deleting the account: 20 requests per 15 minutes
  - For You's signed-out preview: 60 requests a minute
- **Errors** never leak details: a malformed id is a 400, and anything else is "Something went wrong".

## 10. Tests

- **Backend** (`npm test` in `backend/`): 83 tests. They cover the canon breakdown against `scoreFilm()`, each list's order and the About index's picks, Explore's filters, counts and orders (a decade in its own ranking), For You's reasons and shares, the studios and director indexes, the profile's awards, account changes and the Google sign-in check, and the film-page data scripts' pure parts (choosing a trailer, reading credits).
- **Frontend** (`npm test` in `frontend/`): 6 tests of the link-preview middleware.
- **The recommender's evaluation** is a test of its own, written and committed before it was run.

## 11. Changing the data safely

The scripts that change the catalogue (`scripts/media/addStills.js`, `credits.js`, `trailers.js`, `scripts/moods/`) work in three steps:
1. **Dry run by default:** they write a plan (`scripts/reports/*-plan.json`) and change nothing.
2. **`--apply`:** backs up every field it will touch to `data/backups/`, then writes.
3. **`--restore <file>`:** puts the backup back.

The plans and backups are gitignored.
