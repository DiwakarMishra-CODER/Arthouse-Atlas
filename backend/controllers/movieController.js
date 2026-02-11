import Movie from '../models/Movie.js';

// @desc    Get all movies with optional filters
// @route   GET /api/movies
// @access  Public
export const getMovies = async (req, res) => {
  try {
    const { search, director, year, tags, genre, decade, titles, limit = 100, page = 1 } = req.query;
    
    let query = {};

    // Fetch specific movies by exact titles (comma-separated)
    if (titles) {
      const titlesArray = titles.split(',').map(t => t.trim());
      query.title = { $in: titlesArray };
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
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
export const getMovieById = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    res.json(movie);
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
    res.json(tags.sort());
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
