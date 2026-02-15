import express from 'express';
import {
  addToFavorites,
  removeFromFavorites,
  addToWatchlist,
  removeFromWatchlist,
  toggleWatched,
  getRecommendations,
  googleLogin
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes are protected
router.post('/favorites/:movieId', protect, addToFavorites);
router.delete('/favorites/:movieId', protect, removeFromFavorites);
router.post('/watchlist/:movieId', protect, addToWatchlist);
router.delete('/watchlist/:movieId', protect, removeFromWatchlist);
router.post('/watched/:movieId', protect, toggleWatched);
router.get('/recommendations', protect, getRecommendations);
router.post('/google', googleLogin);

export default router;
