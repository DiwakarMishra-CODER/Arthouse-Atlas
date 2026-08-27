# Arthouse Atlas — Technical Overview

A detailed look at the architecture, scoring systems, and engineering decisions behind Arthouse Atlas.

---

## What is Arthouse Atlas?

A full-stack MERN web application — a curated discovery platform for ~497 arthouse films, with a taste-learning recommendation engine and user authentication.

**Live site:** arthouse-atlas.vercel.app

**Summary:**
> Arthouse Atlas is a film discovery platform for world cinema. It curates 497 arthouse films and organises them by director, movement, and studio. The personalisation layer — a recommendation engine — learns user taste from favorites, watchlist, and watched history and suggests films the user hasn't seen.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind | Vite is faster than CRA; Tailwind removes CSS overhead |
| Backend | Node.js + Express | Lightweight REST API |
| Database | MongoDB + Mongoose | Flexible schema for varied film metadata |
| Auth | JWT + Google OAuth 2.0 | JWT is stateless; Google reduces signup friction |
| Deployment | Vercel (frontend) + Render (backend) | Free tier; Vercel optimised for React SPAs |

---

## Architecture

```
Browser (React SPA)
    ↓ axios (Bearer JWT token on every request)
Express REST API  (/api/auth, /api/movies, /api/users, /api/discover ...)
    ↓ Mongoose ODM
MongoDB  (Movie, User, Director, Movement, Studio collections)
    ↓ TMDB API
Streaming providers, trailers, backdrops fetched on demand
```

### SPA Navigation
The browser downloads everything once. React Router fakes navigation — updates the URL and swaps components without ever reloading the page, which is why navigation feels instant.

### HTTP Client
Requests go through axios rather than raw `fetch`, primarily for **interceptors** — code that runs automatically before every request. An interceptor reads the JWT from `localStorage` and attaches it to every API call automatically.

### HTTP Status Codes
- `200` — OK
- `201` — Created (used after register)
- `400` — Bad request (wrong input)
- `401` — Unauthorized (no/invalid token)
- `404` — Not found
- `500` — Server crashed

---

## Global State — Two React Contexts

### AuthContext
Holds: `user`, `login`, `logout`, `register`, `isAuthenticated`

On app load: reads token from localStorage → calls `/api/auth/me` → rehydrates the session.
On login: saves token to localStorage, sets user in state.
On logout: removes token, clears user.

### MovieContext
Holds: `favorites`, `watchlist`, `watched` arrays + toggle functions

Uses **optimistic UI** — updates local state immediately before the API call resolves, so it feels instant to the user.

Uses a `pendingToggles` ref (a Set) to prevent duplicate API calls on rapid double-clicks.

Syncs to localStorage so state survives page refresh.

---

## Authentication

### JWT Flow (Email/Password)

1. User registers/logs in → backend verifies credentials
2. Backend creates a JWT: `jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' })`
3. Token sent to frontend → stored in `localStorage`
4. Every API request: axios interceptor reads token → adds `Authorization: Bearer <token>` header
5. `authMiddleware.js` on backend: verifies token → extracts user ID → attaches `req.user`

The JWT payload carries the MongoDB user ID, signed with a secret only the server knows, so it can't be forged. It expires after 30 days; a known follow-up is adding an axios response interceptor that clears the token and redirects to login on any 401.

### Google OAuth Flow

1. User clicks "Sign in with Google" → Google gives an access token
2. Frontend sends that access token to `POST /api/users/google`
3. Backend calls `https://www.googleapis.com/oauth2/v3/userinfo` to verify it and get name/email/picture
4. Backend finds or creates the user in MongoDB
5. Backend returns its own JWT — same flow as email login from this point

Converting to the app's own JWT keeps the rest of the auth system consistent regardless of login method — no special cases downstream.

### Password Security
Passwords are never stored in plain text. Before saving, bcrypt hashes the password with salt rounds=10. On login, `bcrypt.compare()` checks the candidate password against the stored hash.

