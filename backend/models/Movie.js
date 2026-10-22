import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    index: true
  },
  originalTitle: {
    type: String  // Title in the film's own language, from TMDB
  },
  altTitles: [{
    type: String  // Release titles in other territories — for search and canon-list matching
  }],
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
    type: String  // Primary country — director's national cinema for co-productions
  },
  countries: [{
    type: String,  // Every production country, for co-production display and the atlas map
    index: true
  }],
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
  arthouseScore: {
    type: Number,
    default: 0,
    index: true
  },
  // Provenance — the public canon evidence that this film belongs here.
  // Built by scripts/canon/buildProvenance.js; every film should have ≥1 entry
  // or a curator's note explaining why it is in the catalogue.
  provenance: [{
    source: String,   // source id from scripts/canon/registry.js, e.g. 'ss2022-critics'
    label: String,    // human label, e.g. "Sight & Sound 2022 critics"
    family: String,   // what kind of evidence: 'all-time-poll', 'year-end', 'prize' … (scripts/canon/scoring.js)
    detail: String,   // e.g. "#4", "Spine #217", "Palme d'Or · Cannes 1997"
    rank: Number,
    weight: Number,   // strength of this citation; the film's list is stored strongest first
    url: String,      // link to the citation itself, where there is one (an Ebert essay)
    pollYear: Number  // when the poll was taken, for lists that ran more than once (Sight and Sound 1952–2002)
  }],
  provenanceScore: {
    type: Number,
    default: 0,
    index: true
  },
  provenanceCount: {
    type: Number,     // distinct sources citing the film
    default: 0
  },
  canonRank: {
    type: Number,     // the film's place in the atlas by canon standing (1 = strongest); null with no evidence
    default: null,
    index: true
  },
  canonDecadeRank: {
    type: Number,     // the same, among the atlas's films of its decade — fairer to recent films
    default: null
  },
  curatorNote: {
    type: String,     // why a film with no canon evidence is here, in the house voice
    default: null
  },
  // Editorial — the words readers actually see. Written to data/editorial/STYLE.md;
  // replaces the TMDB overview everywhere once present.
  editorial: {
    hook: { type: String, default: null },          // one line for cards, < 90 chars
    synopsis: { type: String, default: null },      // 80–130 words, setup + texture, no spoilers
    whyItMatters: { type: String, default: null },  // 1–2 sentences of lineage and place
    tags: [{ type: String }],                       // 3–5 hand-assigned, strongest first
    writtenAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null }       // set when the curator has read it
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
  movements: [{
    type: String  // Rules (key director × era, essentials) ∪ curatedMovements — rebuilt by syncMovements.js
  }],
  curatedMovements: [{
    type: String  // Hand-assigned in curation lists; never removed by the sync
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
  // The rest of the credits, for the billing block (scripts/media/credits.js)
  cast: [{ _id: false, name: String, character: String }],  // the first six billed
  writers: [{ _id: false, name: String, job: String }],      // screenplay first, then story, then the source
  editors: [{ type: String }],
  originalLanguage: { type: String, default: null },
  languages: [{ type: String }],                             // the language it's in first
  tagline: { type: String, default: null },                  // as its posters carried it
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
