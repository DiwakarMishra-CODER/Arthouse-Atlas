import Director from '../models/Director.js';
import Movie from '../models/Movie.js';

// @desc    Get all directors
// @route   GET /api/directors
// @access  Public
export const getDirectors = async (req, res) => {
    try {
        const directors = await Director.find()
            .sort({ name: 1 })
            .select('-__v');
        
        // Priority list for custom sorting
        const PRIORITY_DIRECTORS = [
            'David Lynch',
            'Ingmar Bergman',
            'Krzysztof Kieślowski',
            'Andrei Tarkovsky',
            'Michelangelo Antonioni',
            'Robert Bresson',
            'Jean-Luc Godard',
            'Federico Fellini',
            'Yasujirō Ozu',
            'Akira Kurosawa',
            'Satyajit Ray',
            'Wong Kar-wai',
            'Béla Tarr',
            'Edward Yang'
        ];

        // Sort directors: Priority ones first (in order), then alphabetical
        const sortedDirectors = directors.sort((a, b) => {
            const indexA = PRIORITY_DIRECTORS.indexOf(a.name);
            const indexB = PRIORITY_DIRECTORS.indexOf(b.name);

            // Both are in priority list -> sort by index
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            // Only A is in priority list -> A comes first
            if (indexA !== -1) return -1;
            // Only B is in priority list -> B comes first
            if (indexB !== -1) return 1;

            // Neither -> alphabetical (already sorted by DB but good to be safe)
            return a.name.localeCompare(b.name);
        });

        res.json({
            success: true,
            count: sortedDirectors.length,
            data: sortedDirectors
        });
    } catch (error) {
        console.error('Error fetching directors:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch directors'
        });
    }
};

// @desc    Get single director with films
// @route   GET /api/directors/:id
// @access  Public
export const getDirector = async (req, res) => {
    try {
        const director = await Director.findById(req.params.id);
        
        if (!director) {
            return res.status(404).json({
                success: false,
                message: 'Director not found'
            });
        }

        // Get director's top films from Movie collection
        const films = await Movie.find({
            directors: director.name
        })
            .sort({ arthouseScore: -1 })
            .limit(6)
            .select('title year genres posterUrl arthouseScore directors trailerUrl')
            .lean();

        res.json({
            success: true,
            data: {
                ...director.toObject(),
                films
            }
        });
    } catch (error) {
        console.error('Error fetching director:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch director'
        });
    }
};
