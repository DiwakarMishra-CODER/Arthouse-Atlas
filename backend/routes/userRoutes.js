import express from 'express';
import {
  toggleFavorite,
  toggleWatchlist,
  toggleWatched,
  getRecommendations,
  googleLogin
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes are protected
router.post('/favorites/:movieId', protect, toggleFavorite);
router.post('/watchlist/:movieId', protect, toggleWatchlist);
router.post('/watched/:movieId', protect, toggleWatched);
router.get('/recommendations', protect, getRecommendations);
router.post('/google', googleLogin);

export default router;
