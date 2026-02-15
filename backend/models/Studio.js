
import mongoose from 'mongoose';

const studioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  tagline: {
    type: String,
    required: true
  },
  curatorNote: {
    type: String,
    required: true
  },
  featuredFilms: [{
    title: String,
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie'
    },
    posterUrl: String
  }],
  logoUrl: {
    type: String
  },
  tier: {
    type: String,
    enum: ['Major', 'Boutique', 'Archive', 'Restoration', 'International', 'Disruptor'],
    default: 'Boutique'
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Studio = mongoose.model('Studio', studioSchema);

export default Studio;
