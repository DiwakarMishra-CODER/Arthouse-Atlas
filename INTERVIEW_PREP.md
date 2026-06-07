# Arthouse Atlas — Interview Revision Guide

Everything you need to explain this project confidently. Read this before any interview.

---

## What is Arthouse Atlas?

A full-stack MERN web application — a curated discovery platform for ~497 arthouse films, with a taste-learning recommendation engine and user authentication.

**Live site:** arthouse-atlas.vercel.app

**One-line pitch:**
> "Arthouse Atlas is a film discovery platform for world cinema. It curates 497 arthouse films and organises them by director, movement, and studio. The personalisation layer — a recommendation engine — learns your taste from your favorites, watchlist, and watched history and suggests films you haven't seen."

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

### What is an SPA?
The browser downloads everything once. React Router fakes navigation — updates the URL and swaps components without ever reloading the page. That's why clicking between pages feels instant.

### What is axios?
A library for making HTTP requests. Cleaner than raw `fetch`. The main reason you used it: **interceptors** — code that runs automatically before every request. Your interceptor reads the JWT from localStorage and attaches it to every API call so you never have to do it manually.

### What is JSON?
A universal text format. Your React app and Express server run on different computers — they can't share memory or call each other's functions. The only way they can talk is by sending text over HTTP. JSON is the agreed format for that text.

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

Uses **optimistic UI** — updates local state immediately before the API call resolves. Feels instant to the user.

Uses a `pendingToggles` ref (a Set) to prevent duplicate API calls if user double-clicks.

Syncs to localStorage so state survives page refresh.

---

## Authentication

### JWT Flow (Email/Password)

1. User registers/logs in → backend verifies credentials
2. Backend creates a JWT: `jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' })`
3. Token sent to frontend → stored in `localStorage`
4. Every API request: axios interceptor reads token → adds `Authorization: Bearer <token>` header
5. `authMiddleware.js` on backend: verifies token → extracts user ID → attaches `req.user`

**JWT contains:** your MongoDB user ID, signed with a secret only the server knows. Nobody can fake it.
**Expires:** after 30 days. After that, token is invalid and requests return 401.
**Current limitation:** app doesn't auto-logout on 401. A production fix would be an axios response interceptor that clears token and redirects to login on any 401 response.

### Google OAuth Flow

1. User clicks "Sign in with Google" → Google gives an access token
2. Frontend sends that access token to `POST /api/users/google`
3. Backend calls `https://www.googleapis.com/oauth2/v3/userinfo` to verify it and get name/email/picture
4. Backend finds or creates the user in MongoDB
5. Backend returns your own JWT — same flow as email login from this point

**Why your own JWT at the end?** So your entire auth system stays consistent. Whether you logged in with email or Google, the rest of the app always uses your JWT. No special cases.

### Password Security
Passwords are never stored in plain text. Before saving, bcrypt hashes the password with salt rounds=10. On login, `bcrypt.compare()` checks the candidate password against the stored hash.

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

**Why MongoDB not SQL?**
Film data is irregular — some films have 1 director, some have 3. Some have festival wins, some don't. MongoDB's flexible documents handle this naturally. SQL would need many nullable columns or join tables.

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

**Important:** Tags are fixed on the film. What's personalised is how much weight each tag carries in YOUR taste profile.

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

**How assigned:** Manually when seeding. Required real film knowledge — not algorithm-generated.
**Why highest weight in recommendations:** In arthouse cinema, liking one French New Wave film strongly predicts liking others. More reliable signal than genres or tags.

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
- Popularity (25 pts) — low popularity = arthouse indicator; classics get legacy bonus instead
- Vote pattern (20 pts) — high rating + small audience = arthouse sweet spot
- Genre (20 pts) — Drama/Documentary adds; Action/Sci-Fi subtracts (classics and auteurs immune)
- Tags (20 pts) — contemplative/existential/slow/austere = +5 each
- Country (15 pts) — France/Italy/Japan/Iran/Korea = +15; USA = -10 unless rating > 7.8
- Auteur bonus (+15) — flat bonus if director is on the auteur list

