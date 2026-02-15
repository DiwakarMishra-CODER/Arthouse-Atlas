import express from 'express';
import { getDirectors, getDirector } from '../controllers/directorController.js';

const router = express.Router();

router.get('/', getDirectors);
router.get('/:id', getDirector);

export default router;
