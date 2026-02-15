import express from 'express';
import {
  getMovies,
  getMovieById,
  getDirectors,
  getTags,
  getGenres,
  getAllTitles
} from '../controllers/movieController.js';

const router = express.Router();


router.get('/', getMovies);
router.get('/titles', getAllTitles);
router.get('/directors/list', getDirectors);
router.get('/tags/list', getTags);
router.get('/genres/list', getGenres);
router.get('/:id', getMovieById);

export default router;