**Masterpiece floor:** rating > 8.2 → score never drops below 85

**Interview answer:**
> "I needed to filter out mainstream films. arthouseScore looks at six signals — popularity, rating pattern, genres, mood tags, country of origin, and director reputation. Low popularity scores higher because arthouse films are niche by nature. French, Italian, Japanese, Iranian cinema gets a bonus. Mainstream genres get penalised — unless it's a classic or auteur film."

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

**Interview answer:**
> "baseCanonScore answers how canonical a film is — not just whether it's good, but whether it matters historically. Five components: critical consensus, historical importance based on age and tier and festival wins, director auteur status, formal innovation, and cultural influence. Calculated once at seed time and stored permanently — a film's place in history doesn't change."

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

**Why shuffle top 30 not just return top 10?**
Returning top 10 directly gives the same list every visit. Shuffling top 30 gives taste-matched but varied results — feels alive.

**Why no caching?**
If user just favorited something, next visit must reflect that. Cache-Control: no-store.

**Interview answer:**
> "I build a taste profile from the user's interactions — favorites weighted 3×, watched 1.5×, watchlist 1×. That profile captures tags, directors, movements, and decade preferences. I score 200 unseen films against that profile. Movements get the highest weight because they're the most reliable taste signal in arthouse cinema. Top 30 matches get shuffled, 10 returned — so results feel fresh every visit."

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

**Interview answer:**
> "For similar films I find all films sharing any attribute with the current film — director, movement, tags, genres — then rank by how much overlap there is. Director match scores highest because it's the strongest similarity signal."

---

### 5. exploreScore
**Question:** How should this film rank on the Explore page today?

```
0.60 × baseCanonScore
0.20 × RecencyBoost      (post-2015 films score higher)
0.10 × RarityBoost       (less-shown films surface more)
0.10 × RotationNoise     (small daily random variation)
```

Also increments `showCount` on every film returned — so rarity tracking stays accurate over time.

---

### 6. moodScore / decadeScore / combinedScore
Built for advanced discovery filtering. Routes exist (`/api/discover/...`) but not fully wired to the main Explore frontend yet — planned feature.

---

## The Explore Page — Key Engineering

**Infinite scroll:** `IntersectionObserver` on the last card. When it enters viewport → load next page. Guard prevents duplicate calls.

**Scroll restoration:** `movies`, `page`, `filters`, `scrollY` all persisted to `sessionStorage`. Navigate away and back → land exactly where you left off.

**Curated mode:** Hand-picked 25 films appear first, then rest sorted by tier + arthouseScore.

**Shuffle mode:** `arthouseScore ≥ 70` films reserved for first 50 slots. Quality doesn't get buried in random mode.

**Search debounce:** 500ms delay before firing search API call — avoids a request on every keystroke.

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

### What is a Backend?
The frontend (React) runs in the browser. The backend (Node.js + Express) runs on a server. The frontend can't directly touch the database — it asks the backend. The backend talks to MongoDB and sends data back.

### What is Express?
A framework that lets you define what happens when different requests come in:
```js
app.get('/api/movies', getMovies)
app.post('/api/auth/login', loginUser)
```
Without Express you'd manually parse every URL, method, and body. Express handles that boilerplate.

### server.js — The Entry Point
First file that runs when backend starts. Acts as a reception desk:
```js
app.use(cors())                          // allow browser requests
app.use(express.json())                  // parse JSON body
app.use('/api/movies', movieRoutes)      // direct to right department
app.use('/api/auth', authRoutes)
// ... etc
app.listen(5000)
```

### How a Request Travels
User opens Explore page:
1. Frontend: `axios.get('/api/movies?curated=true&limit=20')`
2. server.js: cors() runs → express.json() runs → handed to movieRoutes
3. movieRoutes: `router.get('/', getMovies)` — matches, calls getMovies
4. getMovies controller: reads query params → queries MongoDB → sends JSON back
5. Response travels back to browser

