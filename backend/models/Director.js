import mongoose from 'mongoose';

const directorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true
    },
    tmdbId: {
        type: Number,
        required: true,
        unique: true
    },
    bio: {
        type: String,
        default: ''
    },
    birthDate: {
        type: String,
        default: ''
    },
    deathDate: {
        type: String,
        default: null
    },
    placeOfBirth: {
        type: String,
        default: ''
    },
    profileUrl: {
        type: String,
        default: ''
    },
    backdropUrl: {
        type: String,
        default: ''
    },
    keyStyles: [{
        type: String
    }],
    eras: [{
        type: String
    }],
    awards: [{
        type: String
    }],
    // Editorial essay and sourced lineage — see data/editorial/STYLE.md
    editorial: {
        essay: { type: String, default: null },        // 150–250 words
        signature: { type: String, default: null },    // one line: what you'd recognise in 30 seconds
        startWith: [{                                  // 1–2 films and why that order
            title: String,
            movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
            why: String
        }],
        writtenAt: { type: Date, default: null },
        reviewedAt: { type: Date, default: null }
    },
    // Influence edges, every one sourced (the Starweave rule: no unsourced links)
    influencedBy: [{
        name: String,
        directorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Director', default: null },
        source: String,                                // where the claim comes from
        quote: { type: String, default: null }         // their own words, when we have them
    }],
    influenced: [{
        name: String,
        directorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Director', default: null },
        source: String,
        quote: { type: String, default: null }
    }]
}, {
    timestamps: true
});

// Virtual to get director's films
directorSchema.virtual('films', {
    ref: 'Movie',
    localField: 'name',
    foreignField: 'directors',
    justOne: false
});

// Enable virtuals in JSON
directorSchema.set('toJSON', { virtuals: true });
directorSchema.set('toObject', { virtuals: true });

export default mongoose.model('Director', directorSchema);
