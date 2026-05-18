import express from 'express';
import {
  getMovies,
  getMovieById,
  getDirectors,
  getTags,
  getGenres,
  getAllTitles,
  getSimilarMovies,
  getMovieProviders
} from '../controllers/movieController.js';

const router = express.Router();


router.get('/', getMovies);
router.get('/titles', getAllTitles);
router.get('/directors/list', getDirectors);
router.get('/tags/list', getTags);
router.get('/genres/list', getGenres);
router.get('/:id/similar', getSimilarMovies);
router.get('/:id/providers', getMovieProviders);
router.get('/:id', getMovieById);

export default router;
