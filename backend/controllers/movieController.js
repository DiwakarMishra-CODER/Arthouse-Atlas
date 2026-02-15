import Movie from '../models/Movie.js';

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
    res.status(500).json({ message: error.message });
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

    res.json({
        ...movie.toObject(),
        directorId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
  }
};
