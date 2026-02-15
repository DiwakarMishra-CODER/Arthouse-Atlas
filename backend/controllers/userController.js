
import User from '../models/User.js';
import Movie from '../models/Movie.js';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Add movie to favorites
// @route   POST /api/users/favorites/:movieId
// @access  Private
export const addToFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const movie = await Movie.findById(req.params.movieId);

    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    if (user.favorites.includes(req.params.movieId)) {
      return res.status(400).json({ message: 'Movie already in favorites' });
    }

    user.favorites.push(req.params.movieId);
    await user.save();

    res.json({ message: 'Movie added to favorites', favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove movie from favorites
// @route   DELETE /api/users/favorites/:movieId
// @access  Private
export const removeFromFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites watchlist watched');
    user.favorites = user.favorites.filter(id => id.toString() !== req.params.movieId);
    await user.save();

    res.json({ message: 'Movie removed from favorites', favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add movie to watchlist
// @route   POST /api/users/watchlist/:movieId
// @access  Private
export const addToWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites watchlist watched');
    const movie = await Movie.findById(req.params.movieId);

    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    if (user.watchlist.includes(req.params.movieId)) {
      return res.status(400).json({ message: 'Movie already in watchlist' });
    }

    user.watchlist.push(req.params.movieId);
    await user.save();

    res.json({ message: 'Movie added to watchlist', watchlist: user.watchlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove movie from watchlist
// @route   DELETE /api/users/watchlist/:movieId
// @access  Private
export const removeFromWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites watchlist watched');
    user.watchlist = user.watchlist.filter(id => id.toString() !== req.params.movieId);
    await user.save();

    res.json({ message: 'Movie removed from watchlist', watchlist: user.watchlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle watched status
// @route   POST /api/users/watched/:movieId
// @access  Private
export const toggleWatched = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const movieId = req.params.movieId;

    // Check if valid movie
    const movie = await Movie.findById(movieId);
    if (!movie) {
        return res.status(404).json({ message: 'Movie not found' });
    }

    const index = user.watched.indexOf(movieId);

    if (index > -1) {
        // Remove
        user.watched.splice(index, 1);
        await user.save();
        res.json({ message: 'Removed from watched', watched: user.watched, isWatched: false });
    } else {
        // Add
        user.watched.push(movieId);
        // Optional: Remove from watchlist if they watched it?
        // user.watchlist = user.watchlist.filter(id => id.toString() !== movieId);
        await user.save();
        res.json({ message: 'Marked as watched', watched: user.watched, isWatched: true });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user recommendations
// @route   GET /api/users/recommendations
// @access  Private
export const getRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites');

    if (user.favorites.length === 0) {
      return res.json({ 
        message: 'Like some movies first to get recommendations',
        recommendations: []
      });
    }

    // Aggregate tags from favorites
    const favoredTags = {};
    const favoredDirectors = new Set();

    user.favorites.forEach(movie => {
      movie.derivedTags.forEach(tag => {
        favoredTags[tag] = (favoredTags[tag] || 0) + 1;
      });
      movie.directors.forEach(dir => favoredDirectors.add(dir));
    });

    // Get top tags
    const topTags = Object.entries(favoredTags)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);

    // Find similar movies
    const favoritedIds = user.favorites.map(m => m._id);
    
    const recommendations = await Movie.find({
      _id: { $nin: [...favoritedIds, ...user.watchlist, ...user.watched] }, // Also exclude watched
      $or: [
        { derivedTags: { $in: topTags } },
        { directors: { $in: Array.from(favoredDirectors) } }
      ]
    })
    .limit(20)
    .sort({ createdAt: -1 })
    .select('title year posterUrl directors trailerUrl genres runtime arthouseScore derivedTags');

    // Score recommendations based on tag overlap
    const scoredRecs = recommendations.map(movie => {
      let score = 0;
      movie.derivedTags.forEach(tag => {
        if (favoredTags[tag]) {
          score += favoredTags[tag];
        }
      });
      movie.directors.forEach(dir => {
        if (favoredDirectors.has(dir)) {
          score += 3; // Director match is weighted higher
        }
      });
      return { movie, score };
    });

    // Sort by score and return
    scoredRecs.sort((a, b) => b.score - a.score);
    const sortedRecommendations = scoredRecs.slice(0, 10).map(r => r.movie);

    res.json({
      recommendations: sortedRecommendations,
      basedOn: {
        tags: topTags,
        favoredMoviesCount: user.favorites.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Google login
// @route   POST /api/users/google
// @access  Public
export const googleLogin = async (req, res) => {
  const { token } = req.body;

  try {
    // Verify Access Token & Get User Info
    const googleRes = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const { name, email, picture } = googleRes.data;

    let user = await User.findOne({ email }).populate('favorites watchlist watched');

    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        favorites: user.favorites,
        watchlist: user.watchlist,
        watched: user.watched,
        token: generateToken(user._id)
      });
    } else {
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      user = await User.create({
        username: name, 
        email,
        password: randomPassword,
        profileImage: picture
      });

      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        favorites: [],
        watchlist: [],
        watched: [],
        token: generateToken(user._id)
      });
    }
  } catch (error) {
    console.error('Google Login Error:', error);
    res.status(400).json({ message: 'Google Login Failed', error: error.message });
  }
};
