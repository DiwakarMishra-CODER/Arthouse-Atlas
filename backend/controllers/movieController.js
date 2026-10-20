import Movie from '../models/Movie.js';
import { getErrorResponse } from '../utils/errorResponse.js';
import { getIndex, rankCandidates, inRankedOrder, CARD_FIELDS, REASONS } from '../services/recommender.js';
import { pickTonight, MARATHON } from '../services/tonight.js';
import { loadCatalogue, applyFilters, sortCards, facetCounts, publicCard, searchScore, nameMatches, MOODS, LENGTHS, SORTS } from '../services/catalogue.js';
import { normalizeName } from '../services/nameUtils.js';

const shuffleArray = (array) => {
  const shuffled = [...array]; // Create a copy to avoid mutating original
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Helper to safely escape regex characters for user input
const escapeRegex = (text) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

// @desc    Get all movies with optional filters
// @route   GET /api/movies
// @access  Public
export const getMovies = async (req, res) => {
  try {
    const { search, director, year, tags, genre, decade, titles, limit = 100, page = 1, random } = req.query;
    
    let query = {};

    // Fetch specific movies by exact titles (comma-separated)
    if (titles) {
      const titlesArray = titles.split(',').map(t => t.trim());
      query.title = { $in: titlesArray };
    }

    // Text search (Restricted to Title for precision)
    if (search) {
      const escapedSearch = escapeRegex(search);
      query.title = { $regex: escapedSearch, $options: 'i' };
    }

    // Director filter
    if (director) {
      query.directors = { $regex: director, $options: 'i' };
    }

    // Year filter
    if (year) {
      query.year = parseInt(year);
    }

    // Decade filter
    if (decade) {
      query.decade = parseInt(decade);
    }

    // Genre filter
    if (genre) {
      query.genres = { $in: [genre] };
    }

    // Tags filter
    if (tags) {
      const tagsArray = tags.split(',').map(tag => tag.trim());
      query.derivedTags = { $in: tagsArray };
    }

    // Hybrid Shuffle: Top 50 reserved for highly-rated, rest randomized
    if (random === 'true') {
      // Fetch all matching movies
      const allMovies = await Movie.find(query).lean();

      // Split by arthouse score
      const highTier = allMovies.filter(m => m.arthouseScore >= 70);
      const lowTier = allMovies.filter(m => m.arthouseScore < 70);

      // Shuffle both groups
      const shuffledHighTier = shuffleArray(highTier);
      const shuffledLowTier = shuffleArray(lowTier);

      // Reserve top 50 for highly-rated
      const top50 = shuffledHighTier.slice(0, 50);
      const highTierRejects = shuffledHighTier.slice(50);

      // Mix remaining high-tier with low-tier
      const rest = shuffleArray([...highTierRejects, ...shuffledLowTier]);

      // Final sorted array
      const finalSorted = [...top50, ...rest];

      return res.json({
        movies: finalSorted,
        total: finalSorted.length,
        page: 1,
        pages: 1
      });
    }

    // Default Curated Sort (Top 25)
    if (req.query.curated === 'true') {
      const CURATED_TITLES = [
        'Mulholland Drive',
        'The Tree of Life',
        'Persona',
        'Portrait of a Lady on Fire',
        'Mirror',
        '2001: A Space Odyssey',
        'In the Mood for Love',
        'Jeanne Dielman, 23, quai du Commerce, 1080 Bruxelles',
        'Yi Yi',
        'Tokyo Story',
        'The 400 Blows',
        'La Dolce Vita',
        'Andrei Rublev',
        'The Spirit of the Beehive',
        'Close-Up',
        'A Separation',
        'The Seventh Seal',
        'L\'Avventura',
        'Paris, Texas',
        'Three Colors: Blue',
        'Uncle Boonmee Who Can Recall His Past Lives',
        'Beau Travail',
        'Satantango',
        'Moonlight',
        'A Brighter Summer Day'
      ];

      // 1. Fetch the curated movies
      const curatedDocs = await Movie.find({ title: { $in: CURATED_TITLES } }).lean();

      // 2. Map them to the specific order
      const curatedMap = new Map(curatedDocs.map(m => [m.title, m]));
      const curatedOrdered = CURATED_TITLES.map(title => curatedMap.get(title)).filter(Boolean);

      // 3. Fetch the REST of the movies (excluding curated ones)
      // Note: We ignore pagination for the "rest" part to keep it simple, 
      // or we can implement it. For now, let's return all like random does, 
      // or just enough to fill the page. 
      // User asked for "appear on top", implying the rest follow.
      
      const curatedIds = curatedOrdered.map(m => m._id);
      
      // If applying other filters (genre/director), we should probably skip this logic?
      // The plan said "Ensure filtered searches override this".
      // We are inside "if (curated === 'true')", so we assume caller handles that.
      
      const restQuery = { ...query, _id: { $nin: curatedIds } };
      const restMovies = await Movie.find(restQuery)
        .sort({ tier: 1, arthouseScore: -1, year: -1 })
        .lean();

      const finalSorted = [...curatedOrdered, ...restMovies];

      // Handle pagination manually since we constructed the array
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const paginated = finalSorted.slice(skip, skip + parseInt(limit));

      return res.json({
        movies: paginated,
        total: finalSorted.length,
        page: parseInt(page),
        pages: Math.ceil(finalSorted.length / parseInt(limit))
      });
    }

    // Standard pagination and sorting
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Intelligent sorting: Tier (1→2→3), then ArthouseScore (high→low), then Year (new→old)
    const movies = await Movie.find(query)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ tier: 1, arthouseScore: -1, year: -1 });

    const total = await Movie.countDocuments(query);

    res.json({
      movies,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    });
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// Where the canon places a film: its all-time standing and its standing among films of its decade.
// Pages lead with whichever says more — all-time inside the top 100, otherwise its decade — and
// show the films ranked either side of it there.
const canonFor = async (movie, { withCompany = true } = {}) => {
  if (!movie.canonRank) return { canon: null, company: [] };
  const decade = Math.floor(movie.year / 10) * 10;
  const inDecade = { year: { $gte: decade, $lt: decade + 10 }, canonDecadeRank: { $ne: null } };
  const [of, decadeOf] = await Promise.all([
    Movie.countDocuments({ canonRank: { $ne: null } }),
    Movie.countDocuments(inDecade)
  ]);
  const lead = movie.canonRank <= 100 ? 'atlas' : 'decade';
  const canon = { rank: movie.canonRank, of, decadeRank: movie.canonDecadeRank, decadeOf, decade, lead };
  if (!withCompany) return { canon, company: [] };

  const near = (r) => ({ $gte: Math.max(1, r - 2), $lte: r + 2 });
  const company = await Movie.find(lead === 'atlas'
    ? { canonRank: near(movie.canonRank) }
    : { ...inDecade, canonDecadeRank: near(movie.canonDecadeRank) })
    .sort(lead === 'atlas' ? { canonRank: 1 } : { canonDecadeRank: 1 })
    .select('title year posterUrl canonRank canonDecadeRank')
    .lean();
  return { canon, company };
};

// @desc    Tonight's film: one film a day from the films worth an evening, with the reason it was chosen
// @route   GET /api/movies/tonight?date=YYYY-MM-DD&n=0
// @access  Public
export const getTonight = async (req, res) => {
  try {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : new Date().toISOString().slice(0, 10);
    const n = Math.max(0, parseInt(req.query.n, 10) || 0); // "another film" asks for the next pick of the same day
    const pick = await pickTonight(date, n);
    if (!pick) return res.status(404).json({ message: 'No film tonight' });

    const movie = await Movie.findById(pick.id)
      .select('title originalTitle year directors country runtime posterUrl backdropUrl stills trailerUrl editorial.hook canonRank canonDecadeRank provenance')
      .lean();
    const { canon } = await canonFor(movie, { withCompany: false });
    // a film this long gets fair warning, whatever the reason it was chosen
    const reason = movie.runtime > MARATHON
      ? `${pick.reason ? `${pick.reason} ` : ''}Tonight's marathon: clear your evening, and the next.`
      : pick.reason;
    res.json({ ...movie, provenance: (movie.provenance || []).slice(0, 1), canon, reason, date, n });
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    The top of the canon, one film per director, for the home page's countdown —
//          plus the next ones down ("just missing out"), under the same rule
// @route   GET /api/movies/canon?limit=10&next=10
// @access  Public
export const getCanonTop = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const more = Math.min(50, Math.max(0, parseInt(req.query.next, 10) || 0));
    // enough of the top to fill both rows even when some directors repeat
    const pool = await Movie.find({ canonRank: { $ne: null, $lte: (limit + more) * 3 } })
      .sort({ canonRank: 1 })
      .select('title year directors country runtime posterUrl backdropUrl stills canonRank editorial.hook provenance')
      .lean();
    const seen = new Set();
    const picked = [];
    for (const f of pool) {
      const who = (f.directors || [])[0] || f._id.toString();
      if (seen.has(who)) continue; // one film per director: the countdown shouldn't be two Kurosawas
      seen.add(who);
      picked.push({ ...f, provenance: (f.provenance || []).slice(0, 1) });
      if (picked.length >= limit + more) break;
    }
    const of = await Movie.countDocuments({ canonRank: { $ne: null } });
    res.json({ of, films: picked.slice(0, limit), next: picked.slice(limit) });
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    Every film, compactly, for the home page's world map
// @route   GET /api/movies/atlas
// @access  Public
export const getAtlasFilms = async (req, res) => {
  try {
    const films = await Movie.find({ year: { $ne: null }, country: { $nin: [null, ''] } })
      .select('title year country directors stills backdropUrl canonRank')
      .lean();
    res.set('Cache-Control', 'public, max-age=300'); // five minutes: short enough that a catalogue change shows up soon
    res.json(films.map((f) => ({
      id: f._id,
      t: f.title,
      y: f.year,
      c: f.country,
      d: f.directors?.[0] || null,
      r: f.canonRank ?? null,
      s: (f.stills?.[0] || f.backdropUrl || '').replace(/^https:\/\/image\.tmdb\.org\/t\/p\/[^/]+/, '')
    })));
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    Get single movie by ID
// @route   GET /api/movies/:id
// @access  Public
import Director from '../models/Director.js';

// ... (existing imports)

// @desc    Get single movie by ID
// @route   GET /api/movies/:id
// @access  Public
export const getMovieById = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    // Dynamic Director Lookup
    // Check if the first listed director exists in our Director collection
    let directorId = null;
    if (movie.directors && movie.directors.length > 0) {
      const directorProfile = await Director.findOne({ name: movie.directors[0] });
      if (directorProfile) {
        directorId = directorProfile._id;
      }
    }

    const { canon, company } = await canonFor(movie);

    res.json({
        ...movie.toObject(),
        directorId,
        canon,
        company
    });
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    Get similar movies for a specific movie ID
// @route   GET /api/movies/:id/similar
// @access  Public
export const getSimilarMovies = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).lean();

    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    // The film's nearest neighbours from the MovieLens model: the same ranking
    // For You uses, with this film as the only seed
    const index = getIndex();
    if (index?.films.has(movie.tmdbId)) {
      const ranked = rankCandidates(index, {
        seeds: [{ tmdbId: movie.tmdbId, weight: 1 }],
        exclude: new Set([movie.tmdbId]),
        gamma: index.params.gamma,
        limit: 12
      });
      const docs = await Movie.find({ tmdbId: { $in: ranked.map((r) => r.tmdbId) } }).select(CARD_FIELDS).lean();
      const similar = inRankedOrder(docs, ranked).slice(0, 10).map(({ film, score, because }) => ({
        ...film,
        similarityScore: Math.round(score * 1e4) / 1e4,
        because: because && { reason: REASONS[because.reason] }
      }));
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.json(similar);
    }

    // Films added since the model was last built: shared tags, genres,
    // directors and movements, as before
    // Build lists of attributes for comparison
    const targetTags = movie.derivedTags || [];
    const targetGenres = movie.genres || [];
    const targetDirectors = movie.directors || [];
    const targetMovements = movie.movements || [];

    // Query for movies that share ANY of these attributes (excluding the target movie itself)
    const candidates = await Movie.find({
      _id: { $ne: movie._id },
      $or: [
        { derivedTags: { $in: targetTags } },
        { genres: { $in: targetGenres } },
        { directors: { $in: targetDirectors } },
        { movements: { $in: targetMovements } }
      ]
    })
    .select('title posterUrl year directors derivedTags genres movements trailerUrl')
    .limit(100) // Keep the candidate pool manageable
    .lean();

    // Score candidates based on overlap
    const scoredCandidates = candidates.map(candidate => {
      let score = 0;

      // 3 points for shared director (highest correlation)
      const sharedDirectors = candidate.directors?.filter(d => targetDirectors.includes(d)).length || 0;
      score += sharedDirectors * 3;

      // 2 points for shared movement
      const sharedMovements = candidate.movements?.filter(m => targetMovements.includes(m)).length || 0;
      score += sharedMovements * 2;

      // 1.5 points for shared derived tags (strong thematic correlation)
      const sharedTags = candidate.derivedTags?.filter(t => targetTags.includes(t)).length || 0;
      score += sharedTags * 1.5;

      // 1 point for shared genres (broader correlation)
      const sharedGenres = candidate.genres?.filter(g => targetGenres.includes(g)).length || 0;
      score += sharedGenres * 1;

      return {
        ...candidate,
        similarityScore: score
      };
    });

    // Sort by highest similarity score
    scoredCandidates.sort((a, b) => b.similarityScore - a.similarityScore);

    // Return the top 10
    const topSimilar = scoredCandidates.slice(0, 10);

    // Add brief cache headers since this data rarely changes rapidly
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    res.json(topSimilar);
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    Get unique directors list
// @route   GET /api/movies/directors/list
// @access  Public
export const getDirectors = async (req, res) => {
  try {
    const directors = await Movie.distinct('directors');
    res.json(directors.sort());
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    Get unique tags list
// @route   GET /api/movies/tags/list
// @access  Public
export const getTags = async (req, res) => {
  try {
    const tags = await Movie.distinct('derivedTags');
    
    // Blacklist of countries and standard genres to exclude from "Mood & Style"
    const BLACKLIST = new Set([
      // Countries / Cities
      'afghanistan', 'colombia', 'denmark', 'germany', 'iran', 'italy', 'japan', 
      'london', 'new york', 'france', 'usa', 'uk', 'united kingdom', 'spain', 
      'sweden', 'russia', 'soviet union', 'china', 'hong kong', 'taiwan', 
      'south korea', 'mexico', 'india', 'australia', 'canada', 'brazil',
      // Standard Genres (already filtered by Genre dropdown)
      'action', 'adventure', 'animation', 'comedy', 'crime', 'documentary', 
      'drama', 'family', 'fantasy', 'history', 'horror', 'music', 'mystery', 
      'romance', 'science fiction', 'thriller', 'war', 'western', 'tv movie'
    ]);

    const filteredTags = tags
      .filter(tag => tag && typeof tag === 'string') // Filter out null/undefined/non-strings first
      .filter(tag => !BLACKLIST.has(tag.toLowerCase()));
    
    res.json(filteredTags.sort());
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    Get all movie titles
// @route   GET /api/movies/titles
// @access  Public
export const getAllTitles = async (req, res) => {
  try {
    const titles = await Movie.find({}).select('title _id').sort('title');
    res.json(titles);
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    Get unique genres list
// @route   GET /api/movies/genres/list
// @access  Public
export const getGenres = async (req, res) => {
  try {
    const genres = await Movie.distinct('genres');
    res.json(genres.sort());
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    Get watch providers for a movie by MongoDB ID
// @route   GET /api/movies/:id/providers
// @access  Public
export const getMovieProviders = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie || !movie.tmdbId) {
      return res.status(404).json({ message: 'Movie or TMDB ID not found' });
    }

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'TMDB API key not configured on backend' });
    }

    const response = await fetch(`https://api.themoviedb.org/3/movie/${movie.tmdbId}/watch/providers?api_key=${apiKey}`);
    const data = await response.json();

    res.json(data.results || {});
  } catch (error) {
    console.error('Failed to fetch movie providers from TMDB:', error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    Explore: the catalogue filtered, sorted and counted (the logic is in services/catalogue.js)
// @route   GET /api/movies/explore?q=&country=&decade=&director=&movement=&mood=&genre=&length=&sort=&seed=&page=&limit=&facets=
// @access  Public
export const exploreMovies = async (req, res) => {
  try {
    const { cards, directors, movementsByTag, movementsByTitle } = await loadCatalogue();
    const q = req.query;
    // a movement arrives by its page's slug (or, from old links, by name)
    const movement = q.movement ? movementsByTag.get(q.movement) || movementsByTitle.get(q.movement) || null : null;
    const filters = {
      q: typeof q.q === 'string' ? q.q.trim().slice(0, 80) : '',
      country: typeof q.country === 'string' ? q.country : '',
      decade: /^\d{4}$/.test(q.decade || '') ? Number(q.decade) : '',
      director: typeof q.director === 'string' ? q.director : '',
      movement: movement?.title || '',
      mood: MOODS.includes(q.mood) ? q.mood : '',
      genre: typeof q.genre === 'string' ? q.genre : '',
      length: LENGTHS.includes(q.length) ? q.length : '',
    };
    const sort = SORTS.includes(q.sort) ? q.sort : 'acclaimed';
    const limit = Math.min(96, Math.max(1, parseInt(q.limit, 10) || 24));
    const page = Math.max(1, parseInt(q.page, 10) || 1);

    const matched = sortCards(applyFilters(cards, filters), sort, { seed: q.seed, q: filters.q });
    const films = matched.slice((page - 1) * limit, page * limit).map(publicCard);

    // what each filter's options would give, with the others applied (asked for with each new selection)
    let facets;
    if (q.facets !== '0') {
      facets = facetCounts(cards, filters);
      facets.director = facets.director.map((d) => {
        const person = directors.get(normalizeName(d.value));
        return { value: person?.name || d.value, n: d.n, id: person?._id || null, portrait: person?.profileUrl || null };
      });
      facets.movement = facets.movement.map((m) => {
        const mv = movementsByTitle.get(m.value);
        return { ...m, tag: mv?.tag || null, era: mv?.era || null };
      });
    }

    // the artist the wall is about, credited
    const selected = {};
    if (filters.director) {
      const person = directors.get(normalizeName(filters.director));
      selected.director = {
        name: person?.name || filters.director,
        id: person?._id || null,
        portrait: person?.profileUrl || null,
        born: person?.birthDate?.slice(0, 4) || null,
        died: person?.deathDate?.slice(0, 4) || null,
        place: person?.placeOfBirth || null,
        films: applyFilters(cards, { director: filters.director }).length
      };
    }
    if (movement) {
      selected.movement = {
        title: movement.title,
        tag: movement.tag || null,
        era: movement.era || null,
        tagline: movement.tagline || null,
        films: applyFilters(cards, { movement: movement.title }).length
      };
    }

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      films,
      total: matched.length,
      page,
      pages: Math.ceil(matched.length / limit),
      facets,
      selected,
      filters: { ...filters, movement: movement?.tag || '' },
      sort,
      // how many films have moods (they come from our own notes, so not every film has them yet)
      notes: { moodFilms: cards.filter((c) => c.moods.length).length }
    });
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    Explore's search suggestions: films by title, and directors by name
// @route   GET /api/movies/explore/suggest?q=
// @access  Public
export const exploreSuggest = async (req, res) => {
  try {
    const { cards, directors } = await loadCatalogue();
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
    if (!q) return res.json({ films: [], directors: [] });

    // films whose title (or original or other title) matches, best match first, then the canon
    const films = cards
      .map((c) => [c, searchScore(c, q)])
      .filter(([, s]) => s >= 1.5)
      .sort((a, b) => (b[1] - a[1]) || ((a[0].canonRank ?? Infinity) - (b[0].canonRank ?? Infinity)))
      .slice(0, 6)
      .map(([c]) => ({ _id: c._id, title: c.title, year: c.year, directors: c.directors, still: c.still, posterUrl: c.posterUrl }));

    // directors whose name matches (a typo allowed), most films first
    const people = new Map();
    if (normalizeName(q)) {
      for (const c of cards) {
        c.directors.forEach((name, i) => {
          const key = c._directors[i];
          if (!key || !nameMatches(name, q)) return;
          const p = people.get(key) || { name, films: 0 };
          p.films++;
          people.set(key, p);
        });
      }
    }
    const found = [...people.entries()]
      .sort((a, b) => (b[1].films - a[1].films) || a[1].name.localeCompare(b[1].name))
      .slice(0, 4)
      .map(([key, p]) => {
        const person = directors.get(key);
        return { name: person?.name || p.name, films: p.films, portrait: person?.profileUrl || null };
      });

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ films, directors: found });
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};
