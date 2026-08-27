# Arthouse Atlas — Project Summary

---

## Overview
> A full-stack MERN film discovery platform for 497 curated arthouse films, with a recommendation engine that learns user taste from favorites, watchlist, and watched history.

---

## Stack
**React + Vite → Express API → MongoDB**
Deployed: Vercel (frontend) + Render (backend)
Auth: JWT + Google OAuth

---

## 5 Key Numbers
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
| recommendationScore | Matches this user's taste? |
| similarityScore | Similar to this specific film? |
| exploreScore | How to rank it on Explore today? |
| moodScore | Fits current mood/decade filter? |

**Stored permanently:** arthouseScore, baseCanonScore (calculated once at seed time)
**Calculated live:** everything else (changes per user/context)

---

## Recommendation Engine — Summary
A taste profile is built from interactions (favorites 3×, watched 1.5×, watchlist 1×) across 4 dimensions: tags, directors, movements, decade. 200 unseen films are scored against that profile. Movements get the highest weight — the most reliable signal in arthouse cinema. Top 30 matches are shuffled, 10 returned, so results feel fresh.

---

## baseCanonScore Formula
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
1. Login → server creates token with user ID inside → sent to frontend
2. Frontend saves in localStorage → axios interceptor adds it to every request
3. Backend middleware verifies it → identifies the user

**Google OAuth:** Google token → backend verifies with Google → finds/creates user → returns the app's own JWT

---

## Security & Configuration
Secrets (database URI, JWT signing key, API keys) live only in environment variables — `.env` locally (gitignored), platform environment settings in production (Render for backend, Vercel for frontend). Credentials are rotated periodically as standard practice; rotation only requires updating the value in the hosting provider's dashboard, since the app reads config at runtime rather than hardcoding it.

---

## derivedTags — Key Points
- 15 fixed tags (slow, dreamlike, surreal, bleak, contemplative etc.)
- Assigned by keyword matching against synopsis + keywords + genres
- Calculated once at seed time, stored permanently
- Tags are fixed on films — what's personalised is how much a given user favors each tag

---

## Movements — Key Points
- 12 movements (French New Wave, Italian Neorealism, Slow Cinema etc.)
- Assigned manually — required real film knowledge
- Get highest weight (×2.0) in recommendations — strongest taste signal
- Added later as a feature, not present from the start

---

## Optimistic UI
MovieContext updates local state immediately, then fires the API call, so the UI feels instant. Double-click prevention uses a `pendingToggles` ref to block duplicate in-flight requests.

---

## Explore Page — 3 Things to Know
1. **Infinite scroll** — IntersectionObserver on last card triggers next page load
2. **Scroll restoration** — sessionStorage saves position + filters so back navigation works
3. **Shuffle quality floor** — arthouseScore ≥ 70 films reserved for first 50 slots in shuffle mode

---

## Backend & Express — Quick Points

**Express** — framework that defines what happens when requests come in. Routes direct to controllers; controllers do the work.

**Request journey:** Frontend axios call → server.js middleware → routes file → controller → MongoDB → response back

**Routes** = map of URL → function, no logic.
**Controllers** = actual logic; talk to DB, send response.

**req** = what the client sent (params, query, body, user)
**res** = how the server replies (res.json, res.status)

**Middleware** = code that runs before the controller. Global (cors, json parser) or route-specific (protect).

**CORS** = server telling the browser which origins it allows requests from. Currently open to all origins.

**Ping route** = wakes the Render server before it's needed. No DB, instant response.

---

## Auth — Quick Points

**JWT** = signed token created on login with the user ID inside. Can't be forged. Expires after 30 days.

**Journey:** Login → token saved in localStorage → axios interceptor attaches it to every request → backend middleware verifies it → req.user set

**Why JWT over sessions:** stateless — server stores nothing, no DB lookup on every request, scales easily.

**bcrypt** = passwords hashed before storing, never reversible. On login: hash the attempt, compare to the stored hash.

**Google OAuth** = Google verifies identity → backend gets name/email → finds/creates user → returns the app's own JWT. Same flow after that.

**Protected routes** = `protect` middleware sits before the controller. Invalid token → 401, stops. Valid → req.user attached → controller runs.

**Current limitation** = no auto-logout on JWT expiry. Planned fix: axios response interceptor for 401s.

---

## Frontend — Quick Points

**SPA** = one HTML file. React Router fakes navigation — swaps components, no page reload.

**App.jsx** = root file. Wraps everything in AuthProvider + MovieProvider. Defines all routes. ProtectedRoute redirects to login if not authenticated.

**Pages** = full screens (Home, Explore, MovieDetail, Directors, Movements etc.)
**Components** = reusable building blocks (Navbar, PosterCard, FilterPanel etc.)

---

## Known Limitations
- No auto-logout when JWT expires (planned fix: axios response interceptor)
- Tagging is keyword-based — misses semantic matches
- Discovery routes (moodScore/decadeScore) built but not fully wired to frontend
- Auteur lists are hardcoded

---

## Design Rationale
- **MongoDB:** Film metadata is irregular (varied directors, genres, wins) — flexible schema fits better than rigid SQL tables
- **JWT:** Stateless — server doesn't store sessions, scales easily
- **Movements ×2.0:** Strongest taste signal in arthouse cinema specifically
- **Top 30 → shuffle → 10:** Direct top 10 gives the same list every visit — shuffle adds freshness
- **Favorites 3×:** Liking something is a stronger taste signal than just watching or saving it

---

*Full details → TECHNICAL_OVERVIEW.md*
