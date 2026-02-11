# Arthouse Atlas

A production-quality MERN stack web application for discovering arthouse and auteur cinema. Built with taste-based recommendations, automated tagging, and intelligent content-based filtering.

## 🎬 Overview

Arthouse Atlas is a curated movie discovery platform focused on arthouse films. Users can explore, favorite, and receive personalized recommendations based on cinematic style, mood, and themes rather than mere popularity.

**Key Features:**
- 🔐 JWT-based authentication
- 🎥 Curated arthouse film catalog with TMDB metadata
- 🏷️ Automated tagging system using cinematic themes
- 🔍 Advanced search and filtering
- ⭐ Favorites and watchlist management
- 🎯 Content-based recommendation engine
- 🎨 Minimal, cinematic UI design

## 🏗️ Tech Stack

### Backend
- **Node.js** + **Express.js** - REST API server
- **MongoDB** + **Mongoose** - Database and ODM
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Axios** - TMDB API integration

### Frontend
- **React** - UI framework
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Vite** - Build tool

## 📁 Project Structure

```
ArtofCinema/
├── backend/
│   ├── config/           # Database configuration
│   ├── models/           # Mongoose models (User, Movie)
│   ├── controllers/      # Route controllers
│   ├── routes/           # Express routes
│   ├── middleware/       # Auth middleware
│   ├── services/         # Business logic (tagging)
│   ├── scripts/          # Data pipeline scripts
│   └── server.js         # Express server entry point
│
└── frontend/
    ├── src/
    │   ├── components/   # Reusable components
    │   ├── pages/        # Page components
    │   ├── context/      # React context (Auth)
    │   ├── services/     # API service layer
    │   └── App.jsx       # Main app component
    └── tailwind.config.js
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v16+)
- MongoDB (local or MongoDB Atlas)
- TMDB API Key ([Get one here](https://www.themoviedb.org/settings/api))

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables in `.env`:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/arthouse-atlas
   JWT_SECRET=your_secret_key_here
   TMDB_API_KEY=your_tmdb_api_key
   PORT=5000
   ```

5. **Fetch movie data from TMDB:**
   ```bash
   node scripts/fetchFromTMDB.js
   ```
   This creates `scripts/movies-tmdb.json` with 25 curated arthouse films.

6. **Seed the database:**
   ```bash
   npm run seed
   ```
   This applies automated tagging and inserts movies into MongoDB.

7. **Start the server:**
   ```bash
   npm run dev
   ```
   Server runs on http://localhost:5000

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure API URL in `.env`:**
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```
   App runs on http://localhost:5173

## 🏷️ Automated Tagging Pipeline

### Design Philosophy
Movies are automatically tagged with high-level arthouse themes rather than manual curation. This ensures scalability and explainability.

### Fixed Tag Vocabulary (15 tags):
- slow, dreamlike, melancholic, intimate, existential
- minimalist, bleak, poetic, psychological, fragmented
- contemplative, surreal, austere, lyrical, enigmatic

### Algorithm (Rule-based Keyword Matching):

1. **Input**: Combine movie synopsis + TMDB keywords + genres into searchable text
2. **Scoring**: Each tag has a predefined keyword list (e.g., "slow" → ["slow", "meditative", "paced", "quiet"])
3. **Matching**: Count keyword occurrences in the combined text using regex
4. **Selection**: Assign top 3-5 tags by score
5. **Fallback**: If no matches, use genre-based defaults

**Location**: `backend/services/taggingService.js`

### Example Tagging:
- **Stalker** (1979) → `['slow', 'existential', 'philosophical', 'contemplative']`
- **Mulholland Drive** (2001) → `['dreamlike', 'surreal', 'enigmatic', 'psychological']`

**Advantages**:
- ✅ Explainable (trace tag → keywords → source text)
- ✅ Interview-ready (no black-box ML)
- ✅ Deterministic and reproducible
- ✅ Scalable to large datasets

## 🎯 Recommendation Engine

### Algorithm: Content-Based Filtering

The recommendation system analyzes a user's **liked movies** and finds similar films based on metadata overlap.

### Logic Flow:

1. **Aggregate User Taste**:
   - Extract all `derivedTags` from favorited movies
   - Count tag frequency → identifies user's preferred themes
   - Collect favorite directors

2. **Score Candidate Movies**:
   - Filter out already favorited/watchlisted films
   - Score remaining movies by:
     - **Tag overlap**: +1 point per shared tag (weighted by frequency)
     - **Director match**: +3 points (higher weight)

3. **Rank and Return**:
   - Sort by score descending
   - Return top 10 recommendations

### Example:
```
User Favorites:
- Stalker (tags: slow, existential, contemplative)
- Paris, Texas (tags: slow, melancholic, intimate)

