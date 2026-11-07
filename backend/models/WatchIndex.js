import mongoose from 'mongoose';

// Where each film can be watched, country by country (TMDB's watch providers, which come from
// JustWatch): the last good daily build, kept so a restart doesn't start empty. One document per
// film, keyed by its id, plus one '_meta' document with the providers and when it was built.
const watchIndexSchema = new mongoose.Schema({
  _id: String,
  r: mongoose.Schema.Types.Mixed,          // a film's countries: { IN: { s: [ids], f: [ids], r: [ids], b: [ids] } }
  providers: mongoose.Schema.Types.Mixed,  // _meta: { id: [name, logoPath, priority] }
  builtAt: Date,                           // _meta
}, { versionKey: false, minimize: false, collection: 'watchindex' });

export default mongoose.model('WatchIndex', watchIndexSchema);
