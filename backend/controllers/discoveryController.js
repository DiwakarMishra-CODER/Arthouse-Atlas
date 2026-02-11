import Movie from '../models/Movie.js';
import {
  calculateExploreScore,
  calculateDecadeScore,
  calculateMoodScore,
  calculateCombinedScore,
  applySortOption,
  SORT_OPTIONS
} from '../services/discoveryEngine.js';

// @desc    Get films for Explore tab with intelligent ranking
// @route   GET /api/movies/discover/explore
// @access  Public
export const getExploreFilms = async (req, res) => {
  try {
    const { limit = 60, page = 1, sortBy = 'curated' } = req.query;
    
    // Fetch all films (or apply basic filters)
    let films = await Movie.find({}).lean();
    
    // Calculate ExploreScore for each film
    films = films.map(film => ({
      ...film,
      _exploreScore: calculateExploreScore(film)
    }));
    
    // Apply sort option
    if (sortBy !== 'curated') {
      films = applySortOption(films, sortBy);
    } else {
      // Sort by exploreScore (already calculated)
      films.sort((a, b) => b._exploreScore - a._exploreScore);
    }
    
    // Apply pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedFilms = films.slice(skip, skip + parseInt(limit));
    
    // Update showCount for returned films (async, don't await)
    const filmIds = paginatedFilms.map(f => f._id);
    Movie.updateMany(
      { _id: { $in: filmIds } },
      { 
        $inc: { showCount: 1 },
        $set: { lastShownAt: new Date() }
      }
    ).exec();
    
    // Remove temporary score field
    const cleanedFilms = paginatedFilms.map(({ _exploreScore, ...film }) => film);
    
    res.json({
      movies: cleanedFilms,
      page: parseInt(page),
      pages: Math.ceil(films.length / parseInt(limit)),
      total: films.length,
      sortBy
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get films filtered by decade
// @route   GET /api/movies/discover/decade/:decade
// @access  Public
export const getDecadeFilms = async (req, res) => {
  try {
    const { decade } = req.params;
    const { limit = 60, page = 1 } = req.query;
    
    const decadeNum = parseInt(decade);
    
    // Fetch films from the decade
    let films = await Movie.find({ decade: decadeNum }).lean();
    
    // Calculate DecadeScore for each film
    films = films.map(film => ({
      ...film,
      _decadeScore: calculateDecadeScore(film, films)
    }));
    
    // Sort by decade score
    films.sort((a, b) => b._decadeScore - a._decadeScore);
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedFilms = films.slice(skip, skip + parseInt(limit));
    
    // Update showCount
    const filmIds = paginatedFilms.map(f => f._id);
    Movie.updateMany(
      { _id: { $in: filmIds } },
      { 
        $inc: { showCount: 1 },
        $set: { lastShownAt: new Date() }
      }
    ).exec();
    
    const cleanedFilms = paginatedFilms.map(({ _decadeScore, ...film }) => film);
    
    res.json({
      movies: cleanedFilms,
      decade: decadeNum,
      page: parseInt(page),
      pages: Math.ceil(films.length / parseInt(limit)),
      total: films.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get films filtered by mood(s)
// @route   GET /api/movies/discover/mood
// @access  Public
export const getMoodFilms = async (req, res) => {
  try {
    const { moods, limit = 60, page = 1 } = req.query;
    
    if (!moods) {
      return res.status(400).json({ message: 'Moods parameter required' });
    }
    
    const selectedMoods = Array.isArray(moods) ? moods : moods.split(',');
    
    // Fetch all films
    let films = await Movie.find({}).lean();
    
    // Convert Map moods to plain objects and calculate MoodScore for each film
    films = films.map(film => {
      // Convert moods Map to object if needed
      const filmWithMoods = {
        ...film,
        moods: film.moods instanceof Map ? Object.fromEntries(film.moods) : (film.moods || {})
      };
      
      return {
        ...filmWithMoods,
        _moodScore: calculateMoodScore(filmWithMoods, selectedMoods)
      };
    });
    
    // Filter: only keep films with reasonable mood match (>= 30%)
    films = films.filter(f => f._moodScore >= 30);
    
    // Sort by mood score
    films.sort((a, b) => b._moodScore - a._moodScore);
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedFilms = films.slice(skip, skip + parseInt(limit));
    
    // Update showCount
    const filmIds = paginatedFilms.map(f => f._id);
    Movie.updateMany(
      { _id: { $in: filmIds } },
      { 
        $inc: { showCount: 1 },
        $set: { lastShownAt: new Date() }
      }
    ).exec();
    
    const cleanedFilms = paginatedFilms.map(({ _moodScore, ...film }) => film);
    
    res.json({
      movies: cleanedFilms,
      moods: selectedMoods,
      page: parseInt(page),
      pages: Math.ceil(films.length / parseInt(limit)),
      total: films.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get films with combined decade + mood filter
// @route   GET /api/movies/discover/combined
// @access  Public
export const getCombinedFilms = async (req, res) => {
  try {
    const { decade, moods, limit = 60, page = 1 } = req.query;
    
    if (!decade || !moods) {
      return res.status(400).json({ message: 'Both decade and moods parameters required' });
    }
    
    const decadeNum = parseInt(decade);
    const selectedMoods = Array.isArray(moods) ? moods : moods.split(',');
    
    // Fetch films from the decade
    let films = await Movie.find({ decade: decadeNum }).lean();
    
    // Calculate Combined Score
    films = films.map(film => ({
      ...film,
      _combinedScore: calculateCombinedScore(film, selectedMoods, decadeNum)
    }));
    
    // Filter: mood match threshold
    films = films.filter(f => f._combinedScore >= 30);
    
    // Sort by combined score
    films.sort((a, b) => b._combinedScore - a._combinedScore);
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedFilms = films.slice(skip, skip + parseInt(limit));
    
    // Update showCount
    const filmIds = paginatedFilms.map(f => f._id);
    Movie.updateMany(
      { _id: { $in: filmIds } },
      { 
        $inc: { showCount: 1 },
        $set: { lastShownAt: new Date() }
      }
    ).exec();
    
    const cleanedFilms = paginatedFilms.map(({ _combinedScore, ...film }) => film);
    
    res.json({
      movies: cleanedFilms,
      decade: decadeNum,
      moods: selectedMoods,
      page: parseInt(page),
      pages: Math.ceil(films.length / parseInt(limit)),
      total: films.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get available moods for filter dropdown
// @route   GET /api/movies/discover/moods/list
// @access  Public
export const getAvailableMoods = async (req, res) => {
  try {
    // Get all unique moods from the database
    const films = await Movie.find({}, 'moods');
    const moodSet = new Set();
    
    films.forEach(film => {
      if (film.moods) {
        const moodObj = film.moods instanceof Map ? Object.fromEntries(film.moods) : film.moods;
        Object.keys(moodObj).forEach(mood => moodSet.add(mood));
      }
    });
    
    const moods = Array.from(moodSet).sort();
    
    res.json(moods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default {
  getExploreFilms,
  getDecadeFilms,
  getMoodFilms,
  getCombinedFilms,
  getAvailableMoods
};
