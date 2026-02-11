/**
 * Discovery Engine Service
 * Implements sophisticated ranking algorithms for film discovery
 */

import seedrandom from 'seedrandom';
import { getMoodMatch } from './moodService.js';

// Get current date for daily rotation
const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Day-seeded RNG for rotation noise
const getRotationNoise = (seed = getTodayString()) => {
  const rng = seedrandom(seed);
  return (rng() * 6) - 3; // -3 to +3 range
};

// Calculate recency boost (0-100)
const calculateRecencyBoost = (year) => {
  const score = 100 * (year - 2015) / (2025 - 2015);
  return Math.max(0, Math.min(100, score));
};

// Calculate rarity boost (0-100)
const calculateRarityBoost = (showCount) => {
  const score = 100 / Math.log(showCount + 2);
  return Math.max(0, Math.min(100, score));
};

/**
 * EXPLORE SCORE
 * ExploreScore = 0.60*BaseCanonScore + 0.20*RecencyBoost + 0.10*RarityBoost + 0.10*RotationNoise
 */
export const calculateExploreScore = (film, seed = getTodayString()) => {
  const base = film.baseCanonScore || 0;
  const recency = calculateRecencyBoost(film.year);
  const rarity = calculateRarityBoost(film.showCount || 0);
  const rotation = getRotationNoise(seed + film._id.toString()); // Per-film seed
  
  return (
    0.60 * base +
    0.20 * recency +
    0.10 * rarity +
    0.10 * rotation
  );
};

/**
 * DECADE SCORE
 * DecadeScore = 0.70*BaseCanonScore + 0.20*InfluenceWithinDecade + 0.10*MovementRepresentativeness
 */
export const calculateDecadeScore = (film, decadeFilms) => {
  const base = film.baseCanonScore || 0;
  
  // Influence within decade (normalized position in decade)
  const decadeScores = decadeFilms.map(f => f.baseCanonScore || 0);
  const maxInDecade = Math.max(...decadeScores, 1);
  const influenceWithinDecade = (base / maxInDecade) * 100;
  
  // Movement representativeness (bonus if film has movement tags)
  const movementBonus = (film.movements && film.movements.length > 0) ? 100 : 50;
  
  return (
    0.70 * base +
    0.20 * influenceWithinDecade +
    0.10 * movementBonus
  );
};

/**
 * MOOD SCORE
 * MoodScore = 0.50*(MoodMatchStrength*100) + 0.30*BaseCanonScore + 0.10*DepthBonus + 0.10*ExplorationBonus
 */
export const calculateMoodScore = (film, selectedMoods) => {
  // Convert moods to object if it's a Map
  const filmMoods = film.moods instanceof Map 
    ? Object.fromEntries(film.moods) 
    : (film.moods || {});
  const moodMatch = getMoodMatch(filmMoods, selectedMoods);
  
  const base = film.baseCanonScore || 0;
  const depth = film.depthScore || 50;
  const exploration = calculateRarityBoost(film.showCount || 0);
  
  return (
    0.50 * (moodMatch * 100) +
    0.30 * base +
    0.10 * depth +
    0.10 * exploration
  );
};

/**
 * COMBINED SCORE (Decade + Mood)
 * FinalScore = 0.40*(MoodMatch*100) + 0.40*BaseCanonScore + 0.10*PeriodAuthenticity + 0.10*RarityBoost
 */
export const calculateCombinedScore = (film, selectedMoods, decade) => {
  // Convert moods to object if it's a Map
  const filmMoods = film.moods instanceof Map 
    ? Object.fromEntries(film.moods) 
    : (film.moods || {});
  const moodMatch = getMoodMatch(filmMoods, selectedMoods);
  
  const base = film.baseCanonScore || 0;
  
  // Period authenticity: films from the decade score higher
  const periodAuth = (Math.floor(film.year / 10) * 10 === decade) ? 100 : 50;
  
  const rarity = calculateRarityBoost(film.showCount || 0);
  
  return (
    0.40 * (moodMatch * 100) +
    0.40 * base +
    0.10 * periodAuth +
    0.10 * rarity
  );
};

/**
 * Sort options the user can choose
 */
export const SORT_OPTIONS = {
  CURATED: 'curated',        // Default ExploreScore
  INFLUENCE: 'influence',     // BaseCanonScore
  HIDDEN_GEMS: 'gems',       // RarityBoost + low showCount
  NEW_NOTABLE: 'new'         // RecencyBoost + festival wins
};

export const applySortOption = (films, sortBy) => {
  switch (sortBy) {
    case SORT_OPTIONS.INFLUENCE:
      return films.sort((a, b) => (b.baseCanonScore || 0) - (a.baseCanonScore || 0));
    
    case SORT_OPTIONS.HIDDEN_GEMS:
      return films.sort((a, b) => {
        const rarityA = calculateRarityBoost(a.showCount || 0);
        const rarityB = calculateRarityBoost(b.showCount || 0);
        return rarityB - rarityA;
      });
    
    case SORT_OPTIONS.NEW_NOTABLE:
      return films.sort((a, b) => {
        const scoreA = calculateRecencyBoost(a.year) + (a.festivalWins?.length || 0) * 5;
        const scoreB = calculateRecencyBoost(b.year) + (b.festivalWins?.length || 0) * 5;
        return scoreB - scoreA;
      });
    
    case SORT_OPTIONS.CURATED:
    default:
      return films.sort((a, b) => {
        const scoreA = calculateExploreScore(a);
        const scoreB = calculateExploreScore(b);
        return scoreB - scoreA;
      });
  }
};

export default {
  calculateExploreScore,
  calculateDecadeScore,
  calculateMoodScore,
  calculateCombinedScore,
  applySortOption,
  SORT_OPTIONS
};
