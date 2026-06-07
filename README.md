# Arthouse Atlas

> A curated discovery platform for world cinema — built for cinephiles, not algorithms.

🔗 **Live Site:** [arthouse-atlas.vercel.app](https://arthouse-atlas.vercel.app)

![Arthouse Atlas — Explore Page](./assets/homepage_v2.png)

---

## Why I Built This

Mainstream streaming platforms recommend what's popular, not what's meaningful. I wanted a space for world cinema — Iranian New Wave, French New Wave, Slow Cinema, Japanese Golden Age — organised with real curatorial intent. Arthouse Atlas is that space: 497 hand-curated films with a personalisation layer that learns your taste instead of pushing trends.

---

## What It Does

**Arthouse Atlas** is a full-stack MERN application with two layers:

**Discovery** — Browse 497 curated arthouse films across four lenses: Explore (filterable grid), Directors (auteur profiles), Movements (12 cinematic movements with essential films), and Studios (defining production houses).

**Personalisation** — A weighted affinity recommendation engine that builds a taste profile from your interactions and surfaces films you haven't seen but will love.

---

## Features

### Discovery
- **Explore** — Filterable grid of 497 films. Filter by genre, decade, director, and 15 custom mood tags (slow, dreamlike, surreal, contemplative etc.). Shuffle mode with quality floor. Infinite scroll with session-based scroll restoration.
- **The Auteurs** — Director profiles with filmographies and career overviews.
- **Movements** — Full-screen scroll layout for 12 cinematic movements (German Expressionism → Third Cinema) with essential films and key figures.
- **Studios** — Curated production houses and distributors that define arthouse cinema.

### Personalisation
- **For You** — Weighted affinity recommendation engine. Builds a taste profile across 4 dimensions (mood tags, directors, cinematic movements, decade). Scores 200 canonical candidate films. Returns top 10 shuffled from top 30 — taste-matched but fresh every visit.
- **Favorites / Watchlist / Watched** — Three interaction types weighted differently (3×, 1×, 1.5×) to train your recommendation profile.

### Watch Movie
- Per-film streaming availability sourced live from TMDB API, filtered to India and US regions. Provider logos route to a search for the film on that platform.

### Authentication
- JWT-based email/password login (bcrypt password hashing, 30-day token expiry)
- Google OAuth 2.0 one-click sign in

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind CSS | Vite significantly faster than CRA; Tailwind removes CSS overhead for rapid UI iteration |
| Backend | Node.js + Express.js | Lightweight REST API; clean separation of routes and controllers |
| Database | MongoDB + Mongoose ODM | Film metadata is irregular (varied directors, genres, festival wins) — flexible documents suit it better than rigid SQL tables |
| Auth | JWT + Google OAuth 2.0 | JWT is stateless — no server-side session storage, scales horizontally; Google OAuth reduces signup friction |
| External API | TMDB | Streaming availability and trailers fetched on-demand via tmdbId — data stays current without re-seeding |
| Deployment | Vercel (frontend) + Render (backend) | Vercel optimised for React SPAs; Render handles Node.js backend on free tier |

---

## How It Works — Technical Highlights

### Recommendation Engine
A multi-dimensional weighted affinity system — no ML, fully explainable:

1. **Build taste profile** from user interactions across 4 dimensions (tags, directors, movements, decade), weighted by interaction type: Favorites (3×), Watched (1.5×), Watchlist (1×)
2. **Fetch 200 candidates** — top films by `baseCanonScore`, excluding already-interacted films
3. **Score each candidate** — tags (×1.5), directors (+20 flat), movements (×2.0, highest weight), decade (+5 flat), canon quality bonus (×0.1)
4. **Shuffle top 30, return 10** — results are taste-matched but varied every visit

Movements get the highest multiplier (×2.0) because in arthouse cinema, movement affinity is the strongest taste predictor.

### Film Scoring Pipeline
Every film in the database carries scores calculated at seed time:

```
TMDB raw data
    ↓
taggingService     → derivedTags (rule-based keyword matching, 15-tag vocabulary)
    ↓
moodService        → moods Map (richer mood fingerprint from tag relationships)
    ↓
arthouseScoring    → arthouseScore (popularity, genre, country, auteur bonus)
    ↓
baseCanonScoring   → baseCanonScore (critical consensus 35%, historical importance 25%,
                     auteur status 20%, formal innovation 10%, cultural influence 10%)
```

### Optimistic UI
`MovieContext` updates local state immediately on favorites/watchlist/watched toggles before the API call resolves — so interactions feel instant. A `useRef` Set (`pendingToggles`) prevents duplicate in-flight requests on double-click.

### Explore Page Engineering
- **Infinite scroll** via `IntersectionObserver` on the last rendered card
- **Session restoration** — page state, filters, scroll position all persisted to `sessionStorage` so back-navigation restores exactly where you were
- **Search debounce** — 500ms delay before firing search requests

---

## Project Structure

```
Arthouse-Atlas/
├── backend/
│   ├── controllers/     # Route handlers (movies, users, auth, discovery)
│   ├── models/          # Mongoose schemas (Movie, User, Director, Movement, Studio)
│   ├── routes/          # Express route definitions
│   ├── services/        # Scoring algorithms (arthouse, canon, tagging, mood, discovery)
│   ├── middleware/       # JWT auth guard
│   ├── data/            # Static movement and seed data
│   └── scripts/         # DB seeding and enrichment scripts
└── frontend/
    ├── src/
    │   ├── pages/       # Home, Explore, Directors, Movements, MovieDetail, etc.
    │   ├── components/  # PosterCard, Navbar, HeroFeature, FilterPanel, etc.
    │   ├── context/     # AuthContext, MovieContext (global state)
    │   ├── hooks/       # useMotionPreference
    │   └── services/    # Axios API client with JWT interceptor
```

---

## Local Setup

### 1. Clone
```bash
git clone https://github.com/DiwakarMishra-CODER/Arthouse-Atlas.git
cd Arthouse-Atlas
```

### 2. Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Environment variables

**`backend/.env`**
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
TMDB_API_KEY=your_tmdb_api_key
```

**`frontend/.env.local`**
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

> Note: TMDB API key is handled server-side only — never exposed to the frontend.

### 4. Run
```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

App runs at `http://localhost:5173`

---

## License

MIT