---

## Security & Configuration

All secrets (database credentials, JWT signing key, third-party API keys) are supplied via environment variables — never committed to source control. `.env` files are gitignored on both frontend and backend, with `.env.example` templates checked in to document required variables without exposing values.

Database credentials are rotated periodically as a standard precaution, independent of any specific incident — a credential rotation only requires updating the value in the hosting provider's environment settings (Render for the backend) and restarting the service; no code changes are needed since the app reads `MONGODB_URI` at runtime.

Error responses avoid leaking internal implementation details (stack traces, raw driver errors) to the client — failures are caught and translated into generic client-safe messages, with details logged server-side only.

---

## Database — MongoDB

5 collections: `movies`, `users`, `directors`, `movements`, `studios`

### User Schema
```
username, email, password (hashed)
favorites  → array of Movie ObjectIDs
watchlist  → array of Movie ObjectIDs
watched    → array of Movie ObjectIDs
profileImage, createdAt
```

### Movie Schema — Key Fields

**Basic:** `title`, `year`, `synopsis`, `directors[]`, `runtime`, `country`, `posterUrl`, `backdropUrl`

**Classification:**
- `genres[]` — broad TMDB categories (Drama, Mystery)
- `derivedTags[]` — 15 curated mood/style labels (see below)
- `movements[]` — cinematic movement (French New Wave etc.)
- `decade` — calculated from year, stored for fast filtering

**Quality Scores (all stored permanently):**
- `arthouseScore` — is it arthouse? (0-100)
- `baseCanonScore` — how canonical? (0-100)
- `vote_average`, `vote_count`, `popularity` — from TMDB
- `tier` — 1 (curated canon), 2 (director-based), 3 (discovery)
- `depthScore`, `formalInnovation`, `culturalInfluence`, `influenceScore`

**Discovery:**
- `moods` — Map of mood → weight, derived from derivedTags
- `showCount` — how many times surfaced (for rarity tracking)
- `lastShownAt` — timestamp

**Media:**
- `trailerUrl` — YouTube embed URL
- `stills[]` — scene screenshots from TMDB
- `tmdbId` — foreign key to TMDB (streaming providers fetched live)

**Why MongoDB over SQL:** Film data is irregular — some films have 1 director, some have 3; some have festival wins, some don't. MongoDB's flexible documents handle this naturally, where SQL would need many nullable columns or join tables.

---

## The 15 derivedTags

Fixed vocabulary assigned to every film by `taggingService.js`:

```
slow          dreamlike     melancholic
intimate      existential   minimalist
bleak         poetic        psychological
fragmented    contemplative surreal
austere       lyrical       enigmatic
```

**How they're assigned:**
1. Combine synopsis + keywords + genres into one text blob
2. For each tag, count how many of its related keywords appear in the text
3. Tags scored above 0, sorted by score, top 5 assigned to the film
4. Calculated once at seed time, stored permanently

Tags are fixed on the film. What's personalised is how much weight each tag carries in a given user's taste profile.

---

## The 12 Cinematic Movements

```
1.  German Expressionism          (1920–1933)
2.  Soviet Montage                (1924–1930)
3.  Italian Neorealism            (1944–1952)
4.  Japanese Golden Age           (1950–1960)
5.  French New Wave               (1958–1964)
6.  New Hollywood                 (1967–1980)
7.  Slow Cinema                   (1980s–present)
8.  Iranian New Wave              (1980s–present)
9.  New Taiwanese Cinema          (1980s–2000s)
10. Documentary / Cinema Vérité   (1920s–present)
11. Avant-garde / Experimental    (1920s–present)
12. Third Cinema / Latin American (1960s–1970s)
```

Assigned manually during seeding, since this required genuine film knowledge rather than being algorithm-derived. Movements carry the highest weight in recommendations because, in arthouse cinema, liking one French New Wave film strongly predicts liking others — a more reliable signal than genres or tags.

