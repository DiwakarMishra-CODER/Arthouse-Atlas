
import Studio from '../models/Studio.js';
import { getErrorResponse } from '../utils/errorResponse.js';

// @desc    Get all studios
// @route   GET /api/studios
// @access  Public
export const getStudios = async (req, res) => {
  try {
    const studios = await Studio.find({})
      .populate('featuredFilms.movieId')
      .sort({ sortOrder: 1 });
    res.json(studios);
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};

// @desc    Get single studio by ID
// @route   GET /api/studios/:id
// @access  Public
export const getStudioById = async (req, res) => {
  try {
    const studio = await Studio.findById(req.params.id);
    if (studio) {
      res.json(studio);
    } else {
      res.status(404).json({ message: 'Studio not found' });
    }
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};
