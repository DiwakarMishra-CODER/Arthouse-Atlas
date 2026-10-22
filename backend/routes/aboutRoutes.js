import express from 'express';
import { loadCatalogue } from '../services/catalogue.js';
import { listIndex, listFilms, countFor, examples, filmsNamed, facts } from '../services/about.js';
import { getErrorResponse } from '../utils/errorResponse.js';

/**
 * The About room: the 20 lists, each list's films, how one film is counted, and the films its
 * pages name. All read from the in-memory catalogue.
 */
const router = express.Router();
const handle = (fn) => async (req, res) => {
    try {
        const out = fn(await loadCatalogue(), req);
        if (out == null) return res.status(404).json({ message: 'Not found' });
        res.set('Cache-Control', 'public, max-age=600');
        return res.json(out);
    } catch (error) {
        console.error(error);
        const { status, message } = getErrorResponse(error);
        return res.status(status).json({ message });
    }
};

router.get('/facts', handle((c) => facts(c)));
router.get('/lists', handle((c) => listIndex(c.cards)));
router.get('/lists/:source', handle((c, req) => listFilms(c.cards, req.params.source)));
router.get('/examples', handle((c) => examples(c.cards)));
router.get('/count/:id', handle((c, req) => countFor(c, req.params.id)));
// ?t=Persona&t=Mirror …
router.get('/films', handle((c, req) => filmsNamed(c.cards, [].concat(req.query.t || []).slice(0, 30))));

export default router;
