import express from 'express';
import {
  getMovies,
  getMovieById,
  getDirectors,
  getTags,
  getGenres,
  getAllTitles,
  getSimilarMovies,
  getMovieProviders,
  getTonight,
  getCanonTop,
  getAtlasFilms
} from '../controllers/movieController.js';

const router = express.Router();


router.get('/', getMovies);
router.get('/titles', getAllTitles);
router.get('/tonight', getTonight); // these named routes come before /:id, or their names would be read as ids
router.get('/canon', getCanonTop);
router.get('/atlas', getAtlasFilms);
router.get('/directors/list', getDirectors);
router.get('/tags/list', getTags);
router.get('/genres/list', getGenres);
router.get('/:id/similar', getSimilarMovies);
router.get('/:id/providers', getMovieProviders);
router.get('/:id', getMovieById);

export default router;
