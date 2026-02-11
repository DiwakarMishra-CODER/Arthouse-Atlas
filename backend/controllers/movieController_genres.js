// @desc    Get unique genres list
// @route   GET /api/movies/genres/list
// @access  Public
export const getGenres = async (req, res) => {
  try {
    const genres = await Movie.distinct('genres');
    res.json(genres.sort());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
