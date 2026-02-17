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
  getDirectors: () => api.get('/movies/directors/list'),
  getTags: () => api.get('/movies/tags/list'),
  getGenres: () => api.get('/movies/genres/list')
};

// User API
export const userAPI = {
  toggleFavorite: (movieId) => api.post(`/users/favorites/${movieId}`),
  toggleWatchlist: (movieId) => api.post(`/users/watchlist/${movieId}`),
  toggleWatched: (movieId) => api.post(`/users/watched/${movieId}`),
  getRecommendations: () => api.get('/users/recommendations')
};

export default api;