### Routes vs Controllers
**Routes** — just a map. URL + which function. No logic:
```js
router.get('/', getMovies)
router.get('/:id', getMovieById)
router.get('/:id/similar', getSimilarMovies)
```

**Controllers** — actual logic. Talk to database, send response:
```js
export const getMovieById = async (req, res) => {
  const movie = await Movie.findById(req.params.id)
  if (!movie) return res.status(404).json({ message: 'Not found' })
  res.json(movie)
}
```

**Why separate?** Routes file stays clean — one glance tells you every endpoint.

### req and res
Every controller receives two objects:

**req** — everything the client sent:
- `req.params.id` — from URL: `/movies/:id`
- `req.query.genre` — from URL: `?genre=Drama`
- `req.body.email` — from JSON body
- `req.user` — attached by auth middleware after JWT check

**res** — how you reply:
- `res.json({ movies })` — send data, status 200
- `res.status(404).json({ message: 'Not found' })` — send error
- `res.status(201).json({ user, token })` — created successfully

### Middleware
Code that runs on every request BEFORE it reaches the controller. Like a security checkpoint.

**Global middleware** (runs on every request):
```js
app.use(cors())           // allow browser to talk to API
app.use(express.json())   // parse incoming JSON
```

**Route-specific middleware** (runs only on certain routes):
```js
router.get('/recommendations', protect, getRecommendations)
```
`protect` runs first → if JWT invalid → 401, stops here → controller never runs.

### CORS
Your frontend is at `arthouse-atlas.vercel.app`. Your backend is at `onrender.com`. Different domains.

By default browsers block requests between different origins (Same Origin Policy) — a security rule to prevent malicious sites from making requests on your behalf.

CORS lets the server say "I allow requests from this frontend":
```js
app.use(cors())  // currently allows all origins
```

For production you'd restrict it:
```js
app.use(cors({ origin: 'https://arthouse-atlas.vercel.app' }))
```
**Interview point:** Current implementation is open — you know how to tighten it.

### The Ping Route
```js
app.get('/api/ping', (req, res) => {
  res.status(200).json({ message: 'Server is awake' })
})
```
Render's free tier shuts server down after 15 minutes of inactivity. Cold start = ~30 seconds of bad UX. Frontend pings this on app load to wake the server before the user needs it. No DB query, no auth — instant response.

**Interview point:** Shows you understand real deployment constraints.

### Your 7 Route Groups
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
HTTP is stateless — every request is brand new, server has no memory. So every request needs to carry proof of identity. That proof is the JWT token.

### What is a JWT?
Three parts: `header.payload.signature`

- **Header** — token type and algorithm
- **Payload** — your MongoDB user ID baked in: `{ "id": "64a1f2b3c..." }`
- **Signature** — payload encrypted with JWT_SECRET. Only your server knows the secret. Nobody can fake or tamper with it.

Changes every login — generated fresh each time.

### JWT Token Journey
**Step 1 — Login:**
```js
jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' })
```
Token created with user ID inside. Expires in 30 days.

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

**After 30 days:** `jwt.verify` throws → returns 401 → currently fails silently. Fix: axios response interceptor to auto-logout on 401.

### Why JWT over Sessions?
Sessions store data on the server (in memory or DB) and give you a session ID. Every request: server looks up that session ID.

JWT is stateless — server stores nothing. Identity is encoded in the token itself. Verifies mathematically — no DB lookup. Scales horizontally without shared session storage.

### bcrypt — Password Security
Passwords are NEVER stored in plain text.

**On register/save** — pre-save hook runs automatically:
```js
const salt = await bcrypt.genSalt(10)   // salt rounds = 10 (runs 1024 times)
this.password = await bcrypt.hash(this.password, salt)
```
Original password is gone. Only the hash is stored.

**On login:**
```js
bcrypt.compare(candidatePassword, this.password)  // hashes attempt, compares
```
You can never reverse a hash. You hash the attempt and see if it matches.

