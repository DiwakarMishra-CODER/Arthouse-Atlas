import mongoose from 'mongoose';

const movementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true
  },
  era: {
    type: String,
    required: true
  },
  vibe: {
    type: String,
    required: true
  },
  philosophy: {
    type: String,
    required: true
  },
  visualSignatures: [{
    type: String
  }],
  keyDirectors: [{
    name: { type: String, required: true },
    directorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Director', default: null }
  }],
  essentialFilms: [{
    title: { type: String, required: true },
    movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
    posterUrl: String,
    year: String
  }],
  backdropUrl: {
    type: String
  },
  colorCode: {
    type: String,
    default: '#d4af37' // Default gold
  },
  description: {
    type: String
  },
  tagline: {
    type: String
  },
  tag: {
    type: String
  },
  icon: {
    type: String
  },
  cardColor: {
    type: String
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Movement = mongoose.model('Movement', movementSchema);

export default Movement;
