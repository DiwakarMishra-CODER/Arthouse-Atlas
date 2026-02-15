import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true
  },
  synopsis: {
    type: String,
    required: true
  },
  directors: [{
    type: String,
    required: true,
    index: true
  }],
  runtime: {
    type: Number // in minutes
  },
  country: {
    type: String
  },
  posterUrl: {
    type: String
  },
  genres: [{
    type: String
  }],
  keywords: [{
    type: String
  }],
  derivedTags: [{
    type: String,
    index: true
  }],
  tmdbId: {
    type: Number,
    unique: true,
    sparse: true
  },
  decade: {
    type: Number,
    index: true
  },
  vote_average: {
    type: Number,
    default: 0
  },
  vote_count: {
    type: Number,
    default: 0
  },
  popularity: {
    type: Number,
    default: 0
  },
  tier: {
    type: Number,
    default: 1,
    index: true
  },
  influenceScore: {
    type: Number,
    default: 0
  },
  arthouseScore: {
    type: Number,
    default: 0,
    index: true
  },
  // Discovery Engine Fields
  baseCanonScore: {
    type: Number,
    default: 0,
    index: true
  },
  moods: {
    type: Map,
    of: Number,
    default: {}
  },
  showCount: {
    type: Number,
    default: 0
  },
  lastShownAt: {
    type: Date,
    default: null
  },
  festivalWins: [{
    type: String
  }],
  movements: [{
    type: String
  }],
  depthScore: {
    type: Number,
    default: 50
  },
  formalInnovation: {
    type: Number,
    default: 0
  },
  culturalInfluence: {
    type: Number,
    default: 0
  },
  criticalConsensus: {
    type: Number,
    default: 0
  },
  // Cinematic Motion System Fields
  stills: [{
    type: String  // URLs to still images from TMDB (backdrops/stills)
  }],
  clipUrl: {
    type: String,  // URL to public domain video clip (optional, for classics only)
    default: null
  },
  trailerUrl: {
    type: String,  // YouTube embed URL from TMDB (for hover-to-play previews)
    default: null
  },
  // Arthouse-critical metadata from TMDB
  cinematographers: [{
    type: String,
    index: true  // Enable filtering by DoP
  }],
  composers: [{
    type: String
  }],
  productionCompanies: [{
    type: String,
    index: true  // Enable filtering by production company (e.g., A24)
  }],
  backdropUrl: {
    type: String,  // High-res 16:9 backdrop from TMDB (for UI wallpapers)
    default: null
  },
  motionMood: {
    type: String,  // Visual mood for motion overlays: 'dreamlike', 'bleak', 'fragmented'
    enum: [null, 'dreamlike', 'bleak', 'fragmented'],
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Text index for search functionality
movieSchema.index({ 
  title: 'text', 
  synopsis: 'text', 
  directors: 'text' 
});

const Movie = mongoose.model('Movie', movieSchema);

export default Movie;
