import express from 'express';
import {
  toggleFavorite,
  toggleWatchlist,
  toggleWatched,
  rateMovie,
  clearRating,
  getRecommendations,
  toggleNotFor,
  googleLogin,
  getFestival,
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
router.put('/me', protect, updateMe);
router.put('/me/password', protect, authLimiter, changePassword);
router.delete('/me', protect, authLimiter, deleteMe);
router.post('/not-for-me/:movieId', protect, toggleNotFor);
router.post('/google', authLimiter, googleLogin);

export default router;
