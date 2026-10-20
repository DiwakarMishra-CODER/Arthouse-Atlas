import express from 'express';
import { getDirectors, getDirector, getDirectorIndex } from '../controllers/directorController.js';

const router = express.Router();

router.get('/', getDirectors);
router.get('/index', getDirectorIndex);
router.get('/:id', getDirector);

export default router;
