import express from 'express';
import {
  getExploreFilms,
  getDecadeFilms,
  getMoodFilms,
  getCombinedFilms,
  getAvailableMoods
} from '../controllers/discoveryController.js';

const router = express.Router();

// Discovery endpoints
router.get('/explore', getExploreFilms);
router.get('/decade/:decade', getDecadeFilms);
router.get('/mood', getMoodFilms);
router.get('/combined', getCombinedFilms);
router.get('/moods/list', getAvailableMoods);

export default router;