Top User Tags: slow, existential, melancholic

Recommendations:
- Tokyo Story (tags: slow, contemplative, intimate) → High score
- The Mirror (tags: slow, poetic, dreamlike) → Medium score
```

**Location**: `backend/controllers/userController.js → getRecommendations()`

**Advantages**:
- ✅ Transparent scoring (explainable to users)
- ✅ No cold-start problem (works with 1+ favorites)
- ✅ Interview-friendly (walkable logic)

## 📡 API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Movies
- `GET /api/movies` - Get movies (query params: search, director, year, tags, limit, page)
- `GET /api/movies/:id` - Get movie by ID
- `GET /api/movies/directors/list` - Get all directors
- `GET /api/movies/tags/list` - Get all tags

### User Actions (Protected)
- `POST /api/users/favorites/:movieId` - Add to favorites
- `DELETE /api/users/favorites/:movieId` - Remove from favorites
- `POST /api/users/watchlist/:movieId` - Add to watchlist
- `DELETE /api/users/watchlist/:movieId` - Remove from watchlist
- `GET /api/users/recommendations` - Get personalized recommendations

## 🎨 UI Pages

1. **Home** - Hero section + recently added films
2. **Explore** - Search bar + filters (director, year, tags)
3. **Movie Detail** - Poster, synopsis, metadata, tags, actions
4. **Profile** - User's favorites and watchlist
5. **Recommendations** - Personalized suggestions
6. **Login / Register** - Authentication pages

## 🔐 Authentication Flow

1. User registers/logs in
2. Backend returns JWT token
3. Frontend stores token in `localStorage`
4. Token sent in `Authorization: Bearer <token>` header for protected routes
5. Backend verifies token via middleware

## 📊 Database Models

### User
```javascript
{
  username: String,
  email: String,
  password: String (hashed with bcrypt),
  favorites: [ObjectId] → Movie,
  watchlist: [ObjectId] → Movie
}
```

### Movie
```javascript
{
  title: String,
  year: Number,
  synopsis: String,
  directors: [String],
  runtime: Number,
  country: String,
  posterUrl: String,
  genres: [String],
  keywords: [String],
  derivedTags: [String], // Auto-generated
  tmdbId: Number
}
```

## 🧪 Testing the Application

### Manual Testing Flow:

1. **Start MongoDB** (if local)
2. **Run backend** (`npm run dev` in `/backend`)
3. **Run frontend** (`npm run dev` in `/frontend`)
4. **Register** a new account
5. **Explore** films and add some to favorites
6. **View Recommendations** - should show films with similar tags
7. **Search** by director, year, or tags
8. **View Movie Detail** - test favorites/watchlist buttons

## 🎯 Resume Highlights

This project demonstrates:
- ✅ **Full-stack architecture** (MERN)
- ✅ **RESTful API design**
- ✅ **Authentication & authorization**
- ✅ **Data pipeline engineering** (fetch → process → seed)
- ✅ **Algorithmic recommendation system**
- ✅ **Responsive UI with modern CSS**
- ✅ **Interview-ready explainability** (no opaque ML)

## 🚫 What This Is NOT

- ❌ **Not a streaming platform** (no video playback)
- ❌ **Not a social network** (no comments/reviews)
- ❌ **Not a data viz tool** (no graphs/charts)
- ❌ **Not using scraped data** (TMDB API only)

## 🔧 Development Notes

- **TMDB Rate Limit**: Script includes 250ms delay between requests
- **Seed Script**: Clears existing movies before inserting (toggle via code comment)
- **Tag Vocabulary**: If expanding, update `ARTHOUSE_TAGS` and `TAG_KEYWORDS` in `taggingService.js`

## 📝 License

MIT

## 👤 Author

Created as a portfolio project demonstrating production-quality MERN stack development.
