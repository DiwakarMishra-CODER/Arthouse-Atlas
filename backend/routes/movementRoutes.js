import express from 'express';
import { getMovements, getMovementById } from '../controllers/movementController.js';

const router = express.Router();

router.get('/', getMovements);
router.get('/:id', getMovementById);

export default router;
