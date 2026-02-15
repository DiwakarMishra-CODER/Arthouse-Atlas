
import express from 'express';
import { getStudios, getStudioById } from '../controllers/studioController.js';

const router = express.Router();

router.route('/').get(getStudios);
router.route('/:id').get(getStudioById);

export default router;