**Analogy:** Like a fingerprint. Can't reconstruct the finger from the print. But you can press the finger again and check if it matches.

### Google OAuth Flow
**Step 1** — User clicks "Sign in with Google" → Google gives frontend an access token

**Step 2** — Frontend sends it to backend:
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
Random password because schema requires it — Google users never use it.

**Step 5** — Return your own JWT. Same as email login from this point.

**Why convert to your own JWT?** Entire app is built around JWT. Converting immediately means zero special cases anywhere else — clean and consistent.

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

### What is a React SPA?
Everything lives in one HTML file. React Router fakes navigation — updates URL and swaps components without page reloads. That's why navigation feels instant.

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
Not logged in + try to visit `/profile` → redirected to `/login` automatically.

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

## Common Interview Questions — Ready Answers

**"Walk me through your architecture."**
> "MERN stack — React SPA on the frontend talking to an Express REST API, MongoDB for persistence, JWT for auth. Two global React contexts manage auth state and movie interaction state across the app. Frontend deployed on Vercel, backend on Render."

**"How does your recommendation engine work?"**
> "I build a taste profile from the user's interactions — favorites weighted highest. That profile captures four dimensions: mood tags, directors, movements, and decades. I score 200 unseen canonical films against that profile. Movements get the highest weight because they're the most reliable taste signal in arthouse cinema. Top 30 matches get shuffled, 10 returned so results feel fresh."

**"Why JWT over sessions?"**
> "JWT is stateless — the server doesn't need to store or look up session data. The user's identity is encoded in the token itself. Scales horizontally without sticky sessions. 30-day expiry is baked into the token."

**"Why MongoDB not SQL?"**
> "Film metadata is irregular. Some films have one director, some have three. Some have festival wins, some don't. MongoDB's flexible documents handle this naturally without nullable columns or complex joins."

**"How did you handle optimistic UI?"**
> "MovieContext updates local state immediately before the API call resolves — so the heart icon toggles instantly. A useRef Set called pendingToggles blocks duplicate in-flight requests if the user double-clicks."

**"What's the hardest bug you fixed?"**
> "The infinite scroll loop. The hasMore flag was being set incorrectly — it needed to check both page < totalPages AND movies.length > 0 together. Checking only one condition caused the observer to keep firing even when there was nothing left to load."

**"What is CORS and why did you need it?"**
> "My frontend and backend run on different domains — Vercel and Render. Browsers block cross-origin requests by default for security. CORS lets the server explicitly say which origins are allowed. I used the cors() middleware in Express. Currently it's open to all origins — in production I'd restrict it to just my frontend domain."

**"How does Google OAuth work in your app?"**
> "User clicks Sign in with Google, Google gives an access token. My backend sends that token to Google's userinfo endpoint to verify it's real and get the user's name and email. Then I find or create that user in MongoDB and return my own JWT — same as email login from that point. Everything downstream uses my JWT, so there are no special cases for Google users."

**"How are passwords stored?"**
> "With bcrypt. Before saving a user, a pre-save hook automatically hashes the password with salt rounds of 10. The original password is never stored anywhere. On login, bcrypt hashes the attempt and compares it to the stored hash."

**"What would you improve?"**
> "A few things: auto-logout on JWT expiry (axios response interceptor for 401s), the discovery routes (moodScore, decadeScore) aren't wired to the frontend yet — that's a planned feature. The tagging algorithm is purely keyword-based so it misses thematic matches that use different words — a semantic model would improve it."

---

## Things to Be Honest About in Interviews

- AI (Antigravity) helped build this — but you directed the decisions
- The auteur lists in scoring are hardcoded — a limitation
- Discovery routes (exploreScore etc.) are built but not fully wired to frontend
- No auto-logout on JWT expiry currently
- Tagging is keyword-based — misses semantic matches
- Tier counts (how many tier 1/2/3 films) would need a live DB query to give exact numbers

Being honest about limitations shows maturity. Interviewers respect it.

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

*Last updated: June 2026*
