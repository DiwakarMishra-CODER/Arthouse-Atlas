import Director from '../models/Director.js';
import Movie from '../models/Movie.js';
import Movement from '../models/Movement.js';
import { getErrorResponse } from '../utils/errorResponse.js';
import { directorIndex, namesOf } from '../services/directorIndex.js';

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
        const { status, message } = getErrorResponse(error);
        res.status(status).json({
            success: false,
            message
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

        // The whole filmography in the atlas, in the order it was made
        const films = await Movie.find({ directors: { $in: namesOf(director.name) } })
            .sort({ year: 1 })
            .select('title year runtime country posterUrl backdropUrl stills genres trailerUrl movements editorial.hook provenance provenanceCount canonRank')
            .lean();

        // The movements they're named as key to, and the others named alongside them there
        const movements = await Movement.find({ 'keyDirectors.directorId': director._id })
            .select('title tag era startYear endYear region keyDirectors')
            .sort({ startYear: 1 })
            .lean();
        const peerIds = [...new Set(movements.flatMap((m) => m.keyDirectors
            .filter((d) => d.directorId && !d.directorId.equals(director._id))
            .map((d) => d.directorId.toString())))];
        const peers = (await Director.find({ _id: { $in: peerIds } }).select('name profileUrl birthDate deathDate').lean())
            // which of the director's movements each peer shares, for drawing the circle by movement
            .map((p) => ({ ...p, movementIds: movements.filter((m) => m.keyDirectors.some((d) => d.directorId?.equals(p._id))).map((m) => m._id) }));

        res.json({
            success: true,
            data: {
                ...director.toObject(),
                films,
                movements: movements.map(({ keyDirectors, ...m }) => m),
                peers
            }
        });
    } catch (error) {
        console.error('Error fetching director:', error);
        const { status, message } = getErrorResponse(error);
        res.status(status).json({
            success: false,
            message
        });
    }
};

// @desc    Every director with their films in the atlas, best first, for the Directors index
// @route   GET /api/directors/index
// @access  Public
export const getDirectorIndex = async (req, res) => {
    try {
        res.set('Cache-Control', 'public, max-age=300');
        res.json(await directorIndex());
    } catch (error) {
        console.error('Error building the director index:', error);
        const { status, message } = getErrorResponse(error);
        res.status(status).json({ success: false, message });
    }
};
