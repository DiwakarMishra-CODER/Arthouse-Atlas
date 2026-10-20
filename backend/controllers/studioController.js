
import Studio from '../models/Studio.js';
import { getErrorResponse } from '../utils/errorResponse.js';
import { studioIndex, studioBySlug } from '../services/studios.js';

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
    // a house by its slug (the Studios room), or a Studio record by id (as before)
    const house = await studioBySlug(req.params.id);
    if (house) return res.json(house);
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(404).json({ message: 'Studio not found' });
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

// @desc    Every house in the Studios room, with its count, years and a film to open on
// @route   GET /api/studios/index
// @access  Public
export const getStudioIndex = async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    res.json(await studioIndex());
  } catch (error) {
    console.error(error);
    const { status, message } = getErrorResponse(error);
    res.status(status).json({ message });
  }
};