---

## All 6 Scoring Systems

### Quick Reference Table

| Score | Question it answers | Calculated | Used where |
|---|---|---|---|
| arthouseScore | Is it arthouse? | Seed time | Shuffle floor, curated sort |
| baseCanonScore | How canonical? | Seed time | Recommendations, explore rank |
| recommendationScore | Matches this user? | Live, every request | For You page |
| similarityScore | Like this film? | Live, per request | Similar Films section |
| exploreScore | Surface today? | Live, per request | Discovery routes |
| moodScore/decadeScore | Fits current filter? | Live, per request | Mood/decade discovery |

---

### 1. arthouseScore
**Question:** Is this film actually arthouse?

**Formula — 6 components, max 100:**
- Popularity (25 pts) — low popularity = arthouse indicator; classics get a legacy bonus instead
- Vote pattern (20 pts) — high rating + small audience = arthouse sweet spot
- Genre (20 pts) — Drama/Documentary adds; Action/Sci-Fi subtracts (classics and auteurs immune)
- Tags (20 pts) — contemplative/existential/slow/austere = +5 each
- Country (15 pts) — France/Italy/Japan/Iran/Korea = +15; USA = -10 unless rating > 7.8
- Auteur bonus (+15) — flat bonus if director is on the auteur list

**Masterpiece floor:** rating > 8.2 → score never drops below 85

Six signals combine to filter mainstream films out: popularity, rating pattern, genre, mood tags, country of origin, and director reputation. Low popularity scores higher because arthouse films are niche by nature; French, Italian, Japanese, and Iranian cinema gets a bonus; mainstream genres are penalised unless the film is a recognised classic or auteur work.

---

### 2. baseCanonScore
**Question:** How essential is this film to cinema history?

**Formula:**
```
0.35 × CriticalConsensus
0.25 × HistoricalImportance
0.20 × AuteurImportance
0.10 × FormalInnovation
0.10 × CulturalInfluence
```

**CriticalConsensus:** TMDB rating × 10, adjusted for vote count reliability. More votes = more trustworthy. Minimum multiplier 0.7 (never fully discounted).

**HistoricalImportance:** Tier (1→70pts, 2→50pts, 3→30pts) + age bonus (>70 years = +20) + festival wins (+5 each, max +10)

**AuteurImportance:**
- Master auteurs (Tarkovsky, Bergman, Kubrick, Godard, Ozu etc.) → 100
- Established auteurs (Lynch, Haneke, Denis, PTA etc.) → 75
- Unknown → 50 default

**FormalInnovation:** Experimental tags (surreal, fragmented, dreamlike) × 15 each + pre-1940 bonus

**CulturalInfluence:** Vote count brackets + tier + age/rating combinations

This score answers how canonical a film is — not just whether it's good, but whether it matters historically. Five components combine: critical consensus, historical importance (age, tier, festival wins), director auteur status, formal innovation, and cultural influence. Calculated once at seed time and stored permanently, since a film's place in history doesn't change.

---

### 3. recommendationScore
**Question:** How well does this film match this specific user's taste?

**Step 1 — Build taste profile from interactions:**
```
tagMap[tag]      = favorites_with_tag × 3.0
                 + watched_with_tag × 1.5
                 + watchlist_with_tag × 1.0

(same for directors, movements, decades)
```

**Step 2 — Score each candidate:**
```
+ tagMap[tag] × 1.5        per matching tag
+ 20 flat                   per matching director
+ movementMap[mov] × 2.0   per matching movement
+ 5 flat                    if decade matches
+ baseCanonScore × 0.1      quality tiebreaker
```

**Step 3 — Return results:**
Sort 200 candidates → take top 30 → Fisher-Yates shuffle → return 10

**Why shuffle top 30 instead of returning top 10 directly:** returning the top 10 directly would give the same list every visit. Shuffling the top 30 gives taste-matched but varied results, so the page feels alive.

