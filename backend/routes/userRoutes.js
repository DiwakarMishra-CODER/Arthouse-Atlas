import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  toggleFavorite,
  keepShelf,
  toggleWatchlist,
  toggleWatched,
  rateMovie,
  clearRating,
  getRecommendations,
  toggleNotFor,
  googleLogin,
  getFestival,
  previewFestival,
  exampleFestival,
  updateMe,
  changePassword,
  deleteMe
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes are protected
router.post('/favorites/:movieId', protect, toggleFavorite);
router.post('/watchlist/:movieId', protect, toggleWatchlist);
router.post('/watched/:movieId', protect, toggleWatched);
router.put('/ratings/:movieId', protect, rateMovie);
router.delete('/ratings/:movieId', protect, clearRating);
router.get('/recommendations', protect, getRecommendations);
router.get('/me/festival', protect, getFestival);
// the festival without an account (from what the browser kept), and the maker's, as the example:
// enough for a visit, not to be hammered
const festivalLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many requests, slow down a moment' } });
router.post('/festival/preview', festivalLimiter, previewFestival);
router.get('/festival/example', festivalLimiter, exampleFestival);
router.post('/me/shelf', protect, keepShelf);
router.put('/me', protect, updateMe);
router.put('/me/password', protect, authLimiter, changePassword);
router.delete('/me', protect, authLimiter, deleteMe);
router.post('/not-for-me/:movieId', protect, toggleNotFor);
router.post('/google', authLimiter, googleLogin);

export default router;
