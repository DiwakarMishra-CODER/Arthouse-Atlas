import Movement from '../models/Movement.js';

// @desc    Get all cinematic movements
// @route   GET /api/movements
// @access  Public
export const getMovements = async (req, res) => {
  try {
    const movements = await Movement.find({})
      .sort({ sortOrder: 1 })
      .populate('essentialFilms.movieId', 'title year posterUrl directors trailerUrl genres runtime');
      
    res.json(movements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single movement by ID
// @route   GET /api/movements/:id
// @access  Public
export const getMovementById = async (req, res) => {
  try {
    const movement = await Movement.findById(req.params.id)
      .populate('essentialFilms.movieId', 'title year posterUrl directors trailerUrl');

    if (!movement) {
      return res.status(404).json({ message: 'Movement not found' });
    }

    res.json(movement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
