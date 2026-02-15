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