**Why no caching:** if a user just favorited something, the next visit must reflect that immediately — `Cache-Control: no-store`.

A taste profile is built from the user's interactions — favorites weighted 3×, watched 1.5×, watchlist 1×. That profile captures tags, directors, movements, and decade preferences. 200 unseen films are scored against that profile. Movements get the highest weight because they're the most reliable taste signal in arthouse cinema. The top 30 matches are shuffled, and 10 are returned, so results feel fresh on every visit.

---

### 4. similarityScore
**Question:** How similar is film X to film Y?

```
shared directors  × 3   (highest — same director = most similar)
shared movements  × 2
shared tags       × 1.5
shared genres     × 1   (lowest — too broad)
```

Fetch 100 candidates sharing any attribute → score → sort → return top 10.

**Used:** Similar Films section on MovieDetail page.

All films sharing any attribute with the current film — director, movement, tags, genres — are gathered, then ranked by overlap. Director match scores highest since it's the strongest similarity signal.

---

### 5. exploreScore
**Question:** How should this film rank on the Explore page today?

```
0.60 × baseCanonScore
0.20 × RecencyBoost      (post-2015 films score higher)
0.10 × RarityBoost       (less-shown films surface more)
0.10 × RotationNoise     (small daily random variation)
```

Also increments `showCount` on every film returned, so rarity tracking stays accurate over time.

---

### 6. moodScore / decadeScore / combinedScore
Built for advanced discovery filtering. Routes exist (`/api/discover/...`) but are not fully wired to the main Explore frontend yet — a planned feature.

---

## The Explore Page — Key Engineering

**Infinite scroll:** `IntersectionObserver` on the last card. When it enters viewport → load next page. A guard prevents duplicate calls.

**Scroll restoration:** `movies`, `page`, `filters`, `scrollY` are all persisted to `sessionStorage`. Navigating away and back returns to the exact previous position.

**Curated mode:** Hand-picked 25 films appear first, then the rest sorted by tier + arthouseScore.

**Shuffle mode:** `arthouseScore ≥ 70` films are reserved for the first 50 slots, so quality doesn't get buried in random mode.

**Search debounce:** 500ms delay before firing the search API call, avoiding a request on every keystroke.

---

## The Scoring Pipeline

How raw TMDB data becomes a recommendation:

```
TMDB raw data (synopsis, keywords, genres, ratings)
        ↓
   taggingService     → derivedTags (up to 5 of 15 tags)
        ↓
   moodService        → moods Map (richer mood fingerprint)
        ↓
   arthouseScoring    → arthouseScore (is it arthouse at all?)
        ↓
   baseCanonScoring   → baseCanonScore (how important is it?)
        ↓
   discoveryEngine    → exploreScore (how to surface it today?)
        ↓
   userController     → recommendationScore (personalised for this user)
```

---

## Backend & Express

### Role of the Backend
The frontend (React) runs in the browser and cannot directly touch the database — it asks the backend, which talks to MongoDB and sends data back.

### server.js — The Entry Point
First file that runs when the backend starts:
```js
app.use(cors())                          // allow browser requests
app.use(express.json())                  // parse JSON body
app.use('/api/movies', movieRoutes)      // direct to right department
app.use('/api/auth', authRoutes)
// ... etc
app.listen(5000)
```

### Request Flow
User opens Explore page:
1. Frontend: `axios.get('/api/movies?curated=true&limit=20')`
2. server.js: cors() runs → express.json() runs → handed to movieRoutes
3. movieRoutes: `router.get('/', getMovies)` — matches, calls getMovies
4. getMovies controller: reads query params → queries MongoDB → sends JSON back
5. Response travels back to browser

### Routes vs Controllers
**Routes** — just a map of URL to function, no logic:
```js
router.get('/', getMovies)
router.get('/:id', getMovieById)
router.get('/:id/similar', getSimilarMovies)
```

