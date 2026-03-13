
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

// @desc    Toggle favorite status
// @route   POST /api/users/favorites/:movieId
// @access  Private
export const toggleFavorite = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const movieId = req.params.movieId;

    const movie = await Movie.findById(movieId);
    if (!movie) return res.status(404).json({ message: 'Movie not found' });

    const isFavorite = user.favorites.some(id => id.toString() === movieId);

    if (isFavorite) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { favorites: movieId } });
      return res.json({ message: 'Removed from favorites', isFavorite: false });
    } else {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { favorites: movieId } });
      return res.json({ message: 'Added to favorites', isFavorite: true });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle watchlist status
// @route   POST /api/users/watchlist/:movieId
// @access  Private
export const toggleWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const movieId = req.params.movieId;

    const movie = await Movie.findById(movieId);
    if (!movie) return res.status(404).json({ message: 'Movie not found' });

    const isInWatchlist = user.watchlist.some(id => id.toString() === movieId);

    if (isInWatchlist) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { watchlist: movieId } });
      return res.json({ message: 'Removed from watchlist', isInWatchlist: false });
    } else {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { watchlist: movieId } });
      return res.json({ message: 'Added to watchlist', isInWatchlist: true });
    }
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

    const movie = await Movie.findById(movieId);
    if (!movie) return res.status(404).json({ message: 'Movie not found' });

    const isWatched = user.watched.some(id => id.toString() === movieId);

    if (isWatched) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { watched: movieId } });
      return res.json({ message: 'Removed from watched', isWatched: false });
    } else {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { watched: movieId } });
      return res.json({ message: 'Marked as watched', isWatched: true });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('favorites', 'derivedTags directors movements decade')
      .populate('watched', 'derivedTags directors movements decade')
      .populate('watchlist', 'derivedTags directors movements decade');

    if (user.favorites.length === 0 && user.watched.length === 0 && user.watchlist.length === 0) {
      return res.json({ 
        message: 'Interact with some movies first to get recommendations',
        recommendations: []
      });
    }

    const tagMap = new Map();
    const directorMap = new Map();
    const movementMap = new Map();
    const decadeMap = new Map();

    const processList = (list, weight) => {
      list.forEach(movie => {
        if (movie.derivedTags) {
          movie.derivedTags.forEach(tag => tagMap.set(tag, (tagMap.get(tag) || 0) + weight));
        }
        if (movie.directors) {
          movie.directors.forEach(dir => directorMap.set(dir, (directorMap.get(dir) || 0) + weight));
        }
        if (movie.movements) {
          movie.movements.forEach(mov => movementMap.set(mov, (movementMap.get(mov) || 0) + weight));
        }
        if (movie.decade) {
          decadeMap.set(movie.decade, (decadeMap.get(movie.decade) || 0) + weight);
        }
      });
    };

    processList(user.favorites, 3.0);
    processList(user.watched, 1.5);
    processList(user.watchlist, 1.0);

    const interactedIds = [
      ...user.favorites.map(m => m._id),
      ...user.watched.map(m => m._id),
      ...user.watchlist.map(m => m._id)
    ];

    const candidates = await Movie.find({
      _id: { $nin: interactedIds }
    })
    .sort({ baseCanonScore: -1 })
    .limit(200)
    .select('title year posterUrl directors trailerUrl genres runtime arthouseScore derivedTags movements decade baseCanonScore')
    .lean();

    const scoredCandidates = candidates.map(candidate => {
      let recommendationScore = 0;

      if (candidate.derivedTags) {
        candidate.derivedTags.forEach(tag => {
          if (tagMap.has(tag)) recommendationScore += tagMap.get(tag) * 1.5;
        });
      }

      if (candidate.directors) {
        candidate.directors.forEach(dir => {
          if (directorMap.has(dir)) recommendationScore += 20;
        });
      }

      if (candidate.movements) {
        candidate.movements.forEach(mov => {
          if (movementMap.has(mov)) recommendationScore += movementMap.get(mov) * 2.0;
        });
      }

      if (candidate.decade) {
        if (decadeMap.has(candidate.decade) && decadeMap.get(candidate.decade) > 0) {
          recommendationScore += 5;
        }
      }

      if (candidate.baseCanonScore) {
        recommendationScore += candidate.baseCanonScore * 0.1;
      }

      return {
        ...candidate,
        recommendationScore
      };
    });

    scoredCandidates.sort((a, b) => b.recommendationScore - a.recommendationScore);
    
    // Take the top 30 mathematically best matches
    const top30Matches = scoredCandidates.slice(0, 30);
    
    // Shuffle the array using Fisher-Yates algorithm
    for (let i = top30Matches.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [top30Matches[i], top30Matches[j]] = [top30Matches[j], top30Matches[i]];
    }

    // Return exactly 10 shuffled recommendations
    const recommendations = top30Matches.slice(0, 10);

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json({
      recommendations,
      basedOn: {
        tags: Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]),
        favoredMoviesCount: user.favorites.length + user.watched.length + user.watchlist.length
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
