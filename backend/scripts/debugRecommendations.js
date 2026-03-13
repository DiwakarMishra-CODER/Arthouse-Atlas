import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/User.js';
import Movie from '../models/Movie.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const user = await User.findOne().populate('favorites').populate('watched').populate('watchlist');
    if (!user) {
        console.log("No user found");
        process.exit(0);
    }
    
    console.log("Found user:", user.email);
    console.log("Favorites:", user.favorites.length);
    console.log("Watched:", user.watched.length);
    console.log("Watchlist:", user.watchlist.length);
    
    const tagMap = new Map();
    const directorMap = new Map();
    const movementMap = new Map();
    const decadeMap = new Map();

    const processList = (list, weight) => {
      list.forEach(movie => {
        if (movie.derivedTags) {
          movie.derivedTags.forEach(tag => tagMap.set(tag, (tagMap.get(tag) || 0) + weight));
        }
        if (movie.directors) {
          movie.directors.forEach(dir => directorMap.set(dir, (directorMap.get(dir) || 0) + weight));
        }
        if (movie.movements) {
          movie.movements.forEach(mov => movementMap.set(mov, (movementMap.get(mov) || 0) + weight));
        }
        if (movie.decade) {
          decadeMap.set(movie.decade, (decadeMap.get(movie.decade) || 0) + weight);
        }
      });
    };

    processList(user.favorites, 3.0);
    processList(user.watched, 1.5);
    processList(user.watchlist, 1.0);

    const interactedIds = [
      ...user.favorites.map(m => m._id),
      ...user.watched.map(m => m._id),
      ...user.watchlist.map(m => m._id)
    ];

    const candidates = await Movie.find({
      _id: { $nin: interactedIds }
    })
    .sort({ baseCanonScore: -1 })
    .limit(200)
    .select('title year baseCanonScore derivedTags directors movements decade')
    .lean();

    console.log(`Evaluating ${candidates.length} candidates...`);

    const scoredCandidates = candidates.map(candidate => {
      let recommendationScore = 0;

      if (candidate.derivedTags) {
        candidate.derivedTags.forEach(tag => {
          if (tagMap.has(tag)) recommendationScore += tagMap.get(tag) * 1.5;
        });
      }

      if (candidate.directors) {
        candidate.directors.forEach(dir => {
          if (directorMap.has(dir)) recommendationScore += 20;
        });
      }

      if (candidate.movements) {
        candidate.movements.forEach(mov => {
          if (movementMap.has(mov)) recommendationScore += movementMap.get(mov) * 2.0;
        });
      }

      if (candidate.decade) {
        if (decadeMap.has(candidate.decade) && decadeMap.get(candidate.decade) > 0) {
          recommendationScore += 5;
        }
      }

      if (candidate.baseCanonScore) {
        recommendationScore += candidate.baseCanonScore * 0.1;
      }

      return {
        title: candidate.title,
        baseCanonScore: candidate.baseCanonScore,
        recommendationScore
      };
    });

    scoredCandidates.sort((a, b) => b.recommendationScore - a.recommendationScore);
    
    // Take the top 30 mathematically best matches
    const top30Matches = scoredCandidates.slice(0, 30);
    
    // Shuffle the array using Fisher-Yates algorithm
    for (let i = top30Matches.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [top30Matches[i], top30Matches[j]] = [top30Matches[j], top30Matches[i]];
    }

    // Return exactly 10 shuffled recommendations
    const recommendations = top30Matches.slice(0, 10);

    console.log("Top 10 recommended titles:");
    recommendations.forEach((c, i) => {
        console.log(`${i+1}. ${c.title} (Rec Score: ${c.recommendationScore})`);
    });

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
};
run();