**Controllers** — actual logic; talk to database, send response:
```js
export const getMovieById = async (req, res) => {
  const movie = await Movie.findById(req.params.id)
  if (!movie) return res.status(404).json({ message: 'Not found' })
  res.json(movie)
}
```

Keeping routes and controllers separate keeps the routes file readable — every endpoint is visible at a glance.

### req and res
Every controller receives two objects:

**req** — everything the client sent:
- `req.params.id` — from URL: `/movies/:id`
- `req.query.genre` — from URL: `?genre=Drama`
- `req.body.email` — from JSON body
- `req.user` — attached by auth middleware after JWT check

**res** — how the server replies:
- `res.json({ movies })` — send data, status 200
- `res.status(404).json({ message: 'Not found' })` — send error
- `res.status(201).json({ user, token })` — created successfully

### Middleware
Code that runs on every request before it reaches the controller.

**Global middleware** (runs on every request):
```js
app.use(cors())           // allow browser to talk to API
app.use(express.json())   // parse incoming JSON
```

**Route-specific middleware** (runs only on certain routes):
```js
router.get('/recommendations', protect, getRecommendations)
```
`protect` runs first; if the JWT is invalid, it returns 401 and stops there — the controller never runs.

### CORS
The frontend is at `arthouse-atlas.vercel.app`, the backend at `onrender.com` — different domains. Browsers block cross-origin requests by default (Same Origin Policy). CORS lets the server say which origins are allowed:
```js
app.use(cors())  // currently allows all origins
```
For production this would be restricted:
```js
app.use(cors({ origin: 'https://arthouse-atlas.vercel.app' }))
```

### The Ping Route
```js
app.get('/api/ping', (req, res) => {
  res.status(200).json({ message: 'Server is awake' })
})
```
Render's free tier shuts the server down after 15 minutes of inactivity, and a cold start costs roughly 30 seconds. The frontend pings this route on app load to wake the server before it's actually needed — no DB query, no auth, just an instant response.

### Route Groups
| Route | What it handles |
|---|---|
| `/api/auth` | Register, login, get profile |
| `/api/movies` | Browse, filter, search, similar, providers |
| `/api/users` | Favorites, watchlist, watched, recommendations |
| `/api/discover` | Mood/decade/explore discovery routes |
| `/api/directors` | Director profiles |
| `/api/movements` | Movement pages |
| `/api/studios` | Studio pages |

---

## Authentication — Deep Dive

### The Problem Auth Solves
HTTP is stateless — every request is brand new, and the server has no memory of prior ones. Every request needs to carry proof of identity, which is what the JWT token provides.

### JWT Structure
Three parts: `header.payload.signature`

- **Header** — token type and algorithm
- **Payload** — the MongoDB user ID baked in: `{ "id": "64a1f2b3c..." }`
- **Signature** — payload encrypted with `JWT_SECRET`. Only the server knows the secret, so the token can't be forged or tampered with.

A fresh token is generated on every login.

### JWT Token Journey
**Step 1 — Login:**
```js
jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' })
```

**Step 2 — Saved in browser:**
```js
localStorage.setItem('token', response.data.token)
```

**Step 3 — Attached to every request automatically:**
```js
// axios interceptor — runs before every API call
const token = localStorage.getItem('token')
config.headers.Authorization = `Bearer ${token}`
```

**Step 4 — Backend verifies:**
```js
const token = req.headers.authorization.split(' ')[1]
const decoded = jwt.verify(token, JWT_SECRET)  // throws if tampered/expired
req.user = await User.findById(decoded.id)
next()
```

After 30 days, `jwt.verify` throws and the request returns 401; a known follow-up is an axios response interceptor that auto-logs-out on 401.

### JWT vs Sessions
Sessions store data on the server (memory or DB) and hand out a session ID — every request requires a server-side lookup. JWT is stateless: identity is encoded in the token itself, verified mathematically with no DB lookup, and scales horizontally without shared session storage.

