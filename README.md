# Arthouse Atlas

**A curated atlas of arthouse cinema: 1,120 films, ordered by what critics' polls, year-end lists and festival juries have agreed on, not by an algorithm's guesses.**

**Live:** [arthouse-atlas.vercel.app](https://arthouse-atlas.vercel.app) · **By** Diwakar Mishra · [GitHub](https://github.com/DiwakarMishra-CODER) · [LinkedIn](https://www.linkedin.com/in/diwakar-mishra-dev)

![The home page: the wall of every film's stills dives into today's film](docs/screens/clip-home.webp)

| 1,120 films | 189 directors | 26 movements | 62 studios and labels | 75 countries | 1915 to 2025 |
|---|---|---|---|---|---|

---

## What it is

Arthouse Atlas is a website for finding films worth your evening. 1,056 of its 1,120 films have earned their place on public lists people trust: the Sight and Sound polls, They Shoot Pictures, Don't They?, the BBC's critics' polls, Cahiers du Cinéma's year-end lists, the big festivals' prizes and more, twenty sources in all. Those lists decide the order of the atlas, and every film's page shows exactly which lists placed it. The other 64 films are there on the curator's judgement, and their pages say so. Two of the 1,120 are series the lists count as films: Kieślowski's *Dekalog* and Lynch's *Twin Peaks: The Return*.

On top of that sits **For You**: recommendations learned from 32 million ratings by real viewers (the MovieLens dataset), explained in plain numbers ("Nearly half of the 1,963 people who loved Persona loved this too").

Each page is designed as a room of a cinema. The home page is a picture house, a film's page plays the film's own opening titles, For You is a camera monitor pulling focus, Studios is a backlot seen from a crane. The motion is there to make the films feel like films, not to decorate.

## Why I made this

> *Moonlight* was where it started for me: family made not by blood but by people who care.

> There are so many films, and I only wanted the best, so I went digging for sources I could trust. So the atlas is built on what critics and filmmakers have actually agreed on, list by list, not on an algorithm's guesses. This is my attempt to do these films justice.

From the commentary on the About page, where I talk through the films that made the atlas in eight chapters: Moonlight, Mulholland Drive, Persona, Mirror, Portrait of a Lady on Fire, Wong Kar-wai's Hong Kong, Kieślowski's Three Colours, and why the atlas exists.

---

## A tour

### The home page: a picture house

| | |
|---|---|
| ![](docs/screens/home-wall.jpg) | ![](docs/screens/home-today.jpg) |
| **The front door.** Every film's still, on one wall. Scroll and the camera dives into one tile: today's film, the same for everyone today. | **Today's film** comes with its reason. Here: "Because Julie Dash was born on this day in 1952." Sundays get a long film. |
| ![](docs/screens/home-arthouse-open.jpg) | ![](docs/screens/home-arthouse-note.jpg) |
| **What is arthouse cinema?** It opens on *L'Avventura*, as Antonioni framed it. The frame acts out a studio's notes ("Too wide", "Too empty", "Too slow"), then comes the film's true story: the Cannes audience booed it, and it won the Jury Prize. | **Then four films get a note.** The studio's memo ("Explain the ending") burns through like film stuck in a projector… |
| ![](docs/screens/home-arthouse-answer.jpg) | ![](docs/screens/home-arthouse-end.jpg) |
| **…and the director's answer** takes its place. Four films, four notes, four answers. | **That's arthouse cinema:** films whose makers didn't take the note, each frame shown at the width its director chose. |
| ![](docs/screens/home-countdown.jpg) | ![](docs/screens/home-just-missing.jpg) |
| **The countdown.** The ten films the critics agree on most (one per director), wiped in by an Academy leader's sweep. | **Just missing out:** 11 to 20, hung like trims in an editing room, swaying as you scroll. |
| ![](docs/screens/home-map.jpg) | ![](docs/screens/home-auditorium.jpg) |
| **The atlas.** The earth at night; a country glows while its cinema is happening. Click one to fly in and see its films. | **Three rooms** of the site, played as trailers on a turning stage. |

![The box office: a ticket for your next film](docs/screens/home-box-office.jpg)

**The box office** prints a ticket for your next film: your recommendations when you're signed in, films from the top of the atlas when you're not.

### A film's page: it plays the film's opening titles

![A film's page: the opening titles play as you scroll](docs/screens/clip-film.webp)

You arrive on the film's title card, over its own frames. Scroll, and the screen holds while the credits come up one card at a time, then the film's note as subtitles, then why it matters, then where to watch it. **Skip the opening** and **Read it as text** are always at the foot.

| | |
|---|---|
| ![](docs/screens/film-title.jpg) | ![](docs/screens/film-credits.jpg) |
| **The title card,** here signed in, with the film marked Watched and Favourite and given four stars. The trailer button is a little screen already playing the film's frames. | **The opening titles.** The navbar steps aside while they run; your controls dock at the top right so they're always within reach. |
| ![](docs/screens/film-trailer.jpg) | ![](docs/screens/film-critics.jpg) |
| **The trailer plays in place.** The little screen grows into the big one. For the 55 films with no trailer online, the film's own frames run instead. | **How the critics rank it:** the film's standing on a marquee, its strongest lists as laurels, and what MovieLens viewers made of it. |
| ![](docs/screens/film-lists.jpg) | ![](docs/screens/film-double-bill.jpg) |
| **When the lists placed it:** every list that names the film, in the decade it named it. Persona: Cahiers' #1 of 1967 through Sight and Sound's #18 in 2022. | **Films like it, as a double bill,** each pairing with its reason: "Only 1 in 95 people loved it, but 1 in 3 of those who loved Persona did." |

### For You: the focus puller's monitor

![For You: the monitor racks focus from the film you loved to your pick](docs/screens/clip-for-you.webp)

Your taste is the lens. A film you loved stands sharp in the foreground, your pick waits far behind it, and the focus racks from one to the other. Under the picture, why it was picked, with real counts. It turns by itself every few seconds; drag the focus ring, swipe, or tap the picture to open the film. Newcomers rate a few films most people have seen, and it works without an account (your ratings move into the account when you sign up).

### The other rooms

| | |
|---|---|
| ![](docs/screens/explore.jpg) | ![](docs/screens/explore-foyer.jpg) |
| **Explore: the foyer.** A cinema letterboard says what's showing, and every gold word is a choice (country, decade, director, movement, mood, genre, length, order), each made with pictures. | **The display cases.** Films in canon order (pick a decade and it's that decade's own ranking), lit as you reach them; hover one and its frames run. Start from a film you know, or let the projector pick. |
| ![](docs/screens/directors.jpg) | ![](docs/screens/director.jpg) |
| **Directors: "Directed by".** The scroll is the projector; each director's best film rolls into the gate, then everyone appears as end credits. | **A director's page** is a retrospective: the career on a projector, a poster wall, the biography on an archive card, the circle they worked with. |
| ![](docs/screens/movements.jpg) | ![](docs/screens/movement.jpg) |
| **Movements:** 26 schools of cinema on one strip of film from 1920 to now. 7 are still happening. | **A movement's page** plays like a screening, its type and grade taken from the movement itself. |
| ![](docs/screens/studios.jpg) | ![](docs/screens/studio.jpg) |
| **Studios: the Lot.** 62 houses (55 production companies and 7 labels) as soundstages made of their own films, seen from a crane. | **A house's page** opens with its own titles: its mark in the projector's light, then its signature film. |
| ![](docs/screens/about-commentary.jpg) | ![](docs/screens/about-count.jpg) |
| **About: why I made this,** played as a commentary track over the films. | **How a film earns its place,** counted step by step for a real film (here, Seven Samurai). |
| ![](docs/screens/about-lists.jpg) | ![](docs/screens/sign-in.jpg) |
| **The 20 lists,** each playing its number one and its rarest pick. | **Sign in is your first take:** the form is a clapperboard; Action claps it shut. |
| ![](docs/screens/profile.jpg) | ![](docs/screens/not-found.jpg) |
| **Your profile is your own awards night:** your ratings pick your favourite film, director, movement, country, decade and hidden gem. *(Shown with sample ratings.)* | **A missing page** is the end of a reel: the projector still running, nothing in the gate. |

**On a phone:**

<p>
<img src="docs/screens/phone-home.jpg" width="31%" alt="The home page on a phone" />
<img src="docs/screens/phone-film.jpg" width="31%" alt="A film's page on a phone" />
<img src="docs/screens/phone-for-you.jpg" width="31%" alt="For You on a phone" />
</p>

---

## How a film earns its place

The order of the atlas comes from public lists, combined in a way you can check. The code is in [`backend/scripts/canon/`](backend/scripts/canon/), with the scoring rules in [`scoring.js`](backend/scripts/canon/scoring.js).

**The 20 sources**, in seven families:

| Family | Sources |
|---|---|
| All-time polls (10) | Sight and Sound critics' polls 2022 and 2012, Sight and Sound directors' poll 2012, Sight and Sound's earlier polls 1952–2002, They Shoot Pictures Don't They? top 1,000, BBC Culture's three polls (foreign-language films, the 21st century, films by women), Sight and Sound's greatest documentaries, Jonathan Rosenbaum's 1,000 essential films |
| Filmmakers' polls (2) | Sight and Sound directors' poll 2022, The New York Times' best of the 21st century |
| Lists of the year (4) | CriticsTop10, Sight and Sound's year-end poll, Cahiers du Cinéma's top ten, Kinema Junpo's best ten |
| Festival prizes (1) | The top prizes at Cannes, Venice, Berlin and Locarno, and FIPRESCI |
| Regional poll (1) | Busan's Asian cinema 100 |
| A critic's canon (1) | Roger Ebert's Great Movies |
| A collection (1) | The Criterion Collection |

**How they're combined:**

1. **Each citation gets a strength:** how much its source counts, times how high the film sits on it. Being #1 on a poll counts for more than #240; a Palme d'Or for more than a jury prize; a place on a list without ranks (Criterion, Ebert) counts the same for every film on it.
2. **Citations are grouped by family, and each family is capped.** A film gets its best citation in a family in full, a fraction of its second and less for the rest. Five year-end lists drawing on the same critics can't add up to five opinions.
3. **Families count for different amounts.** All-time polls count most; year-end lists and prizes, which are a first verdict rather than a lasting one, count for about half as much.
4. **Staying power earns a bonus.** For every further decade in which the great polls have placed the film, its score goes up (up to a limit). Seven Samurai has been in them since the 1980s.
5. **Fair to young films.** A 2021 film couldn't have been in the 2012 poll, so each film is only judged by the lists it could have appeared on. This gives a second ranking, used to rank a film among the films of its own decade.

**The result:** 1,056 of the 1,120 films are ranked, from 4,187 citations. The most cited are Citizen Kane and The Rules of the Game, 16 times each. The other 64 films are in the atlas on curatorial judgement and say so. The top ten:

> 1. Seven Samurai · 2. Tokyo Story · 3. Citizen Kane · 4. Rashomon · 5. 8½ · 6. L'Avventura · 7. In the Mood for Love · 8. The Passion of Joan of Arc · 9. Vertigo · 10. The Rules of the Game

The About page shows the whole count, step by step, for three real films (Seven Samurai, Parasite and Pacifiction). The breakdown it uses reproduces every stored score exactly: that was checked over all 1,056 ranked films, and a test covers it.

## How For You works

The recommendations are learned from **MovieLens 32M**, a public research dataset from GroupLens at the University of Minnesota: 32,000,204 ratings from 200,948 people. 1,086 of the atlas's 1,118 films are in it (the two series aren't), with 3,779,709 ratings between them.

- **The model** is [EASE](https://arxiv.org/abs/1905.03375) (Steck, 2019). It learns, for every pair of films, how much loving one predicts loving the other, after allowing for everything else a person loved. That stops popular films from winning just for being popular. Each film keeps its 50 strongest links. A film MovieLens lacks is linked by director, movement, country and decade instead.
- **Your picks:** each film you loved votes for its linked films, and the votes add up. Twenty picks come back, each with the film of yours that led to it.
- **The reasons are real counts**, quoted only when 30 or more people loved both films.
- **It was tested properly.** The test was written down and committed before it was run. On the 1,120-film atlas it was measured on 11,090 people the model never saw, each given only the last 5 films they loved. For **66.7%** of them (2 in 3), the top 10 already held a film they went on to love. Asked for the exact next film they loved, out of more than 1,000, it had it in the top 10 for **34.8%**: 4.7 times as often as the old hand-tuned engine (7.4%) and 1.7 times as often as simply showing the most popular films (20.9%). Random picks get 0.9%.
- **Why the earlier number was higher:** on the 855-film atlas the same test gave 42.1%. With more films to choose from, every method scored lower, the random and popular baselines included, while the model's lead over them held. The task got harder; the model didn't get worse. The full report, with the method and the uncertainty margins, is in [`backend/data/recs/EVALUATION.md`](backend/data/recs/EVALUATION.md).

On film pages, the same data gives **what viewers made of it** ("On MovieLens, 1,963 people loved it, nearly three in four of those who rated it") for the 976 films that 30 or more people rated.

---

## Engineering notes

- **The wall of stills** (home page): a still for each of 1,118 films, packed into one sprite sheet, built with sharp at two sizes, so the wall loads as one request. The resting wall is drawn once off-screen and laid down as a single pattern fill each frame, with a lens under the pointer. At the end of the dive, a plain `<img>` takes over the tile's exact rectangle, so the push-in runs as a cheap compositor transform.
- **The world map:** Natural Earth's country shapes, drawn with d3-geo. Countries that no longer exist light their successors (the Soviet Union lights 15 states). Countries crossing the 180° line are handled, and each country is framed by its mainland (France without French Guiana).
- **The canon countdown:** an Academy-leader sweep wipes each film in with a clip-path driven by framer-motion motion values, with no React re-render per frame. Section heights are pure CSS, so Back restores the scroll position exactly.
- **The film page's opening** is one sticky stage whose card is picked by scroll progress. The trailer's little screen grows into the full screen through a shared layout animation. It plays in YouTube's IFrame API, which falls back to the film's own frames if the video can't play.
- **Link previews:** WhatsApp, LinkedIn, Slack and the rest don't run a page's JavaScript. So a small Vercel middleware ([`frontend/middleware.js`](frontend/middleware.js)) puts each film's, director's, movement's and studio's own title, line and picture into the HTML before it's served.
- **Search engines:** the same middleware gives every page its canonical address and schema.org data (a `Movie` with its director and year on a film's page, a `Person` on a director's), and `exportMeta.js` writes a sitemap of all 1,404 pages.
- **Performance:** animations move only `transform` and `opacity`. Frame timing for each animated section is measured in headless Chrome, aiming for 60 fps.
- **Accessibility:**
  - axe-core, the standard automated checker, finds no violations on any page, at desktop or phone size. That covers all 14 pages, For You with picks showing, and the profile signed in.
  - There's a skip link, and a visible focus ring on every control.
  - The site follows the system's reduced-motion setting.
  - The scroll-driven scenes (a film's opening, the home page's arthouse scene, About's commentary, the Directors opening) carry their text for screen readers too.
- **Data changes are careful.** The scripts that fix the catalogue (stills, credits, trailers, moods) do a dry run by default, back up what they'll change before `--apply`, and can restore from that backup.

More detail, with the formulas: [TECHNICAL_OVERVIEW.md](TECHNICAL_OVERVIEW.md).

## Built with

| | |
|---|---|
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, framer-motion 12, React Router 7, d3-geo and topojson-client |
| **Backend** | Node.js, Express 4, MongoDB with Mongoose 8, JWT and bcrypt, Google sign-in, rate limiting |
| **Data scripts** | sharp (image sprites), world-atlas (Natural Earth shapes), the TMDB API, MovieLens 32M |
| **Hosting** | Vercel (the site), Render (the API, kept awake by an uptime monitor), MongoDB Atlas |

## Running it locally

You'll need Node.js 20 or newer, a MongoDB database with the catalogue, and a [TMDB API key](https://www.themoviedb.org/settings/api). The database isn't in this repository. It was built from the public sources by the scripts in [`backend/scripts/`](backend/scripts/).

```bash
# the API
cd backend
cp .env.example .env      # then fill in MONGODB_URI, JWT_SECRET, TMDB_API_KEY (and GOOGLE_CLIENT_ID for Google sign-in)
npm install
npm run dev               # http://localhost:5000

# the site, in another terminal
cd frontend
cp .env.example .env.local    # VITE_API_URL points at the API (and VITE_GOOGLE_CLIENT_ID for Google sign-in)
npm install
npm run dev                   # http://localhost:5173
```

**Tests:** `npm test` in `backend/` runs 83 tests. They cover the canon breakdown, the About lists, Explore's filters, For You's reasons, the studios, the director index, the profile awards, accounts (including the Google sign-in check) and the film-page data scripts. `npm test` in `frontend/` runs 10 tests of the link-preview and search middleware and the sitemap.

**The data scripts** (all in `backend/scripts/`; the media scripts only write when given `--apply`):

| Script | What it does |
|---|---|
| `canon/` | Fetches the 20 sources, resolves them to TMDB, scores and ranks the films |
| `catalogue/planAdditions.js` | Plans which missing films to add: every film cited by 2 or more sources that the canon would rank in its top 500, checked against TMDB |
| `addFilms.js`, `catalogue/addSeries.js` | Add films from TMDB, and the two series the lists count as films |
| `media/addStills.js` | Adds frames from TMDB, so 1,048 films have at least four |
| `media/credits.js` | Cast, writers, editors, languages and taglines from TMDB |
| `media/trailers.js` | Checks every trailer still plays and replaces dead ones |
| `recs/` (`npm run recs:*`) | Downloads MovieLens, builds and evaluates the recommender, and counts the reasons and the viewer numbers |
| `buildMosaic.js` | The home page's sprite sheets |
| `buildAtlasMap.js` | The map's shapes |
| `exportMeta.js` | The link-preview titles and pictures, and the sitemap (run after the catalogue changes) |

## Project structure

```
backend/
  controllers/  routes/  models/  middleware/     the API (Express + Mongoose)
  services/       the catalogue, today's film, For You, About, studios, directors
  scripts/        the canon engine, media, recommender and map pipelines
  data/           the list sources, the recommender model and its evaluation
  tests/
frontend/
  src/pages/      one file per room
  src/components/ each room's parts (home, film, foryou, explore, about …)
  middleware.js   link previews
  public/         the wall's sprite sheets, map shapes, preview data
docs/screens/     the pictures in this README
```

## Credits

- **Film data, pictures and trailers:** [TMDB](https://www.themoviedb.org/). *This product uses the TMDB API but is not endorsed or certified by TMDB.* Trailers play from YouTube.
- **Where to watch:** streaming availability from [JustWatch](https://www.justwatch.com/), via TMDB.
- **Ratings:** [MovieLens 32M](https://grouplens.org/datasets/movielens/), GroupLens Research, University of Minnesota (F. Maxwell Harper and Joseph A. Konstan, *The MovieLens Datasets: History and Context*, ACM TiiS 2015). Used under its non-commercial licence.
- **The lists:** each belongs to its publisher: Sight and Sound (BFI), They Shoot Pictures Don't They?, BBC Culture, The New York Times, CriticsTop10, Cahiers du Cinéma, Kinema Junpo, the Busan International Film Festival, the Cannes, Venice, Berlin and Locarno festivals and FIPRESCI, Jonathan Rosenbaum, Roger Ebert and The Criterion Collection.
- **Map:** [Natural Earth](https://www.naturalearthdata.com/) (public domain), via world-atlas.

Made by **Diwakar Mishra**.
