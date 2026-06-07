# Arthouse Atlas — Quick Revision (Read Before Interview)

---

## The One-Line Pitch
> "A full-stack MERN film discovery platform for 497 curated arthouse films, with a recommendation engine that learns your taste from your favorites, watchlist, and watched history."

---

## Stack (say this in 10 seconds)
**React + Vite → Express API → MongoDB**
Deployed: Vercel (frontend) + Render (backend)
Auth: JWT + Google OAuth

---

## 5 Numbers to Remember
- **497** films
- **15** derivedTags
- **12** cinematic movements
- **Top 30** shuffled → **10** returned (recommendations)
- **30 days** JWT expiry

---

## 3 Interaction Weights
| Action | Weight |
|---|---|
| Favorite | 3× |
| Watched | 1.5× |
| Watchlist | 1× |

---

## 6 Scores — One Line Each
| Score | What it answers |
|---|---|
| arthouseScore | Is it arthouse at all? |
| baseCanonScore | How canonical/important historically? |
| recommendationScore | Matches THIS user's taste? |
| similarityScore | Similar to THIS specific film? |
| exploreScore | How to rank it on Explore today? |
| moodScore | Fits current mood/decade filter? |

**Stored permanently:** arthouseScore, baseCanonScore (calculated once at seed time)
**Calculated live:** everything else (changes per user/context)

---

## Recommendation Engine — Say This
> "Build a taste profile from interactions (favorites 3×, watched 1.5×, watchlist 1×) across 4 dimensions: tags, directors, movements, decade. Score 200 unseen films against that profile. Movements get highest weight — most reliable signal in arthouse cinema. Shuffle top 30, return 10 so results feel fresh."

---

## baseCanonScore Formula (just know the components)
1. Critical consensus — 35% (TMDB rating, adjusted for vote count reliability)
2. Historical importance — 25% (tier + age + festival wins)
3. Auteur importance — 20% (master auteurs = 100, established = 75, unknown = 50)
4. Formal innovation — 10% (experimental tags + pre-1940 bonus)
5. Cultural influence — 10% (vote count + tier + lasting appeal)

---

## arthouseScore — Key Logic
- Low popularity → high score (arthouse is niche)
- France/Italy/Japan/Iran/Korea → +15 country bonus
- USA → -10 penalty (unless rating > 7.8)
- Action/Sci-Fi genres → penalised (unless classic or auteur)
- Rating > 8.2 → score never drops below 85 (masterpiece floor)

---

## JWT Auth — 3 Steps
1. Login → server creates token with your user ID inside → sent to frontend
2. Frontend saves in localStorage → axios interceptor adds it to every request
3. Backend middleware verifies it → knows who you are

**Google OAuth:** Google token → backend verifies with Google → finds/creates user → returns your own JWT

---

## derivedTags — Key Points
- 15 fixed tags (slow, dreamlike, surreal, bleak, contemplative etc.)
- Assigned by keyword matching against synopsis + keywords + genres
- Calculated once at seed time, stored permanently
- Tags are FIXED on films — what's personalised is how much YOU like each tag

---

## Movements — Key Points
- 12 movements (French New Wave, Italian Neorealism, Slow Cinema etc.)
- Assigned MANUALLY — required real film knowledge
- Get highest weight (×2.0) in recommendations — strongest taste signal
- Added later as a feature, not present from the start

---

## Optimistic UI (important concept)
MovieContext updates local state IMMEDIATELY, then fires API call.
Result: UI feels instant. If API fails, state was already updated (acceptable tradeoff for UX).
Double-click prevention: `pendingToggles` ref blocks duplicate in-flight requests.

---

## Explore Page — 3 Things to Know
1. **Infinite scroll** — IntersectionObserver on last card triggers next page load
2. **Scroll restoration** — sessionStorage saves position + filters so back button works
3. **Shuffle quality floor** — arthouseScore ≥ 70 films reserved for first 50 slots in shuffle mode

---

## Backend & Express — Quick Points

**What is Express?** Framework that lets you define what happens when requests come in. Routes direct to controllers. Controllers do the work.

**Request journey:** Frontend axios call → server.js middleware → routes file → controller → MongoDB → response back

**Routes** = map of URL → function. No logic.
**Controllers** = actual logic. Talk to DB, send response.

**req** = what client sent (params, query, body, user)
**res** = how you reply (res.json, res.status)

**Middleware** = code that runs before controller. Global (cors, json parser) or route-specific (protect).

**CORS** = server telling browser "I allow requests from this frontend." Currently open to all origins — know how to restrict it.

**Ping route** = wakes Render server before user needs it. No DB, instant response. Shows deployment awareness.

---

## Auth — Quick Points

**JWT** = wristband. Server creates it on login with your user ID inside. Signed with a secret — can't be faked. Expires 30 days.

**Journey:** Login → token saved in localStorage → axios interceptor attaches it to every request → backend middleware verifies it → req.user set

**Why JWT over sessions?** Stateless — server stores nothing. No DB lookup on every request. Scales easily.

**bcrypt** = passwords hashed before storing. Can't be reversed. On login: hash the attempt, compare to stored hash.

**Google OAuth** = Google verifies identity → backend gets name/email → finds/creates user → returns YOUR own JWT. Same flow after that.

**Protected routes** = `protect` middleware sits before controller. Invalid token → 401, stops. Valid → req.user attached → controller runs.

**Current limitation** = no auto-logout on JWT expiry. Fix: axios response interceptor for 401s.

---

## Frontend — Quick Points

**SPA** = one HTML file. React Router fakes navigation — swaps components, no page reload.

**App.jsx** = root file. Wraps everything in AuthProvider + MovieProvider. Defines all routes. ProtectedRoute redirects to login if not authenticated.

**Pages** = full screens (Home, Explore, MovieDetail, Directors, Movements etc.)
**Components** = reusable building blocks (Navbar, PosterCard, FilterPanel etc.)

---

## Honest Limitations (say these confidently)
- No auto-logout when JWT expires (would add axios response interceptor)
- Tagging is keyword-based — misses semantic matches
- Discovery routes (moodScore/decadeScore) built but not fully wired to frontend
- Auteur lists are hardcoded

---

## If They Ask "Why did you use X?"
- **MongoDB:** Film metadata is irregular (varied directors, genres, wins) — flexible schema fits better than rigid SQL tables
- **JWT:** Stateless — server doesn't store sessions, scales easily
- **Movements ×2.0:** Strongest taste signal in arthouse cinema specifically
- **Top 30 → shuffle → 10:** Direct top 10 gives same list every visit — shuffle adds freshness
- **Favorites 3×:** Liking something is a stronger taste signal than just watching or saving it

---

*Full details → INTERVIEW_PREP.md*
