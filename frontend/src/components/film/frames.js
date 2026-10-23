import { sized } from '../movements/treatments';

// a film's frames, as its page shows them: the backdrop, then its stills, each once (the small copy;
// sized() takes any of them to the size a screen wants)
export const framesOf = (movie) => [...new Set([movie.backdropUrl, ...(movie.stills || [])].filter(Boolean).map((s) => sized(s, 'w780')))];
