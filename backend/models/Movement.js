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
  },
  // Editorial — see data/editorial/STYLE.md. `description`/`vibe`/`philosophy`
  // above are the short-form stubs; this is the page.
  editorial: {
    essay: { type: String, default: null },          // 300–450 words
    before: { type: String, default: null },         // what cinema looked like just before
    broke: { type: String, default: null },          // what it broke, concretely
    startWith: [{                                    // three films, one line each on the order
      title: String,
      movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
      why: String
    }],
    grewFrom: [{ type: String }],                    // movement titles
    fed: [{ type: String }],                         // movement titles
    writtenAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null }
  },
  startYear: { type: Number },                       // parsed from era, for the timeline
  endYear: { type: Number },                         // null/current year for living movements
  region: { type: String }                           // for the timeline's regional lanes
}, {
  timestamps: true
});

const Movement = mongoose.model('Movement', movementSchema);

export default Movement;
