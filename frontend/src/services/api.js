import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/me')
};

// Movies API
export const moviesAPI = {
  getMovies: (params) => api.get('/movies', { params }),
  getTitles: () => api.get('/movies/titles'),
  getMovieById: (id) => api.get(`/movies/${id}`),
  // today's film from the top of the canon; n = 1, 2 … for "another film" the same day
  getTonight: (date, n = 0) => api.get('/movies/tonight', { params: { date, n } }),
  getCanonTop: (limit = 10, next = 0) => api.get('/movies/canon', { params: { limit, next } }),
  getAtlasFilms: () => api.get('/movies/atlas'),
  getSimilarMovies: (id) => api.get(`/movies/${id}/similar`),
  explore: (params) => api.get('/movies/explore', { params }),
  exploreSuggest: (q) => api.get('/movies/explore/suggest', { params: { q } }),
  getMovieProviders: (id) => api.get(`/movies/${id}/providers`),
  getDirectors: () => api.get('/movies/directors/list'),
  getTags: () => api.get('/movies/tags/list'),
  getGenres: () => api.get('/movies/genres/list')
};

// Directors API: the index (every director with their films here, best first)
export const directorsAPI = {
  getIndex: () => api.get('/directors/index')
};

// Studios API: the houses (by slug) and their films
export const studiosAPI = {
  getIndex: () => api.get('/studios/index'),
  getOne: (slug) => api.get(`/studios/${slug}`)
};

// Movements API — movements are addressed by slug (e.g. 'czech_new_wave')
export const movementsAPI = {
  getAll: () => api.get('/movements'),
  getStats: () => api.get('/movements/stats'),
  getOne: (slugOrId) => api.get(`/movements/${slugOrId}`)
};

// User API
export const userAPI = {
  toggleFavorite: (movieId) => api.post(`/users/favorites/${movieId}`),
  toggleWatchlist: (movieId) => api.post(`/users/watchlist/${movieId}`),
  toggleWatched: (movieId) => api.post(`/users/watched/${movieId}`),
  // what was marked in this browser before signing in, added to the account (only ever added)
  keepShelf: (lists) => api.post('/users/me/shelf', lists),
  rateMovie: (movieId, value) => api.put(`/users/ratings/${movieId}`, { value }),
  clearRating: (movieId) => api.delete(`/users/ratings/${movieId}`),
  getRecommendations: () => api.get('/users/recommendations', { params: { _t: Date.now() } }),
  toggleNotFor: (movieId) => api.post(`/users/not-for-me/${movieId}`),
  getFestival: () => api.get('/users/me/festival'),
  updateMe: (username) => api.put('/users/me', { username }),
  changePassword: (current, next) => api.put('/users/me/password', { current, next }),
  deleteMe: (confirm) => api.delete('/users/me', { data: { confirm } }),
};

export default api;

// For You without an account (ratings travel with the request), and the deck newcomers rate
export const aboutAPI = {
  facts: () => api.get('/about/facts'),
  lists: () => api.get('/about/lists'),
  list: (source) => api.get(`/about/lists/${source}`),
  examples: () => api.get('/about/examples'),
  count: (id) => api.get(`/about/count/${id}`),
  films: (titles) => api.get('/about/films', { params: { t: titles }, paramsSerializer: { indexes: null } }),
};

export const recsAPI = {
  preview: (body) => api.post('/recs/preview', body),
  starters: () => api.get('/recs/starters'),
};
