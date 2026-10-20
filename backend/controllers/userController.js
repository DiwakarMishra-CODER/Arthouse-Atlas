
import User from '../models/User.js';
import Movie from '../models/Movie.js';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { getErrorResponse } from '../utils/errorResponse.js';
import { getIndex, rankCandidates, inRankedOrder, CARD_FIELDS, REASONS } from '../services/recommender.js';

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
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
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
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
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
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    Rate a film from 1 to 5 stars (replaces an earlier rating)
// @route   PUT /api/users/ratings/:movieId
// @access  Private
export const rateMovie = async (req, res) => {
  try {
    const { movieId } = req.params;
    const value = Number(req.body?.value);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return res.status(400).json({ message: 'A rating is a whole number from 1 to 5' });
    }

    const movie = await Movie.findById(movieId).select('_id');
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    // Update the existing rating if there is one, otherwise add it (the
    // $ne guard keeps one rating per film even if two requests race)
    const ratedAt = new Date();
    const updated = await User.updateOne(
      { _id: req.user._id, 'ratings.movie': movie._id },
      { $set: { 'ratings.$.value': value, 'ratings.$.ratedAt': ratedAt } }
    );
    if (updated.matchedCount === 0) {
      await User.updateOne(
        { _id: req.user._id, 'ratings.movie': { $ne: movie._id } },
        { $push: { ratings: { movie: movie._id, value, ratedAt } } }
      );
    }
    res.json({ message: 'Rating saved', rating: value });
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    Remove a rating
// @route   DELETE /api/users/ratings/:movieId
// @access  Private
export const clearRating = async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $pull: { ratings: { movie: req.params.movieId } } });
    res.json({ message: 'Rating removed', rating: 0 });
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// How much each film the user has touched says about their taste. A favourite
// or 4–5 stars counts fully; a watched or watchlisted film counts half; a
// rating of 1–3 outranks a watched mark and counts for nothing.
const tasteWeight = ({ favorite, rating, listed }) => {
  if (favorite) return 1;
  if (rating) return rating >= 4 ? 1 : 0;
  return listed ? 0.5 : 0;
};

const SEED_FIELDS = 'tmdbId title derivedTags directors movements decade';

export const getRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('favorites', SEED_FIELDS)
      .populate('watched', SEED_FIELDS)
      .populate('watchlist', SEED_FIELDS)
      .populate('ratings.movie', SEED_FIELDS);
    const rated = (user.ratings || []).filter((r) => r.movie);

    if (user.favorites.length === 0 && user.watched.length === 0 && user.watchlist.length === 0 && rated.length === 0) {
      return res.json({
        message: 'Interact with some movies first to get recommendations',
        recommendations: []
      });
    }

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const index = getIndex();
    if (!index) return res.json(await legacyRecommendations(user));

    // Every film they've touched, once, with what they did to it
    const touched = new Map();
    const touch = (movie, mark) => {
      if (!movie?.tmdbId) return;
      const t = touched.get(movie.tmdbId) || { movie };
      touched.set(movie.tmdbId, { ...t, ...mark });
    };
    user.favorites.forEach((m) => touch(m, { favorite: true }));
    user.watched.forEach((m) => touch(m, { listed: true }));
    user.watchlist.forEach((m) => touch(m, { listed: true }));
    rated.forEach((r) => touch(r.movie, { rating: r.value }));

    const seeds = [...touched].map(([tmdbId, t]) => ({ tmdbId, weight: tasteWeight(t), movie: t.movie }))
      .filter((s) => s.weight > 0)
      .sort((a, b) => b.weight - a.weight);
    const ranked = rankCandidates(index, {
      seeds,
      exclude: new Set(touched.keys()),
      gamma: index.params.gamma,
      limit: 30
    });

    const docs = await Movie.find({ tmdbId: { $in: ranked.map((r) => r.tmdbId) } }).select(CARD_FIELDS).lean();
    const seedOf = new Map(seeds.map((s) => [s.tmdbId, s.movie]));
    const recommendations = inRankedOrder(docs, ranked).slice(0, 20).map(({ film, score, because }) => ({
      ...film,
      recommendationScore: Math.round(score * 1e4) / 1e4,
      because: because && {
        film: { _id: seedOf.get(because.seed)._id, title: seedOf.get(because.seed).title },
        reason: REASONS[because.reason]
      }
    }));

    const tagWeights = new Map();
    seeds.forEach((s) => (s.movie.derivedTags || []).forEach((tag) => tagWeights.set(tag, (tagWeights.get(tag) || 0) + s.weight)));
    const usable = seeds.filter((s) => index.films.has(s.tmdbId));

    res.json({
      recommendations,
      basedOn: {
        tags: [...tagWeights].sort((a, b) => b[1] - a[1]).slice(0, 5).map((e) => e[0]),
        favoredMoviesCount: touched.size,
        films: usable.slice(0, 5).map((s) => ({ _id: s.movie._id, title: s.movie.title })),
        ...(usable.length ? {} : { fallback: 'canon' })
      }
    });
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// The scoring used before the MovieLens model, kept for when the model file is
// missing: tag, director, movement and decade overlap over the 200 films with
// the highest baseCanonScore
const legacyRecommendations = async (user) => {
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

    if (candidate.arthouseScore) {
      recommendationScore += candidate.arthouseScore * 0.05;
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

  return {
    recommendations,
    basedOn: {
      tags: Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]),
      favoredMoviesCount: user.favorites.length + user.watched.length + user.watchlist.length
    }
  };
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

    let user = await User.findOne({ email }).populate('favorites watchlist watched').populate('ratings.movie', 'title posterUrl year');

    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        favorites: user.favorites,
        watchlist: user.watchlist,
        watched: user.watched,
        ratings: user.ratings,
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
        ratings: [],
        token: generateToken(user._id)
      });
    }
  } catch (error) {
    console.error('Google Login Error:', error);
    res.status(400).json({ message: 'Google Login Failed', error: error.message });
  }
};