### bcrypt — Password Security
Passwords are never stored in plain text.

**On register/save** — a pre-save hook runs automatically:
```js
const salt = await bcrypt.genSalt(10)   // salt rounds = 10 (runs 1024 times)
this.password = await bcrypt.hash(this.password, salt)
```

**On login:**
```js
bcrypt.compare(candidatePassword, this.password)  // hashes attempt, compares
```
A hash can't be reversed — the attempt is hashed and compared to the stored hash, like matching a fingerprint rather than reconstructing a finger from one.

### Google OAuth Flow
**Step 1** — User clicks "Sign in with Google" → Google gives the frontend an access token

**Step 2** — Frontend sends it to the backend:
```
POST /api/users/google  { token: "google_access_token" }
```

**Step 3** — Backend verifies with Google:
```js
axios.get('https://www.googleapis.com/oauth2/v3/userinfo',
  { headers: { Authorization: `Bearer ${token}` } }
)
// returns: { name, email, picture }
```

**Step 4** — Find or create user:
```js
let user = await User.findOne({ email })
if (!user) {
  user = await User.create({ username: name, email, password: randomPassword, profileImage: picture })
}
```
A random password is used because the schema requires one — Google users never need it.

**Step 5** — Return the app's own JWT, identical to the email-login flow from this point.

Converting to the app's own JWT immediately means zero special cases anywhere downstream — the rest of the app is agnostic to how the user logged in.

### Protected Routes
```js
// Public — anyone
router.get('/', getMovies)

// Protected — JWT required
router.post('/favorites/:movieId', protect, toggleFavorite)
router.get('/recommendations',     protect, getRecommendations)
```

`protect` middleware sits between route and controller:
```
Request → protect runs
  Token missing? → 401, stops
  Token invalid? → 401, stops
  Token valid?   → req.user attached → next() → controller runs
```

---

## Frontend Overview

### React SPA
Everything lives in one HTML file. React Router fakes navigation — updating the URL and swapping components without page reloads.

Entry point: `main.jsx` → `App.jsx` → sets up routing and global state.

### App.jsx — The Root
**Global state wraps everything:**
```jsx
<AuthProvider>
  <MovieProvider>
    <AppRoutes />
  </MovieProvider>
</AuthProvider>
```

**Routes defined:**
```jsx
<Route path="/"           element={<Home />} />
<Route path="/explore"    element={<Explore />} />
<Route path="/movie/:id"  element={<MovieDetail />} />
<Route path="/profile"    element={<ProtectedRoute><Profile /></ProtectedRoute>} />
```

**ProtectedRoute component:**
```jsx
const ProtectedRoute = ({ children }) => {
  return isAuthenticated ? children : <Navigate to="/login" />
}
```
Visiting `/profile` while logged out redirects automatically to `/login`.

### Pages vs Components
**Pages** — full screens, one per route:
```
Home, Explore, MovieDetail, Directors, DirectorDetail,
Movements, Studios, Recommendations, Profile, Login, Register
```

**Components** — reusable building blocks:
```
Navbar, PosterCard, FilterPanel, MovieCard, TagChip,
StarRating, LoadingSkeleton, HeroFeature, Dropdown
```

---

## Known Limitations

- The auteur lists used in scoring are hardcoded
- Discovery routes (`exploreScore` etc.) are built but not fully wired to the frontend
- No auto-logout on JWT expiry currently
- Tagging is keyword-based and misses semantic matches that use different wording
- Tier counts (how many tier 1/2/3 films exist) would need a live DB query for exact numbers

---

## Numbers Worth Remembering

- **497** films total
- **15** possible derivedTags
- **12** cinematic movements
- **3×, 1.5×, 1×** — favorites, watched, watchlist weights
- **200** candidates fetched for recommendations
- **Top 30** shuffled down to **10** recommendations
- **30 days** JWT expiry
- **5** components in baseCanonScore
- **6** total scoring systems

---

*Last updated: August 2026*
