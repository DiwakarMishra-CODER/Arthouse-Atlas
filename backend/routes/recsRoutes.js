import express from 'express';
import rateLimit from 'express-rate-limit';
import { previewForYou, getStarters } from '../controllers/recsController.js';

const router = express.Router();

// For You without an account: generous enough to rate a deck of films, not to be hammered
const previewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, slow down a moment' }
});

router.post('/preview', previewLimiter, previewForYou);
router.get('/starters', getStarters);

export default router;
