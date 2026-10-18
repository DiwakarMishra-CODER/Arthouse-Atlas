import express from 'express';
import { getMovements, getMovementById, getMovementStats } from '../controllers/movementController.js';

const router = express.Router();

router.get('/', getMovements);
router.get('/stats', getMovementStats); // before /:id so "stats" isn't read as a slug
router.get('/:id', getMovementById);

export default router;
