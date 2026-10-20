
import express from 'express';
import { getStudios, getStudioById, getStudioIndex } from '../controllers/studioController.js';

const router = express.Router();

router.route('/').get(getStudios);
router.route('/index').get(getStudioIndex);
router.route('/:id').get(getStudioById);

export default router;
